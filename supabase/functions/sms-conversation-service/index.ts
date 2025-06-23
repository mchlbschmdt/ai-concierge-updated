import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { ConversationManager } from './conversationManager.ts'
import { PropertyService } from './propertyService.ts'
import { MessageUtils } from './messageUtils.ts'
import { ResponseGenerator } from './responseGenerator.ts'
import { NameHandler } from './nameHandler.ts'
import { RecommendationService } from './recommendationService.ts'
import { Conversation, Property, ProcessMessageResult } from './types.ts'
import { EnhancedConversationService } from './enhancedConversationService.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

console.log("Enhanced SMS Conversation Service starting up...")

interface MultiMessageResult {
  messages: string[];
  shouldUpdateState: boolean;
}

class EnhancedSmsConversationService {
  private conversationManager: ConversationManager;
  private propertyService: PropertyService;
  private recommendationService: RecommendationService;
  private enhancedService: EnhancedConversationService;

  constructor(supabase: any) {
    this.conversationManager = new ConversationManager(supabase);
    this.propertyService = new PropertyService(supabase);
    this.recommendationService = new RecommendationService(supabase, this.conversationManager);
    this.enhancedService = new EnhancedConversationService(
      this.conversationManager, 
      this.propertyService, 
      this.recommendationService
    );
  }

  async processMessage(phoneNumber: string, messageBody: string): Promise<MultiMessageResult> {
    console.log('=== PROCESSING ENHANCED MESSAGE ===');
    console.log('Phone:', phoneNumber);
    console.log('Message:', messageBody);
    
    try {
      const conversation = await this.conversationManager.getOrCreateConversation(phoneNumber);
      const cleanMessage = messageBody.trim().toLowerCase();
      const isPaused = MessageUtils.isConversationPaused(conversation.last_interaction_timestamp);

      console.log('Current state:', conversation.conversation_state);
      console.log('Is paused:', isPaused);
      console.log('Guest name:', conversation.conversation_context?.guest_name);
      console.log('Name request made:', conversation.conversation_context?.name_request_made);

      // Handle reset commands
      if (cleanMessage === 'reset' || cleanMessage === 'restart' || cleanMessage === 'start over') {
        await this.conversationManager.resetConversation(phoneNumber);
        return this.wrapSingleResponse("I've reset our conversation. Please text your property ID to get started.");
      }

      let result: ProcessMessageResult;

      switch (conversation.conversation_state) {
        case 'awaiting_property_id':
          result = await this.handlePropertyIdInput(conversation, cleanMessage);
          break;
        
        case 'awaiting_confirmation':
          result = await this.handleConfirmation(conversation, cleanMessage);
          break;
        
        case 'confirmed':
          // Use enhanced conversation service for confirmed guests
          const property = await this.propertyService.getPropertyInfo(conversation.property_id!);
          result = await this.handleConfirmedGuestInquiry(conversation, messageBody, property!, isPaused);
          break;
        
        default:
          await this.conversationManager.resetConversation(phoneNumber);
          result = this.getWelcomeMessage();
      }

      // Split the response into multiple messages if needed
      const messageSegments = MessageUtils.ensureSmsLimit(result.response);
      return {
        messages: messageSegments,
        shouldUpdateState: result.shouldUpdateState
      };

    } catch (error) {
      console.error('Error processing message:', error);
      return this.wrapSingleResponse("Sorry, I encountered an error. Please try again or text 'reset'.");
    }
  }

