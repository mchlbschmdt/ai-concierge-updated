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
    
    // NEW: Troubleshooting intents - HIGH PRIORITY
    // When troubleshooting is detected, return ONLY troubleshooting intent
    // Do NOT allow other intents to be triggered
    if (this.detectTroubleshootingIntent(lowerMessage)) {
      const category = this.detectTroubleshootingCategory(lowerMessage);
      console.log(`🔧 Troubleshooting intent detected (${category}) - blocking other intents:`, message);
      return { intent: `troubleshoot_${category}`, confidence: 0.98, isMultiPart: false };
    }
    
    // NEW: Additional services intent
    if (this.detectAdditionalServicesIntent(lowerMessage)) {
      console.log('🛎️ Additional services intent detected:', message);
      return { intent: 'ask_additional_services', confidence: 0.9, isMultiPart: false };
    }
    
    // NEW: Resort amenities intent
    if (this.detectResortAmenitiesIntent(lowerMessage)) {
      console.log('🏨 Resort amenities intent detected:', message);
      return { intent: 'ask_resort_amenities', confidence: 0.9, isMultiPart: false };
    }
    
    // NEW: Weather queries
    if (this.detectWeatherIntent(lowerMessage)) {
      console.log('🌤️ Weather intent detected:', message);
      return { intent: 'ask_weather', confidence: 0.92, isMultiPart: false };
    }
    
    // NEW: Packing tips queries
    if (this.detectPackingTipsIntent(lowerMessage)) {
      console.log('🎒 Packing tips intent detected:', message);
      return { intent: 'ask_packing_tips', confidence: 0.9, isMultiPart: false };
    }
    
    // NEW: Best time to visit
    if (this.detectBestTimeToVisitIntent(lowerMessage)) {
      console.log('🎢 Best time to visit intent detected:', message);
      return { intent: 'ask_best_time_to_visit', confidence: 0.93, isMultiPart: false };
    }
    
    // NEW: Transportation queries
    if (this.detectTransportationIntent(lowerMessage)) {
      console.log('🚗 Transportation intent detected:', message);
      return { intent: 'ask_transportation', confidence: 0.92, isMultiPart: false };
    }
    
    // NEW: Local events and activities
    if (this.detectLocalEventsIntent(lowerMessage)) {
      console.log('🎭 Local events intent detected:', message);
      return { intent: 'ask_local_events', confidence: 0.91, isMultiPart: false };
    }
    
    // NEW: Coffee requests - HIGHEST PRIORITY for food-related queries
    if (this.detectCoffeeIntent(lowerMessage)) {
      console.log('☕ Coffee intent detected:', message);
      return { intent: 'ask_coffee_recommendations', confidence: 0.95, isMultiPart: false };
    }
    
    // NEW: Location/Direction queries - HIGH PRIORITY for AI routing
    const locationIntent = this.detectLocationIntent(lowerMessage);
    if (locationIntent) {
      console.log('🌍 Location intent detected:', locationIntent, message);
      return { intent: locationIntent, confidence: 0.95, isMultiPart: false };
    }

    // NEW: Attractions - HIGH PRIORITY before general food
    if (this.detectAttractionIntent(lowerMessage)) {
      console.log('🏛️ Attraction intent detected:', message);
      return { intent: 'ask_attractions', confidence: 0.95, isMultiPart: false };
    }

    // NEW: Food recommendations - AFTER coffee and attractions
    if (this.detectFoodRecommendationIntent(lowerMessage)) {
      const kidsContext = this.detectKidsContext(lowerMessage);
      console.log('🍽️ Food recommendation intent detected:', message);
      return { 
        intent: 'ask_food_recommendations', 
        confidence: 0.95, 
        isMultiPart: false,
        hasKids: kidsContext.hasKids,
        kidAges: kidsContext.kidAges
      };
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

  // NEW: Detect location/direction-based queries that should route to external AI
  private static detectLocationIntent(message: string): string | null {
    const lowerMessage = message.toLowerCase();
    
    // Distance and direction keywords - These should go to AI
    const directionKeywords = [
      'how far', 'distance to', 'directions to', 'how to get to',
      'drive to', 'walk to', 'how close', 'how far away',
      'miles to', 'minutes to', 'travel time'
    ];
    
    // Location-based recommendation keywords - These should also go to AI
    const locationKeywords = [
      'restaurant near', 'food near', 'coffee near', 'places to eat',
      'things to do near', 'attractions near', 'activities around',
      'shopping near', 'grocery near', 'recommend', 'suggestions',
      'best place', 'good place', 'where to', 'local'
    ];
    
    // Check for direction/distance queries first
    if (directionKeywords.some(keyword => lowerMessage.includes(keyword))) {
      // Determine the type of location query
      if (lowerMessage.includes('waterpark') || lowerMessage.includes('theme park') || lowerMessage.includes('attraction')) {
        return 'ask_attractions';
      }
      if (lowerMessage.includes('restaurant') || lowerMessage.includes('food') || lowerMessage.includes('eat')) {
        return 'ask_food_recommendations';
      }
      return 'ask_directions'; // Generic direction query
    }
    
    // Check for recommendation queries
    if (locationKeywords.some(keyword => lowerMessage.includes(keyword))) {
      if (lowerMessage.includes('food') || lowerMessage.includes('restaurant') || lowerMessage.includes('eat') || lowerMessage.includes('dining')) {
        return 'ask_food_recommendations';
      }
      if (lowerMessage.includes('coffee') || lowerMessage.includes('cafe')) {
        return 'ask_coffee_recommendations';
      }
      if (lowerMessage.includes('attraction') || lowerMessage.includes('activity') || lowerMessage.includes('things to do') || lowerMessage.includes('fun')) {
        return 'ask_attractions';
      }
    }
    
    return null;
  }

  // NEW: Detect attraction-specific intents with enhanced location patterns
  private static detectAttractionIntent(message: string): boolean {
    const attractionKeywords = [
      'attraction', 'attractions', 'scenic', 'park', 'museum', 'landmark', 'tour', 'historic',
      'rainforest', 'old san juan', 'fort', 'beach', 'nature', 'hiking', 'waterfall',
      'sightseeing', 'tourist spot', 'places to visit', 'worth visiting', 'things to see',
      'local attractions', 'interesting places', 'explore', 'visit', 'viewpoint',
      'animal kingdom', 'disney', 'universal',
      'theme park', 'epcot', 'hollywood studios', 'magic kingdom', 'islands of adventure'
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
      'brunch', 'local food', 'traditional food', 'kids', 'take the kids',
      'recommend a restaurant', 'restaurant near', 'good place to eat', 'dining options',
      'breakfast spot', 'local spot', 'good local spot', 'whats a good', 'what\'s a good'
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
    const lowerMessage = message.toLowerCase();
    
    // CRITICAL: Urgent access issues - HIGHEST PRIORITY
    if (this.matchesKeywords(message, [
      'code not working', 'code doesn\'t work', 'can\'t get in', 'locked out',
      'trouble entering', 'access problem', 'door won\'t open', 'can\'t access',
      'code won\'t work', 'having trouble with code'
    ])) {
      return { intent: 'ask_access', confidence: 0.98 };
    }
    
    // ENHANCED: Check-out time detection (separate from "leave")
    if (this.matchesKeywords(message, [
      'check out time', 'checkout time', 'check-out time',
      'what time do i check out', 'when do i check out', 'when do i need to leave',
      'when should i leave', 'departure time', 'check out instructions',
      'checkout instructions', 'leaving instructions'
    ])) {
      return { intent: 'ask_checkout_time', confidence: 0.95 };
    }
    
    // ENHANCED: Amenity detection - separate intent with more keywords
    if (this.matchesKeywords(message, [
      'pool', 'hot tub', 'jacuzzi', 'spa', 'game room', 'games', 'arcade',
      'gym', 'fitness', 'bbq', 'grill', 'barbecue',
      'does the property have', 'is there a', 'do you have a',
      'turn on hot tub', 'heat hot tub', 'hot tub timer'
    ])) {
      return { intent: 'ask_amenity', confidence: 0.95 };
    }
    
    // NEW: Garbage/trash collection
    if (this.matchesKeywords(message, [
      'garbage', 'trash', 'recycling', 'pickup', 'collection',
      'garbage day', 'trash day', 'when is garbage', 'when is trash'
    ])) {
      return { intent: 'ask_garbage', confidence: 0.95 };
    }
    
    // NEW: Resort amenities intent
    if (this.detectResortAmenitiesIntent(lowerMessage)) {
      console.log('🏨 Resort amenities intent detected:', message);
      return { intent: 'ask_resort_amenities', confidence: 0.9 };
    }
    
    // NEW: Weather
    if (this.detectWeatherIntent(lowerMessage)) {
      console.log('🌤️ Weather intent detected:', message);
      return { intent: 'ask_weather', confidence: 0.92 };
    }
    
    // NEW: Packing tips
    if (this.detectPackingTipsIntent(lowerMessage)) {
      console.log('🎒 Packing tips intent detected:', message);
      return { intent: 'ask_packing_tips', confidence: 0.9 };
    }
    
    // NEW: Grocery stores
    if (this.matchesKeywords(message, [
      'grocery', 'groceries', 'supermarket', 'store', 'shopping',
      'where can i buy', 'where to buy', 'publix', 'aldi',
      'food shopping', 'buy food'
    ])) {
      return { intent: 'ask_grocery', confidence: 0.95 };
    }
    
    // NEW: Transportation without car
    if (this.matchesKeywords(message, [
      'transportation', 'transport', 'without a car', 'no car',
      'getting around', 'how do i get', 'shuttle', 'uber', 'lyft',
      'public transport', 'bus', 'taxi', 'rideshare'
    ])) {
      return { intent: 'ask_transportation_no_car', confidence: 0.95 };
    }
    
    // General property-specific questions
    if (this.matchesKeywords(message, [
      'amenities', 'property features', 'what does the property have'
    ])) {
      return { intent: 'ask_property_specific', confidence: 0.9 };
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

    // Access/Entry (don't confuse with check-out)
    if (this.matchesKeywords(message, [
      'access', 'entry', 'how do i get in', 'getting in', 'enter',
      'access code', 'entry code', 'door code', 'lock code'
    ])) {
      return { intent: 'ask_access', confidence: 0.95 };
    }
    
    // Check-in time
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

    // ENHANCED: Access/Entry with URGENCY detection and expanded keywords
    if (this.matchesKeywords(message, [
      'access', 'entry', 'key', 'code', 'door', 'get in', 'enter', 'unit',
      'not working', 'cant get in', 'can\'t get in', 'locked out', 'trouble getting in',
      'problem with code', 'code not working', 'cant enter', 'can\'t enter',
      'door wont open', 'door won\'t open', 'key doesnt work', 'key doesn\'t work',
      'help getting in', 'stuck outside', 'entrance', 'keypad', 'unlock',
      'building access', 'apartment access', 'front door', 'main door'
    ])) {
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

  // NEW: Detect urgency in message for priority handling
  static detectUrgency(message: string): boolean {
    const urgencyKeywords = [
      'not working', 'cant', 'can\'t', 'doesnt work', 'doesn\'t work',
      'wont work', 'won\'t work', 'broken', 'problem', 'issue', 'trouble',
      'emergency', 'urgent', 'help', 'please help', 'need help', 'asap'
    ];
    
    const lowerMessage = message.toLowerCase();
    return urgencyKeywords.some(keyword => lowerMessage.includes(keyword));
  }
  
  static isTravelCode(message: string): boolean {
    return message.toLowerCase().trim() === 'travel';
  }
  
  static detectTroubleshootingIntent(lowerMessage: string): boolean {
    const troubleshootingKeywords = [
      'not working', 'broken', "won't", "can't", "doesn't work",
      'issue', 'problem', 'trouble', 'help with', 'fix', 'repair'
    ];
    
    const informationKeywords = [
      'how to', 'where is', 'do you have', 'is there', 'what is'
    ];
    
    const hasTroubleshooting = troubleshootingKeywords.some(kw => lowerMessage.includes(kw));
    const isInformationOnly = informationKeywords.some(kw => lowerMessage.includes(kw)) && !hasTroubleshooting;
    
    return hasTroubleshooting && !isInformationOnly;
  }
  
  static detectTroubleshootingCategory(lowerMessage: string): string {
    if (lowerMessage.includes('tv') || lowerMessage.includes('remote') || lowerMessage.includes('streaming')) {
      return 'tv';
    }
    if (lowerMessage.includes('wifi') || lowerMessage.includes('internet')) {
      return 'wifi';
    }
    if (lowerMessage.includes('washer') || lowerMessage.includes('dryer') || 
        lowerMessage.includes('dishwasher') || lowerMessage.includes('appliance')) {
      return 'equipment';
    }
    return 'general';
  }
  
  static detectAdditionalServicesIntent(lowerMessage: string): boolean {
    const serviceKeywords = [
      'laundry service', 'housekeeping', 'cleaning service',
      'extra towels', 'room service', 'maintenance request',
      'additional services', 'concierge'
    ];
    
    return serviceKeywords.some(kw => lowerMessage.includes(kw));
  }
  
  static detectResortAmenitiesIntent(lowerMessage: string): boolean {
    // Direct resort keywords
    const resortKeywords = [
      'resort pool', 'resort gym', 'resort spa', 'resort restaurant', 
      'resort amenities', 'resort facilities', 'resort features',
      'community pool', 'community gym', 'community center'
    ];
    
    // Amenity keywords that should trigger when combined with location
    const amenityKeywords = [
      'pool', 'gym', 'fitness', 'spa', 'restaurant', 'bar', 
      'hot tub', 'jacuzzi', 'tennis', 'golf', 'clubhouse',
      'playground', 'game room', 'business center'
    ];
    
    // Location keywords
    const locationKeywords = ['on-site', 'on site', 'in the resort', 'at the resort', 'resort has'];
    
    // Check for direct resort mentions
    const hasDirectResort = resortKeywords.some(kw => lowerMessage.includes(kw));
    
    // Check for amenity + location combo
    const hasAmenity = amenityKeywords.some(kw => lowerMessage.includes(kw));
    const hasLocation = locationKeywords.some(kw => lowerMessage.includes(kw));
    
    // Check for "what amenities" or "what facilities" style questions
    const amenityOverviewPhrases = [
      'what amenities', 'what facilities', 'what does the resort have',
      'resort overview', 'what\'s available', 'what can we use'
    ];
    const isOverviewQuestion = amenityOverviewPhrases.some(phrase => lowerMessage.includes(phrase));
    
    return hasDirectResort || (hasAmenity && hasLocation) || isOverviewQuestion;
  }
  
  private static detectWeatherIntent(lowerMessage: string): boolean {
    const weatherKeywords = [
      'weather', 'forecast', 'temperature', 'rain', 'sunny', 'hot', 'cold',
      'what\'s the weather', 'how\'s the weather', 'weather like',
      'should i bring umbrella', 'is it raining', 'going to rain',
      'what to expect weather', 'climate', 'how hot', 'how cold',
      'weather forecast', 'today\'s weather', 'tomorrow\'s weather'
    ];
    
    return weatherKeywords.some(kw => lowerMessage.includes(kw));
  }
  
  private static detectPackingTipsIntent(lowerMessage: string): boolean {
    const packingKeywords = [
      'what to pack', 'what should i bring', 'what to bring',
      'packing list', 'pack for', 'what do i need',
      'should i bring', 'do i need to bring',
      'what clothes', 'what to wear', 'dress code',
      'essentials', 'what\'s needed', 'bring sunscreen',
      'beach gear', 'pool stuff', 'swim', 'sunscreen'
    ];
    
    return packingKeywords.some(kw => lowerMessage.includes(kw));
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