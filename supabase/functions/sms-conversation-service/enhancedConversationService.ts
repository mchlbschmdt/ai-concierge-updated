
import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { ConversationManager } from './conversationManager.ts';
import { IntentRecognitionService } from './intentRecognitionService.ts';
import { RecommendationService } from './recommendationService.ts';
import { ResponseGenerator } from './responseGenerator.ts';
import { MessageUtils } from './messageUtils.ts';
import { PropertyService } from './propertyService.ts';
import { Conversation, Property } from './types.ts';

export class EnhancedConversationService {
  private conversationManager: ConversationManager;
  private recommendationService: RecommendationService;
  private propertyService: PropertyService;

  constructor(private supabase: SupabaseClient) {
    this.conversationManager = new ConversationManager(supabase);
    this.recommendationService = new RecommendationService(supabase, this.conversationManager);
    this.propertyService = new PropertyService(supabase);
  }

  async processMessage(phoneNumber: string, message: string) {
    try {
      console.log('🚀 Enhanced Conversation Service V2.2 - Processing:', { phoneNumber, message });

      // Get or create conversation
      let conversation = await this.conversationManager.getOrCreateConversation(phoneNumber);
      
      // Special handling for 'get_conversation' requests
      if (message === 'get_conversation') {
        return conversation;
      }

      // Check for travel code activation
      if (message.trim().toLowerCase() === 'travel') {
        console.log('🌍 Travel mode activated for:', phoneNumber);
        
        await this.conversationManager.updateConversationState(phoneNumber, {
          conversation_context: { travel_mode: true },
          last_message_type: 'travel_activation'
        });

        return {
          response: "🌍 Travel mode activated! Ask me about any city and I'll share insider recommendations from food blogs, local guides, and hidden gems.",
          shouldUpdateState: false
        };
      }

      // Recognize intent with enhanced context detection
      const intentResult = IntentRecognitionService.recognizeIntent(message);
      console.log('🎯 Intent analysis:', intentResult);

      // Handle conversation reset first
      if (intentResult.intent === 'conversation_reset') {
        await this.conversationManager.resetConversation(phoneNumber);
        return {
          response: "Let's start fresh! Please send your property code to begin.",
          shouldUpdateState: false
        };
      }

      // CONVERSATION STATE MACHINE - Handle states before intent processing
      console.log('🔄 Current conversation state:', conversation.conversation_state);

      // State 1: Awaiting Property ID
      if (conversation.conversation_state === 'awaiting_property_id') {
        return await this.handlePropertyIdInput(conversation, message);
      }

      // State 2: Awaiting Confirmation
      if (conversation.conversation_state === 'awaiting_confirmation') {
        return await this.handleConfirmation(conversation, message);
      }

      // State 3: Confirmed - Check if property is linked
      if (conversation.conversation_state === 'confirmed') {
        const property = await PropertyService.getPropertyByPhone(this.supabase, phoneNumber);
        if (!property) {
          console.log('❌ No property linked despite confirmed state, resetting conversation');
          await this.conversationManager.resetConversation(phoneNumber);
          return {
            response: "Let's start fresh! Please send your property code to begin.",
            shouldUpdateState: false
          };
        }

        // Handle recommendation intents with enhanced context
        if (this.isRecommendationIntent(intentResult.intent)) {
          return await this.recommendationService.getEnhancedRecommendations(
            property, 
            message, 
            conversation,
            intentResult
          );
        }

        // Handle property-specific intents
        const propertyResponse = await this.handlePropertyIntent(intentResult.intent, property, conversation);
        if (propertyResponse) {
          await this.conversationManager.updateConversationState(phoneNumber, {
            last_message_type: intentResult.intent,
            conversation_context: {
              ...conversation.conversation_context,
              lastIntent: intentResult.intent,
              hasKids: intentResult.hasKids,
              isCheckoutSoon: intentResult.isCheckoutSoon
            }
          });
          
          return {
            response: MessageUtils.ensureSmsLimit(propertyResponse),
            shouldUpdateState: false
          };
        }

        // Fallback response for confirmed guests
        return {
          response: "I can help with restaurant recommendations, WiFi, parking, check-in details, and local activities. What would you like to know?",
          shouldUpdateState: false
        };
      }

      // Fallback - should not reach here
      console.log('❌ Unknown conversation state, resetting to awaiting_property_id');
      await this.conversationManager.resetConversation(phoneNumber);
      return {
        response: "Let's start fresh! Please send your property code to begin.",
        shouldUpdateState: false
      };

    } catch (error) {
      console.error('❌ Enhanced conversation service error:', error);
      return {
        response: "Sorry, I'm having trouble right now. Please try again in a moment.",
        shouldUpdateState: false
      };
    }
  }

