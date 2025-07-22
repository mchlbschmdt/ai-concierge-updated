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

  constructor(private supabase: SupabaseClient) {
    this.conversationManager = new ConversationManager(supabase);
    this.recommendationService = new RecommendationService(supabase, this.conversationManager);
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

      // Handle conversation reset - use the correct method name
      if (intentResult.intent === 'conversation_reset') {
        await this.conversationManager.resetConversation(phoneNumber);
        return {
          response: "Let's start fresh! Please send your property code to begin.",
          shouldUpdateState: false
        };
      }

      // Get property for context - use the correct static method
      const property = await PropertyService.getPropertyByPhone(this.supabase, phoneNumber);
      if (!property) {
        // If no property is linked, check if this is a property code
        if (/^\d+$/.test(message.trim())) {
          // This looks like a property code, let the system handle it
          return {
            response: "Let me look up that property code for you...",
            shouldUpdateState: false
          };
        }
        
        return {
          response: "Please text your property code to get started, or contact support if you need assistance.",
          shouldUpdateState: false
        };
      }

      // Handle recommendation intents with enhanced context
      if (this.isRecommendationIntent(intentResult.intent)) {
        return await this.recommendationService.getEnhancedRecommendations(
          property, 
          message, 
          conversation,
          intentResult // Pass the full intent result with family/checkout context
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

      // Fallback response
      return {
        response: "I can help with restaurant recommendations, WiFi, parking, check-in details, and local activities. What would you like to know?",
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
