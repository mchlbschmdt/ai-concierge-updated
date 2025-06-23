
export class ResetHandler {
  static isResetCommand(message: string): boolean {
    const lowerMessage = message.toLowerCase().trim();
    const resetKeywords = [
      'reset', 'restart', 'start over', 'something else', 'different options',
      'what else', 'other recommendations', 'try again', 'nevermind',
      'change topic', 'something different', 'new suggestions', 'new recommendation',
      'different recommendation', 'other options', 'start fresh', 'clear'
    ];
    
    // Check for exact word matches using word boundaries
    return resetKeywords.some(keyword => {
      if (keyword.includes(' ')) {
        // Multi-word phrases - check if the entire phrase exists
        return lowerMessage.includes(keyword);
      } else {
        // Single words - use word boundary regex for exact matches
        const wordRegex = new RegExp(`\\b${keyword}\\b`);
        return wordRegex.test(lowerMessage);
      }
    });
  }

  static generateResetResponse(guestName?: string, resetCount?: number): string {
    const namePrefix = guestName ? `${guestName}, ` : '';
    const responses = [
      `${namePrefix}no problem! What would you like to explore instead? I can help with dining, activities, local spots, or property details.`,
      `${namePrefix}let's try something different! Are you looking for restaurants, things to do, or information about your stay?`,
      `${namePrefix}sure thing! What can I help you with? Dining options, local activities, or property information?`,
      `${namePrefix}of course! What would you like to know about? Food, activities, or details about your stay?`,
      `${namePrefix}happy to start fresh! What are you in the mood for - food recommendations, things to do, or property info?`,
      `${namePrefix}absolutely! Let me know what you'd like help with - restaurants, activities, or anything about your stay.`
    ];

    // Use reset count to ensure variety
    const responseIndex = (resetCount || 0) % responses.length;
    return responses[responseIndex];
  }

  static clearRecommendationHistory(context: any): any {
    return {
      ...context,
      recommendation_history: {},
      recent_intents: ['conversation_reset'],
      last_intent: 'conversation_reset',
      conversation_depth: 0,
      last_interaction: new Date().toISOString(),
      last_response_type: 'reset_response'
    };
  }
}
