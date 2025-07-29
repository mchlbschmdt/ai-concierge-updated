import { PropertyDataExtractor } from './propertyDataExtractor.ts';
import { ConversationMemoryManager } from './conversationMemoryManager.ts';

export interface MultiIntentResponse {
  responses: string[];
  shouldUpdateState: boolean;
  handledIntents: string[];
}

export class MultiIntentHandler {
  
  static async handleMultipleIntents(
    subIntents: string[], 
    property: any, 
    conversation: any, 
    message: string
  ): Promise<MultiIntentResponse> {
    const responses: string[] = [];
    const handledIntents: string[] = [];
    const context = conversation.conversation_context || {};
    
    // Check if we already answered these questions recently to avoid repetition
    const recentlyAnswered = subIntents.filter(intent => 
      ConversationMemoryManager.wasSpecificQuestionAnswered(context, message)
    );
    
    // Process each intent sequentially
    for (const intent of subIntents) {
      // Skip if recently answered
      if (recentlyAnswered.includes(intent)) {
        continue;
      }
      
      const response = await this.handleSingleIntentFromMultiple(intent, property, message, context);
      if (response) {
        responses.push(response);
        handledIntents.push(intent);
      }
    }
    
    // If no specific responses, provide a helpful acknowledgment
    if (responses.length === 0) {
      responses.push('I can help with all of those! Let me address them one at a time - what would you like to know about first?');
    }
    
    return {
      responses,
      shouldUpdateState: true,
      handledIntents
    };
  }
  
  private static async handleSingleIntentFromMultiple(
    intent: string, 
    property: any, 
    message: string, 
    context: any
  ): Promise<string | null> {
    const lowerMessage = message.toLowerCase();
    
    switch (intent) {
      case 'ask_property_specific': 
      case 'ask_amenity': {
        // Handle property amenities and checkout questions
        if (lowerMessage.includes('amenities') || lowerMessage.includes('pool') || 
            lowerMessage.includes('hot tub') || lowerMessage.includes('game room') ||
            lowerMessage.includes('grill') || lowerMessage.includes('bbq') ||
            lowerMessage.includes('wifi') || lowerMessage.includes('ac')) {
          const response = PropertyDataExtractor.extractAmenityInfo(property, message);
          return response.hasData ? response.content : 'Let me get the amenity details for this property.';
        }
        
        if (lowerMessage.includes('checkout') || lowerMessage.includes('check-out')) {
          const response = PropertyDataExtractor.extractCheckoutInfo(property);
          return response.content;
        }
        break;
      }
      
      case 'ask_emergency_contact': {
        const response = PropertyDataExtractor.extractEmergencyContact(property);
        return response.content;
      }
      
      case 'ask_grocery_transport': {
        const response = PropertyDataExtractor.extractGroceryTransportInfo(property);
        if (response.hasData) {
          return response.content;
        } else {
          return 'I can find nearby grocery stores and transportation options for you.';
        }
      }
      
      case 'ask_food_recommendations': {
        // For multi-intent, provide a brief acknowledgment
        return 'I can recommend great local restaurants based on your preferences.';
      }
      
      case 'ask_activities': {
        return 'I can suggest family-friendly activities and attractions in the area.';
      }
      
      case 'ask_wifi': {
        if (property.wifi_name && property.wifi_password) {
          return `📶 WiFi: "${property.wifi_name}" Password: "${property.wifi_password}"`;
        } else {
          return 'Let me get the WiFi information for this property.';
        }
      }
      
      case 'ask_parking': {
        if (property.parking_instructions) {
          return `🚗 You can park ${property.parking_instructions.toLowerCase()}. Should be easy to find!`;
        } else {
          // Generate generic parking response
          const responses = [
            '🚗 You can park in the property\'s designated parking area - usually right on-site or very close by!',
            '🚗 Parking is typically included with your stay. Look for the property\'s parking spots when you arrive!',
            '🚗 No worries about parking - there\'s space available for guests at the property!'
          ];
          return responses[Math.floor(Math.random() * responses.length)];
        }
      }
      
      default:
        return null;
    }
    
    return null;
  }
  
  static formatMultipleResponses(responses: string[]): string {
    if (responses.length === 1) {
      return responses[0];
    }
    
    if (responses.length === 2) {
      return responses.join(' Also, ');
    }
    
    // For 3+ responses, use numbered format for clarity
    return responses.map((response, index) => 
      `${index + 1}. ${response}`
    ).join('\n\n');
  }
  
  static shouldBreakDownQuestions(subIntents: string[]): boolean {
    // Break down if more than 2 different intent types
    return subIntents.length > 2;
  }
  
  static generateBreakDownPrompt(subIntents: string[]): string {
    const intentDescriptions: Record<string, string> = {
      'ask_food_recommendations': 'restaurant recommendations',
      'ask_activities': 'local activities',
      'ask_property_specific': 'property amenities and checkout info',
      'ask_emergency_contact': 'emergency contacts',
      'ask_grocery_transport': 'grocery stores and transportation',
      'ask_wifi': 'WiFi information',
      'ask_parking': 'parking details'
    };
    
    const descriptions = subIntents
      .map(intent => intentDescriptions[intent] || intent)
      .filter(Boolean);
    
    if (descriptions.length <= 2) {
      return `I can help with ${descriptions.join(' and ')}. What would you like to know first?`;
    }
    
    return `I can help with several things: ${descriptions.join(', ')}. Would you like me to address these one at a time or focus on a specific area first?`;
  }
}