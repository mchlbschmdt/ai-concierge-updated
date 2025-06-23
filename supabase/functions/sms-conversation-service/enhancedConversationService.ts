import { Conversation, Property, ProcessMessageResult } from './types.ts';
import { FuzzyMatchingService } from './fuzzyMatchingService.ts';
import { ConversationContextManager } from './conversationContextManager.ts';
import { DeliveryService } from './deliveryService.ts';
import { MessageUtils } from './messageUtils.ts';
import { ResponseGenerator } from './responseGenerator.ts';
import { NameHandler } from './nameHandler.ts';

export class EnhancedConversationService {
  constructor(private conversationManager: any, private propertyService: any, private recommendationService: any) {}

  async processEnhancedMessage(conversation: Conversation, messageBody: string, property: Property): Promise<ProcessMessageResult> {
    console.log('🔍 Processing enhanced conversational message');
    
    // Step 1: Fuzzy matching and typo correction
    const { correctedMessage, corrections } = FuzzyMatchingService.correctTypos(messageBody);
    const intents = FuzzyMatchingService.detectIntent(correctedMessage);
    
    console.log('Typo corrections:', corrections);
    console.log('Detected intents:', intents);
    
    // Step 2: Check for name extraction
    const nameCheck = NameHandler.checkIfNameProvided(messageBody, conversation);
    const guestName = nameCheck.extractedName || conversation.conversation_context?.guest_name;
    
    // Step 3: Update conversation context
    const updatedContext = ConversationContextManager.updateContext(
      conversation.conversation_context || {},
      intents,
      correctedMessage,
      nameCheck.extractedName
    );

    // Step 4: Generate time-aware greeting
    const timezone = conversation.timezone || 'UTC';
    const timeGreeting = ResponseGenerator.getTimeAwareGreeting(timezone);
    const conversationalGreeting = ConversationContextManager.getConversationalGreeting(updatedContext, timeGreeting);
    
    // Step 5: Build response based on context and intent
    let response = '';
    
    // Add typo correction acknowledgment if any
    if (corrections.length > 0) {
      const correctionMsg = FuzzyMatchingService.generateCorrectionMessage(corrections);
      response += correctionMsg;
    }
    
    // Handle name capture first if needed
    if (!guestName && !nameCheck.extractedName && !this.isServiceRequest(correctedMessage)) {
      response += `${conversationalGreeting} Before we dive in, what's your name so I can assist you more personally?`;
      
      // Update context with name request
      await this.conversationManager.updateConversationState(conversation.phone_number, {
        conversation_context: updatedContext
      });
      
      return {
        response: response,
        shouldUpdateState: false
      };
    }

    // If name was just provided, acknowledge it
    if (nameCheck.extractedName && !guestName) {
      await this.conversationManager.updateConversationState(conversation.phone_number, {
        conversation_context: updatedContext
      });
      
      return {
        response: `Nice to meet you, ${nameCheck.extractedName}! How can I help with your stay?`,
        shouldUpdateState: false
      };
    }

    // Handle delivery requests
    if (DeliveryService.isDeliveryRequest(correctedMessage, intents)) {
      return await this.handleDeliveryRequest(conversation, property, updatedContext, conversationalGreeting);
    }

    // Handle food requests
    if (intents.includes('food_urgent') || MessageUtils.matchesLocationKeywords(correctedMessage)) {
      return await this.handleFoodRequest(conversation, property, updatedContext, conversationalGreeting, intents);
    }

    // Handle service requests (WiFi, parking, etc.)
    const serviceResponse = await this.handleServiceRequests(conversation, property, correctedMessage, guestName);
    if (serviceResponse) {
      return serviceResponse;
    }

    // Default contextual response
    return await this.handleGeneralInquiry(conversation, property, correctedMessage, updatedContext, conversationalGreeting);
  }

  private async handleDeliveryRequest(conversation: Conversation, property: Property, context: any, greeting: string): Promise<ProcessMessageResult> {
    console.log('🚗 Processing delivery request');
    
    const deliveryOptions = DeliveryService.getDeliveryRecommendations(property, context);
    const isUrgent = context.last_intent?.includes('food_urgent');
    
    let response = `${greeting}let's get you something delivered fast! 🍽️\n\n`;
    response += DeliveryService.formatDeliveryRecommendations(deliveryOptions, isUrgent);
    
    // Add smart follow-up
    const followUp = ConversationContextManager.generateSmartFollowUp(context, 'delivery');
    response += `\n\n${followUp}`;

    // Update context
    await this.conversationManager.updateConversationState(conversation.phone_number, {
      conversation_context: context,
      last_message_type: 'delivery_recommendations'
    });

    return {
      response: response,
      shouldUpdateState: false
    };
  }

  private async handleFoodRequest(conversation: Conversation, property: Property, context: any, greeting: string, intents: string[]): Promise<ProcessMessageResult> {
    console.log('🍽️ Processing food request');
    
    const isUrgent = intents.includes('food_urgent');
    const wantsWalkable = context.walkable_preference || intents.includes('walkable_request');
    
    let response = `${greeting}`;
    
    if (isUrgent) {
      response += `hungry and in a hurry? I've got you covered! 🍴\n\n`;
    } else {
      response += `let's find you something delicious! 🍽️\n\n`;
    }

    // Provide both walkable and delivery options unless preference is clear
    if (wantsWalkable) {
      response += this.getMockWalkableRecommendations();
    } else if (context.delivery_preference) {
      const deliveryOptions = DeliveryService.getDeliveryRecommendations(property, context);
      response += DeliveryService.formatDeliveryRecommendations(deliveryOptions, isUrgent);
    } else {
      // Provide both options
      response += "Quick walk:\n";
      response += this.getMockWalkableRecommendations();
      response += "\n\nFor delivery:\n";
      const deliveryOptions = DeliveryService.getDeliveryRecommendations(property, context);
      response += DeliveryService.formatDeliveryRecommendations(deliveryOptions, isUrgent);
    }

    // Add clarifying question
    response += `\n\n${this.getContextualClarifyingQuestion(context, intents)}`;

    // Update context
    await this.conversationManager.updateConversationState(conversation.phone_number, {
      conversation_context: context,
      last_message_type: 'food_recommendations'
    });

    return {
      response: response,
      shouldUpdateState: false
    };
  }

  private getMockWalkableRecommendations(): string {
    return "Committee (0.2 mi, 4.4★): Trendy Greek plates & cocktails—just a short walk away.";
  }

  private getContextualClarifyingQuestion(context: any, intents: string[]): string {
    if (context.delivery_preference) {
      return "Want more delivery options or craving anything specific?";
    } else if (context.walkable_preference) {
      return "Need directions to any of these spots?";
    } else if (intents.includes('food_urgent')) {
      return "Do you want something walkable or should I focus on delivery options?";
    } else {
      return "Craving anything specific—pizza, seafood, or something casual? Want to walk or get delivery?";
    }
  }

  private isServiceRequest(message: string): boolean {
    return MessageUtils.matchesAnyKeywords(message, [
      'wifi', 'wi-fi', 'internet', 'password', 'parking', 'park', 'check in', 'check out'
    ]);
  }

  private async handleServiceRequests(conversation: Conversation, property: Property, message: string, guestName: string | null): Promise<ProcessMessageResult | null> {
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

  private async handleGeneralInquiry(conversation: Conversation, property: Property, message: string, context: any, greeting: string): Promise<ProcessMessageResult> {
    // Default to enhanced contextual recommendations
    return await this.recommendationService.getContextualRecommendations(property, `general: ${message}`, conversation);
  }
}
