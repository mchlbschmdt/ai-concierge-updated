import { EnhancedPropertyKnowledgeService, KnowledgeSearchResult } from './enhancedPropertyKnowledgeService.ts';
import { Property } from './types.ts';

export interface RouteDecision {
  route: 'property_knowledge' | 'external_ai' | 'clarification' | 'error';
  content?: string;
  confidence: number;
  needsAI: boolean;
  context?: any;
}

export class EnhancedIntentRouter {
  /**
   * PHASE 2: Intelligent routing - property knowledge first, then external AI
   */
  static routeQuery(query: string, intent: string, property: Property): RouteDecision {
    console.log('🧭 Enhanced intent routing for:', { query, intent });

    // STEP 1: Always check property knowledge first
    const knowledgeResult = EnhancedPropertyKnowledgeService.searchPropertyKnowledge(property, query);
    
    if (knowledgeResult.found && knowledgeResult.confidence >= 0.7) {
      console.log('✅ High confidence property knowledge found, using directly');
      return {
        route: 'property_knowledge',
        content: knowledgeResult.content,
        confidence: knowledgeResult.confidence,
        needsAI: false
      };
    }

    if (knowledgeResult.found && knowledgeResult.confidence >= 0.4) {
      console.log('⚠️ Medium confidence property knowledge found, enhancing with AI');
      return {
        route: 'property_knowledge',
        content: knowledgeResult.content,
        confidence: knowledgeResult.confidence,
        needsAI: true, // Enhance with AI for better response
        context: { baseKnowledge: knowledgeResult.content }
      };
    }

    // STEP 2: Route to external AI for location-based queries
    if (this.isLocationBasedQuery(intent, query)) {
      console.log('🌍 Location-based query detected, routing to external AI');
      return {
        route: 'external_ai',
        confidence: 0.8,
        needsAI: true,
        context: { 
          queryType: 'location',
          fallbackMessage: knowledgeResult.found ? knowledgeResult.content : null
        }
      };
    }

    // STEP 3: Handle property-specific queries with missing information
    if (this.isPropertySpecificQuery(intent, query)) {
      console.log('🏠 Property-specific query with missing info');
      const fallbackMessage = EnhancedPropertyKnowledgeService.generateIntelligentFallback(query, property.address);
      return {
        route: 'clarification',
        content: fallbackMessage,
        confidence: 0.6,
        needsAI: false
      };
    }

    // STEP 4: Default to external AI for other queries
    console.log('🤖 Defaulting to external AI for general query');
    return {
      route: 'external_ai',
      confidence: 0.5,
      needsAI: true,
      context: { queryType: 'general' }
    };
  }

  /**
   * Determine if query should use external AI for local recommendations
   */
  private static isLocationBasedQuery(intent: string, query: string): boolean {
    const locationIntents = [
      'ask_food_recommendations',
      'ask_coffee_recommendations',
      'ask_attractions',
      'ask_activities',
      'ask_grocery_transport'
    ];

    if (locationIntents.includes(intent)) {
      return true;
    }

    // Check for location-based keywords in the query
    const locationKeywords = [
      'restaurant', 'food', 'eat', 'dining', 'coffee', 'cafe',
      'attraction', 'activity', 'things to do', 'places to visit',
      'how far', 'distance', 'directions to', 'near', 'nearby',
      'grocery', 'store', 'shopping', 'transportation'
    ];

    const lowerQuery = query.toLowerCase();
    return locationKeywords.some(keyword => lowerQuery.includes(keyword));
  }

  /**
   * Determine if query is property-specific
   */
  private static isPropertySpecificQuery(intent: string, query: string): boolean {
    const propertyIntents = [
      'ask_amenity',
      'ask_wifi',
      'ask_parking',
      'ask_access',
      'ask_checkout_time',
      'ask_checkin_time',
      'ask_emergency_contact',
      'ask_property_specific'
    ];

    if (propertyIntents.includes(intent)) {
      return true;
    }

    // Check for property-specific keywords
    const propertyKeywords = [
      'wifi', 'password', 'network', 'internet',
      'checkout', 'checkin', 'key', 'code', 'door',
      'parking', 'amenities', 'pool', 'hot tub', 'grill',
      'rules', 'policy', 'contact', 'emergency'
    ];

    const lowerQuery = query.toLowerCase();
    return propertyKeywords.some(keyword => lowerQuery.includes(keyword));
  }

  /**
   * Enhanced query classification for better routing
   */
  static classifyQueryComplexity(query: string, intent: string): {
    complexity: 'simple' | 'moderate' | 'complex';
    requiresContext: boolean;
    isFollowUp: boolean;
  } {
    const lowerQuery = query.toLowerCase();
    
    // Simple queries (direct property information)
    const simplePatterns = ['wifi password', 'checkout time', 'pool', 'parking'];
    if (simplePatterns.some(pattern => lowerQuery.includes(pattern))) {
      return { complexity: 'simple', requiresContext: false, isFollowUp: false };
    }

    // Follow-up queries
    const followUpPatterns = ['how far', 'distance', 'directions', 'that place', 'those restaurants'];
    if (followUpPatterns.some(pattern => lowerQuery.includes(pattern))) {
      return { complexity: 'moderate', requiresContext: true, isFollowUp: true };
    }

    // Complex queries (recommendations, multi-part)
    const complexPatterns = ['best restaurant', 'things to do', 'recommendations', ' and '];
    if (complexPatterns.some(pattern => lowerQuery.includes(pattern))) {
      return { complexity: 'complex', requiresContext: true, isFollowUp: false };
    }

    return { complexity: 'moderate', requiresContext: false, isFollowUp: false };
  }

  /**
   * Generate enhanced prompts for AI when property knowledge is insufficient
   */
  static enhancePromptWithPropertyContext(query: string, property: Property, knowledgeResult?: KnowledgeSearchResult): string {
    let enhancedPrompt = query;

    // Add property context
    if (property.address) {
      enhancedPrompt += ` (I'm staying near ${property.address})`;
    }

    // Add any relevant property knowledge as context
    if (knowledgeResult?.found) {
      enhancedPrompt += ` Note: The property guide mentions: "${knowledgeResult.content.substring(0, 100)}..."`;
    }

    return enhancedPrompt;
  }
}