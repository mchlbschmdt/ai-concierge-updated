
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
    responseGiven: string
  ): ConversationFlow {
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
      lastSpecificResponse: responseGiven,
      awaitingFollowUp: this.determineAwaitingFollowUp(intent, responseGiven)
    };

    return flow;
  }

  static detectFollowUpIntent(message: string, conversationFlow: ConversationFlow): string | null {
    const lowerMessage = message.toLowerCase().trim();
    
    if (!conversationFlow.currentTopic) return null;

    const lastIntent = conversationFlow.currentTopic.intent;
    
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
        'directions', 'how to get', 'reservation', 'hours', 'contact', 'phone'
      ]
    };

    const patterns = followUpPatterns[lastIntent];
    if (patterns && patterns.some(pattern => lowerMessage.includes(pattern))) {
      return `${lastIntent}_followup`;
    }

    // Generic follow-up questions
    if (this.isGenericFollowUp(lowerMessage)) {
      return `${lastIntent}_generic_followup`;
    }

    return null;
  }

  private static isGenericFollowUp(message: string): boolean {
    const genericFollowUps = [
      'who do i contact', 'how do i', 'where exactly', 'what about',
      'can you help', 'more info', 'tell me more', 'how', 'where', 'when'
    ];
    
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

  private static determineAwaitingFollowUp(intent: string, response: string): string | undefined {
    // If response mentions contacting someone, expect follow-up about contact details
    if (response.toLowerCase().includes('contact') && !response.includes('phone') && !response.includes('@')) {
      return 'contact_details';
    }

    // If response mentions a location without specific directions
    if ((response.includes('restaurant') || response.includes('store')) && !response.includes('address')) {
      return 'location_details';
    }

    return undefined;
  }
}
