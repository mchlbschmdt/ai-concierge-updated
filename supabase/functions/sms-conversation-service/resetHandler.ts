
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

  static generateResetResponse(): string {
    console.log('🔄 ResetHandler.generateResetResponse called');
    
    // Use a single, consistent response template asking for property code
    const response = "No problem! I've reset our conversation. Please send me your property code to get started.";
    
    console.log('✅ Generated consistent reset response:', response);
    return response;
  }

  static getCompleteResetUpdates(context: any): any {
    console.log('🧹 ResetHandler.getCompleteResetUpdates called');
    
    try {
      // Preserve global blacklist but clear everything else for a complete reset
      const globalBlacklist = context?.global_recommendation_blacklist || [];
      
      const resetUpdates = {
        conversation_state: 'awaiting_property_id',
        property_id: null,
        property_confirmed: false,
        guest_name: null,
        conversation_context: {
          recommendation_history: {},
          recent_intents: ['conversation_reset'],
          last_intent: 'conversation_reset',
          conversation_depth: 0,
          last_interaction: new Date().toISOString(),
          last_response_type: 'reset_response',
          global_recommendation_blacklist: globalBlacklist,
          reset_count: (context?.reset_count || 0) + 1
        },
        last_recommendations: null,
        last_message_type: null
      };
      
      console.log('✅ Successfully prepared complete reset updates:', resetUpdates);
      return resetUpdates;
    } catch (error) {
      console.error('❌ Error preparing reset updates:', error);
      // Return a safe default reset state
      return {
        conversation_state: 'awaiting_property_id',
        property_id: null,
        property_confirmed: false,
        guest_name: null,
        conversation_context: {
          recommendation_history: {},
          recent_intents: ['conversation_reset'],
          last_intent: 'conversation_reset',
          conversation_depth: 0,
          last_interaction: new Date().toISOString(),
          last_response_type: 'reset_response',
          global_recommendation_blacklist: [],
          reset_count: 1
        },
        last_recommendations: null,
        last_message_type: null
      };
    }
  }
}
