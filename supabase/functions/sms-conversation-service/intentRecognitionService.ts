import { VibeDetectionService } from './vibeDetectionService.ts';
import { MenuService } from './menuService.ts';
import { AmenityService } from './amenityService.ts';
import { WiFiTroubleshootingService } from './wifiTroubleshootingService.ts';

export interface IntentResult {
  intent: string;
  confidence: number;
  subIntents?: string[];
  isMultiPart: boolean;
  hasKids?: boolean;
  isCheckoutSoon?: boolean;
}

export class IntentRecognitionService {
  static recognizeIntent(message: string): IntentResult {
    const lowerMessage = message.toLowerCase().trim();
    
    // PRIORITY: Check for "travel" code first
    if (this.isTravelCode(lowerMessage)) {
      console.log('🌍 Travel code detected:', message);
      return { intent: 'travel_code_detected', confidence: 0.95, isMultiPart: false };
    }
    
    // Reset/restart commands - HIGH PRIORITY - check first!
    if (this.isResetCommand(lowerMessage)) {
      console.log('🔄 Reset command detected:', message);
      return { intent: 'conversation_reset', confidence: 0.95, isMultiPart: false };
    }
    
    // NEW: Menu requests
    if (MenuService.extractMenuIntent(message)) {
      console.log('📄 Menu intent detected:', message);
      return { intent: 'ask_menu', confidence: 0.9, isMultiPart: false };
    }
    
    // NEW: Coffee requests - HIGHEST PRIORITY for food-related queries
    if (this.detectCoffeeIntent(lowerMessage)) {
      console.log('☕ Coffee intent detected:', message);
      return { intent: 'ask_coffee_recommendations', confidence: 0.95, isMultiPart: false };
    }
    
    // NEW: Attractions - HIGH PRIORITY before general food
    if (this.detectAttractionIntent(lowerMessage)) {
      console.log('🏛️ Attraction intent detected:', message);
      return { intent: 'ask_attractions', confidence: 0.95, isMultiPart: false };
    }

    // NEW: Food recommendations - AFTER coffee and attractions
    if (this.detectFoodRecommendationIntent(lowerMessage)) {
      console.log('🍽️ Food recommendation intent detected:', message);
      return { intent: 'ask_food_recommendations', confidence: 0.95, isMultiPart: false };
    }
    
    // NEW: Amenity requests - AFTER food detection
    if (AmenityService.detectAmenityQuery(message)) {
      console.log('🏊 Amenity intent detected:', message);
      return { intent: 'ask_amenity', confidence: 0.9, isMultiPart: false };
    }
    
    // NEW: Vibe/ambience questions
    if (VibeDetectionService.detectVibeIntent(message)) {
      console.log('✨ Vibe intent detected:', message);
      return { intent: 'ask_venue_vibe', confidence: 0.9, isMultiPart: false };
    }
    
    // NEW: Busyness questions
    if (VibeDetectionService.detectBusynessIntent(message)) {
      console.log('👥 Busyness intent detected:', message);
      return { intent: 'ask_venue_busyness', confidence: 0.9, isMultiPart: false };
    }
    
    // NEW: Property-specific questions
    if (VibeDetectionService.detectPropertySpecificIntent(message)) {
      console.log('🏠 Property-specific intent detected:', message);
      return { intent: 'ask_property_specific', confidence: 0.9, isMultiPart: false };
    }
    
    // Detect family/kids context
    const hasKids = this.detectFamilyContext(lowerMessage);
    const isCheckoutSoon = this.detectCheckoutContext(lowerMessage);
    
    // Multi-part detection - check for "and" patterns
    const hasMultipleParts = this.detectMultipleRequests(lowerMessage);
    
    if (hasMultipleParts) {
      const subIntents = this.parseMultipleIntents(lowerMessage);
      return {
        intent: 'ask_multiple_requests',
        confidence: 0.9,
        subIntents,
        isMultiPart: true,
        hasKids,
        isCheckoutSoon
      };
    }

    // Single intent detection
    const singleIntent = this.detectSingleIntent(lowerMessage);
    return {
      intent: singleIntent.intent,
      confidence: singleIntent.confidence,
      isMultiPart: false,
      hasKids,
      isCheckoutSoon
    };
  }

