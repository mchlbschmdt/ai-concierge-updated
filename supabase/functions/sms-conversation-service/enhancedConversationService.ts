
import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { ConversationManager } from './conversationManager.ts';
import { IntentRecognitionService } from './intentRecognitionService.ts';
import { RecommendationService } from './recommendationService.ts';
import { ResponseGenerator } from './responseGenerator.ts';
import { MessageUtils } from './messageUtils.ts';
import { PropertyService } from './propertyService.ts';
import { WiFiTroubleshootingService } from './wifiTroubleshootingService.ts';
import { MenuService } from './menuService.ts';
import { ConversationMemoryManager } from './conversationMemoryManager.ts';
import { LocationService } from './locationService.ts';
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

        // Phase 2: WiFi Troubleshooting Integration
        const wifiTroubleshootingResponse = await this.handleWiFiTroubleshooting(conversation, message);
        if (wifiTroubleshootingResponse) {
          return wifiTroubleshootingResponse;
        }

        // Phase 6: Menu and Food Query Integration
        const menuResponse = await this.handleMenuQueries(conversation, message, property);
        if (menuResponse) {
          return menuResponse;
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

        // Phase 4: Property Context Enhancement
        const propertyContextResponse = await this.handlePropertyContextQueries(intentResult.intent, property, conversation, message);
        if (propertyContextResponse) {
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
            response: MessageUtils.ensureSmsLimit(propertyContextResponse),
            shouldUpdateState: false
          };
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

        // Phase 5: Generic Response Cleanup - Better fallback
        return await this.generateHelpfulFallback(conversation, property, intentResult.intent);
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

  // Phase 2: WiFi Troubleshooting Integration
  private async handleWiFiTroubleshooting(conversation: Conversation, message: string) {
    const context = conversation.conversation_context || {};
    const lastMessageType = conversation.last_message_type;
    
    // Check if we're in WiFi troubleshooting flow
    if (ConversationMemoryManager.isInWiFiTroubleshootingFlow(context)) {
      const troubleshootingState = ConversationMemoryManager.getWiFiTroubleshootingState(context);
      
      if (troubleshootingState === 'awaiting_help_response') {
        const response = WiFiTroubleshootingService.detectTroubleshootingResponse(message);
        
        if (response === 'no') {
          // Offer host contact
          await this.conversationManager.updateConversationState(conversation.phone_number, {
            conversation_context: {
              ...context,
              wifi_troubleshooting_state: 'awaiting_host_contact_response'
            }
          });
          
          return {
            response: WiFiTroubleshootingService.generateHostContactOffer(),
            shouldUpdateState: false
          };
        } else if (response === 'yes') {
          // Clear troubleshooting state
          const clearedContext = ConversationMemoryManager.clearWiFiTroubleshootingState(context);
          await this.conversationManager.updateConversationState(conversation.phone_number, {
            conversation_context: clearedContext
          });
          
          return {
            response: "Great! Glad I could help get you connected. Need anything else?",
            shouldUpdateState: false
          };
        }
      }
      
      if (troubleshootingState === 'awaiting_host_contact_response') {
        const response = WiFiTroubleshootingService.detectTroubleshootingResponse(message);
        
        if (response === 'yes') {
          // Notify host and clear troubleshooting state
          const clearedContext = ConversationMemoryManager.clearWiFiTroubleshootingState(context);
          await this.conversationManager.updateConversationState(conversation.phone_number, {
            conversation_context: clearedContext
          });
          
          return {
            response: WiFiTroubleshootingService.generateHostContactedConfirmation(),
            shouldUpdateState: false
          };
        } else if (response === 'no') {
          // Clear troubleshooting state
          const clearedContext = ConversationMemoryManager.clearWiFiTroubleshootingState(context);
          await this.conversationManager.updateConversationState(conversation.phone_number, {
            conversation_context: clearedContext
          });
          
          return {
            response: "No problem! Let me know if you need help with anything else.",
            shouldUpdateState: false
          };
        }
      }
    }
    
    // Check if this is a new WiFi issue
    if (WiFiTroubleshootingService.detectWiFiIssue(message, lastMessageType)) {
      await this.conversationManager.updateConversationState(conversation.phone_number, {
        conversation_context: {
          ...context,
          wifi_troubleshooting_state: 'awaiting_help_response'
        }
      });
      
      return {
        response: WiFiTroubleshootingService.generateTroubleshootingSteps(),
        shouldUpdateState: false
      };
    }
    
    return null;
  }

  // Phase 6: Menu and Food Query Integration
  private async handleMenuQueries(conversation: Conversation, message: string, property: Property) {
    const context = conversation.conversation_context || {};
    
    // Check if this is a menu-related query
    if (MenuService.extractMenuIntent(message)) {
      const lastRecommendedRestaurant = ConversationMemoryManager.getLastRecommendedRestaurant(context);
      
      if (lastRecommendedRestaurant) {
        const menuLink = await MenuService.getMenuLink(lastRecommendedRestaurant);
        
        if (menuLink) {
          return {
            response: `Here's the menu for ${lastRecommendedRestaurant}: ${menuLink}`,
            shouldUpdateState: false
          };
        } else {
          return {
            response: MenuService.generateMenuResponse(lastRecommendedRestaurant, property.address),
            shouldUpdateState: false
          };
        }
      }
    }
    
    // Check for specific food queries
    const specificFoodType = MenuService.detectSpecificFoodQuery(message);
    if (specificFoodType) {
      const lastRecommendedRestaurant = ConversationMemoryManager.getLastRecommendedRestaurant(context);
      
      if (lastRecommendedRestaurant) {
        return {
          response: MenuService.generateSpecificFoodResponse(message, lastRecommendedRestaurant),
          shouldUpdateState: false
        };
      }
    }
    
    return null;
  }

  // v3.1 Enhanced Property Context with distance and amenity queries
  private async handlePropertyContextQueries(intent: string, property: Property, conversation: Conversation, message: string): Promise<string | null> {
    const context = conversation?.conversation_context || {};
    const guestName = context?.guest_name;
    const namePrefix = guestName ? `${guestName}, ` : '';
    const propertyContext = LocationService.getPropertySpecificContext(property.address);
    const lowerMessage = message.toLowerCase();
    
    // v3.1 Distance context handling
    const distanceContext = LocationService.getDistanceContext(property.address, message);
    if (distanceContext) {
      return `${namePrefix}${distanceContext}`;
    }
    
    // Water park hours
    if (lowerMessage.includes('water park') && lowerMessage.includes('hour')) {
      if (propertyContext.waterParkInfo) {
        return `${namePrefix}${propertyContext.waterParkInfo}. Want wristband info or directions?\n\nOr were you referring to a different water park?`;
      }
    }
    
    // Shuttle information with enhanced context
    if (lowerMessage.includes('shuttle')) {
      if (propertyContext.shuttleInfo) {
        return `${namePrefix}${propertyContext.shuttleInfo}. Would you like me to check today's schedule?\n\nOr were you asking about a different shuttle?`;
      }
    }
    
    return null;
  }

  // Phase 5: Generic Response Cleanup
  private async generateHelpfulFallback(conversation: Conversation, property: Property, intent?: string) {
    const context = conversation.conversation_context || {};
    const guestName = context?.guest_name;
    const namePrefix = guestName ? `${guestName}, ` : '';
    const propertyType = LocationService.determinePropertyType(property.address);
    
    // v3.1 Enhanced context-aware fallbacks
    if (intent === 'ask_food_recommendations' || context?.dining_conversation_state) {
      const lastPrefs = context?.last_food_preferences;
      const prefContext = lastPrefs?.length ? ` (${lastPrefs.join(', ')})` : '';
      return {
        response: `${namePrefix}want help with a different restaurant${prefContext}, specific cuisine, or dining vibe?`,
        shouldUpdateState: false
      };
    }
    
    if (intent === 'ask_wifi' || context?.wifi_troubleshooting_state) {
      return {
        response: `${namePrefix}let me make sure I get this right—were you asking about the WiFi, directions, or something else?`,
        shouldUpdateState: false
      };
    }
    
    if (intent === 'ask_amenity' || intent === 'amenity_request') {
      return {
        response: `${namePrefix}want info about other amenities, or help with dining and local recommendations?`,
        shouldUpdateState: false
      };
    }
    
    if (intent === 'ask_activities') {
      return {
        response: `${namePrefix}want more activity ideas, restaurant recommendations, or property info?`,
        shouldUpdateState: false
      };
    }
    
    // Property-specific helpful suggestions
    if (propertyType === 'reunion_resort') {
      return {
        response: `${namePrefix}I can help with:\n• Restaurant recommendations near Reunion\n• Water park hours and shuttle times\n• WiFi, parking, or checkout details\n• Local activities and attractions\n\nWhat would be most helpful?`,
        shouldUpdateState: false
      };
    }
    
    if (propertyType === 'disney_area') {
      return {
        response: `${namePrefix}I can help with:\n• Disney dining and park recommendations\n• Shuttle schedules and transportation\n• WiFi, parking, or property details\n• Local activities beyond the parks\n\nWhat can I help you with?`,
        shouldUpdateState: false
      };
    }
    
    // General helpful fallback
    return {
      response: `${namePrefix}I can help with:\n• Restaurant and dining recommendations\n• WiFi, parking, or checkout details\n• Local activities and attractions\n• Property amenities and services\n\nWhat would be most helpful right now?`,
      shouldUpdateState: false
    };
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

  // Enhanced confirmation with personalized welcome message
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

      // Enhanced welcome message with property details
      const context = conversation.conversation_context || {};
      const pendingProperty = context.pending_property;
      
      let welcomeMessage;
      if (pendingProperty?.property_name && pendingProperty?.address) {
        welcomeMessage = `Welcome to ${pendingProperty.property_name} at ${pendingProperty.address}! I'm your AI concierge and I'm here to help with any questions about your stay. How may I help you today?`;
      } else {
        // Fallback to generic message
        const greeting = ResponseGenerator.getTimeAwareGreeting(conversation?.timezone || 'UTC');
        welcomeMessage = `${greeting}! I'm your AI concierge. I can help with WiFi, parking, directions, and local recommendations. What do you need?`;
      }
      
      return {
        response: MessageUtils.ensureSmsLimit(welcomeMessage),
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
