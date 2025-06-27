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
    existingContext: any, 
    newIntent: string, 
    responseType: string,
    recommendationData?: { type: string; content: string; vibe?: string }
  ): any {
    const memory: ConversationMemory = existingContext || {};
    const now = new Date().toISOString();

    // Preserve guest name and global blacklist across all updates
    if (existingContext?.guest_name) {
      memory.guest_name = existingContext.guest_name;
    }
    
    // Preserve guest preferences
    if (existingContext?.guest_preferences) {
      memory.guest_preferences = existingContext.guest_preferences;
    } else {
      memory.guest_preferences = {};
    }
    
    // Preserve global blacklist (survives resets)
    if (existingContext?.global_recommendation_blacklist) {
      memory.global_recommendation_blacklist = existingContext.global_recommendation_blacklist;
    }

    // Update last intent
    memory.last_intent = newIntent;
    memory.last_response_type = responseType;

    // Update recent intents (keep last 5)
    if (!memory.recent_intents) {
      memory.recent_intents = [];
    }
    memory.recent_intents.push(newIntent);
    if (memory.recent_intents.length > 5) {
      memory.recent_intents = memory.recent_intents.slice(-5);
    }

    // Update intent history (keep last 10)
    if (!memory.intent_history) {
      memory.intent_history = [];
    }
    memory.intent_history.push({ intent: newIntent, timestamp: now });
    if (memory.intent_history.length > 10) {
      memory.intent_history = memory.intent_history.slice(-10);
    }

    // Enhanced recommendation tracking
    if (recommendationData) {
      if (!memory.recommendation_history) {
        memory.recommendation_history = {};
      }
      
      const recType = recommendationData.type;
      const content = recommendationData.content;
      
      // Extract specific place names and add to global blacklist
      const placeNames = this.extractPlaceNames(content);
      if (placeNames.length > 0) {
        if (!memory.global_recommendation_blacklist) {
          memory.global_recommendation_blacklist = [];
        }
        
        // Add to global blacklist (persists across resets)
        memory.global_recommendation_blacklist.push(...placeNames);
        
        // Keep only unique places and limit to last 50
        memory.global_recommendation_blacklist = [
          ...new Set(memory.global_recommendation_blacklist)
        ].slice(-50);
      }
      
      // Track by recommendation type with enhanced data
      const recommendationItem: RecommendationItem = {
        name: placeNames[0] || 'Unknown',
        type: recType,
        timestamp: now,
        vibe_description: recommendationData.vibe
      };
      
      if (recType === 'ask_food_recommendations') {
        if (!memory.recommendation_history.food_recommendations) {
          memory.recommendation_history.food_recommendations = [];
        }
        memory.recommendation_history.food_recommendations.push(recommendationItem);
      } else if (recType === 'ask_activities') {
        if (!memory.recommendation_history.activities) {
          memory.recommendation_history.activities = [];
        }
        memory.recommendation_history.activities.push(recommendationItem);
      } else if (recType === 'ask_grocery_stores') {
        if (!memory.recommendation_history.grocery_stores) {
          memory.recommendation_history.grocery_stores = [];
        }
        memory.recommendation_history.grocery_stores.push(recommendationItem);
      }
      
      // Track vibe requests
      if (newIntent === 'ask_venue_vibe') {
        if (!memory.recommendation_history.venue_vibes_requested) {
          memory.recommendation_history.venue_vibes_requested = [];
        }
        memory.recommendation_history.venue_vibes_requested.push(content);
      }
      
      // Track busyness queries
      if (newIntent === 'ask_venue_busyness') {
        if (!memory.recommendation_history.busyness_queries) {
          memory.recommendation_history.busyness_queries = [];
        }
        memory.recommendation_history.busyness_queries.push(content);
      }
      
      memory.recommendation_history.last_recommendation_type = recType;
      memory.recommendation_history.last_recommendation_timestamp = now;
    }

    return {
      ...existingContext,
      ...memory,
      conversation_depth: (existingContext?.conversation_depth || 0) + 1,
      last_interaction: now
    };
  }

  // NEW: Generate recall-based responses
  static generateRecallResponse(
    context: any, 
    newRecommendationType: string, 
    guestName?: string
  ): string | null {
    if (!context?.recommendation_history) return null;
    
    const history = context.recommendation_history;
    const namePrefix = guestName ? `${guestName}, s` : 'S';
    
    // Check for previous similar recommendations
    if (newRecommendationType === 'ask_food_recommendations' && history.food_recommendations?.length > 0) {
      const lastFood = history.food_recommendations[history.food_recommendations.length - 1];
      return `${namePrefix}ince you liked ${lastFood.name}, here's another spot you might enjoy.`;
    }
    
    if (newRecommendationType === 'ask_activities' && history.activities?.length > 0) {
      const lastActivity = history.activities[history.activities.length - 1];
      return `${namePrefix}ince you were interested in ${lastActivity.name}, here's something similar.`;
    }
    
    return null;
  }

  // NEW: Extract guest preferences from messages
  static extractPreferences(message: string, existingPreferences: GuestPreferences = {}): GuestPreferences {
    const lowerMessage = message.toLowerCase();
    const preferences = { ...existingPreferences };
    
    // Food preferences
    if (lowerMessage.includes('vegetarian') || lowerMessage.includes('vegan')) {
      if (!preferences.dietary_restrictions) preferences.dietary_restrictions = [];
      if (lowerMessage.includes('vegetarian')) preferences.dietary_restrictions.push('vegetarian');
      if (lowerMessage.includes('vegan')) preferences.dietary_restrictions.push('vegan');
    }
    
    // Price preferences
    if (lowerMessage.includes('cheap') || lowerMessage.includes('budget') || lowerMessage.includes('affordable')) {
      preferences.preferred_price_range = 'budget';
    } else if (lowerMessage.includes('upscale') || lowerMessage.includes('fancy') || lowerMessage.includes('expensive')) {
      preferences.preferred_price_range = 'upscale';
    }
    
    // Distance preferences
    if (lowerMessage.includes('close') || lowerMessage.includes('nearby') || lowerMessage.includes('walking')) {
      preferences.preferred_distance = 'walking';
    } else if (lowerMessage.includes('drive') || lowerMessage.includes('car')) {
      preferences.preferred_distance = 'driving';
    }
    
    // Likes and dislikes
    if (lowerMessage.includes('love') || lowerMessage.includes('like') || lowerMessage.includes('enjoy')) {
      // Extract what they like (simplified)
      if (!preferences.likes) preferences.likes = [];
      // This would need more sophisticated NLP in practice
    }
    
    return preferences;
  }

  // Keep existing methods but add preference tracking
  static handleConversationReset(existingContext: any, guestName?: string): { context: any; response: string } {
    console.log('🔄 Handling conversation reset for guest:', guestName);
    
    const memory: ConversationMemory = existingContext || {};
    const resetCount = (memory.conversation_reset_count || 0) + 1;
    
    // FIXED: COMPLETELY clear property context for fresh start
    console.log('🧹 Clearing ALL conversation state including property context');
    
    // Clear ALL conversation state for complete reset - INCLUDING PROPERTY
    const clearedContext = {
      // CLEAR property context completely
      property_id: null,
      property_confirmed: false,
      
      // CLEAR global blacklist for fresh recommendations
      global_recommendation_blacklist: [],
      
      // Reset conversation state
      last_intent: 'conversation_reset',
      recent_intents: ['conversation_reset'],
      recommendation_history: {}, // Clear ALL session-specific recommendations
      conversation_reset_count: resetCount,
      conversation_depth: 0,
      last_interaction: new Date().toISOString(),
      last_response_type: 'reset_response',
      
      // PRESERVE guest preferences across resets
      guest_preferences: memory.guest_preferences || {},
      guest_name: memory.guest_name
    };

    // Generate contextual reset response asking for property code
    const response = "Hi! I'm your Hostly AI Concierge. I can help with property info, local recommendations, and more! To get started, please send me your property code (the numbers from your booking confirmation).";

    return { context: clearedContext, response };
  }

  static shouldPreventRepetition(context: any, newIntent: string): boolean {
    if (!context?.recent_intents) return false;
    
    const recentIntents = context.recent_intents;
    const lastTwoIntents = recentIntents.slice(-2);
    
    // Prevent immediate repetition of the same intent
    return lastTwoIntents.length >= 2 && 
           lastTwoIntents.every((intent: string) => intent === newIntent);
  }

  static generateRepetitionResponse(intent: string, guestName?: string): string {
    const namePrefix = guestName ? `${guestName}, ` : '';
    
    const responses: Record<string, string[]> = {
      'ask_checkout_time': [
        `${namePrefix}as I mentioned, checkout is at 11 AM. Are you looking for late checkout options?`,
        `${namePrefix}checkout time is still 11 AM. Need help with anything else for your departure?`
      ],
      'ask_wifi': [
        `${namePrefix}the WiFi details are the same as before. Having trouble connecting?`,
        `${namePrefix}WiFi info hasn't changed. Are you experiencing connection issues?`
      ]
    };

    const intentResponses = responses[intent];
    if (intentResponses) {
      return intentResponses[Math.floor(Math.random() * intentResponses.length)];
    }

    return `${namePrefix}I just shared that information. Is there something specific you'd like me to clarify?`;
  }

  static getRecommendationContext(context: any): string {
    if (!context) return '';
    
    const contextParts = [];
    
    // Use global blacklist for anti-repetition
    const globalBlacklist = context.global_recommendation_blacklist || [];
    if (globalBlacklist.length > 0) {
      const recentBlacklist = globalBlacklist.slice(-10); // Last 10 places
      contextParts.push(`NEVER mention these places again: ${recentBlacklist.join(', ')}`);
    }
    
    // Add guest preferences context
    const preferences = context.guest_preferences;
    if (preferences) {
      if (preferences.dietary_restrictions?.length > 0) {
        contextParts.push(`Guest dietary restrictions: ${preferences.dietary_restrictions.join(', ')}`);
      }
      if (preferences.preferred_price_range) {
        contextParts.push(`Price preference: ${preferences.preferred_price_range}`);
      }
      if (preferences.preferred_distance) {
        contextParts.push(`Distance preference: ${preferences.preferred_distance}`);
      }
    }
    
    // Add session-specific context
    const history = context.recommendation_history;
    if (history?.specific_places_mentioned?.length > 0) {
      const sessionPlaces = history.specific_places_mentioned.slice(-3);
      contextParts.push(`Recent session mentions: ${sessionPlaces.join(', ')}`);
    }

    if (history?.recommendation_categories_used?.length > 0) {
      const categories = [...new Set(history.recommendation_categories_used)];
      contextParts.push(`Categories covered: ${categories.join(', ')}`);
    }

    if (history?.last_recommendation_type) {
      contextParts.push(`Last type: ${history.last_recommendation_type}`);
    }

    return contextParts.length > 0 ? contextParts.join('. ') + '.' : '';
  }

  // Add method to completely clear recommendation memory for testing
  static clearRecommendationMemory(context: any): any {
    console.log('🧹 Completely clearing recommendation memory for fresh testing');
    
    const clearedContext = {
      ...context,
      recommendation_history: {},
      global_recommendation_blacklist: [],
      recent_intents: [],
      last_intent: null,
      last_response_type: null
    };
    
    return clearedContext;
  }

  private static extractPlaceNames(content: string): string[] {
    // Enhanced place name extraction with better regex patterns
    const patterns = [
      // Standard place names (capitalized words)
      /[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*(?:\s+(?:Restaurant|Bar|Cafe|Market|Store|Shop|Grill|Kitchen|Rooftop|Bistro|Eatery))?/g,
      // Places with "The" prefix
      /The\s+[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*/g,
      // Places with numbers or special chars
      /[A-Z][a-z0-9\-']+(?:\s+[A-Z][a-z0-9\-']+)*(?:\s+(?:Restaurant|Bar|Cafe))?/g
    ];
    
    const allMatches = new Set<string>();
    
    patterns.forEach(pattern => {
      const matches = content.match(pattern) || [];
      matches.forEach(match => {
        // Clean up the match
        const cleaned = match.trim()
          .replace(/\s*\([^)]*\)/g, '') // Remove parenthetical content
          .replace(/\s*★.*$/g, '') // Remove star ratings
          .replace(/\s*\d+\.\d+\s*mi.*$/g, ''); // Remove distance info
        
        if (cleaned.length > 2 && !this.isCommonWord(cleaned)) {
          allMatches.add(cleaned);
        }
      });
    });
    
    return Array.from(allMatches).slice(0, 5); // Limit to 5 places per recommendation
  }

  private static isCommonWord(word: string): boolean {
    const commonWords = [
      'The', 'And', 'Or', 'At', 'In', 'On', 'For', 'With', 'From', 'To', 'This', 'That',
      'You', 'Your', 'They', 'Their', 'We', 'Our', 'It', 'Its', 'Great', 'Good', 'Best',
      'Perfect', 'Amazing', 'Wonderful', 'Excellent', 'Popular', 'Local', 'Nearby', 'Close'
    ];
    
    return commonWords.includes(word) || word.length < 3;
  }
}
