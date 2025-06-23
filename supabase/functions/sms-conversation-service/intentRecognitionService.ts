
export interface IntentResult {
  intent: string;
  confidence: number;
  subIntents?: string[];
  isMultiPart: boolean;
}

export class IntentRecognitionService {
  static recognizeIntent(message: string): IntentResult {
    const lowerMessage = message.toLowerCase().trim();
    
    // Multi-part detection - check for "and" patterns
    const hasMultipleParts = this.detectMultipleRequests(lowerMessage);
    
    if (hasMultipleParts) {
      const subIntents = this.parseMultipleIntents(lowerMessage);
      return {
        intent: 'ask_multiple_requests',
        confidence: 0.9,
        subIntents,
        isMultiPart: true
      };
    }

    // Single intent detection
    const singleIntent = this.detectSingleIntent(lowerMessage);
    return {
      intent: singleIntent.intent,
      confidence: singleIntent.confidence,
      isMultiPart: false
    };
  }

  private static detectMultipleRequests(message: string): boolean {
    const multiPartIndicators = [
      ' and ',
      ' & ',
      'also',
      'plus',
      'what about',
      'how about'
    ];
    
    const questionWords = ['what', 'where', 'how', 'when', 'do you know'];
    const questionCount = questionWords.filter(word => message.includes(word)).length;
    
    return multiPartIndicators.some(indicator => message.includes(indicator)) || questionCount > 1;
  }

  private static parseMultipleIntents(message: string): string[] {
    const intents: string[] = [];
    
    // Split by common separators
    const parts = message.split(/\sand\s|\s&\s|also|plus|what about|how about/)
      .map(part => part.trim())
      .filter(part => part.length > 0);
    
    parts.forEach(part => {
      const intent = this.detectSingleIntent(part);
      if (intent.intent !== 'general_inquiry') {
        intents.push(intent.intent);
      }
    });
    
    return intents.length > 0 ? intents : ['general_inquiry'];
  }

  private static detectSingleIntent(message: string): { intent: string; confidence: number } {
    // Checkout/Check-in times
    if (this.matchesKeywords(message, ['checkout', 'check out', 'check-out', 'when do i leave', 'departure time'])) {
      return { intent: 'ask_checkout_time', confidence: 0.95 };
    }
    
    if (this.matchesKeywords(message, ['checkin', 'check in', 'check-in', 'arrival time', 'when can i arrive'])) {
      return { intent: 'ask_checkin_time', confidence: 0.95 };
    }

    // WiFi
    if (this.matchesKeywords(message, ['wifi', 'wi-fi', 'internet', 'password', 'network'])) {
      return { intent: 'ask_wifi', confidence: 0.9 };
    }

    // Parking
    if (this.matchesKeywords(message, ['parking', 'park', 'car', 'vehicle', 'garage'])) {
      return { intent: 'ask_parking', confidence: 0.9 };
    }

    // Access/Entry
    if (this.matchesKeywords(message, ['access', 'entry', 'key', 'code', 'door', 'get in'])) {
      return { intent: 'ask_access', confidence: 0.9 };
    }

    // Directions
    if (this.matchesKeywords(message, ['directions', 'how to get', 'address', 'location', 'where is'])) {
      return { intent: 'ask_directions', confidence: 0.85 };
    }

    // Emergency
    if (this.matchesKeywords(message, ['emergency', 'contact', 'help', 'problem', 'issue'])) {
      return { intent: 'ask_emergency_contact', confidence: 0.9 };
    }

    // Food recommendations
    if (this.matchesKeywords(message, ['food', 'restaurant', 'eat', 'dining', 'hungry', 'meal'])) {
      return { intent: 'ask_food_recommendations', confidence: 0.85 };
    }

    // Grocery/shopping
    if (this.matchesKeywords(message, ['grocery', 'groceries', 'store', 'shopping', 'market'])) {
      return { intent: 'ask_grocery_stores', confidence: 0.85 };
    }

    // Activities/attractions
    if (this.matchesKeywords(message, ['things to do', 'activities', 'attractions', 'fun', 'sightseeing'])) {
      return { intent: 'ask_activities', confidence: 0.85 };
    }

    // Basic greetings
    if (this.matchesKeywords(message, ['hi', 'hello', 'hey', 'good morning', 'good afternoon'])) {
      return { intent: 'greeting', confidence: 0.9 };
    }

    return { intent: 'general_inquiry', confidence: 0.5 };
  }

  private static matchesKeywords(message: string, keywords: string[]): boolean {
    return keywords.some(keyword => message.includes(keyword));
  }
}
