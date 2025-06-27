export interface ConversationMemory {
  last_intent?: string;
  recent_intents?: string[];
  intent_history?: { intent: string; timestamp: string }[];
  last_response_type?: string;
  recommendation_history?: RecommendationHistory;
  conversation_reset_count?: number;
  guest_name?: string;
  guest_preferences?: GuestPreferences;
  global_recommendation_blacklist?: string[]; // Persistent across resets
}

export interface GuestPreferences {
  food_preferences?: string[];
  activity_preferences?: string[];
  dietary_restrictions?: string[];
  preferred_price_range?: string;
  preferred_distance?: string;
  dislikes?: string[];
  likes?: string[];
}

export interface RecommendationHistory {
  food_recommendations?: RecommendationItem[];
  activities?: RecommendationItem[];
  grocery_stores?: RecommendationItem[];
  last_recommendation_type?: string;
  last_recommendation_timestamp?: string;
  avoided_recommendations?: string[];
  specific_places_mentioned?: string[];
  recommendation_categories_used?: string[];
  geographic_areas_covered?: string[];
  venue_vibes_requested?: string[];
  busyness_queries?: string[];
}

export interface RecommendationItem {
  name: string;
  type: string;
  timestamp: string;
  guest_feedback?: 'liked' | 'disliked' | 'neutral';
  vibe_description?: string;
}

export class ConversationMemoryManager {
  
  static updateMemory(
    context: any,
    intent: string,  
    responseType: string,
    additionalData?: any
  ): any {
    const now = new Date().toISOString();
    const updatedContext = { ...context };
    
    // Initialize context structure if not present
    if (!updatedContext.recommendation_history) {
      updatedContext.recommendation_history = {};
    }
    if (!updatedContext.recent_intents) {
      updatedContext.recent_intents = [];
    }
    if (!updatedContext.conversation_flow) {
      updatedContext.conversation_flow = {};
    }

    // Update recent intents (keep last 5)
    updatedContext.recent_intents.unshift(intent);
    updatedContext.recent_intents = updatedContext.recent_intents.slice(0, 5);

    // Update recommendation history
    if (this.isRecommendationIntent(intent)) {
      updatedContext.recommendation_history[intent] = {
        timestamp: now,
        response_type: responseType,
        count: (updatedContext.recommendation_history[intent]?.count || 0) + 1,
        ...additionalData
      };
    }

    // NEW: Track last recommended restaurant for menu requests
    if (intent === 'ask_food_recommendations' && additionalData?.restaurantName) {
      updatedContext.last_recommended_restaurant = additionalData.restaurantName;
    }

    // NEW: Track last food query type
    if (intent === 'ask_food_recommendations' && additionalData?.foodType) {
      updatedContext.last_food_query_type = additionalData.foodType;
    }

    // NEW: Track amenity requests
    if (intent === 'ask_amenity' && additionalData?.amenityType) {
      updatedContext.last_amenity_request = {
        type: additionalData.amenityType,
        timestamp: now
      };
    }

    // NEW: Track WiFi troubleshooting state
    if (intent === 'wifi_troubleshooting') {
      updatedContext.wifi_troubleshooting_state = additionalData?.state || 'started';
      updatedContext.wifi_issue_timestamp = now;
    }

    // Update last interaction
    updatedContext.last_interaction = now;
    updatedContext.last_intent = intent;

    // Update conversation depth
    updatedContext.conversation_depth = (updatedContext.conversation_depth || 0) + 1;

    return updatedContext;
  }

  static shouldPreventRepetition(context: any, intent: string): boolean {
    if (!context?.recommendation_history) return false;
    
    const intentHistory = context.recommendation_history[intent];
    if (!intentHistory) return false;
    
    // Check if same intent was asked within last 10 minutes
    const lastAsked = new Date(intentHistory.timestamp);
    const now = new Date();
    const minutesSinceLastAsked = (now.getTime() - lastAsked.getTime()) / (1000 * 60);
    
    // Prevent repetition if asked within 10 minutes AND count > 2
    if (minutesSinceLastAsked < 10 && intentHistory.count > 2) {
      return true;
    }
    
    return false;
  }

