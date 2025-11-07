
export interface ConversationTopic {
  intent: string;
  details: Record<string, any>;
  timestamp: string;
  followUpSuggestions?: string[];
}

export interface ConversationFlow {
  currentTopic?: ConversationTopic;
  recentTopics: ConversationTopic[];
  awaitingFollowUp?: string;
  conversationDepth: number;
  lastSpecificResponse?: string;
}

export class ConversationContextTracker {
  static updateConversationFlow(
    existingContext: any,
    intent: string,
    messageContent: string,
    responseGiven: string | string[]
  ): ConversationFlow {
    // Normalize to string at the top
    const responseText = Array.isArray(responseGiven) ? responseGiven.join(' ') : responseGiven;
    
    const context = existingContext || {};
    const now = new Date().toISOString();
    
    const newTopic: ConversationTopic = {
      intent,
      details: this.extractDetailsFromMessage(messageContent, intent),
      timestamp: now,
      followUpSuggestions: this.getFollowUpSuggestions(intent)
    };

    const flow: ConversationFlow = {
      currentTopic: newTopic,
      recentTopics: [
        ...(context.recentTopics || []).slice(-4), // Keep last 4 topics
        newTopic
      ],
      conversationDepth: (context.conversationDepth || 0) + 1,
      lastSpecificResponse: responseText,
      awaitingFollowUp: this.determineAwaitingFollowUp(intent, responseText)
    };

    return flow;
  }

  static detectFollowUpIntent(message: string, conversationFlow: ConversationFlow): string | null {
    const lowerMessage = message.toLowerCase().trim();
    
    if (!conversationFlow.currentTopic) return null;

    const lastIntent = conversationFlow.currentTopic.intent;
    const lastResponse = conversationFlow.lastSpecificResponse || '';
    
    // Enhanced distance and restaurant-specific follow-up detection
    if (this.isDistanceQuestion(lowerMessage)) {
      return 'ask_distance_followup';
    }
    
    // Enhanced restaurant name recognition from previous recommendations
    if (this.isRestaurantSpecificQuestion(lowerMessage, lastResponse)) {
      return 'ask_restaurant_followup';
    }
    
    // Check for common follow-up patterns
    const followUpPatterns: Record<string, string[]> = {
      'ask_checkin_time': [
        'early', 'before', 'earlier', 'sooner', 'contact', 'who', 'how'
      ],
      'ask_wifi': [
        'not working', 'cant connect', 'trouble', 'help', 'password wrong'
      ],
      'ask_parking': [
        'where exactly', 'which spot', 'how do i', 'contact', 'full'
      ],
      'ask_food_recommendations': [
        'directions', 'how to get', 'reservation', 'hours', 'contact', 'phone',
        'how far', 'distance', 'drive to', 'walk to', 'close', 'near'
      ]
    };

    const patterns = followUpPatterns[lastIntent];
    if (patterns && patterns.some(pattern => lowerMessage.includes(pattern))) {
      return `${lastIntent}_followup`;
    }

    // Generic follow-up questions (more restrictive)
    if (this.isGenericFollowUp(lowerMessage)) {
      return `${lastIntent}_generic_followup`;
    }

    return null;
  }
  
  private static isDistanceQuestion(message: string): boolean {
    const distancePatterns = [
      'how far away is', 'how far is', 'distance to', 'distance from',
      'how close is', 'how long to get to', 'walk to', 'drive to',
      'far away is', 'close to', 'near to'
    ];
    
    return distancePatterns.some(pattern => message.includes(pattern));
  }
  
  private static isRestaurantSpecificQuestion(message: string, lastResponse: string): boolean {
    // Extract restaurant names from the last response
    const restaurantNames = this.extractRestaurantNames(lastResponse);
    
    // Check if the message mentions any of these restaurants
    for (const name of restaurantNames) {
      if (message.toLowerCase().includes(name.toLowerCase())) {
        return true;
      }
    }
    
    // Check for generic restaurant references
    const restaurantReferences = [
      'that restaurant', 'the restaurant', 'that place', 'the place',
      'there', 'it', 'them', 'this place', 'that spot'
    ];
    
    return restaurantReferences.some(ref => message.includes(ref));
  }
  