  // NEW: Detect family/kids context
  private static detectFamilyContext(message: string): boolean {
    const familyKeywords = [
      'kids', 'children', 'family', 'toddler', 'baby', 'child',
      'family-friendly', 'kid-friendly', 'with kids', 'for kids',
      'stroller', 'playground', 'child menu', 'family fun',
      'little ones', 'teenagers', 'teens'
    ];
    
    return familyKeywords.some(keyword => message.includes(keyword));
  }

  // NEW: Detect checkout context
  private static detectCheckoutContext(message: string): boolean {
    const checkoutKeywords = [
      'checking out', 'leaving today', 'departing', 'quick',
      'last day', 'final day', 'before we leave', 'heading out',
      'short time', 'limited time', 'fast', 'nearby only'
    ];
    
    return checkoutKeywords.some(keyword => message.includes(keyword));
  }

  // NEW: Detect "travel" code
  private static isTravelCode(message: string): boolean {
    const cleanMessage = message.trim().toLowerCase();
    return cleanMessage === 'travel';
  }

  // NEW: Detect coffee-specific intents FIRST (higher priority than food)
  private static detectCoffeeIntent(message: string): boolean {
    const coffeeKeywords = [
      'coffee', 'café', 'cafe', 'coffee shop', 'espresso', 'latte', 'cappuccino', 'pastries',
      'bakery', 'breakfast spot', 'morning coffee', 'coffee place', 'barista', 'brew',
      'coffee near', 'good coffee', 'coffee recommendations', 'caffeine'
    ];
    
    return this.matchesKeywords(message, coffeeKeywords);
  }

  // NEW: Detect attraction-specific intents
  private static detectAttractionIntent(message: string): boolean {
    const attractionKeywords = [
      'attraction', 'attractions', 'scenic', 'park', 'museum', 'landmark', 'tour', 'historic',
      'rainforest', 'old san juan', 'fort', 'beach', 'nature', 'hiking', 'waterfall',
      'sightseeing', 'tourist spot', 'places to visit', 'worth visiting', 'things to see',
      'local attractions', 'interesting places', 'explore', 'visit', 'viewpoint'
    ];
    
    return this.matchesKeywords(message, attractionKeywords);
  }

  // NEW: Detect food recommendation intents (excluding coffee and attractions)
  private static detectFoodRecommendationIntent(message: string): boolean {
    // Check for coffee first - if it's coffee, don't classify as food
    if (this.detectCoffeeIntent(message)) {
      return false;
    }
    
    // Check for attractions - if it's attractions, don't classify as food
    if (this.detectAttractionIntent(message)) {
      return false;
    }
    
    const foodKeywords = [
      'food', 'restaurant', 'eat', 'dining', 'hungry', 'meal', 'lunch', 'dinner', 'breakfast',
      'where to eat', 'good food', 'best restaurant', 'food recommendations', 'places to eat',
      'grab a bite', 'get food', 'pizza', 'burger', 'sushi', 'italian', 'mexican', 'chinese', 
      'american', 'cuisine', 'quick bite', 'fast food', 'takeout', 'delivery',
      'puerto rican food', 'mofongo', 'seafood', 'authentic', 'local cuisine',
      'brunch', 'local food', 'traditional food',
      'recommend a restaurant', 'restaurant near', 'good place to eat', 'dining options'
    ];
    
    // Check for recommendation phrases combined with food-related terms
    const recommendationPhrases = [
      'recommend', 'suggestion', 'suggest', 'where should', 'what\'s good', 'best place',
      'good place', 'looking for', 'need to find'
    ];
    
    const hasFoodKeyword = foodKeywords.some(keyword => message.includes(keyword));
    const hasRecommendationPhrase = recommendationPhrases.some(phrase => message.includes(phrase));
    
    // Strong signal: both recommendation language and food terms
    if (hasFoodKeyword && hasRecommendationPhrase) {
      return true;
    }
    
    // Also catch direct food keywords
    return this.matchesKeywords(message, foodKeywords);
  }

