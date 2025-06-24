
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
    
    // Enhanced reset response with Hostly branding and more information
    const response = "Hi! I'm your Hostly AI Concierge. I can help with property info, local recommendations, and more! To get started, please send me your property code (the numbers from your booking confirmation).";
    
    console.log('✅ Generated enhanced reset response:', response);
    return response;
  }

  static getCompleteResetUpdates(context: any): any {
    console.log('🧹 ResetHandler.getCompleteResetUpdates called');
    
    try {
      // Preserve only essential cross-session data, clear everything else
      const globalBlacklist = context?.global_recommendation_blacklist || [];
      
      const resetUpdates = {
        conversation_state: 'awaiting_property_id',
        property_id: null,
        property_confirmed: false,
        conversation_context: {
          recommendation_history: {}, // Clear all recommendation history
          recent_intents: ['conversation_reset'],
          last_intent: 'conversation_reset',
          conversation_depth: 0,
          last_interaction: new Date().toISOString(),
          last_response_type: 'reset_response',
          global_recommendation_blacklist: globalBlacklist,
          reset_count: (context?.reset_count || 0) + 1,
          pending_property: null,
          guest_name: null
        },
        last_recommendations: null, // Clear cached recommendations
        last_message_type: null
      };
      
      console.log('✅ Successfully prepared complete reset updates with cleared recommendation history:', resetUpdates);
      return resetUpdates;
    } catch (error) {
      console.error('❌ Error preparing reset updates:', error);
      // Return a safe default reset state
      return {
        conversation_state: 'awaiting_property_id',
        property_id: null,
        property_confirmed: false,
        conversation_context: {
          recommendation_history: {},
          recent_intents: ['conversation_reset'],
          last_intent: 'conversation_reset',
          conversation_depth: 0,
          last_interaction: new Date().toISOString(),
          last_response_type: 'reset_response',
          global_recommendation_blacklist: [],
          reset_count: 1,
          pending_property: null,
          guest_name: null
        },
        last_recommendations: null,
        last_message_type: null
      };
    }
  }

  // Add method to clear specific phone number's conversation memory
  static async clearConversationMemory(supabase: any, phoneNumber: string): Promise<void> {
    console.log('🧹 Clearing conversation memory for phone number:', phoneNumber);
    
    try {
      const resetUpdates = {
        conversation_state: 'property_confirmed', // Keep property confirmed if they had one
        conversation_context: {
          recommendation_history: {}, // Clear all recommendation history
          recent_intents: [],
          conversation_depth: 0,
          last_interaction: new Date().toISOString(),
          global_recommendation_blacklist: [], // Clear blacklist for fresh start
          reset_count: 0
        },
        last_recommendations: null, // Clear cached recommendations
        last_message_type: null
      };

      const { error } = await supabase
        .from('sms_conversations')
        .update(resetUpdates)
        .eq('phone_number', phoneNumber);

      if (error) {
        console.error('❌ Error clearing conversation memory:', error);
        throw error;
      }

      console.log('✅ Successfully cleared conversation memory for:', phoneNumber);
    } catch (error) {
      console.error('❌ Failed to clear conversation memory:', error);
      throw error;
    }
  }
}
