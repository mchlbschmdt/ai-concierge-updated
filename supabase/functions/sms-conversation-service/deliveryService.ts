
import { Property } from './types.ts';

export interface DeliveryOption {
  name: string;
  cuisine: string;
  rating: number;
  deliveryTime: string;
  platforms: string[];
  description: string;
}

export class DeliveryService {
  static getDeliveryRecommendations(property: Property, context: any): DeliveryOption[] {
    // Mock delivery data - in production, this would come from Google Places API, Yelp, or restaurant APIs
    const allDeliveryOptions: DeliveryOption[] = [
      {
        name: "Chinatown Express",
        cuisine: "Chinese",
        rating: 4.4,
        deliveryTime: "25-35 min",
        platforms: ["Uber Eats", "DoorDash"],
        description: "Fast Chinese favorites"
      },
      {
        name: "Tony's Pizza Palace",
        cuisine: "Italian",
        rating: 4.6,
        deliveryTime: "20-30 min",
        platforms: ["Uber Eats", "Grubhub"],
        description: "NY-style pizza & pasta"
      },
      {
        name: "Green Bowl Co",
        cuisine: "Healthy",
        rating: 4.5,
        deliveryTime: "30-40 min",
        platforms: ["DoorDash"],
        description: "Fresh salads & grain bowls"
      },
      {
        name: "Spice Route",
        cuisine: "Indian",
        rating: 4.3,
        deliveryTime: "35-45 min",
        platforms: ["Uber Eats", "DoorDash"],
        description: "Authentic curries & tandoor"
      },
      {
        name: "Burger Joint",
        cuisine: "American",
        rating: 4.2,
        deliveryTime: "20-25 min",
        platforms: ["Uber Eats", "Grubhub", "DoorDash"],
        description: "Gourmet burgers & fries"
      }
    ];

    // Filter based on dietary restrictions
    let filteredOptions = allDeliveryOptions;
    
    if (context?.dietary_restrictions?.includes('vegetarian')) {
      filteredOptions = filteredOptions.filter(option => 
        ['Healthy', 'Indian'].includes(option.cuisine) || option.name === 'Tony\'s Pizza Palace'
      );
    }
    
    if (context?.dietary_restrictions?.includes('no_seafood')) {
      filteredOptions = filteredOptions.filter(option => 
        !['Seafood', 'Sushi'].includes(option.cuisine)
      );
    }

    // Sort by rating and delivery time
    return filteredOptions
      .sort((a, b) => b.rating - a.rating)
      .slice(0, 3);
  }

  static formatDeliveryRecommendations(options: DeliveryOption[], urgent: boolean = false): string {
    if (options.length === 0) {
      return "Sorry, having trouble finding delivery options right now. You might want to check Uber Eats or DoorDash directly.";
    }

    const intro = urgent ? 
      "Here are some fast delivery options 🚗💨" : 
      "Here are some great delivery choices:";

    const formatted = options.map(option => {
      const platforms = option.platforms.join(" & ");
      return `${option.name} (${option.rating}★): ${option.description}—${option.deliveryTime} via ${platforms}`;
    }).join('\n');

    return `${intro}\n\n${formatted}`;
  }

  static isDeliveryRequest(message: string, intents: string[]): boolean {
    return intents.includes('delivery_request') || 
           message.toLowerCase().includes('deliver') ||
           message.toLowerCase().includes('bring to me') ||
           message.toLowerCase().includes('order in');
  }
}