  // NEW: Handle property ID input
  private async handlePropertyIdInput(conversation: Conversation, message: string) {
    console.log('🏨 Handling property ID input:', message);
    
    const propertyCode = message.match(/\d+/)?.[0];
    
    if (!propertyCode) {
      return {
        response: "Hi! Please text your property ID number from your booking confirmation. Text 'reset' if needed.",
        shouldUpdateState: false
      };
    }

    try {
      const property = await this.propertyService.findPropertyByCode(propertyCode);
      
      if (!property) {
        return {
          response: `Property ID ${propertyCode} not found. Check your booking confirmation or text 'reset'.`,
          shouldUpdateState: false
        };
      }

      // Update to awaiting confirmation state with property info
      await this.conversationManager.updateConversationState(conversation.phone_number, {
        property_id: property.property_id || property.id,
        conversation_state: 'awaiting_confirmation',
        conversation_context: {
          ...conversation.conversation_context,
          pending_property: property
        }
      });

      const response = `Great! You're staying at ${property.property_name} (${property.address}). Correct? Reply Y or N.`;
      return {
        response: MessageUtils.ensureSmsLimit(response),
        shouldUpdateState: false
      };
    } catch (error) {
      console.error('❌ Error finding property:', error);
      return {
        response: "Trouble looking up that property ID. Try again or text 'reset'.",
        shouldUpdateState: false
      };
    }
  }

  // NEW: Handle confirmation
  private async handleConfirmation(conversation: Conversation, message: string) {
    console.log('✅ Handling confirmation:', message);
    
    const normalizedInput = message.toLowerCase().trim();
    const isYes = ['y', 'yes', 'yeah', 'yep', 'correct', 'right', 'true', '1', 'ok', 'okay', 'yup', 'sure', 'absolutely', 'definitely'].includes(normalizedInput);
    const isNo = ['n', 'no', 'nope', 'wrong', 'incorrect', 'false', '0', 'nah', 'negative'].includes(normalizedInput);

    if (isYes) {
      // Confirm the property and move to confirmed state
      await this.conversationManager.updateConversationState(conversation.phone_number, {
        property_confirmed: true,
        conversation_state: 'confirmed'
      });

      const greeting = ResponseGenerator.getTimeAwareGreeting(conversation?.timezone || 'UTC');
      const response = `${greeting}! I'm your AI concierge. I can help with WiFi, parking, directions, and local recommendations. What do you need?`;
      
      return {
        response: MessageUtils.ensureSmsLimit(response),
        shouldUpdateState: false
      };
    } else if (isNo) {
      // Reset to awaiting property ID
      await this.conversationManager.updateConversationState(conversation.phone_number, {
        property_id: null,
        conversation_state: 'awaiting_property_id',
        conversation_context: {
          ...conversation.conversation_context,
          pending_property: null
        }
      });

      return {
        response: "No problem! Please provide your correct property ID from your booking confirmation.",
        shouldUpdateState: false
      };
    } else {
      return {
        response: "Please reply Y for Yes or N for No to confirm the property. Text 'reset' to start over.",
        shouldUpdateState: false
      };
    }
  }

  private isRecommendationIntent(intent: string): boolean {
    return [
      'ask_food_recommendations',
      'ask_activities',
      'ask_grocery_stores'
    ].includes(intent);
  }

  private async handlePropertyIntent(intent: string, property: Property, conversation: Conversation): Promise<string | null> {
    const context = conversation?.conversation_context || {};
    const guestName = context?.guest_name;
    const namePrefix = guestName ? `${guestName}, ` : '';

    switch (intent) {
      case 'ask_checkin_time':
        const checkInTime = property?.check_in_time || '4:00 PM';
        return `${namePrefix}check-in is at ${checkInTime}. Looking forward to your arrival!`;
      
      case 'ask_checkout_time':
        const checkOutTime = property?.check_out_time || '11:00 AM';
        return `${namePrefix}check-out is at ${checkOutTime}. Need help planning your departure?`;
      
      case 'ask_wifi':
        if (property?.wifi_name && property?.wifi_password) {
          return `${namePrefix}WiFi: ${property.wifi_name}\nPassword: ${property.wifi_password}`;
        }
        return `${namePrefix}WiFi details should be in your check-in instructions. Let me know if you need help finding them!`;

      case 'ask_emergency_contact':
        const contact = property?.emergency_contact;
        if (contact) {
          return `${namePrefix}you can reach the property at ${contact} for any questions or assistance!`;
        }
        return `${namePrefix}let me get you the property contact information.`;
      
      case 'ask_parking':
        const parking = property?.parking_instructions;
        if (parking) {
          return `${namePrefix}parking info: ${parking}`;
        }
        return `${namePrefix}parking details should be in your check-in instructions. Need help finding specific information?`;

      case 'greeting':
        const greeting = ResponseGenerator.getTimeAwareGreeting(conversation?.timezone || 'UTC');
        return `${greeting}${guestName ? `, ${guestName}` : ''}! I can help with dining recommendations, WiFi, parking, or local activities. What interests you?`;
      
      default:
        return null;
    }
  }
}
