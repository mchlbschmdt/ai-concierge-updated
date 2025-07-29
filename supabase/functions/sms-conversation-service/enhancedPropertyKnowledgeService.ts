import { Property } from './types.ts';

export interface KnowledgeSearchResult {
  found: boolean;
  content: string;
  source: 'knowledge_base' | 'property_data' | 'none';
  confidence: number;
}

export class EnhancedPropertyKnowledgeService {
  /**
   * PHASE 1: Primary search in property knowledge base with enhanced matching
   */
  static searchPropertyKnowledge(property: Property, query: string): KnowledgeSearchResult {
    console.log('🔍 Enhanced knowledge base search for:', query);
    
    // First check knowledge base
    const knowledgeResult = this.searchKnowledgeBase(property, query);
    if (knowledgeResult.found) {
      console.log('✅ Found in knowledge base:', knowledgeResult.content.substring(0, 100));
      return knowledgeResult;
    }

    // Then check structured property data
    const propertyDataResult = this.searchPropertyData(property, query);
    if (propertyDataResult.found) {
      console.log('✅ Found in property data:', propertyDataResult.content.substring(0, 100));
      return propertyDataResult;
    }

    console.log('❌ No relevant property information found');
    return { found: false, content: '', source: 'none', confidence: 0 };
  }

  /**
   * Enhanced knowledge base search with better pattern matching
   */
  private static searchKnowledgeBase(property: Property, query: string): KnowledgeSearchResult {
    if (!property.knowledge_base) {
      return { found: false, content: '', source: 'none', confidence: 0 };
    }

    const lowerQuery = query.toLowerCase();
    const knowledgeBase = property.knowledge_base;

    // Enhanced query processing
    const queryTerms = this.extractQueryTerms(lowerQuery);
    console.log('🔍 Query terms:', queryTerms);

    // Split knowledge base into logical sections
    const sections = this.extractKnowledgeSections(knowledgeBase);
    console.log('📚 Knowledge sections found:', sections.length);

    let bestMatch = { section: '', score: 0, confidence: 0 };

    for (const section of sections) {
      const score = this.calculateSectionRelevance(section, queryTerms, lowerQuery);
      if (score > bestMatch.score) {
        bestMatch = { 
          section: section.trim(), 
          score, 
          confidence: Math.min(score / queryTerms.length, 0.95) 
        };
      }
    }

    // Return match if confidence is high enough
    if (bestMatch.confidence >= 0.3) {
      return {
        found: true,
        content: this.formatKnowledgeResponse(bestMatch.section, queryTerms),
        source: 'knowledge_base',
        confidence: bestMatch.confidence
      };
    }

    return { found: false, content: '', source: 'none', confidence: 0 };
  }