  async handleConfirmedGuestInquiry(conversation: Conversation, messageBody: string, property: Property, isPaused: boolean): Promise<ProcessMessageResult> {
    const message = messageBody.trim().toLowerCase();
    const timezone = conversation.timezone || 'UTC';
    const greeting = ResponseGenerator.getTimeAwareGreeting(timezone);
    const guestName = conversation.conversation_context?.guest_name;
    
    console.log('🔍 Processing confirmed guest inquiry:');
    console.log('- Guest name:', guestName);
    console.log('- Message:', message);
    console.log('- Name request made:', conversation.conversation_context?.name_request_made);
    
    // Check for name-related responses FIRST
    const nameCheck = NameHandler.checkIfNameProvided(messageBody, conversation);
    const nameRefusal = NameHandler.detectNameRefusal(messageBody);
    
    console.log('🏷️ Name check result:', nameCheck);
    console.log('🚫 Name refusal:', nameRefusal);
    
    // PRIORITY 1: Handle name capture - store name AND process original request if it was delayed
    if (nameCheck.hasName && nameCheck.extractedName && !guestName) {
      console.log('✅ Name captured, storing:', nameCheck.extractedName);
      
      // Store the name
      await this.conversationManager.updateConversationState(conversation.phone_number, {
        conversation_context: {
          ...conversation.conversation_context,
          guest_name: nameCheck.extractedName,
          name_request_made: true,
          pending_request: null // Clear any pending request
        }
      });
      
      // Check if there was a pending request to process
      const pendingRequest = conversation.conversation_context?.pending_request;
      if (pendingRequest) {
        console.log('🔄 Processing pending request after name capture:', pendingRequest);
        // Process the original request with the new name
        const enhancedResult = await this.handleServiceOrRecommendationRequest(
          { ...conversation, conversation_context: { ...conversation.conversation_context, guest_name: nameCheck.extractedName } },
          property,
          pendingRequest,
          nameCheck.extractedName
        );
        return {
          response: `Nice to meet you, ${nameCheck.extractedName}! ${enhancedResult.response}`,
          shouldUpdateState: enhancedResult.shouldUpdateState
        };
      }
      
      const welcomeWithName = `Nice to meet you, ${nameCheck.extractedName}! How can I help with your stay?`;
      return {
        response: welcomeWithName,
        shouldUpdateState: false
      };
    }

    // PRIORITY 2: Handle name refusal with clever response
    if (nameRefusal && !guestName) {
      console.log('🎭 Name refused, generating clever response');
      await this.conversationManager.updateConversationState(conversation.phone_number, {
        conversation_context: {
          ...conversation.conversation_context,
          guest_name: 'Mystery Guest',
          name_request_made: true
        }
      });
      
      const cleverResponse = NameHandler.generateCleverRefusalResponse();
      return {
        response: cleverResponse,
        shouldUpdateState: false
      };
    }

    // PRIORITY 3: Handle service/recommendation requests
    const serviceOrRecommendationResponse = await this.handleServiceOrRecommendationRequest(conversation, property, messageBody, guestName);
    if (serviceOrRecommendationResponse) {
      // If we don't have a name and haven't asked yet, ask for name but store the request
      if (!guestName && !conversation.conversation_context?.name_request_made && !NameHandler.isDirectServiceRequest(messageBody)) {
        console.log('🏷️ Storing request and asking for name');
        await this.conversationManager.updateConversationState(conversation.phone_number, {
          conversation_context: {
            ...conversation.conversation_context,
            name_request_made: true,
            pending_request: messageBody // Store the original request
          }
        });
        
        const nameRequest = `${greeting}! Happy to help 🙂 Before we dive in, what's your name so I can assist you more personally?`;
        return {
          response: nameRequest,
          shouldUpdateState: false
        };
      }
      
      return serviceOrRecommendationResponse;
    }

    // PRIORITY 4: Handle greetings
    const isGreeting = MessageUtils.matchesAnyKeywords(message, [
      'hi', 'hello', 'hey', 'good morning', 'good afternoon', 'good evening'
    ]);
    
    if (isGreeting) {
      const nameToUse = guestName ? `, ${guestName}` : '';
      let response;
      
      if (isPaused) {
        const contextualFollowUp = ResponseGenerator.generateContextualFollowUp(conversation);
        response = `${greeting}${nameToUse}! Welcome back! ${contextualFollowUp}How can I help?`;
      } else {
        response = `${greeting}${nameToUse}! How can I help with your stay?`;
      }
      
      return {
        response: response,
        shouldUpdateState: false
      };
    }

    // PRIORITY 5: Default response
    return {
      response: `${greeting}! How can I help with your stay?`,
      shouldUpdateState: false
    };
  }

  async handleServiceOrRecommendationRequest(conversation: Conversation, property: Property, messageBody: string, guestName: string | null): Promise<ProcessMessageResult | null> {
    const message = messageBody.trim().toLowerCase();
    const nameToUse = guestName ? `, ${guestName}` : '';

    // Handle specific service requests (WiFi, parking, etc.)
    const serviceResponse = await this.handleServiceRequests(conversation, property, message, guestName);
    if (serviceResponse) {
      return serviceResponse;
    }

    // Handle location/recommendation requests with enhanced sources
    if (MessageUtils.matchesLocationKeywords(message) || 
        MessageUtils.matchesAnyKeywords(message, ['restaurant', 'food', 'eat', 'drink', 'bar', 'coffee', 'activities', 'hungry', 'where'])) {
      
      console.log('🍽️ Processing location/recommendation request with enhanced sources');
      return await this.getEnhancedRecommendations(conversation, property, messageBody, guestName);
    }

    return null;
  }