  private static extractRestaurantNames(response: string | string[]): string[] {
    // Type guard: convert array to string if needed
    const responseText = Array.isArray(response) ? response.join(' ') : response;
    if (typeof responseText !== 'string') return [];
    
    const names: string[] = [];
    
    // Common restaurant name patterns
    const patterns = [
      /([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\s+(?:Restaurant|Cafe|Bistro|Bar|Grill)/gi,
      /(?:Try|Visit|Check out)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/gi,
      /\b([A-Z][a-z]+(?:'s)?(?:\s+[A-Z][a-z]+)*)\s+(?:is|offers|serves|has)/gi
    ];
    
    patterns.forEach(pattern => {
      const matches = responseText.match(pattern);
      if (matches) {
        matches.forEach(match => {
          const nameMatch = match.match(/([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/);
          if (nameMatch) {
            names.push(nameMatch[1]);
          }
        });
      }
    });
    
    // Also look for specific restaurant names mentioned
    const commonNames = ['coopershawk', 'cooper hawk', 'paddlefish', 'homecomin', 'boathouse', 'wharf'];
    commonNames.forEach(name => {
      if (responseText.toLowerCase().includes(name)) {
        names.push(name);
      }
    });
    
    return [...new Set(names)]; // Remove duplicates
  }

  private static isGenericFollowUp(message: string): boolean {
    // Only catch truly vague/generic follow-ups, not specific questions
    const genericFollowUps = [
      'what about', 'tell me more', 'more info', 'anything else',
      'what else', 'can you help', 'help me', 'and what about'
    ];
    
    // Don't treat specific questions as generic follow-ups
    const specificQuestionWords = ['where do i', 'how do i', 'what is', 'when is', 'who is'];
    if (specificQuestionWords.some(phrase => message.includes(phrase))) {
      return false;
    }
    
    return genericFollowUps.some(phrase => message.includes(phrase));
  }

  private static extractDetailsFromMessage(message: string, intent: string): Record<string, any> {
    const details: Record<string, any> = {};
    
    // Extract time references
    const timeWords = ['early', 'late', 'morning', 'afternoon', 'evening', 'tonight'];
    timeWords.forEach(word => {
      if (message.toLowerCase().includes(word)) {
        details.timeReference = word;
      }
    });

    // Extract urgency
    const urgencyWords = ['urgent', 'asap', 'quickly', 'soon', 'now'];
    if (urgencyWords.some(word => message.toLowerCase().includes(word))) {
      details.urgency = 'high';
    }
    
    // Extract restaurant names or specific places mentioned
    if (intent.includes('food') || intent.includes('restaurant')) {
      const restaurantMentions = this.extractRestaurantNames(message);
      if (restaurantMentions.length > 0) {
        details.restaurantNames = restaurantMentions;
      }
    }
    
    // Extract distance-related context
    if (message.toLowerCase().includes('far') || message.toLowerCase().includes('distance')) {
      details.askingDistance = true;
    }

    return details;
  }

  private static getFollowUpSuggestions(intent: string): string[] {
    const suggestions: Record<string, string[]> = {
      'ask_checkin_time': ['early check-in options', 'property contact info'],
      'ask_wifi': ['connection troubleshooting', 'alternative networks'],
      'ask_parking': ['exact location', 'overflow parking'],
      'ask_food_recommendations': ['directions to restaurant', 'reservation help']
    };

    return suggestions[intent] || [];
  }

  private static determineAwaitingFollowUp(intent: string, response: string | any): string | undefined {
    // Ensure response is a string before processing
    const responseText = typeof response === 'string' ? response : JSON.stringify(response);
    
    // If response mentions contacting someone, expect follow-up about contact details
    if (responseText.toLowerCase().includes('contact') && !responseText.includes('phone') && !responseText.includes('@')) {
      return 'contact_details';
    }

    // If response mentions a location without specific directions
    if ((responseText.includes('restaurant') || responseText.includes('store')) && !responseText.includes('address')) {
      return 'location_details';
    }

    return undefined;
  }
}