  /**
   * Search structured property data (amenities, instructions, etc.)
   */
  private static searchPropertyData(property: Property, query: string): KnowledgeSearchResult {
    const lowerQuery = query.toLowerCase();
    
    // WiFi queries
    if (this.isWifiQuery(lowerQuery)) {
      if (property.wifi_name && property.wifi_password) {
        return {
          found: true,
          content: `📶 WiFi Network: "${property.wifi_name}"\nPassword: "${property.wifi_password}"`,
          source: 'property_data',
          confidence: 0.95
        };
      }
    }

    // Checkout queries
    if (this.isCheckoutQuery(lowerQuery)) {
      if (property.check_out_time || property.cleaning_instructions) {
        let content = '';
        if (property.check_out_time) {
          content += `⏰ Checkout time: ${property.check_out_time}\n`;
        }
        if (property.cleaning_instructions) {
          content += `📝 Checkout instructions: ${property.cleaning_instructions}`;
        }
        return {
          found: true,
          content: content.trim(),
          source: 'property_data',
          confidence: 0.9
        };
      }
    }

    // Emergency contact queries
    if (this.isEmergencyQuery(lowerQuery)) {
      if (property.emergency_contact) {
        return {
          found: true,
          content: `🚨 Emergency contact: ${property.emergency_contact}`,
          source: 'property_data',
          confidence: 0.95
        };
      }
    }

    // Access/entry queries
    if (this.isAccessQuery(lowerQuery)) {
      if (property.access_instructions) {
        return {
          found: true,
          content: `🔑 Access instructions: ${property.access_instructions}`,
          source: 'property_data',
          confidence: 0.9
        };
      }
    }

    // Parking queries
    if (this.isParkingQuery(lowerQuery)) {
      if (property.parking_instructions) {
        return {
          found: true,
          content: `🚗 Parking instructions: ${property.parking_instructions}`,
          source: 'property_data',
          confidence: 0.9
        };
      }
    }

    // Directions queries
    if (this.isDirectionsQuery(lowerQuery)) {
      if (property.directions_to_property) {
        return {
          found: true,
          content: `📍 Directions: ${property.directions_to_property}`,
          source: 'property_data',
          confidence: 0.85
        };
      }
    }

    // House rules queries
    if (this.isHouseRulesQuery(lowerQuery)) {
      if (property.house_rules) {
        return {
          found: true,
          content: `📋 House rules: ${property.house_rules}`,
          source: 'property_data',
          confidence: 0.85
        };
      }
    }

    // Amenities queries
    if (this.isAmenitiesQuery(lowerQuery)) {
      return this.searchAmenities(property, lowerQuery);
    }

    return { found: false, content: '', source: 'none', confidence: 0 };
  }

  /**
   * Query classification helpers
   */
  private static isWifiQuery(query: string): boolean {
    return ['wifi', 'wi-fi', 'internet', 'password', 'network'].some(term => query.includes(term));
  }

  private static isCheckoutQuery(query: string): boolean {
    return ['checkout', 'check out', 'check-out', 'leaving', 'departure'].some(term => query.includes(term));
  }

  private static isEmergencyQuery(query: string): boolean {
    return ['emergency', 'contact', 'maintenance', 'problem', 'broken', 'help'].some(term => query.includes(term));
  }

  private static isAccessQuery(query: string): boolean {
    return ['access', 'entry', 'key', 'code', 'door', 'get in', 'lock'].some(term => query.includes(term));
  }

  private static isParkingQuery(query: string): boolean {
    return ['parking', 'park', 'where to park', 'car'].some(term => query.includes(term));
  }

  private static isDirectionsQuery(query: string): boolean {
    return ['directions', 'how to get', 'address', 'location', 'where is'].some(term => query.includes(term));
  }

  private static isHouseRulesQuery(query: string): boolean {
    return ['rules', 'house rules', 'policy', 'policies', 'allowed', 'not allowed'].some(term => query.includes(term));
  }

  private static isAmenitiesQuery(query: string): boolean {
    return ['amenities', 'pool', 'hot tub', 'grill', 'bbq', 'gym', 'fitness'].some(term => query.includes(term));
  }

  /**
   * Enhanced amenities search
   */
  private static searchAmenities(property: Property, query: string): KnowledgeSearchResult {
    const amenities = property.amenities ? JSON.parse(property.amenities) : [];
    const specialNotes = property.special_notes || '';
    
    let response = '';
    let confidence = 0;

    // Specific amenity queries
    if (query.includes('pool') && amenities.includes('Pool')) {
      response = '🏊‍♀️ Yes! The property has a pool available.';
      if (specialNotes.toLowerCase().includes('pool')) {
        const poolInfo = this.extractSpecificInfo(specialNotes, 'pool');
        if (poolInfo) response += ` ${poolInfo}`;
      }
      confidence = 0.95;
    }
    
    if (query.includes('hot tub') && amenities.includes('Hot Tub')) {
      response += response ? '\n\n' : '';
      response += '🛁 Yes! There\'s a hot tub available.';
      if (specialNotes.toLowerCase().includes('hot tub')) {
        const hotTubInfo = this.extractSpecificInfo(specialNotes, 'hot tub');
        if (hotTubInfo) response += ` ${hotTubInfo}`;
      }
      confidence = Math.max(confidence, 0.95);
    }

    if ((query.includes('grill') || query.includes('bbq')) && amenities.includes('BBQ Grill')) {
      response += response ? '\n\n' : '';
      response += '🔥 Yes! There\'s a BBQ grill available for your use.';
      confidence = Math.max(confidence, 0.95);
    }

    // General amenities list
    if (query.includes('amenities') && amenities.length > 0) {
      response += response ? '\n\n' : '';
      response += `🏡 Property amenities: ${amenities.join(', ')}`;
      confidence = Math.max(confidence, 0.8);
    }

    if (response) {
      return { found: true, content: response, source: 'property_data', confidence };
    }

    return { found: false, content: '', source: 'none', confidence: 0 };
  }