  private static isResetCommand(message: string): boolean {
    const resetKeywords = [
      'reset', 'restart', 'start over', 'something else', 'different options',
      'what else', 'other recommendations', 'try again', 'nevermind',
      'change topic', 'something different', 'new suggestions', 'new recommendation',
      'different recommendation', 'other options', 'start fresh', 'clear'
    ];
    
    // Check for exact word matches (not partial)
    const words = message.split(/\s+/).map(word => word.replace(/[^\w]/g, ''));
    
    return resetKeywords.some(keyword => {
      const keywordWords = keyword.split(/\s+/);
      
      // For single word keywords, check exact match
      if (keywordWords.length === 1) {
        return words.includes(keywordWords[0]);
      }
      
      // For multi-word keywords, check if all words appear in sequence
      const keywordText = keywordWords.join(' ');
      return message.includes(keywordText);
    });
  }

  // ENHANCED: Detect multiple requests with better patterns
  private static detectMultipleRequests(message: string): boolean {
    const multiPartIndicators = [
      ' and ', ' & ', 'also', 'plus', 'what about', 'how about', 'along with'
    ];
    
    // Check for multiple question words or topics
    const questionWords = ['what', 'where', 'how', 'when', 'who'];
    const questionCount = questionWords.filter(word => message.includes(word)).length;
    
    // Check for multiple topic areas in one message
    const topicAreas = ['food', 'restaurant', 'amenities', 'activities', 'grocery', 'transport'];
    const topicCount = topicAreas.filter(topic => message.includes(topic)).length;
    
    return multiPartIndicators.some(indicator => message.includes(indicator)) || 
           questionCount > 1 || 
           topicCount > 1;
  }

  private static parseMultipleIntents(message: string): string[] {
    const intents: string[] = [];
    
    // Split by common separators
    const parts = message.split(/\sand\s|\s&\s|also|plus|what about|how about/)
      .map(part => part.trim())
      .filter(part => part.length > 0);
    
    parts.forEach(part => {
      const intent = this.detectSingleIntent(part);
      if (intent.intent !== 'general_inquiry') {
        intents.push(intent.intent);
      }
    });
    
    return intents.length > 0 ? intents : ['general_inquiry'];
  }

