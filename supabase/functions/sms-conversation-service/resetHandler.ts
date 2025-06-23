
export class ResetHandler {
  static isResetCommand(message: string): boolean {
    console.log('🔍 ResetHandler.isResetCommand called with:', message);
    
    const lowerMessage = message.toLowerCase().trim();
    const resetKeywords = [
      'reset', 'restart', 'start over', 'something else', 'different options',
      'what else', 'other recommendations', 'try again', 'nevermind',
      'change topic', 'something different', 'new suggestions', 'new recommendation',
      'different recommendation', 'other options', 'start fresh', 'clear',
      'different suggestions', 'other places', 'something new'
    ];
    
    // Check for exact word matches using word boundaries
    const isReset = resetKeywords.some(keyword => {
      if (keyword.includes(' ')) {
        // Multi-word phrases - check if the entire phrase exists
        return lowerMessage.includes(keyword);
      } else {
        // Single words - use word boundary regex for exact matches
        const wordRegex = new RegExp(`\\b${keyword}\\b`);
        return wordRegex.test(lowerMessage);
      }
    });
    
    console.log('🔍 Reset command detected:', isReset);
    return isReset;
  }

  static generateResetResponse(guestName?: string, resetCount?: number, hasHistory?: boolean): string {
    console.log('🔄 ResetHandler.generateResetResponse called with:', {
      guestName,
      resetCount,
      hasHistory
    });
    
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
        `${namePrefix}of course! What would you like to know about? Food, activities, or details about your stay?`,
        `${namePrefix}happy to start fresh! What are you in the mood for - food recommendations, things to do, or property info?`,
        `${namePrefix}absolutely! Let me know what you'd like help with - restaurants, activities, or anything about your stay.`
      ];
    }

    // Use reset count to ensure variety
    const responseIndex = (resetCount || 0) % responses.length;
    const selectedResponse = responses[responseIndex];
    
    console.log('✅ Generated reset response:', selectedResponse);
    return selectedResponse;
  }

  static clearRecommendationHistory(context: any): any {
    console.log('🧹 ResetHandler.clearRecommendationHistory called');
    
    // Preserve global blacklist but clear session data
    const globalBlacklist = context?.global_recommendation_blacklist || [];
    
    const clearedContext = {
      ...context,
      recommendation_history: {}, // Clear session recommendations
      recent_intents: ['conversation_reset'],
      last_intent: 'conversation_reset',
      conversation_depth: 0,
      last_interaction: new Date().toISOString(),
      last_response_type: 'reset_response',
      global_recommendation_blacklist: globalBlacklist // Preserve cross-session blacklist
    };
    
    console.log('✅ Cleared context:', clearedContext);
    return clearedContext;
  }
}
