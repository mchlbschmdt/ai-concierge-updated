
import { ConversationFlow } from './conversationContextTracker.ts';

export class ConversationalResponseGenerator {
  static generateContextualResponse(
    intent: string,
    conversationFlow: ConversationFlow,
    property: any,
    message: string,
    guestName?: string
  ): string {
    const namePrefix = guestName ? `${guestName}, ` : '';
    
    // Handle follow-up intents with specific responses
    if (intent.includes('_followup')) {
      return this.generateFollowUpResponse(intent, conversationFlow, property, message, namePrefix);
    }

    // Handle recommendation intents - ROUTE TO RECOMMENDATION SERVICE
    if (this.isRecommendationIntent(intent)) {
      return this.generateRecommendationPrompt(intent, property, message, namePrefix);
    }

    // Generate contextual response based on conversation history
    if (conversationFlow.conversationDepth > 1) {
      return this.generateContextAwareResponse(intent, conversationFlow, property, message, namePrefix);
    }

    // First-time responses
    return this.generateFirstTimeResponse(intent, property, namePrefix);
  }

  private static isRecommendationIntent(intent: string): boolean {
    const recommendationIntents = [
      'ask_food_recommendations',
      'ask_activities', 
      'ask_grocery_stores'
    ];
    return recommendationIntents.includes(intent);
  }

  private static generateRecommendationPrompt(
    intent: string,
    property: any,
    message: string,
    namePrefix: string
  ): string {
    // This signals to the main service to use the recommendation service
    return 'USE_RECOMMENDATION_SERVICE';
  }

  private static generateFollowUpResponse(
    intent: string,
    conversationFlow: ConversationFlow,
    property: any,
    message: string,
    namePrefix: string
  ): string {
    const baseIntent = intent.replace('_followup', '').replace('_generic_followup', '');
    const lowerMessage = message.toLowerCase();

    // Handle contextual references like "that restaurant", "there", "it", etc.
    if (this.isContextualReference(lowerMessage)) {
      return this.handleContextualReference(lowerMessage, conversationFlow, namePrefix, property);
    }

    switch (baseIntent) {
      case 'ask_checkin_time':
        if (lowerMessage.includes('early') || lowerMessage.includes('before')) {
          return `${namePrefix}for early check-in, I'd recommend calling the property directly. They can let you know if your room is ready ahead of the standard time. Would you like their contact information?`;
        }
        if (lowerMessage.includes('contact') || lowerMessage.includes('who')) {
          const contact = property?.emergency_contact;
          if (contact) {
            return `${namePrefix}you can reach the property at ${contact}. They're usually responsive about early check-in requests!`;
          }
          return `${namePrefix}let me get you the property contact information for early check-in requests.`;
        }
        break;

      case 'ask_wifi':
        if (lowerMessage.includes('not working') || lowerMessage.includes('trouble')) {
          return `${namePrefix}try forgetting the network and reconnecting. If that doesn't work, there might be a secondary network available. Should I help you contact the property for tech support?`;
        }
        break;

      case 'ask_parking':
        if (lowerMessage.includes('where exactly') || lowerMessage.includes('which')) {
          const parkingDetails = property?.parking_instructions;
          if (parkingDetails) {
            return `${namePrefix}here are the specific parking details: ${parkingDetails}. Any other questions about parking?`;
          }
          return `${namePrefix}let me get you the exact parking location. You can contact the property for specific spot assignments.`;
        }
        break;

      case 'ask_food_recommendations':
        if (lowerMessage.includes('directions') || lowerMessage.includes('how to get')) {
          return `${namePrefix}I can help with directions! Which restaurant from my recommendations are you interested in visiting?`;
        }
        if (lowerMessage.includes('reservation') || lowerMessage.includes('phone')) {
          return `${namePrefix}most of these places accept walk-ins, but I can help you find contact info for reservations. Which restaurant interests you most?`;
        }
        break;
    }

    // Generic follow-up fallback
    return `${namePrefix}I'd be happy to help with more details! What specific information do you need?`;
  }

