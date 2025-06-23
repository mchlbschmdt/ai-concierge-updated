import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { ConversationManager } from './conversationManager.ts'
import { PropertyService } from './propertyService.ts'
import { MessageUtils } from './messageUtils.ts'
import { ResponseGenerator } from './responseGenerator.ts'
import { NameHandler } from './nameHandler.ts'
import { RecommendationService } from './recommendationService.ts'
import { Conversation, Property, ProcessMessageResult } from './types.ts'

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

  constructor(supabase: any) {
    this.conversationManager = new ConversationManager(supabase);
    this.propertyService = new PropertyService(supabase);
    this.recommendationService = new RecommendationService(supabase, this.conversationManager);
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
          result = await this.handleConfirmedGuestInquiry(conversation, messageBody, isPaused);
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

  async handleConfirmedGuestInquiry(conversation: Conversation, messageBody: string, isPaused: boolean): Promise<ProcessMessageResult> {
    const property = await this.propertyService.getPropertyInfo(conversation.property_id!);
    const message = messageBody.trim().toLowerCase();
    const timezone = conversation.timezone || 'UTC';
    const greeting = ResponseGenerator.getTimeAwareGreeting(timezone);
    const guestName = conversation.conversation_context?.guest_name;
    
    console.log('🔍 Processing guest inquiry:');
    console.log('- Guest name:', guestName);
    console.log('- Message:', message);
    console.log('- Is paused conversation:', isPaused);
    
    const isGreeting = MessageUtils.matchesAnyKeywords(message, [
      'hi', 'hello', 'hey', 'good morning', 'good afternoon', 'good evening'
    ]);

    // 1. TIME-AWARE GREETING + NAME CAPTURE
    // Check if we need to capture the guest's name first
    const nameCheck = NameHandler.checkIfNameProvided(messageBody, conversation);
    
    // If name was just provided, store it and acknowledge
    if (nameCheck.extractedName && !guestName) {
      console.log('✅ Name captured:', nameCheck.extractedName);
      await this.conversationManager.updateConversationState(conversation.phone_number, {
        conversation_context: {
          ...conversation.conversation_context,
          guest_name: nameCheck.extractedName
        }
      });
      
      const welcomeWithName = `Nice to meet you, ${nameCheck.extractedName}! How can I help with your stay?`;
      return {
        response: welcomeWithName,
        shouldUpdateState: false
      };
    }

    // If we should ask for name (not a greeting, no name provided, no name stored, and it's a request)
    if (!guestName && 
        !isGreeting && 
        !MessageUtils.matchesAnyKeywords(message, ['wifi', 'wi-fi', 'password', 'internet', 'parking']) &&
        !nameCheck.extractedName) {
      
      console.log('🏷️ Asking for name before proceeding');
      const nameRequest = `${greeting}! Happy to help 🙂 Before we dive in, what's your name so I can assist you more personally?`;
      return {
        response: nameRequest,
        shouldUpdateState: false
      };
    }

    // Handle greetings (with name if we have it)
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

    // Handle specific service requests (WiFi, parking, etc.)
    const serviceResponse = await this.handleServiceRequests(conversation, property!, message, guestName);
    if (serviceResponse) {
      return serviceResponse;
    }

    // Handle location/recommendation requests with the structured format
    if (MessageUtils.matchesLocationKeywords(message) || 
        MessageUtils.matchesAnyKeywords(message, ['restaurant', 'food', 'eat', 'drink', 'bar', 'coffee', 'activities'])) {
      
      console.log('🍽️ Processing location/recommendation request');
      return await this.handleStructuredRecommendations(conversation, property!, messageBody, message, guestName);
    }

    // Default contextual response
    return await this.recommendationService.getContextualRecommendations(property!, `general: ${messageBody}`, conversation);
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

  async handleStructuredRecommendations(conversation: Conversation, property: Property, originalMessage: string, message: string, guestName: string | null): Promise<ProcessMessageResult> {
    console.log('🎯 Handling structured recommendations');
    
    try {
      const timezone = conversation.timezone || 'UTC';
      const greeting = ResponseGenerator.getTimeAwareGreeting(timezone);
      const nameToUse = guestName ? `, ${guestName}` : '';
      
      // 2. ACKNOWLEDGE THE REQUEST + CLARIFY
      const requestType = this.categorizeRequest(message);
      console.log('📋 Request type:', requestType);
      
      let acknowledgment = '';
      let clarifyingQuestion = '';
      
      if (MessageUtils.matchesAnyKeywords(message, ['food', 'restaurant', 'eat', 'dining', 'hungry'])) {
        if (MessageUtils.matchesAnyKeywords(message, ['now', 'hungry'])) {
          acknowledgment = `${greeting}${nameToUse}! Hungry now? I've got you covered 🙂`;
        } else {
          acknowledgment = `${greeting}${nameToUse}! Looking for somewhere great to eat? I've got some perfect spots for you 🙂`;
        }
        clarifyingQuestion = "Are you in the mood for something quick and casual, or more of a sit-down vibe?";
      } else if (MessageUtils.matchesAnyKeywords(message, ['drink', 'bar', 'cocktail', 'beer'])) {
        acknowledgment = `${greeting}${nameToUse}! Ready for drinks? I know some fantastic spots 🙂`;
        clarifyingQuestion = "Looking for craft cocktails, casual drinks, or maybe rooftop vibes?";
      } else if (MessageUtils.matchesAnyKeywords(message, ['coffee', 'cafe'])) {
        acknowledgment = `${greeting}${nameToUse}! Need your coffee fix? I've got great recommendations 🙂`;
        clarifyingQuestion = "Want something cozy for work or a quick grab-and-go spot?";
      } else {
        acknowledgment = `${greeting}${nameToUse}! I'd love to help with recommendations 🙂`;
        clarifyingQuestion = "What kind of vibe are you going for?";
      }

      // 3. PROVIDE 1-2 RECOMMENDATIONS (Mock data for now - in real implementation, call Places API)
      const mockRecommendations = this.getMockRecommendations(requestType, property.address);
      
      // 4. ALWAYS END WITH A HELPFUL OFFER
      const helpfulOffer = "Want more ideas like this or something different?\nWould you like me to send walking or driving directions?";
      
      const fullResponse = `${acknowledgment}\n\n${clarifyingQuestion}\n\n${mockRecommendations}\n\n${helpfulOffer}`;
      
      // Store the interaction context
      await this.conversationManager.updateConversationState(conversation.phone_number, {
        conversation_context: {
          ...conversation.conversation_context,
          lastRequestType: requestType,
          lastRecommendations: mockRecommendations
        },
        last_message_type: 'recommendations'
      });
      
      return {
        response: fullResponse,
        shouldUpdateState: false
      };
      
    } catch (error) {
      console.error('❌ Error in structured recommendations:', error);
      return {
        response: "Having trouble with recommendations right now. Try again soon or ask about WiFi, parking, or check-in details.",
        shouldUpdateState: false
      };
    }
  }

  getMockRecommendations(requestType: string, propertyAddress: string): string {
    // Mock recommendations with proper distance-based phrasing
    const recommendations = [
      "Committee (0.2 mi, 4.4★): Trendy Greek spot with creative meze & cocktails—just a short walk away.",
      "Legal Harborside (0.8 mi, 4.3★): Upscale seafood with waterfront views—best reached by a quick Uber or bike."
    ];
    
    if (requestType.includes('drink') || requestType.includes('bar')) {
      return [
        "The Quiet Man Pub (0.3 mi, 4.5★): Cozy Irish pub with great beer selection—just a short walk away.",
        "Top of the Hub (1.2 mi, 4.2★): Rooftop bar with city views—best reached by a quick Uber or scooter."
      ].join('\n');
    }
    
    if (requestType.includes('coffee')) {
      return [
        "Blue Bottle Coffee (0.1 mi, 4.6★): Artisan coffee and pastries—just a short walk away.",
        "Thinking Cup (0.7 mi, 4.4★): Local favorite with great atmosphere—best reached by a quick Uber or bike."
      ].join('\n');
    }
    
    return recommendations.join('\n');
  }

  categorizeRequest(message: string): string {
    if (MessageUtils.matchesAnyKeywords(message, ['food', 'restaurant', 'eat', 'dining', 'hungry'])) return 'food';
    if (MessageUtils.matchesAnyKeywords(message, ['drink', 'bar', 'cocktail', 'beer'])) return 'drinks';
    if (MessageUtils.matchesAnyKeywords(message, ['coffee', 'cafe'])) return 'coffee';
    if (MessageUtils.matchesAnyKeywords(message, ['activities', 'things to do', 'attractions'])) return 'activities';
    return 'general';
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
      const response = `${greeting}! I'm your AI concierge. I can help with WiFi, parking, directions, and local tips. What do you need?`;
      
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
        features: ['time-aware-greeting', 'name-capture', 'structured-recommendations', 'service-requests', 'multi-sms'],
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

console.log("Enhanced SMS Conversation Service is ready with structured recommendation flow, time-aware greetings, and name capture")
