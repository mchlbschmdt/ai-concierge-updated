export interface ConversationMemory {
  last_intent?: string;
  recent_intents?: string[];
  intent_history?: { intent: string; timestamp: string }[];
  last_response_type?: string;
  recommendation_history?: RecommendationHistory;
  conversation_reset_count?: number;
  guest_name?: string;
}

export interface RecommendationHistory {
  food_recommendations?: string[];
  activities?: string[];
  grocery_stores?: string[];
  last_recommendation_type?: string;
  last_recommendation_timestamp?: string;
  avoided_recommendations?: string[];
  specific_places_mentioned?: string[];
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

    // Preserve guest name
    if (existingContext?.guest_name) {
      memory.guest_name = existingContext.guest_name;
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

    // Track recommendations with better detail
    if (recommendationData) {
      if (!memory.recommendation_history) {
        memory.recommendation_history = {};
      }
      
      const recType = recommendationData.type;
      const content = recommendationData.content;
      
      // Extract specific place names from content for tracking
      const placeNames = this.extractPlaceNames(content);
      
      if (recType === 'ask_food_recommendations') {
        if (!memory.recommendation_history.food_recommendations) {
          memory.recommendation_history.food_recommendations = [];
        }
        memory.recommendation_history.food_recommendations.push(content);
      } else if (recType === 'ask_activities') {
        if (!memory.recommendation_history.activities) {
          memory.recommendation_history.activities = [];
        }
        memory.recommendation_history.activities.push(content);
      } else if (recType === 'ask_grocery_stores') {
        if (!memory.recommendation_history.grocery_stores) {
          memory.recommendation_history.grocery_stores = [];
        }
        memory.recommendation_history.grocery_stores.push(content);
      }
      
      // Track specific places mentioned
      if (placeNames.length > 0) {
        if (!memory.recommendation_history.specific_places_mentioned) {
          memory.recommendation_history.specific_places_mentioned = [];
        }
        memory.recommendation_history.specific_places_mentioned.push(...placeNames);
        
        // Keep only unique places and limit to last 20
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
    
    // Clear recommendation history but preserve guest info and basic context
    const clearedContext = {
      // Preserve essential info
      guest_name: guestName || existingContext?.guest_name,
      property_id: existingContext?.property_id,
      property_confirmed: existingContext?.property_confirmed,
      
      // Reset conversation state
      last_intent: 'conversation_reset',
      recent_intents: ['conversation_reset'],
      recommendation_history: {}, // Clear all previous recommendations
      conversation_reset_count: resetCount,
      conversation_depth: 0,
      last_interaction: new Date().toISOString(),
      last_response_type: 'reset_response'
    };

    // Generate contextual reset response with variety
    const response = this.generateResetResponse(guestName, resetCount);

    return { context: clearedContext, response };
  }

  private static generateResetResponse(guestName?: string, resetCount?: number): string {
    const namePrefix = guestName ? `${guestName}, ` : '';
    
    const responses = [
      `${namePrefix}no problem! What would you like to explore instead? I can help with dining, activities, local spots, or property details.`,
      `${namePrefix}let's try something different! Are you looking for restaurants, things to do, or information about your stay?`,
      `${namePrefix}sure thing! What can I help you with? Dining options, local activities, or property information?`,
      `${namePrefix}of course! What would you like to know about? Food, activities, or details about your stay?`,
      `${namePrefix}happy to start fresh! What are you in the mood for - food recommendations, things to do, or property info?`,
      `${namePrefix}absolutely! Let me know what you'd like help with - restaurants, activities, or anything about your stay.`
    ];

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
    if (!context?.recommendation_history) return '';
    
    const history = context.recommendation_history;
    const contextParts = [];

    // Build context about previous recommendations
    if (history.specific_places_mentioned?.length > 0) {
      const places = history.specific_places_mentioned.slice(-5); // Last 5 places
      contextParts.push(`Previously mentioned: ${places.join(', ')}`);
    }

    if (history.food_recommendations?.length > 0) {
      contextParts.push(`Food recommendations given: ${history.food_recommendations.length} times`);
    }
    
    if (history.activities?.length > 0) {
      contextParts.push(`Activities suggested: ${history.activities.length} times`);
    }

    if (history.last_recommendation_type) {
      contextParts.push(`Last type: ${history.last_recommendation_type}`);
    }

    return contextParts.length > 0 ? `Previous context: ${contextParts.join('. ')}.` : '';
  }

  private static extractPlaceNames(content: string): string[] {
    // Simple extraction of likely place names (capitalized words/phrases)
    const placeMatches = content.match(/[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*(?:\s+\([^)]+\))?/g) || [];
    
    // Filter out common words that aren't places
    const commonWords = ['The', 'And', 'Or', 'At', 'In', 'On', 'For', 'With', 'From', 'To'];
    
    return placeMatches.filter(match => 
      !commonWords.includes(match) && 
      match.length > 2 && 
      !match.includes('★') // Exclude star ratings
    ).slice(0, 3); // Limit to 3 places per recommendation
  }
}
