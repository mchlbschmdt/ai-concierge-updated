export interface ConversationMemory {
  last_intent?: string;
  recent_intents?: string[];
  intent_history?: { intent: string; timestamp: string }[];
  last_response_type?: string;
  recommendation_history?: RecommendationHistory;
  conversation_reset_count?: number;
}

export interface RecommendationHistory {
  food_recommendations?: string[];
  activities?: string[];
  last_recommendation_type?: string;
  last_recommendation_timestamp?: string;
  avoided_recommendations?: string[];
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

    // Track recommendations
    if (recommendationData) {
      if (!memory.recommendation_history) {
        memory.recommendation_history = {};
      }
      
      const recType = recommendationData.type;
      if (recType === 'food_recommendations') {
        if (!memory.recommendation_history.food_recommendations) {
          memory.recommendation_history.food_recommendations = [];
        }
        memory.recommendation_history.food_recommendations.push(recommendationData.content);
      } else if (recType === 'activities') {
        if (!memory.recommendation_history.activities) {
          memory.recommendation_history.activities = [];
        }
        memory.recommendation_history.activities.push(recommendationData.content);
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
    const memory: ConversationMemory = existingContext || {};
    const resetCount = (memory.conversation_reset_count || 0) + 1;
    
    // Clear recommendation history but keep guest info
    const clearedContext = {
      ...existingContext,
      last_intent: 'conversation_reset',
      recent_intents: ['conversation_reset'],
      recommendation_history: {},
      conversation_reset_count: resetCount,
      conversation_depth: 0,
      last_interaction: new Date().toISOString()
    };

    // Generate contextual reset response
    const namePrefix = guestName ? `${guestName}, ` : '';
    const responses = [
      `${namePrefix}no problem! What would you like to explore instead? I can help with dining, activities, local spots, or property details.`,
      `${namePrefix}let's try something different! Are you looking for restaurants, things to do, or information about your stay?`,
      `${namePrefix}sure thing! What can I help you with? Dining options, local activities, or property information?`,
      `${namePrefix}of course! What would you like to know about? Food, activities, or details about your stay?`
    ];

    const response = responses[Math.floor(Math.random() * responses.length)];

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
    if (!context?.recommendation_history) return '';
    
    const history = context.recommendation_history;
    const contextParts = [];

    if (history.food_recommendations?.length > 0) {
      contextParts.push(`Previously recommended restaurants: ${history.food_recommendations.join(', ')}`);
    }
    
    if (history.activities?.length > 0) {
      contextParts.push(`Previously suggested activities: ${history.activities.join(', ')}`);
    }

    if (history.last_recommendation_type) {
      contextParts.push(`Last recommendation type: ${history.last_recommendation_type}`);
    }

    return contextParts.length > 0 ? `Previous conversation context: ${contextParts.join('. ')}.` : '';
  }
}