  async handleServiceRequests(conversation: Conversation, property: Property, message: string, guestName: string | null): Promise<ProcessMessageResult | null> {
    const nameToUse = guestName ? `, ${guestName}` : '';

    // WiFi requests
    if (MessageUtils.matchesAnyKeywords(message, ['wifi', 'wi-fi', 'internet', 'password', 'network'])) {
      if (property?.wifi_name && property?.wifi_password) {
        const response = `Here you go${nameToUse}!\n\nWiFi: ${property.wifi_name}\nPassword: ${property.wifi_password}\n\nAnything else?`;
        await this.conversationManager.updateConversationContext(conversation, 'wifi');
        return {
          response: response,
          shouldUpdateState: false
        };
      } else {
        return {
          response: "WiFi details should be in your check-in instructions. Contact property if needed.",
          shouldUpdateState: false
        };
      }
    }

    // Parking requests
    if (MessageUtils.matchesAnyKeywords(message, ['parking', 'park', 'car', 'garage'])) {
      if (property?.parking_instructions) {
        await this.conversationManager.updateConversationContext(conversation, 'parking');
        return {
          response: property.parking_instructions + `\n\nOther questions${nameToUse}?`,
          shouldUpdateState: false
        };
      } else {
        return {
          response: "Check your booking for parking info or contact the property.",
          shouldUpdateState: false
        };
      }
    }

    // Check-in/out times
    if (MessageUtils.matchesAnyKeywords(message, ['check in', 'check out', 'checkin', 'checkout'])) {
      const checkIn = property?.check_in_time || '4:00 PM';
      const checkOut = property?.check_out_time || '11:00 AM';
      const response = `Check-in: ${checkIn}\nCheck-out: ${checkOut}\n\nAnything else${nameToUse}?`;
      return {
        response: response,
        shouldUpdateState: false
      };
    }

    return null; // No service request matched
  }

  async getEnhancedRecommendations(conversation: Conversation, property: Property, messageBody: string, guestName: string | null): Promise<ProcessMessageResult> {
    console.log('🎯 Getting enhanced recommendations with premium sources');
    
    try {
      const propertyAddress = property?.address || 'the property';
      const propertyName = property?.property_name || 'your accommodation';
      const timezone = conversation.timezone || 'UTC';
      const greeting = ResponseGenerator.getTimeAwareGreeting(timezone);
      const nameToUse = guestName ? `, ${guestName}` : '';
      
      // Enhanced prompt for better recommendations with local sources
      const enhancedPrompt = `You are a knowledgeable local concierge assistant with access to premium local guides, food blogs, and insider recommendations. A guest${nameToUse} is staying at ${propertyName} located at ${propertyAddress}. 

Their request: "${messageBody}"

IMPORTANT GUIDELINES:
- Source recommendations from TOP LOCAL FOOD BLOGS, hospitality guides, and trusted local websites
- Avoid generic chain restaurants unless they're truly exceptional
- Include hidden gems and local favorites that locals actually recommend
- Mention specific dishes or specialties when relevant
- Provide practical details: distance, price range, and why it's special
- Keep response under 160 characters for SMS
- Be warm and personalized${guestName ? ` using ${guestName}'s name` : ''}

Focus on quality over quantity - 1-2 outstanding recommendations are better than many generic ones.`;

      console.log('🤖 Calling enhanced OpenAI recommendations');
      const response = await fetch('https://zutwyyepahbbvrcbsbke.supabase.co/functions/v1/openai-recommendations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`
        },
        body: JSON.stringify({ 
          prompt: enhancedPrompt,
          propertyAddress: `${propertyName}, ${propertyAddress}`,
          requestType: 'enhanced_local_recommendations'
        })
      });

      if (response.ok) {
        const data = await response.json();
        console.log('✅ Enhanced recommendations received');
        
        await this.conversationManager.updateConversationState(conversation.phone_number, {
          last_recommendations: data.recommendation,
          conversation_context: {
            ...conversation.conversation_context,
            lastRecommendationType: 'enhanced_local'
          }
        });
        
        return {
          response: data.recommendation,
          shouldUpdateState: false
        };
      } else {
        throw new Error(`Enhanced recommendations API failed: ${response.status}`);
      }
    } catch (error) {
      console.error('❌ Error getting enhanced recommendations:', error);
      
      return {
        response: `${guestName ? `${guestName}, ` : ''}having trouble with recommendations right now. Try again soon or ask about WiFi, parking, or check-in details.`,
        shouldUpdateState: false
      };
    }
  }

  async handlePropertyIdInput(conversation: Conversation, input: string): Promise<ProcessMessageResult> {
    const propertyCode = input.match(/\d+/)?.[0];
    
    if (!propertyCode) {
      return {
        response: "Hi! Please text your property ID from your booking confirmation. Text 'reset' if needed.",
        shouldUpdateState: false
      };
    }

    try {
      const property = await this.propertyService.findPropertyByCode(propertyCode);
      
      if (!property) {
        return {
          response: `Property ID ${propertyCode} not found. Check your booking or text 'reset'.`,
          shouldUpdateState: false
        };
      }

      await this.conversationManager.updateConversationState(conversation.phone_number, {
        property_id: property.property_id || property.id,
        conversation_state: 'awaiting_confirmation'
      });

      const response = `Great! You're staying at ${property.property_name}, ${property.address}. Correct? Reply Y or N.`;
      return {
        response: response,
        shouldUpdateState: true
      };
    } catch (error) {
      return {
        response: "Trouble looking up that property ID. Try again or text 'reset'.",
        shouldUpdateState: false
      };
    }
  }

  async handleConfirmation(conversation: Conversation, input: string): Promise<ProcessMessageResult> {
    const normalizedInput = input.toLowerCase().trim();
    const isYes = ['y', 'yes', 'yeah', 'yep', 'correct', 'right', 'ok', 'okay'].includes(normalizedInput);
    const isNo = ['n', 'no', 'nope', 'wrong', 'incorrect'].includes(normalizedInput);

    if (isYes) {
      const property = await this.propertyService.getPropertyInfo(conversation.property_id!);
      const timezone = MessageUtils.guessTimezoneFromAddress(property?.address) || 'UTC';
      
      await this.conversationManager.updateConversationState(conversation.phone_number, {
        property_confirmed: true,
        conversation_state: 'confirmed',
        timezone: timezone
      });

      const greeting = ResponseGenerator.getTimeAwareGreeting(timezone);
      const response = `${greeting}—I'm your Hostly AI Concierge! I can help with property info, local tips, and more! How can I assist you today?`;
      
      return {
        response: response,
        shouldUpdateState: true
      };
    } else if (isNo) {
      await this.conversationManager.updateConversationState(conversation.phone_number, {
        property_id: null,
        conversation_state: 'awaiting_property_id'
      });

      return {
        response: "No problem! Please provide your correct property ID from booking confirmation.",
        shouldUpdateState: true
      };
    } else {
      return {
        response: "Please reply Y for Yes or N for No to confirm. Text 'reset' to start over.",
        shouldUpdateState: false
      };
    }
  }

  getWelcomeMessage(): ProcessMessageResult {
    return {
      response: "Welcome! Text your property ID to get started. Text 'reset' anytime to restart.",
      shouldUpdateState: false
    };
  }

  private wrapSingleResponse(response: string): MultiMessageResult {
    const messageSegments = MessageUtils.ensureSmsLimit(response);
    return {
      messages: messageSegments,
      shouldUpdateState: true
    };
  }
}

