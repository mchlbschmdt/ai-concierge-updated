
export class ResetHandler {
  static isResetCommand(message: string): boolean {
    const lowerMessage = message.toLowerCase().trim();
    const resetKeywords = [
      'reset', 'restart', 'start over', 'something else', 'different options',
      'what else', 'other recommendations', 'try again', 'nevermind',
      'change topic', 'something different', 'new suggestions'
    ];
    
    return resetKeywords.some(keyword => lowerMessage.includes(keyword));
  }

  static generateResetResponse(guestName?: string): string {
    const namePrefix = guestName ? `${guestName}, ` : '';
    const responses = [
      `${namePrefix}no problem! What would you like to explore instead? I can help with dining, activities, local spots, or property details.`,
      `${namePrefix}let's try something different! Are you looking for restaurants, things to do, or information about your stay?`,
      `${namePrefix}sure thing! What can I help you with? Dining options, local activities, or property information?`,
      `${namePrefix}of course! What would you like to know about? Food, activities, or details about your stay?`
    ];

    return responses[Math.floor(Math.random() * responses.length)];
  }

  static clearRecommendationHistory(context: any): any {
    return {
      ...context,
      recommendation_history: {},
      recent_intents: ['conversation_reset'],
      last_intent: 'conversation_reset',
      conversation_depth: 0,
      last_interaction: new Date().toISOString()
    };
  }
}