  static generateRepetitionResponse(intent: string, guestName?: string): string {
    const namePrefix = guestName ? `${guestName}, ` : '';
    
    const responses = {
      'ask_food_recommendations': [
        `${namePrefix}I just shared some great dining spots! Want help with something else—maybe checkout time or local activities?`,
        `${namePrefix}You're all set with restaurant recommendations! Need help with WiFi, parking, or directions?`,
      ],
      'ask_activities': [
        `${namePrefix}I covered the best local activities already! Want to know about dining, WiFi, or checkout details?`,
        `${namePrefix}You have the activity recommendations! How about restaurant suggestions or property info?`,
      ],
      'ask_grocery_stores': [
        `${namePrefix}I shared the nearby shopping options! Need help with something else like WiFi or check-in details?`,
        `${namePrefix}You're set with grocery stores! Want restaurant recommendations or property information?`,
      ]
    };
    
    const intentResponses = responses[intent] || [
      `${namePrefix}I covered that topic recently! Want help with something else—maybe dining, WiFi, or checkout time?`
    ];
    
    return intentResponses[Math.floor(Math.random() * intentResponses.length)];
  }

  static getConversationSummary(context: any): string {
    if (!context) return 'New conversation';
    
    const depth = context.conversation_depth || 0;
    const lastIntent = context.last_intent || 'unknown';
    const recentIntents = context.recent_intents || [];
    
    return `Depth: ${depth}, Last: ${lastIntent}, Recent: ${recentIntents.slice(0, 3).join(', ')}`;
  }

  // NEW: Get last recommended restaurant
  static getLastRecommendedRestaurant(context: any): string | null {
    return context?.last_recommended_restaurant || null;
  }

  // NEW: Get last food query type
  static getLastFoodQueryType(context: any): string | null {
    return context?.last_food_query_type || null;
  }

  // NEW: Check if user is in WiFi troubleshooting flow
  static isInWiFiTroubleshootingFlow(context: any): boolean {
    return context?.wifi_troubleshooting_state !== null && context?.wifi_troubleshooting_state !== undefined;
  }

  // NEW: Get WiFi troubleshooting state
  static getWiFiTroubleshootingState(context: any): string | null {
    return context?.wifi_troubleshooting_state || null;
  }

  // NEW: Clear WiFi troubleshooting state
  static clearWiFiTroubleshootingState(context: any): any {
    const updatedContext = { ...context };
    delete updatedContext.wifi_troubleshooting_state;
    delete updatedContext.wifi_issue_timestamp;
    return updatedContext;
  }

  private static isRecommendationIntent(intent: string): boolean {
    const recommendationIntents = [
      'ask_food_recommendations',
      'ask_activities', 
      'ask_grocery_stores',
      'ask_venue_vibe',
      'ask_venue_busyness',
      'ask_amenity'
    ];
    return recommendationIntents.includes(intent);
  }

  // NEW: Enhanced memory clearing for fresh starts
  static clearRecommendationMemory(context: any): any {
    const clearedContext = { ...context };
    
    // Clear all recommendation-related memory
    clearedContext.recommendation_history = {};
    clearedContext.global_recommendation_blacklist = [];
    clearedContext.dining_curated_used = [];
    clearedContext.dining_conversation_state = null;
    clearedContext.dining_vibe_preference = null;
    clearedContext.last_recommended_restaurant = null;
    clearedContext.last_food_query_type = null;
    
    // Keep essential conversation tracking
    clearedContext.conversation_depth = (clearedContext.conversation_depth || 0) + 1;
    clearedContext.last_interaction = new Date().toISOString();
    
    return clearedContext;
  }

  // NEW: Property location anchoring
  static setPropertyLocationAnchor(context: any, propertyAddress: string): any {
    const updatedContext = { ...context };
    updatedContext.property_location_anchor = propertyAddress;
    updatedContext.location_anchor_set = new Date().toISOString();
    return updatedContext;
  }

  // NEW: Get property location anchor
  static getPropertyLocationAnchor(context: any): string | null {
    return context?.property_location_anchor || null;
  }
}