serve(async (req) => {
  console.log(`=== Enhanced SMS Conversation Service Request ===`);
  console.log(`Method: ${req.method}`);

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  if (req.method === 'GET') {
    return new Response(
      JSON.stringify({ 
        status: 'healthy', 
        service: 'enhanced-sms-conversation-service',
        features: ['enhanced-recommendations', 'local-blog-sources', 'improved-name-capture', 'better-typo-correction'],
        timestamp: new Date().toISOString()
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    )
  }

  if (req.method === 'POST') {
    try {
      const supabase = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
      )

      const body = await req.json()
      console.log('Enhanced SMS Service - Action:', body.action);

      const service = new EnhancedSmsConversationService(supabase);

      switch (body.action) {
        case 'getOrCreateConversation':
          const conversation = await service.conversationManager.getOrCreateConversation(body.phoneNumber);
          return new Response(
            JSON.stringify({ conversation }),
            {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
              status: 200
            }
          )

        case 'processMessage':
          const result = await service.processMessage(body.phoneNumber, body.messageBody);
          console.log('✅ Enhanced processing result:', result);
          return new Response(
            JSON.stringify(result),
            {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
              status: 200
            }
          )

        default:
          return new Response(
            JSON.stringify({ error: 'Unknown action' }),
            {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
              status: 400
            }
          )
      }

    } catch (error) {
      console.error('❌ Enhanced SMS Service Error:', error);
      return new Response(
        JSON.stringify({ 
          error: 'Internal server error',
          message: error.message,
          timestamp: new Date().toISOString()
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500
        }
      )
    }
  }

  return new Response(
    JSON.stringify({ error: 'Method not allowed' }), 
    { 
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    }
  )
})

console.log("Enhanced SMS Conversation Service is ready with improved name capture, better recommendations from local sources, and fixed typo correction")
