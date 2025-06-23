
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
    
    // Use a single, consistent response template to avoid confusion
    let response: string;
    
    if (hasHistory) {
      // When we have previous recommendations, emphasize variety
      response = `${namePrefix}no problem! Let's explore some completely different options. What would you like to try - different dining spots, activities, or local gems?`;
    } else {
      // Standard reset response - consistent and helpful
      response = `${namePrefix}no problem! What would you like to explore? I can help with dining, activities, local spots, or property details.`;
    }
    
    console.log('✅ Generated consistent reset response:', response);
    return response;
  }

  static clearRecommendationHistory(context: any): any {
    console.log('🧹 ResetHandler.clearRecommendationHistory called');
    
    try {
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
      
      console.log('✅ Successfully cleared context:', clearedContext);
      return clearedContext;
    } catch (error) {
      console.error('❌ Error clearing recommendation history:', error);
      // Return a safe default context
      return {
        recommendation_history: {},
        recent_intents: ['conversation_reset'],
        last_intent: 'conversation_reset',
        conversation_depth: 0,
        last_interaction: new Date().toISOString(),
        last_response_type: 'reset_response',
        global_recommendation_blacklist: []
      };
    }
  }
}
