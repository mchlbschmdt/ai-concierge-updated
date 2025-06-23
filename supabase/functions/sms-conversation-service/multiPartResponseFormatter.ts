
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
    const responses: string[] = [];
    const namePrefix = guestName ? `${guestName}, ` : '';

    intents.forEach((intent, index) => {
      let response = '';
      
      // Check property data first
      if (propertyResponses.has(intent)) {
        response = propertyResponses.get(intent)!;
      } else if (openAIResponses.has(intent)) {
        response = openAIResponses.get(intent)!;
      }

      if (response) {
        // Remove duplicate name prefix for subsequent responses
        if (index > 0 && response.startsWith(namePrefix)) {
          response = response.substring(namePrefix.length);
        }
        responses.push(response);
      }
    });

    const helpOffer = this.generateHelpOffer(intents);
    
    return { responses, helpOffer };
  }

  private static generateHelpOffer(intents: string[]): string {
    const offers = [
      "Need anything else while you're planning?",
      "Want directions to any of these places?",
      "Can I help you with anything else?",
      "Anything else I can assist with?"
    ];

    // Context-aware help offers
    if (intents.includes('ask_food_recommendations') || intents.includes('ask_grocery_stores')) {
      return "Want directions to any of these places?";
    }
    
    if (intents.includes('ask_checkout_time')) {
      return "Need help with luggage storage or transport arrangements?";
    }

    return offers[Math.floor(Math.random() * offers.length)];
  }

  static combineResponses(multiPartResponse: MultiPartResponse, guestName?: string): string {
    const { responses, helpOffer } = multiPartResponse;
    
    if (responses.length === 0) {
      return `${guestName ? `${guestName}, ` : ''}I'd be happy to help! Could you clarify what you're looking for?`;
    }

    if (responses.length === 1) {
      return `${responses[0]}\n\n${helpOffer}`;
    }

    // Multiple responses - format as numbered list
    const formattedResponses = responses.map((response, index) => {
      // Remove any existing help offers from individual responses
      const cleanResponse = response.replace(/\n\n(Need|Want|Can I|Anything).*\?$/g, '');
      return cleanResponse;
    });

    return `${formattedResponses.join('\n\n')}\n\n${helpOffer}`;
  }
}
