
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

class EnhancedSmsConversationService {
  private conversationManager: ConversationManager;
  private propertyService: PropertyService;
  private recommendationService: RecommendationService;

  constructor(supabase: any) {
    this.conversationManager = new ConversationManager(supabase);
    this.propertyService = new PropertyService(supabase);
    this.recommendationService = new RecommendationService(supabase, this.conversationManager);
  }

  async processMessage(phoneNumber: string, messageBody: string): Promise<ProcessMessageResult> {
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
        return {
          response: "I've reset our conversation. Please text your property ID to get started.",
          shouldUpdateState: true
        };
      }

      switch (conversation.conversation_state) {
        case 'awaiting_property_id':
          return await this.handlePropertyIdInput(conversation, cleanMessage);
        
        case 'awaiting_confirmation':
          return await this.handleConfirmation(conversation, cleanMessage);
        
        case 'confirmed':
          return await this.handleConfirmedGuestInquiry(conversation, messageBody, isPaused);
        
        default:
          await this.conversationManager.resetConversation(phoneNumber);
          return this.getWelcomeMessage();
      }
    } catch (error) {
      console.error('Error processing message:', error);
      return {
        response: "Sorry, I encountered an error. Please try again or text 'reset'.",
        shouldUpdateState: false
      };
    }
  }

  async handleConfirmedGuestInquiry(conversation: Conversation, messageBody: string, isPaused: boolean): Promise<ProcessMessageResult> {
    const property = await this.propertyService.getPropertyInfo(conversation.property_id!);
    const message = messageBody.trim().toLowerCase();
    const greeting = ResponseGenerator.getTimeAwareGreeting(conversation.timezone || 'UTC');
    const guestName = conversation.conversation_context?.guest_name;
    
    const isGreeting = MessageUtils.matchesAnyKeywords(message, [
      'hi', 'hello', 'hey', 'good morning', 'good afternoon', 'good evening'
    ]);

    // Check if we need to capture the guest's name
    const nameCheck = NameHandler.checkIfNameProvided(messageBody, conversation);
    
    if (!nameCheck.hasName && !isGreeting && !MessageUtils.matchesLocationKeywords(message) && 
        !MessageUtils.matchesServiceKeywords(message)) {
      // Ask for name with time-aware greeting
      const nameRequest = `${greeting}! Happy to help 🙂 Before we dive in, what's your name so I can assist you more personally?`;
      return {
        response: MessageUtils.ensureSmsLimit(nameRequest),
        shouldUpdateState: false
      };
    }

    // If name was just provided, store it and continue
    if (nameCheck.extractedName && !guestName) {
      await this.conversationManager.updateConversationState(conversation.phone_number, {
        conversation_context: {
          ...conversation.conversation_context,
          guest_name: nameCheck.extractedName
        }
      });
      
      const welcomeWithName = `Nice to meet you, ${nameCheck.extractedName}! How can I help with your stay?`;
      return {
        response: MessageUtils.ensureSmsLimit(welcomeWithName),
        shouldUpdateState: false
      };
    }

    const contextualFollowUp = ResponseGenerator.generateContextualFollowUp(conversation);

    if (isGreeting && isPaused) {
      const nameToUse = guestName ? `, ${guestName}` : '';
      let response = `${greeting}${nameToUse}! Welcome back! ${contextualFollowUp}How can I help?`;
      return {
        response: MessageUtils.ensureSmsLimit(response),
        shouldUpdateState: false
      };
    } else if (isGreeting) {
      const nameToUse = guestName ? `, ${guestName}` : '';
      let response = `${greeting}${nameToUse}! How can I help with your stay?`;
      return {
        response: MessageUtils.ensureSmsLimit(response),
        shouldUpdateState: false
      };
    }

    return await this.handleSpecificInquiry(conversation, property!, message, messageBody);
  }

  async handleSpecificInquiry(conversation: Conversation, property: Property, message: string, originalMessage: string): Promise<ProcessMessageResult> {
    const guestName = conversation.conversation_context?.guest_name;

    // WiFi requests
    if (MessageUtils.matchesAnyKeywords(message, ['wifi', 'wi-fi', 'internet', 'password', 'network'])) {
      if (property?.wifi_name && property?.wifi_password) {
        const nameToUse = guestName ? `, ${guestName}` : '';
        const response = `Here you go${nameToUse}!\n\nWiFi: ${property.wifi_name}\nPassword: ${property.wifi_password}\n\nAnything else?`;
        await this.conversationManager.updateConversationContext(conversation, 'wifi');
        return {
          response: MessageUtils.ensureSmsLimit(response),
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
        const nameToUse = guestName ? `, ${guestName}` : '';
        return {
          response: MessageUtils.ensureSmsLimit(property.parking_instructions + `\n\nOther questions${nameToUse}?`),
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
      const nameToUse = guestName ? `, ${guestName}` : '';
      const response = `Check-in: ${checkIn}\nCheck-out: ${checkOut}\n\nAnything else${nameToUse}?`;
      return {
        response: MessageUtils.ensureSmsLimit(response),
        shouldUpdateState: false
      };
    }

    // Location/recommendation requests
    if (MessageUtils.matchesLocationKeywords(message)) {
      await this.conversationManager.updateConversationContext(conversation, 'recommendations');
      return await this.recommendationService.getEnhancedRecommendations(property, originalMessage, conversation);
    }

    // Default to contextual response
    return await this.recommendationService.getContextualRecommendations(property, `general: ${originalMessage}`, conversation);
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
        response: MessageUtils.ensureSmsLimit(response),
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
        response: MessageUtils.ensureSmsLimit(response),
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
        features: ['continuity', 'personalization', 'time-awareness', 'friendly-format', 'name-capture'],
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

console.log("Enhanced SMS Conversation Service is ready with friendly, time-aware recommendation format and name capture")
