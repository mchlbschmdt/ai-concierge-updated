export interface ConversationMemory {
  last_intent?: string;
  recent_intents?: string[];
  intent_history?: { intent: string; timestamp: string }[];
  last_response_type?: string;
  recommendation_history?: RecommendationHistory;
  conversation_reset_count?: number;
  guest_name?: string;
  global_recommendation_blacklist?: string[]; // Persistent across resets
}

export interface RecommendationHistory {
  food_recommendations?: string[];
  activities?: string[];
  grocery_stores?: string[];
  last_recommendation_type?: string;
  last_recommendation_timestamp?: string;
  avoided_recommendations?: string[];
  specific_places_mentioned?: string[];
  recommendation_categories_used?: string[];
  geographic_areas_covered?: string[];
}

export class ConversationMemoryManager {
  static updateMemory(
    existingContext: any, 
    newIntent: string, 
    responseType: string,
    recommendationData?: { type: string; content: string }
  ): any {
    const memory: ConversationMemory = existingContext || {};
    const now = new Date().toISOString();

    // Preserve guest name and global blacklist across all updates
    if (existingContext?.guest_name) {
      memory.guest_name = existingContext.guest_name;
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

    // Enhanced recommendation tracking with better place extraction
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
      
      // Track by recommendation type
      if (recType === 'ask_food_recommendations') {
        if (!memory.recommendation_history.food_recommendations) {
          memory.recommendation_history.food_recommendations = [];
        }
        memory.recommendation_history.food_recommendations.push(content);
        
        // Track categories used
        if (!memory.recommendation_history.recommendation_categories_used) {
          memory.recommendation_history.recommendation_categories_used = [];
        }
        memory.recommendation_history.recommendation_categories_used.push('food');
      } else if (recType === 'ask_activities') {
        if (!memory.recommendation_history.activities) {
          memory.recommendation_history.activities = [];
        }
        memory.recommendation_history.activities.push(content);
        
        if (!memory.recommendation_history.recommendation_categories_used) {
          memory.recommendation_history.recommendation_categories_used = [];
        }
        memory.recommendation_history.recommendation_categories_used.push('activities');
      } else if (recType === 'ask_grocery_stores') {
        if (!memory.recommendation_history.grocery_stores) {
          memory.recommendation_history.grocery_stores = [];
        }
        memory.recommendation_history.grocery_stores.push(content);
        
        if (!memory.recommendation_history.recommendation_categories_used) {
          memory.recommendation_history.recommendation_categories_used = [];
        }
        memory.recommendation_history.recommendation_categories_used.push('grocery');
      }
      
      // Track specific places mentioned in current session
      if (placeNames.length > 0) {
        if (!memory.recommendation_history.specific_places_mentioned) {
          memory.recommendation_history.specific_places_mentioned = [];
        }
        memory.recommendation_history.specific_places_mentioned.push(...placeNames);
        
        // Keep only unique places and limit to last 20 for current session
        memory.recommendation_history.specific_places_mentioned = [
          ...new Set(memory.recommendation_history.specific_places_mentioned)
        ].slice(-20);
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

  static handleConversationReset(existingContext: any, guestName?: string): { context: any; response: string } {
    console.log('🔄 Handling conversation reset for guest:', guestName);
    
    const memory: ConversationMemory = existingContext || {};
    const resetCount = (memory.conversation_reset_count || 0) + 1;
    
    // Preserve global blacklist across resets (this is key!)
    const globalBlacklist = memory.global_recommendation_blacklist || [];
    
    console.log('🚫 Preserving global recommendation blacklist:', globalBlacklist);
    
    // Clear conversation state but preserve essential cross-session data
    const clearedContext = {
      // Preserve essential info
      guest_name: guestName || existingContext?.guest_name,
      property_id: existingContext?.property_id,
      property_confirmed: existingContext?.property_confirmed,
      
      // Preserve global blacklist (key for preventing repetition)
      global_recommendation_blacklist: globalBlacklist,
      
      // Reset conversation state
      last_intent: 'conversation_reset',
      recent_intents: ['conversation_reset'],
      recommendation_history: {}, // Clear session-specific recommendations
      conversation_reset_count: resetCount,
      conversation_depth: 0,
      last_interaction: new Date().toISOString(),
      last_response_type: 'reset_response'
    };

    // Generate contextual reset response with variety promise
    const response = this.generateResetResponse(guestName, resetCount, globalBlacklist.length > 0);

    return { context: clearedContext, response };
  }

  private static generateResetResponse(guestName?: string, resetCount?: number, hasHistory?: boolean): string {
    const namePrefix = guestName ? `${guestName}, ` : '';
    
    let responses = [];
    
    if (hasHistory) {
      // When we have previous recommendations, emphasize variety
      responses = [
        `${namePrefix}no problem! Let's explore some completely different options. What would you like to try - different dining spots, activities, or local gems?`,
        `${namePrefix}sure thing! I'll suggest some fresh options you haven't heard about yet. Looking for food, things to do, or property info?`,
        `${namePrefix}absolutely! Time for some new discoveries. What sounds good - different restaurants, activities, or other local spots?`,
        `${namePrefix}let's start fresh with some new recommendations! Are you in the mood for different dining, activities, or anything else?`,
        `${namePrefix}happy to help with something completely different! What can I suggest - new food spots, activities, or property details?`
      ];
    } else {
      // Standard reset responses
      responses = [
        `${namePrefix}no problem! What would you like to explore instead? I can help with dining, activities, local spots, or property details.`,
        `${namePrefix}let's try something different! Are you looking for restaurants, things to do, or information about your stay?`,
        `${namePrefix}sure thing! What can I help you with? Dining options, local activities, or property information?`,
        `${namePrefix}of course! What would you like to know about? Food, activities, or details about your stay?`
      ];
    }

    // Use reset count to ensure variety in responses
    const responseIndex = (resetCount || 0) % responses.length;
    return responses[responseIndex];
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