  private static detectSingleIntent(message: string): { intent: string; confidence: number } {
    // ENHANCED: Property-specific intents with higher priority than food
    if (this.matchesKeywords(message, [
      'amenities', 'amenity', 'pool', 'hot tub', 'game room', 'gym', 'fitness',
      'check out', 'checkout', 'check-out', 'instructions', 'time to leave',
      'departure', 'when do i leave', 'check out time', 'checkout time'
    ])) {
      return { intent: 'ask_property_specific', confidence: 0.95 };
    }

    // ENHANCED: Emergency/Maintenance with highest priority
    if (this.matchesKeywords(message, [
      'emergency', 'maintenance', 'problem', 'issue', 'broken', 'not working',
      'who do i contact', 'who should i contact', 'contact for', 'emergency contact',
      'maintenance issues', 'problems during', 'issues during'
    ])) {
      return { intent: 'ask_emergency_contact', confidence: 0.98 };
    }

    // ENHANCED: Transportation/Grocery with specific detection
    if (this.matchesKeywords(message, [
      'grocery', 'groceries', 'supermarket', 'store', 'shopping',
      'transportation', 'transport', 'without a car', 'public transport',
      'uber', 'taxi', 'bus', 'getting around'
    ])) {
      return { intent: 'ask_grocery_transport', confidence: 0.95 };
    }

    // Coffee-specific detection first
    if (this.detectCoffeeIntent(message)) {
      return { intent: 'ask_coffee_recommendations', confidence: 0.95 };
    }

    // Attraction-specific detection
    if (this.detectAttractionIntent(message)) {
      return { intent: 'ask_attractions', confidence: 0.95 };
    }

    // MUCH MORE RESTRICTIVE: Only detect food with explicit food keywords (excluding coffee)
    if (this.matchesKeywords(message, [
      'food', 'restaurant', 'eat', 'dining', 'hungry', 'meal', 'lunch', 'dinner', 'breakfast',
      'where to eat', 'good food', 'best restaurant', 'food recommendations', 'places to eat',
      'grab a bite', 'get food', 'pizza', 'burger', 'sushi', 'italian', 'mexican', 'chinese', 
      'american', 'cuisine', 'quick bite', 'fast food', 'takeout', 'delivery',
      'puerto rican food', 'mofongo', 'seafood', 'authentic', 'local cuisine',
      'brunch', 'local food', 'traditional food'
    ])) {
      return { intent: 'ask_food_recommendations', confidence: 0.95 };
    }

    // ENHANCED: Multi-part activities detection - PRIORITIZE OVER FOOD
    if (this.matchesKeywords(message, [
      'things to do', 'activities', 'attractions', 'fun', 'sightseeing', 'entertainment',
      'what to do', 'places to visit', 'tourist spots', 'local attractions', 'activities near',
      'stuff to do', 'interesting places', 'worth visiting', 'recommendations for activities',
      'family-friendly attractions', 'theme parks', 'nature', 'local events', 'attraction',
      'beach', 'scenic', 'visit', 'explore', 'tour', 'museum', 'park', 'landmark'
    ])) {
      return { intent: 'ask_attractions', confidence: 0.95 };
    }

    if (this.matchesKeywords(message, [
      'drink', 'bar', 'cocktail', 'beer', 'wine', 'nightlife', 'drinks',
      'places to drink', 'good bars', 'cocktail bar', 'brewery', 'wine bar'
    ])) {
      return { intent: 'ask_food_recommendations', confidence: 0.9 }; // Handle drinks as food recommendations
    }

    // Contact and emergency - HIGH PRIORITY for property management
    if (this.matchesKeywords(message, [
      'contact', 'phone', 'call', 'number', 'reach', 'contact info', 'contact information',
      'phone number', 'how to contact', 'who to call', 'contact details', 'get in touch'
    ])) {
      return { intent: 'ask_emergency_contact', confidence: 0.95 };
    }

    if (this.matchesKeywords(message, ['emergency', 'help', 'problem', 'issue', 'urgent'])) {
      return { intent: 'ask_emergency_contact', confidence: 0.95 };
    }

    // Property basics
    if (this.matchesKeywords(message, ['checkout', 'check out', 'check-out', 'when do i leave', 'departure time'])) {
      return { intent: 'ask_checkout_time', confidence: 0.95 };
    }
    
    if (this.matchesKeywords(message, ['checkin', 'check in', 'check-in', 'arrival time', 'when can i arrive', 'early check'])) {
      return { intent: 'ask_checkin_time', confidence: 0.95 };
    }

    // WiFi
    if (this.matchesKeywords(message, ['wifi', 'wi-fi', 'internet', 'password', 'network'])) {
      return { intent: 'ask_wifi', confidence: 0.9 };
    }

    // Parking - include "park" patterns when asking about parking
    if (this.matchesKeywords(message, [
      'parking', 'park', 'where to park', 'where do we park', 'where can i park',
      'parking spot', 'parking lot', 'parking space', 'car park', 'parking garage', 
      'parking area', 'parking information', 'do we park'
    ])) {
      return { intent: 'ask_parking', confidence: 0.9 };
    }

    // Access/Entry
    if (this.matchesKeywords(message, ['access', 'entry', 'key', 'code', 'door', 'get in'])) {
      return { intent: 'ask_access', confidence: 0.9 };
    }

    // Directions
    if (this.matchesKeywords(message, ['directions', 'how to get', 'address', 'location', 'where is'])) {
      return { intent: 'ask_directions', confidence: 0.85 };
    }

    // Basic greetings
    if (this.matchesKeywords(message, ['hi', 'hello', 'hey', 'good morning', 'good afternoon'])) {
      return { intent: 'greeting', confidence: 0.9 };
    }

    return { intent: 'general_inquiry', confidence: 0.5 };
  }

  private static matchesKeywords(message: string, keywords: string[]): boolean {
    return keywords.some(keyword => {
      // Handle multi-word keywords
      if (keyword.includes(' ')) {
        return message.includes(keyword);
      }
      
      // For single words, check for word boundaries to avoid partial matches
      const wordRegex = new RegExp(`\\b${keyword}\\b`, 'i');
      return wordRegex.test(message);
    });
  }
}