  /**
   * Utility functions for enhanced text processing
   */
  private static extractQueryTerms(query: string): string[] {
    // Remove common stop words and extract meaningful terms
    const stopWords = ['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'how', 'what', 'where', 'when', 'is', 'are'];
    return query.split(/\s+/)
      .filter(word => word.length > 2 && !stopWords.includes(word))
      .map(word => word.replace(/[^\w]/g, ''));
  }

  private static extractKnowledgeSections(knowledgeBase: string): string[] {
    // Split by double newlines, bullet points, or section headers
    return knowledgeBase
      .split(/\n\s*\n|\*\*[^*]+\*\*|\d+\.\s/)
      .filter(section => section.trim().length > 10);
  }

  private static calculateSectionRelevance(section: string, queryTerms: string[], fullQuery: string): number {
    const lowerSection = section.toLowerCase();
    let score = 0;

    // Exact phrase match (highest score)
    if (lowerSection.includes(fullQuery)) {
      score += queryTerms.length * 2;
    }

    // Individual term matches
    for (const term of queryTerms) {
      if (lowerSection.includes(term)) {
        score += 1;
      }
    }

    // Bonus for multiple term matches in same section
    const matchedTerms = queryTerms.filter(term => lowerSection.includes(term));
    if (matchedTerms.length > 1) {
      score += matchedTerms.length * 0.5;
    }

    return score;
  }

  private static formatKnowledgeResponse(section: string, queryTerms: string[]): string {
    // Clean up the section and format it nicely
    let response = section.trim();
    
    // Remove excessive asterisks or formatting
    response = response.replace(/\*\*\*/g, '');
    response = response.replace(/\*\*([^*]+)\*\*/g, '$1');
    
    // Ensure it's not too long for SMS
    if (response.length > 300) {
      const sentences = response.split(/[.!?]+/);
      let truncated = '';
      for (const sentence of sentences) {
        if ((truncated + sentence).length > 280) break;
        truncated += sentence + '. ';
      }
      response = truncated.trim();
    }

    return response;
  }

  private static extractSpecificInfo(text: string, keyword: string): string {
    const pattern = new RegExp(`[^.]*${keyword}[^.]*\\.?`, 'i');
    const match = text.match(pattern);
    return match ? match[0].trim() : '';
  }

  /**
   * Generate contextual fallback when no property info is found
   */
  static generateIntelligentFallback(query: string, propertyAddress?: string): string {
    const lowerQuery = query.toLowerCase();
    
    if (this.isWifiQuery(lowerQuery)) {
      return "I don't have the WiFi details in the property guide. Let me contact your host to get the network name and password for you.";
    }
    
    if (this.isLocationQuery(lowerQuery)) {
      if (propertyAddress) {
        return `I don't have that specific information in the property guide, but I can help you find local recommendations near ${propertyAddress}. What are you looking for?`;
      }
      return "I don't have that information in the property guide, but I can help you find local recommendations. What are you looking for?";
    }
    
    if (this.isAmenitiesQuery(lowerQuery)) {
      return "I don't see that amenity information in the property guide. Let me check with your host about what's available.";
    }
    
    return "I don't have that specific information in the property guide. Would you like me to help you find local recommendations or contact your host for details?";
  }

  private static isLocationQuery(query: string): boolean {
    return ['restaurant', 'food', 'attraction', 'activity', 'place', 'near', 'distance', 'directions to'].some(term => query.includes(term));
  }
}