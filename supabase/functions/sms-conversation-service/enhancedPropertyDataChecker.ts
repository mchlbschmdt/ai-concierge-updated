
import { Property } from './types.ts';

export interface PropertyDataResponse {
  hasAnswer: boolean;
  response: string;
  source: string;
  intent: string;
}

export class EnhancedPropertyDataChecker {
  static checkPropertyDataForIntent(property: Property | null, intent: string, message: string, guestName?: string): PropertyDataResponse {
    if (!property) {
      return { hasAnswer: false, response: '', source: 'none', intent };
    }

    const namePrefix = guestName ? `${guestName}, ` : '';

    switch (intent) {
      case 'ask_checkout_time':
        if (property.check_out_time) {
          return {
            hasAnswer: true,
            response: `${namePrefix}checkout is at ${property.check_out_time}. Let me know if you need help with late checkout or storing bags!`,
            source: 'property_data',
            intent
          };
        }
        break;

      case 'ask_checkin_time':
        if (property.check_in_time) {
          return {
            hasAnswer: true,
            response: `${namePrefix}check-in is at ${property.check_in_time}. Contact us if you need early check-in arrangements!`,
            source: 'property_data',
            intent
          };
        }
        break;

      case 'ask_wifi':
        if (property.wifi_name && property.wifi_password) {
          return {
            hasAnswer: true,
            response: `${namePrefix}here are your WiFi details:\n\nNetwork: ${property.wifi_name}\nPassword: ${property.wifi_password}\n\nNeed help connecting?`,
            source: 'property_data',
            intent
          };
        }
        break;

      case 'ask_parking':
        if (property.parking_instructions) {
          return {
            hasAnswer: true,
            response: `${namePrefix}${property.parking_instructions}\n\nAny other parking questions?`,
            source: 'property_data',
            intent
          };
        }
        break;

      case 'ask_access':
        if (property.access_instructions) {
          return {
            hasAnswer: true,
            response: `${namePrefix}${property.access_instructions}\n\nIf you have trouble accessing, contact our emergency line!`,
            source: 'property_data',
            intent
          };
        }
        break;

      case 'ask_directions':
        if (property.directions_to_property) {
          return {
            hasAnswer: true,
            response: `${namePrefix}${property.directions_to_property}\n\nNeed any other navigation help?`,
            source: 'property_data',
            intent
          };
        } else if (property.address) {
          return {
            hasAnswer: true,
            response: `${namePrefix}the address is: ${property.address}\n\nWould you like specific directions from somewhere?`,
            source: 'property_data',
            intent
          };
        }
        break;

      case 'ask_emergency_contact':
        if (property.emergency_contact) {
          return {
            hasAnswer: true,
            response: `${namePrefix}for urgent matters, here's the emergency contact:\n\n${property.emergency_contact}\n\nDon't hesitate to call if you need immediate assistance!`,
            source: 'property_data',
            intent
          };
        }
        break;

      case 'ask_food_recommendations':
        if (property.local_recommendations && this.containsFoodInfo(property.local_recommendations)) {
          return {
            hasAnswer: true,
            response: `${namePrefix}${this.extractFoodRecommendations(property.local_recommendations)}\n\nWant directions to any of these?`,
            source: 'property_data',
            intent
          };
        }
        break;

      case 'ask_grocery_stores':
        if (property.local_recommendations && this.containsGroceryInfo(property.local_recommendations)) {
          return {
            hasAnswer: true,
            response: `${namePrefix}${this.extractGroceryRecommendations(property.local_recommendations)}\n\nNeed directions to either?`,
            source: 'property_data',
            intent
          };
        }
        break;

      case 'general_inquiry':
        // Check knowledge base for general questions
        if (property.knowledge_base && this.isRelevantToQuery(property.knowledge_base, message)) {
          return {
            hasAnswer: true,
            response: `${namePrefix}${property.knowledge_base}\n\nAnything else I can help with?`,
            source: 'property_data',
            intent
          };
        }
        break;
    }

    return { hasAnswer: false, response: '', source: 'none', intent };
  }

  private static containsFoodInfo(text: string): boolean {
    const foodKeywords = ['restaurant', 'dining', 'food', 'eat', 'meal', 'lunch', 'dinner', 'cafe', 'bar'];
    return foodKeywords.some(keyword => text.toLowerCase().includes(keyword));
  }

  private static containsGroceryInfo(text: string): boolean {
    const groceryKeywords = ['grocery', 'store', 'market', 'shopping', 'publix', 'walmart', 'kroger'];
    return groceryKeywords.some(keyword => text.toLowerCase().includes(keyword));
  }

  private static extractFoodRecommendations(text: string): string {
    // Extract food-related sections from local recommendations
    const sentences = text.split('.').filter(sentence => 
      this.containsFoodInfo(sentence)
    );
    return sentences.join('. ').trim() || text;
  }

  private static extractGroceryRecommendations(text: string): string {
    // Extract grocery-related sections from local recommendations
    const sentences = text.split('.').filter(sentence => 
      this.containsGroceryInfo(sentence)
    );
    return sentences.join('. ').trim() || text;
  }

  private static isRelevantToQuery(content: string, query: string): boolean {
    const lowerContent = content.toLowerCase();
    const lowerQuery = query.toLowerCase();
    const queryWords = lowerQuery.split(' ').filter(word => word.length > 2);
    
    const matchedWords = queryWords.filter(word => lowerContent.includes(word));
    return matchedWords.length >= Math.max(1, Math.floor(queryWords.length * 0.3));
  }
}
