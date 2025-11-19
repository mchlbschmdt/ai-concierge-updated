export interface ParsedQuery {
  originalMessage: string;
  queries: QueryComponent[];
  isMultiQuery: boolean;
  acknowledgmentMessage: string;
}

export interface QueryComponent {
  type: 'food' | 'activities' | 'amenities' | 'transport' | 'property_info' | 'emergency' | 'general';
  intent: string;
  text: string;
  keywords: string[];
  priority: number; // 1 = highest, 3 = lowest
}

export class MultiQueryParser {
  /**
   * Parses a message to detect multiple queries and prioritize them
   */
  static parseMessage(message: string): ParsedQuery {
    const lowerMessage = message.toLowerCase();
    const queries: QueryComponent[] = [];
    
    // Define query patterns with their intents and priorities
    const queryPatterns = [
      // High priority - Emergency/Property specific
      {
        patterns: ['emergency', 'maintenance', 'problem', 'broken', 'not working', 'contact', 'help'],
        type: 'emergency' as const,
        intent: 'ask_emergency_contact',
        priority: 1
      },
      {
        patterns: ['amenities', 'pool', 'hot tub', 'game room', 'gym', 'facilities'],
        type: 'amenities' as const,
        intent: 'ask_property_specific',
        priority: 1
      },
      {
        patterns: ['checkout', 'check out', 'check-out', 'leaving', 'departure'],
        type: 'property_info' as const,
        intent: 'ask_checkout_time',
        priority: 1
      },
      
      // Medium priority - Food and activities
      {
        patterns: ['breakfast', 'lunch', 'dinner', 'food', 'restaurant', 'eat', 'dining', 'meal'],
        type: 'food' as const,
        intent: 'ask_food_recommendations',
        priority: 2
      },
      {
        patterns: ['coffee', 'cafe', 'coffee shop', 'espresso', 'latte'],
        type: 'food' as const,
        intent: 'ask_coffee_recommendations',
        priority: 2
      },
      {
        patterns: ['activities', 'attractions', 'things to do', 'family-friendly', 'theme parks', 'entertainment'],
        type: 'activities' as const,
        intent: 'ask_activities',
        priority: 2
      },
      
      // Lower priority - Transport and general
      {
        patterns: ['grocery', 'groceries', 'supermarket', 'shopping', 'publix', 'aldi'],
        type: 'transport' as const,
        intent: 'ask_grocery',
        priority: 3
      },
      {
        patterns: ['transportation', 'uber', 'taxi', 'shuttle', 'getting around', 'no car'],
        type: 'transport' as const,
        intent: 'ask_transportation_no_car',
        priority: 3
      },
      {
        patterns: ['garbage', 'trash', 'recycling'],
        type: 'property_info' as const,
        intent: 'ask_garbage',
        priority: 3
      }
    ];
    
    // Check each pattern against the message using word boundary matching
    queryPatterns.forEach(pattern => {
      const matchedKeywords = pattern.patterns.filter(keyword => {
        // Use word boundaries to match complete words only to prevent false positives
        // (e.g., "heat" should not match "eat", "theater" should not match "eat")
        const escapedKeyword = keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const wordBoundaryRegex = new RegExp(`\\b${escapedKeyword}\\b`, 'i');
        return wordBoundaryRegex.test(lowerMessage);
      });
      
      if (matchedKeywords.length > 0) {
        // Extract the relevant portion of the message
        const queryText = this.extractQueryText(message, matchedKeywords);
        
        queries.push({
          type: pattern.type,
          intent: pattern.intent,
          text: queryText,
          keywords: matchedKeywords,
          priority: pattern.priority
        });
      }
    });
    
    // Remove duplicates and sort by priority
    const uniqueQueries = this.deduplicateQueries(queries);
    uniqueQueries.sort((a, b) => a.priority - b.priority);
    
    // Only trigger multi-query if we have strong signals (multiple keywords or high priority)
    const strongMatches = uniqueQueries.filter(q => 
      q.keywords.length >= 2 || // Multiple matching keywords
      q.priority === 1 // Or high-priority intent
    );
    
    const isMultiQuery = strongMatches.length > 1 || 
                        (uniqueQueries.length > 1 && strongMatches.length >= 1);
    
    return {
      originalMessage: message,
      queries: isMultiQuery ? strongMatches : uniqueQueries,
      isMultiQuery,
      acknowledgmentMessage: this.generateAcknowledgment(isMultiQuery ? strongMatches : uniqueQueries, isMultiQuery)
    };
  }
  
  /**
   * Extracts the relevant portion of text for a specific query
   */
  private static extractQueryText(message: string, keywords: string[]): string {
    // For now, return the full message. Could be enhanced to extract specific portions
    return message;
  }
  
  /**
   * Removes duplicate queries of the same type
   */
  private static deduplicateQueries(queries: QueryComponent[]): QueryComponent[] {
    const seen = new Set<string>();
    return queries.filter(query => {
      const key = `${query.type}-${query.intent}`;
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });
  }
  
  /**
   * Generates an acknowledgment message for the queries
   */
  private static generateAcknowledgment(queries: QueryComponent[], isMultiQuery: boolean): string {
    if (queries.length === 0) {
      return "I'm looking into that for you!";
    }
    
    if (!isMultiQuery) {
      const query = queries[0];
      return this.getSingleQueryAcknowledgment(query.type);
    }
    
    // Multi-query acknowledgment - keep it concise!
    const queryTypes = queries.map(q => this.getQueryTypeDescription(q.type));
    
    if (queryTypes.length === 2) {
      return `Happy to help with both! Let me start with ${queryTypes[0]}...`;
    } else if (queryTypes.length > 2) {
      const lastType = queryTypes.pop();
      return `Happy to help with all that! Starting with ${queryTypes[0]}...`;
    }
    
    return "Got it! Let me find all that for you...";
  }
  
  /**
   * Gets acknowledgment for a single query type
   */
  private static getSingleQueryAcknowledgment(type: QueryComponent['type']): string {
    const acknowledgments = {
      emergency: "I'll get you the emergency contact information right away!",
      amenities: "Let me get the details about our amenities for you!",
      property_info: "I'll look up that property information for you!",
      food: "I'm finding great dining options for you!",
      activities: "I'm looking up fun activities and attractions in the area!",
      transport: "I'll get you transportation and shopping information!",
      general: "I'm looking into that for you!"
    };
    
    return acknowledgments[type] || acknowledgments.general;
  }
  
  /**
   * Gets a description for a query type
   */
  private static getQueryTypeDescription(type: QueryComponent['type']): string {
    const descriptions = {
      emergency: "emergency contacts",
      amenities: "property amenities",
      property_info: "property information",
      food: "dining recommendations",
      activities: "local attractions",
      transport: "transportation options",
      general: "your questions"
    };
    
    return descriptions[type] || "your request";
  }
  
  /**
   * Checks if a message should trigger immediate acknowledgment
   */
  static needsImmediateAcknowledgment(message: string): boolean {
    const urgentKeywords = [
      'emergency', 'urgent', 'help', 'problem', 'broken', 'not working',
      'maintenance', 'issue', 'asap', 'right now', 'immediately'
    ];
    
    const lowerMessage = message.toLowerCase();
    return urgentKeywords.some(keyword => lowerMessage.includes(keyword));
  }
}