  private static isContextualReference(message: string): boolean {
    const contextualWords = [
      'that', 'there', 'it', 'they', 'them', 'the restaurant', 'the place',
      'how far', 'distance from', 'near disney', 'from epcot', 'from magic kingdom',
      'from animal kingdom', 'from hollywood studios', 'close to disney'
    ];
    
    return contextualWords.some(word => message.includes(word));
  }

  private static handleContextualReference(
    message: string, 
    conversationFlow: ConversationFlow, 
    namePrefix: string,
    property: any
  ): string {
    const lastTopic = conversationFlow.currentTopic;
    const lastRecommendations = conversationFlow.lastSpecificResponse;
    
    // Check if they're asking about distance from Disney parks
    if (message.includes('disney') || message.includes('epcot') || message.includes('magic kingdom') || 
        message.includes('animal kingdom') || message.includes('hollywood studios')) {
      
      if (lastTopic?.intent === 'ask_food_recommendations' && lastRecommendations) {
        // Extract restaurant name from last recommendation if possible
        const restaurantMatch = lastRecommendations.match(/(\w+['']?\w*(?:\s+\w+)*?)(?:\s+\(|,|\s+is)/);
        const restaurantName = restaurantMatch ? restaurantMatch[1] : 'the restaurant I recommended';
        
        // Provide distance context based on property location
        const propertyAddress = property?.address || '';
        if (propertyAddress.toLowerCase().includes('reunion') || propertyAddress.toLowerCase().includes('kissimmee')) {
          return `${namePrefix}${restaurantName} is about 12-15 minutes from Disney parks, similar to your property location. It's an easy drive to any of the parks!`;
        } else if (propertyAddress.toLowerCase().includes('orlando')) {
          return `${namePrefix}${restaurantName} is typically 8-15 minutes from Disney parks depending on traffic and which park you're visiting. Want specific directions?`;
        } else {
          return `${namePrefix}${restaurantName} is in the Disney area, so it should be close to all the parks. Would you like specific directions to the restaurant or a particular park?`;
        }
      }
    }
    
    // Handle other contextual references
    if ((message.includes('that') || message.includes('there') || message.includes('it')) && lastRecommendations) {
      if (lastTopic?.intent === 'ask_food_recommendations') {
        return `${namePrefix}I can give you more details about the restaurant I recommended! What specifically would you like to know - directions, hours, or something else?`;
      }
    }
    
    // Fallback for contextual references
    return `${namePrefix}I want to make sure I understand what you're referring to. Could you be more specific about what you'd like to know?`;
  }

  private static generateContextAwareResponse(
    intent: string,
    conversationFlow: ConversationFlow,
    property: any,
    message: string,
    namePrefix: string
  ): string {
    const lastTopic = conversationFlow.currentTopic;
    const conversationDepth = conversationFlow.conversationDepth;

    // Handle contact requests after check-in discussions
    if (intent === 'ask_emergency_contact' && lastTopic?.intent === 'ask_checkin_time') {
      const contact = property?.emergency_contact;
      if (contact) {
        return `${namePrefix}you can reach the property at ${contact} for early check-in or any other questions!`;
      }
      return `${namePrefix}let me get you the property contact information.`;
    }

    // If they're asking the same thing again, acknowledge it
    if (lastTopic && conversationFlow.recentTopics.filter(t => t.intent === intent).length > 1) {
      return this.generateRepeatQuestionResponse(intent, namePrefix, conversationDepth);
    }

    // Context-aware responses based on conversation flow
    switch (intent) {
      case 'ask_checkin_time':
        const checkInTime = property?.check_in_time || '4:00 PM';
        if (conversationDepth === 2) {
          return `${namePrefix}check-in is at ${checkInTime}. Are you looking to arrive earlier?`;
        }
        return `${namePrefix}standard check-in is ${checkInTime}. Let me know if you need early check-in or have other arrival questions!`;

      case 'ask_checkout_time':
        const checkOutTime = property?.check_out_time || '11:00 AM';
        return `${namePrefix}check-out is at ${checkOutTime}. Planning a late departure or need help with luggage storage?`;

      case 'ask_wifi':
        if (property?.wifi_name && property?.wifi_password) {
          return `${namePrefix}WiFi details:\nNetwork: ${property.wifi_name}\nPassword: ${property.wifi_password}\n\nHaving trouble connecting?`;
        }
        return `${namePrefix}WiFi info should be in your check-in instructions. If you can't find it, I can help you contact the property.`;

      case 'ask_emergency_contact':
        const contact = property?.emergency_contact;
        if (contact) {
          return `${namePrefix}you can reach the property at ${contact}. They're available to help with any questions or issues!`;
        }
        return `${namePrefix}let me get you the property contact information.`;

      default:
        return this.generateSmartDefault(namePrefix, conversationFlow, intent);
    }
  }

  private static generateFirstTimeResponse(intent: string, property: any, namePrefix: string): string {
    switch (intent) {
      case 'ask_checkin_time':
        return `${namePrefix}check-in is at ${property?.check_in_time || '4:00 PM'}. Looking forward to your arrival!`;
      
      case 'ask_checkout_time':
        return `${namePrefix}check-out is at ${property?.check_out_time || '11:00 AM'}. Need any help planning your departure?`;
      
      case 'ask_wifi':
        if (property?.wifi_name && property?.wifi_password) {
          return `${namePrefix}here's your WiFi:\nNetwork: ${property.wifi_name}\nPassword: ${property.wifi_password}`;
        }
        return `${namePrefix}WiFi details are in your check-in instructions. Let me know if you need help finding them!`;

      case 'ask_emergency_contact':
        const contact = property?.emergency_contact;
        if (contact) {
          return `${namePrefix}you can reach the property at ${contact} for any questions or assistance!`;
        }
        return `${namePrefix}let me get you the property contact information.`;
      
      default:
        return `${namePrefix}I'm here to help with your stay! What would you like to know?`;
    }
  }

  private static generateRepeatQuestionResponse(intent: string, namePrefix: string, depth: number): string {
    const responses = {
      'ask_checkin_time': [
        `${namePrefix}as I mentioned, check-in is at the standard time. Are you specifically looking for early check-in options?`,
        `${namePrefix}the check-in time hasn't changed. Is there something specific about your arrival I can help with?`
      ],
      'ask_wifi': [
        `${namePrefix}the WiFi info is the same as before. Are you having connection issues?`,
        `${namePrefix}WiFi details haven't changed. Need troubleshooting help?`
      ],
      'ask_emergency_contact': [
        `${namePrefix}the contact information is the same as before. Do you need help with something specific?`,
        `${namePrefix}contact details haven't changed. What can they help you with?`
      ]
    };

    const options = responses[intent as keyof typeof responses];
    if (options) {
      return options[(depth - 1) % options.length];
    }

    return `${namePrefix}I shared that information already. Is there something specific you'd like me to clarify?`;
  }

  private static generateSmartDefault(namePrefix: string, flow: ConversationFlow, intent: string): string {
    // Reference the conversation naturally
    if (flow.recentTopics.length > 0) {
      const lastIntent = flow.recentTopics[flow.recentTopics.length - 1].intent;
      return `${namePrefix}along with what we discussed about ${this.getIntentFriendlyName(lastIntent)}, I can also help with ${this.getIntentFriendlyName(intent)}. What would you like to know?`;
    }

    return `${namePrefix}happy to help with ${this.getIntentFriendlyName(intent)}! What specific information do you need?`;
  }

  private static getIntentFriendlyName(intent: string): string {
    const names: Record<string, string> = {
      'ask_checkin_time': 'check-in',
      'ask_checkout_time': 'check-out', 
      'ask_wifi': 'WiFi',
      'ask_parking': 'parking',
      'ask_food_recommendations': 'dining options',
      'ask_activities': 'local activities',
      'ask_grocery_stores': 'shopping',
      'ask_emergency_contact': 'property contact'
    };
    
    return names[intent] || 'your stay';
  }
}
