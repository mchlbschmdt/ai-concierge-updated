
export interface MultiPartResponse {
  responses: string[];
  helpOffer: string;
}

export class MultiPartResponseFormatter {
  static formatMultiPartResponse(
    intents: string[], 
    propertyResponses: Map<string, string>, 
    openAIResponses: Map<string, string>,
    guestName?: string
  ): MultiPartResponse {
    console.log('🔍 MultiPartResponseFormatter.formatMultiPartResponse called with:', {
      intents,
      propertyResponsesSize: propertyResponses.size,
      openAIResponsesSize: openAIResponses.size,
      guestName
    });

    const responses: string[] = [];
    const namePrefix = guestName ? `${guestName}, ` : '';

    intents.forEach((intent, index) => {
      let response = '';
      
      // Check property data first
      if (propertyResponses.has(intent)) {
        response = propertyResponses.get(intent)!;
        console.log('📋 Using property response for intent:', intent);
      } else if (openAIResponses.has(intent)) {
        response = openAIResponses.get(intent)!;
        console.log('🤖 Using OpenAI response for intent:', intent);
      }

      if (response) {
        // Remove duplicate name prefix for subsequent responses
        if (index > 0 && response.startsWith(namePrefix)) {
          response = response.substring(namePrefix.length);
        }
        responses.push(response);
        console.log('✅ Added response:', response.substring(0, 50) + '...');
      } else {
        console.log('❌ No response found for intent:', intent);
      }
    });

    const helpOffer = this.generateHelpOffer(intents);
    console.log('💡 Generated help offer:', helpOffer);
    
    const result = { responses, helpOffer };
    console.log('🎯 Final MultiPartResponse:', result);
    return result;
  }

  static formatResponse(response: string): string[] {
    console.log('📝 MultiPartResponseFormatter.formatResponse called with:', response);
    
    // Simple wrapper that returns the response as an array of messages
    if (!response || response.trim() === '') {
      console.log('⚠️ Empty response, returning default message');
      return ["I'm here to help! What can I assist you with?"];
    }
    
    // Split long responses into multiple messages if needed (optional)
    const maxLength = 1600; // SMS character limit consideration
    if (response.length <= maxLength) {
      console.log('✅ Response fits in single message');
      return [response];
    }
    
    console.log('📊 Response too long, splitting into segments');
    // Split at sentence boundaries for long responses
    const sentences = response.split(/(?<=[.!?])\s+/);
    const messages: string[] = [];
    let currentMessage = '';
    
    for (const sentence of sentences) {
      if (currentMessage.length + sentence.length + 1 <= maxLength) {
        currentMessage += (currentMessage ? ' ' : '') + sentence;
      } else {
        if (currentMessage) {
          messages.push(currentMessage);
        }
        currentMessage = sentence;
      }
    }
    
    if (currentMessage) {
      messages.push(currentMessage);
    }
    
    const result = messages.length > 0 ? messages : [response];
    console.log('🎯 Final formatted messages:', result);
    return result;
  }

  private static generateHelpOffer(intents: string[]): string {
    console.log('🤝 Generating help offer for intents:', intents);
    
    const offers = [
      "Need anything else while you're planning?",
      "Want directions to any of these places?",
      "Can I help you with anything else?",
      "Anything else I can assist with?"
    ];

    // Context-aware help offers
    if (intents.includes('ask_food_recommendations') || intents.includes('ask_grocery_stores')) {
      console.log('🍽️ Food-related intent detected');
      return "Want directions to any of these places?";
    }
    
    if (intents.includes('ask_checkout_time')) {
      console.log('🛎️ Checkout intent detected');
      return "Need help with luggage storage or transport arrangements?";
    }

    const randomOffer = offers[Math.floor(Math.random() * offers.length)];
    console.log('🎲 Using random offer:', randomOffer);
    return randomOffer;
  }

  static combineResponses(multiPartResponse: MultiPartResponse, guestName?: string): string {
    console.log('🔗 MultiPartResponseFormatter.combineResponses called with:', {
      responsesCount: multiPartResponse.responses.length,
      helpOffer: multiPartResponse.helpOffer,
      guestName
    });

    const { responses, helpOffer } = multiPartResponse;
    
    if (responses.length === 0) {
      const fallback = `${guestName ? `${guestName}, ` : ''}I'd be happy to help! Could you clarify what you're looking for?`;
      console.log('📭 No responses, returning fallback:', fallback);
      return fallback;
    }

    if (responses.length === 1) {
      const single = `${responses[0]}\n\n${helpOffer}`;
      console.log('📝 Single response format:', single);
      return single;
    }

    // Multiple responses - format as numbered list
    const formattedResponses = responses.map((response, index) => {
      // Remove any existing help offers from individual responses
      const cleanResponse = response.replace(/\n\n(Need|Want|Can I|Anything).*\?$/g, '');
      return cleanResponse;
    });

    const combined = `${formattedResponses.join('\n\n')}\n\n${helpOffer}`;
    console.log('📋 Combined multiple responses:', combined);
    return combined;
  }
}
