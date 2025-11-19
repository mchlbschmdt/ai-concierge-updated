/**
 * Request Type Classifier
 * Determines whether a request is:
 * - INFORMATION: User wants to know something (e.g., "What's the WiFi?")
 * - ACTION: User wants something done (e.g., "Turn on pool heat", "Book amenity access")
 * - GENERAL_KNOWLEDGE: User wants info not specific to property (e.g., "Disney hours", "Best time to visit")
 */

export type RequestType = 'INFORMATION' | 'ACTION' | 'GENERAL_KNOWLEDGE';

export interface RequestClassification {
  type: RequestType;
  requiresHostContact: boolean;
  shouldUseAI: boolean;
  confidence: number;
}

export class RequestTypeClassifier {
  /**
   * Classify the type of request based on the message content and detected intent
   */
  static classify(message: string, intent: string): RequestClassification {
    const lowerMsg = message.toLowerCase();

    // ACTION: Service requests that require host coordination
    if (this.isActionRequest(lowerMsg, intent)) {
      return {
        type: 'ACTION',
        requiresHostContact: true,
        shouldUseAI: false,
        confidence: 0.95
      };
    }

    // GENERAL_KNOWLEDGE: Queries about external entities (theme parks, restaurants, general area)
    if (this.isGeneralKnowledgeQuery(lowerMsg, intent)) {
      return {
        type: 'GENERAL_KNOWLEDGE',
        requiresHostContact: false,
        shouldUseAI: true,
        confidence: 0.93
      };
    }

    // INFORMATION: Property-specific information requests (default)
    return {
      type: 'INFORMATION',
      requiresHostContact: false,
      shouldUseAI: false,
      confidence: 0.90
    };
  }

  /**
   * Detect if this is an action request requiring coordination
   */
  private static isActionRequest(message: string, intent: string): boolean {
    // Intent-based detection
    if (intent.startsWith('request_')) {
      return true;
    }

    // Action keywords with property elements
    const actionKeywords = [
      /\b(turn on|activate|enable|start|heat)\s+(the\s+)?pool/i,
      /\b(pay for|add|want|need|book)\s+(the\s+)?(pool heat|heated pool)/i,
      /\b(book|access|use|want to use|need access|get access to)\s+(the\s+)?(waterpark|water park|gym|golf|resort amenities)/i,
      /\b(schedule|arrange|want|need|book)\s+(grocery|groceries|chef|massage|cleaning)/i,
      /\bcan you (turn|activate|enable|book|schedule|arrange)/i,
      /\bI want to (turn|activate|book|use|access)/i,
      /\bplease (turn|activate|enable|book)/i
    ];

    return actionKeywords.some(pattern => pattern.test(message));
  }

  /**
   * Detect if this is a general knowledge query (not property-specific)
   */
  private static isGeneralKnowledgeQuery(message: string, intent: string): boolean {
    // Intent-based detection
    if (intent === 'ask_general_knowledge') {
      return true;
    }

    // General knowledge patterns
    const generalKnowledgePatterns = [
      // Theme park hours and schedules
      /\b(disney|disneyland|magic kingdom|epcot|hollywood studios|animal kingdom)\s+(park\s+)?(hours?|times?|schedule|open|close)/i,
      /\b(universal|islands of adventure|volcano bay)\s+(park\s+)?(hours?|times?|schedule|open|close)/i,
      /\bwhat time does (disney|universal|the park)/i,
      /\bwhen does (disney|universal|the park) (open|close)/i,
      
      // Ticket purchasing
      /\b(buy|purchase|get|where to buy)\s+(disney|universal|park|theme park)?\s*tickets?/i,
      /\bticket prices?\s+(for|to)\s+(disney|universal)/i,
      /\bhow (much|to get|to buy)\s+(disney|universal)?\s*tickets?/i,
      
      // Best time to visit / crowd info
      /\bbest (time|day|month)\s+to (visit|go to)\s+(disney|universal|the parks?)/i,
      /\bhow busy is (disney|universal|the park)/i,
      /\b(crowd|wait time)s?\s+(at|for|calendar)\s+(disney|universal)/i,
      /\b(least|most) crowded (time|day|month)/i,
      
      // General area dining and attractions
      /\b(restaurants?|dining|places to eat)\s+(in|near|around)\s+(orlando|kissimmee|the area)/i,
      /\b(things to do|attractions|activities)\s+(in|near|around)\s+(orlando|kissimmee|the area)/i,
      /\bbest (restaurants?|places to eat)\s+(in|near)\s+orlando/i,
      
      // Weather (general area, not property-specific)
      /\bweather\s+(in|near|around)\s+(orlando|florida)/i,
      /\bwhat'?s the weather like in (orlando|florida)/i
    ];

    return generalKnowledgePatterns.some(pattern => pattern.test(message));
  }

  /**
   * Get a human-readable description of the request type
   */
  static getTypeDescription(type: RequestType): string {
    switch (type) {
      case 'ACTION':
        return 'Service request requiring host coordination';
      case 'GENERAL_KNOWLEDGE':
        return 'General knowledge query (external to property)';
      case 'INFORMATION':
        return 'Property-specific information request';
      default:
        return 'Unknown request type';
    }
  }
}
