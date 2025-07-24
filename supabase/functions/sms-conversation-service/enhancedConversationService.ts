import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { ConversationManager } from './conversationManager.ts';
import { IntentRecognitionService } from './intentRecognitionService.ts';
import { RecommendationService } from './recommendationService.ts';
import { ResponseGenerator } from './responseGenerator.ts';
import { MessageUtils } from './messageUtils.ts';
import { PropertyService } from './propertyService.ts';
import { WiFiTroubleshootingService } from './wifiTroubleshootingService.ts';
import { MenuService } from './menuService.ts';
import { ConversationMemoryManager } from './conversationMemoryManager.ts';
import { LocationService } from './locationService.ts';
import { ConversationContextTracker } from './conversationContextTracker.ts';
import { ConversationalResponseGenerator } from './conversationalResponseGenerator.ts';
import { PropertyDataExtractor } from './propertyDataExtractor.ts';
import { MultiIntentHandler } from './multiIntentHandler.ts';
import { PropertyContextSwitcher } from './propertyContextSwitcher.ts';
import { MultiQueryParser } from './multiQueryParser.ts';
import { RecommendationDiversifier } from './recommendationDiversifier.ts';
import { PerplexityRecommendationService } from './perplexityRecommendationService.ts';
import { Conversation, Property } from './types.ts';

export class EnhancedConversationService {
  private conversationManager: ConversationManager;
  private recommendationService: RecommendationService;
  private propertyService: PropertyService;

  constructor(private supabase: SupabaseClient) {
    this.conversationManager = new ConversationManager(supabase);
    this.recommendationService = new RecommendationService(supabase, this.conversationManager);
    this.propertyService = new PropertyService(supabase);
  }

  async processMessage(phoneNumber: string, message: string) {
    try {
      console.log('🚀 Enhanced Conversation Service V2.4 - Processing:', { phoneNumber, message });

      // PHASE 1: Property Context Switching Detection (NEW)
      let conversation = await this.conversationManager.getOrCreateConversation(phoneNumber);
      const currentProperty = await PropertyService.getPropertyByPhone(this.supabase, phoneNumber);
      
      const propertySwitchResult = PropertyContextSwitcher.detectPropertySwitch(message, currentProperty);
      if (propertySwitchResult.isPropertySwitch) {
        return await this.handlePropertySwitch(phoneNumber, propertySwitchResult, conversation);
      }

      // PHASE 2: Multi-Query Detection and Immediate Acknowledgment (NEW)
      const parsedQuery = MultiQueryParser.parseMessage(message);
      if (parsedQuery.isMultiQuery) {
        console.log('🔍 Multi-query detected:', parsedQuery);
        // Process multi-query immediately, don't use setTimeout to avoid race conditions
        return await this.processMultiQuerySequentially(phoneNumber, parsedQuery, conversation);
      }
      
      // Special handling for 'get_conversation' requests
      if (message === 'get_conversation') {
        return conversation;
      }

      // Check for travel code activation
      if (message.trim().toLowerCase() === 'travel') {
        console.log('🌍 Travel mode activated for:', phoneNumber);
        
        await this.conversationManager.updateConversationState(phoneNumber, {
          conversation_context: { travel_mode: true },
          last_message_type: 'travel_activation'
        });

        return {
          response: "🌍 Travel mode activated! Ask me about any city and I'll share insider recommendations from food blogs, local guides, and hidden gems.",
          shouldUpdateState: false
        };
      }

      // Recognize intent with enhanced context detection
      const intentResult = IntentRecognitionService.recognizeIntent(message);
      console.log('🎯 Intent analysis:', intentResult);

      // Handle conversation reset first
      if (intentResult.intent === 'conversation_reset') {
        await this.conversationManager.resetConversation(phoneNumber);
        return {
          response: "Let's start fresh! Please send your property code to begin.",
          shouldUpdateState: false
        };
      }

      // CONVERSATION STATE MACHINE - Handle states before intent processing
      console.log('🔄 Current conversation state:', conversation.conversation_state);

      // State 1: Awaiting Property ID
      if (conversation.conversation_state === 'awaiting_property_id') {
        return await this.handlePropertyIdInput(conversation, message);
      }

      // State 2: Awaiting Confirmation
      if (conversation.conversation_state === 'awaiting_confirmation') {
        return await this.handleConfirmation(conversation, message);
      }

      // State 3: Confirmed - Check if property is linked
      if (conversation.conversation_state === 'confirmed') {
        const property = await PropertyService.getPropertyByPhone(this.supabase, phoneNumber);
        if (!property) {
          console.log('❌ No property linked despite confirmed state, resetting conversation');
          await this.conversationManager.resetConversation(phoneNumber);
          return {
            response: "Let's start fresh! Please send your property code to begin.",
            shouldUpdateState: false
          };
        }

        // ✅ NEW: Check for follow-up intents FIRST before processing new intents
        const conversationFlow = conversation.conversation_context?.conversation_flow;
        if (conversationFlow) {
          const followUpIntent = ConversationContextTracker.detectFollowUpIntent(message, conversationFlow);
          if (followUpIntent) {
            console.log('🔄 Follow-up intent detected:', followUpIntent);
            return await this.handleFollowUpIntent(followUpIntent, conversation, message, property);
          }
        }

        // PHASE 3: Enhanced intent detection for food & local queries with diversification
        if (intentResult.intent === 'ask_food_recommendations') {
          const enhancedFoodResponse = await this.handleEnhancedFoodIntentWithDiversification(intentResult.intent, property, message, conversation);
          if (enhancedFoodResponse) {
            return enhancedFoodResponse;
          }
        }

        // Phase 2: Enhanced WiFi Troubleshooting Integration
        const wifiTroubleshootingResponse = await this.handleEnhancedWiFiTroubleshooting(conversation, message, property);
        if (wifiTroubleshootingResponse) {
          return wifiTroubleshootingResponse;
        }

        // Phase 6: Menu and Food Query Integration
        const menuResponse = await this.handleMenuQueries(conversation, message, property);
        if (menuResponse) {
          return menuResponse;
        }

        // ENHANCED: Handle multi-part requests
        if (intentResult.intent === 'ask_multiple_requests' && intentResult.subIntents) {
          return await this.handleMultipleRequests(intentResult.subIntents, property, conversation, message);
        }

        // Handle recommendation intents with enhanced context and diversification
        console.log('🎯 Detected recommendation intent:', intentResult.intent);
        if (this.isRecommendationIntent(intentResult.intent)) {
          const result = await this.handleRecommendationWithDiversification(intentResult.intent, property, message, conversation);
          console.log('📋 Recommendation result:', typeof result, result);
          return result;
        }

        // Phase 4: Property Context Enhancement
        const propertyContextResponse = await this.handlePropertyContextQueries(intentResult.intent, property, conversation, message);
        if (propertyContextResponse) {
          return await this.updateConversationAndRespond(phoneNumber, intentResult.intent, propertyContextResponse, conversation);
        }

        // ENHANCED: Handle property-specific intents with data extraction
        const propertyResponse = await this.handlePropertyIntentWithDataExtraction(intentResult.intent, property, conversation, message);
        if (propertyResponse) {
          return await this.updateConversationAndRespond(phoneNumber, intentResult.intent, propertyResponse, conversation);
        }

        // Phase 5: Enhanced fallback with conversation context
        return await this.generateContextualFallback(conversation, property, intentResult.intent, message);
      }

      // Fallback - should not reach here
      console.log('❌ Unknown conversation state, resetting to awaiting_property_id');
      await this.conversationManager.resetConversation(phoneNumber);
      return {
        response: "Let's start fresh! Please send your property code to begin.",
        shouldUpdateState: false
      };

    } catch (error) {
      console.error('❌ Enhanced conversation service error:', error);
      return {
        response: "Sorry, I'm having trouble right now. Please try again in a moment.",
        shouldUpdateState: false
      };
    }
  }

  // ✅ NEW: Handle property context switching
  private async handlePropertySwitch(phoneNumber: string, switchResult: any, conversation: Conversation) {
    console.log('🏠 Property switch detected:', switchResult);
    
    try {
      // Look up the new property
      const newProperty = await this.propertyService.findPropertyByCode(switchResult.newPropertyCode);
      
      if (!newProperty) {
        return {
          response: PropertyContextSwitcher.generatePropertyNotFoundMessage(switchResult.newPropertyCode),
          shouldUpdateState: false
        };
      }
      
      // Update conversation with new property context
      await this.conversationManager.updateConversationState(phoneNumber, {
        property_id: newProperty.id,
        conversation_state: 'awaiting_confirmation',
        conversation_context: {
          ...conversation.conversation_context,
          property_switch: true,
          pending_property: newProperty,
          previous_property: conversation.property_id
        }
      });
      
      return {
        response: PropertyContextSwitcher.generateSwitchConfirmation(
          switchResult.newPropertyCode, 
          newProperty.property_name
        ),
        shouldUpdateState: false
      };
    } catch (error) {
      console.error('❌ Property switch error:', error);
      return {
        response: "I'm having trouble switching properties right now. Please try again.",
        shouldUpdateState: false
      };
    }
  }

  // ✅ NEW: Process multi-query sequentially
  private async processMultiQuerySequentially(phoneNumber: string, parsedQuery: any, conversation: Conversation) {
    console.log('🔄 Processing multi-query sequentially:', parsedQuery.queries);
    
    const responses: string[] = [];
    // Add immediate acknowledgment first
    responses.push(parsedQuery.acknowledgmentMessage);
    
    for (const query of parsedQuery.queries) {
      try {
        // Process each query component
        const response = await this.processIndividualQuery(query, conversation);
        if (response) {
          responses.push(response);
        }
      } catch (error) {
        console.error('❌ Error processing query component:', error);
        responses.push(`I had trouble with your ${query.type} request. Let me know if you'd like me to try again.`);
      }
    }
    
    // Combine all responses
    const combinedResponse = responses.join('\n\n');
    
    // Update conversation state
    await this.conversationManager.updateConversationState(phoneNumber, {
      last_message_type: 'multi_query_processed',
      conversation_context: {
        ...conversation.conversation_context,
        multi_request_processed: true,
        last_multi_query: parsedQuery.queries.map(q => q.type)
      }
    });
    
    return {
      response: MessageUtils.ensureSmsLimit(combinedResponse),
      shouldUpdateState: false
    };
  }

  // ✅ NEW: Process individual query component
  private async processIndividualQuery(query: any, conversation: Conversation): Promise<string | null> {
    const property = await PropertyService.getPropertyByPhone(this.supabase, conversation.phone_number);
    if (!property) return null;
    
    // Route to appropriate handler based on query type
    switch (query.type) {
      case 'food': {
        const result = await this.handleRecommendationWithDiversification('ask_food_recommendations', property, query.text, conversation);
        return typeof result === 'string' ? result : result?.response || null;
      }
      case 'activities': {
        const result = await this.handleRecommendationWithDiversification('ask_activities', property, query.text, conversation);
        return typeof result === 'string' ? result : result?.response || null;
      }
      case 'transport':
        const transportResponse = PropertyDataExtractor.extractGroceryTransportInfo(property);
        return transportResponse.content;
      case 'amenities':
        const amenityResponse = PropertyDataExtractor.extractAmenityInfo(property, query.text);
        return amenityResponse.content;
      case 'property_info':
        return await this.handlePropertyIntentWithDataExtraction('ask_property_specific', property, conversation, query.text);
      default: {
        const result = await this.generateContextualFallback(conversation, property, query.intent, query.text);
        return typeof result === 'string' ? result : result?.response || null;
      }
    }
  }

  // ✅ NEW: Handle recommendations with diversification
  private async handleRecommendationWithDiversification(intent: string, property: Property, message: string, conversation: Conversation) {
    console.log('🎯 Processing recommendation with diversification:', intent);
    
    const context = conversation.conversation_context || {};
    const previousRecommendations = context.recommendation_history || [];
    console.log('📝 Previous recommendations for diversification:', previousRecommendations);
    
    // Check if diversification is needed
    const diversificationContext = {
      requestType: intent,
      previousRecommendations: previousRecommendations,
      conversationHistory: context.conversation_flow || {},
      currentRequest: message
    };
    
    const diversificationResult = RecommendationDiversifier.analyzeForDiversification(diversificationContext);
    console.log('🎲 Diversification analysis result:', diversificationResult);
    if (diversificationResult.shouldDiversify) {
      console.log('🔄 Diversification needed:', diversificationResult);
      
      // Add rejection filters to the recommendation request
      const rejectionNote = diversificationResult.rejectedOptions.length > 0 
        ? `Avoid suggesting: ${diversificationResult.rejectedOptions.join(', ')}. ` 
        : '';
      const enhancedMessage = rejectionNote + message;
      
      // Get diversified recommendations
      const recommendationResponse = await this.recommendationService.getEnhancedRecommendations(
        property,
        enhancedMessage,
        conversation,
        { intent, confidence: 0.9 }
      );
      
      // Update conversation with new recommendations
      const updatedHistory = [...previousRecommendations, {
        intent,
        recommendations: [recommendationResponse.response],
        timestamp: new Date().toISOString()
      }];
      
      await this.conversationManager.updateConversationState(conversation.phone_number, {
        conversation_context: {
          ...context,
          recommendation_history: updatedHistory
        },
        last_message_type: intent,
        last_recommendations: recommendationResponse.response
      });
      
      // Add diversification note if needed
      if (diversificationResult.diversificationNote) {
        recommendationResponse.response = diversificationResult.diversificationNote + '\n\n' + recommendationResponse.response;
      }
      
      return {
        response: recommendationResponse.response,
        shouldUpdateState: false
      };
    }
    
    // No diversification needed, proceed normally
    return await this.handleRecommendationWithContext(intent, property, message, conversation);
  }

  /**
   * Enhanced food recommendation with diversification
   */
  async handleEnhancedFoodIntentWithDiversification(intent: string, property: Property, message: string, conversation: Conversation): Promise<ProcessingResult> {
    console.log('🍽️ Enhanced food intent with diversification:', intent);
    
    try {
      const context = conversation?.conversation_context || {};
      
      // Get previous recommendations for diversification analysis  
      const previousRecs = conversation?.last_recommendations;
      console.log('📝 Previous recommendations for diversification:', previousRecs);
      
      // Parse previous recommendations safely
      let previousRecommendations = [];
      try {
        previousRecommendations = previousRecs ? JSON.parse(previousRecs) : [];
      } catch (e) {
        // If parsing fails, treat as string array
        previousRecommendations = previousRecs ? [previousRecs] : [];
      }
      
      // Analyze if we should diversify
      const diversificationContext = {
        requestType: intent,
        previousRecommendations,
        conversationHistory: RecommendationDiversifier.extractConversationHistory(conversation),
        timeOfDay: this.getTimeOfDay(),
        guestPreferences: context.guest_preferences || {}
      };
      
      const diversificationResult = RecommendationDiversifier.analyzeForDiversification(diversificationContext);
      console.log('🎯 Diversification analysis:', diversificationResult);
      
      // Try Perplexity first for fresh, real-time recommendations
      const requestType = this.categorizeRequestType(intent, message);
      console.log('📋 Categorized request type:', requestType);
      
      const perplexityRecommendation = await PerplexityRecommendationService.getLocalRecommendations(
        property,
        message,
        conversation,
        requestType,
        diversificationResult.rejectedOptions
      );
      
      console.log('✅ Perplexity recommendation received:', perplexityRecommendation);
      
      // Update conversation with the new recommendation
      await this.updateConversationState(conversation.phone_number, {
        last_recommendations: JSON.stringify([perplexityRecommendation]),
        last_message_type: intent,
        conversation_context: {
          ...context,
          lastIntent: intent,
          last_interaction: new Date().toISOString()
        }
      });
      
      return {
        response: perplexityRecommendation,
        shouldUpdateState: true
      };
      
    } catch (error) {
      console.error('❌ Error in enhanced food intent with diversification:', error);
      return {
        response: "I'm having trouble finding recommendations right now. Please try again in a moment.",
        shouldUpdateState: false
      };
    }
  }

  // ✅ LEGACY: Old food intent method with diversification
  private async handleEnhancedFoodIntentWithDiversificationOld(conversation: Conversation, message: string, property: Property, intentResult: any) {
    const lowerMessage = message.toLowerCase();
    const context = conversation.conversation_context || {};
    
    // Check for food-specific keywords to ensure this is actually a food request
    const foodKeywords = [
      'eat', 'food', 'restaurant', 'dinner', 'lunch', 'breakfast', 'hungry',
      'bite', 'pizza', 'seafood', 'burger', 'coffee', 'cafe'
    ];
    
    const hasFood = foodKeywords.some(keyword => lowerMessage.includes(keyword));
    
    if (!hasFood) {
      console.log('🚫 Not actually a food request, returning null');
      return null;
    }
    
    // CRITICAL: Check if we're already in an active dining conversation
    const isInDiningConversation = context?.dining_conversation_state === 'active';
    
    if (isInDiningConversation) {
      console.log('🍽️ Already in active dining conversation - continuing food recommendations');
      
      // Extract filters from current message
      const filters = this.extractFoodFilters(message);
      console.log('🔍 Food filters detected in active conversation:', filters);
      
      // Update preferences if new ones are detected
      if (filters.length > 0) {
        await this.conversationManager.updateConversationState(conversation.phone_number, {
          conversation_context: {
            ...context,
            last_food_preferences: filters
          }
        });
      }
      
      // Continue with diversified recommendation service
      return await this.handleRecommendationWithDiversification('ask_food_recommendations', property, message, conversation);
    }
    
    // Continue with diversified recommendation service for new food requests
    return await this.handleRecommendationWithDiversification('ask_food_recommendations', property, message, conversation);
  }

  // ✅ NEW: Handle follow-up intents with proper context
  private async handleFollowUpIntent(followUpIntent: string, conversation: Conversation, message: string, property: Property) {
    console.log('🔄 Processing follow-up intent:', followUpIntent);
    
    const context = conversation.conversation_context || {};
    const conversationFlow = context.conversation_flow || {};
    
    // Generate contextual response using ConversationalResponseGenerator
    const response = ConversationalResponseGenerator.generateContextualResponse(
      followUpIntent,
      conversationFlow,
      property,
      message,
      context.guest_name
    );
    
    // Update conversation flow with follow-up
    const updatedFlow = ConversationContextTracker.updateConversationFlow(
      conversationFlow,
      followUpIntent,
      message,
      response
    );
    
    // Update conversation state
    await this.conversationManager.updateConversationState(conversation.phone_number, {
      conversation_context: {
        ...context,
        conversation_flow: updatedFlow
      },
      last_message_type: followUpIntent
    });
    
    return {
      response: MessageUtils.ensureSmsLimit(response),
      shouldUpdateState: false
    };
  }

  // ✅ NEW: Handle recommendations with full conversation context
  private async handleRecommendationWithContext(intent: string, property: Property, message: string, conversation: Conversation) {
    console.log('🎯 Processing recommendation with context:', intent);
    
    const context = conversation.conversation_context || {};
    
    // Get recommendation response
    const recommendationResponse = await this.recommendationService.getEnhancedRecommendations(
      property,
      message,
      conversation,
      { intent, confidence: 0.9 }
    );
    
    console.log('🔍 Recommendation service returned:', recommendationResponse);
    
    // Update conversation flow after recommendation
    const conversationFlow = context.conversation_flow || {};
    const updatedFlow = ConversationContextTracker.updateConversationFlow(
      conversationFlow,
      intent,
      message,
      recommendationResponse.response
    );
    
    // Update conversation state with flow tracking
    await this.conversationManager.updateConversationState(conversation.phone_number, {
      conversation_context: {
        ...context,
        conversation_flow: updatedFlow
      },
      last_message_type: intent,
      last_recommendations: recommendationResponse.response
    });
    
    // Return just the response string, not the full object
    return recommendationResponse.response;
  }

  // ENHANCED: Handle property intents with data extraction and graceful fallbacks
  private async handlePropertyIntentWithDataExtraction(intent: string, property: Property, conversation: Conversation, message: string): Promise<string | null> {
    const context = conversation?.conversation_context || {};
    
    // Handle specific property intents with data extraction
    switch (intent) {
      case 'ask_property_specific': {
        const amenityResponse = PropertyDataExtractor.extractAmenityInfo(property, message);
        const checkoutResponse = PropertyDataExtractor.extractCheckoutInfo(property);
        
        let combinedResponse = '';
        
        // Handle amenity questions
        if (message.toLowerCase().includes('amenities') || message.toLowerCase().includes('pool') || 
            message.toLowerCase().includes('hot tub') || message.toLowerCase().includes('game room')) {
          if (amenityResponse.hasData) {
            combinedResponse += amenityResponse.content + ' ';
          } else {
            combinedResponse += 'Let me get the amenity details for you. ';
          }
        }
        
        // Handle checkout questions
        if (message.toLowerCase().includes('checkout') || message.toLowerCase().includes('check-out') || 
            message.toLowerCase().includes('instructions')) {
          if (checkoutResponse.hasData) {
            combinedResponse += checkoutResponse.content;
          } else {
            combinedResponse += checkoutResponse.content;
          }
        }
        
        // If we answered something, return it
        if (combinedResponse.trim()) {
          return combinedResponse.trim();
        }
        break;
      }
      
      case 'ask_emergency_contact': {
        const emergencyResponse = PropertyDataExtractor.extractEmergencyContact(property);
        return emergencyResponse.content;
      }
      
      case 'ask_grocery_transport': {
        const groceryTransportResponse = PropertyDataExtractor.extractGroceryTransportInfo(property);
        if (groceryTransportResponse.hasData) {
          return groceryTransportResponse.content;
        } else {
          // Route to recommendation service for enhanced response
          return await this.handleRecommendationWithContext('ask_food_recommendations', property, message, conversation);
        }
      }
    }
    
    // Fallback to conversational response generator
    const conversationFlow = context.conversation_flow || {};
    const response = ConversationalResponseGenerator.generateContextualResponse(
      intent,
      conversationFlow,
      property,
      message,
      context.guest_name
    );
    
    // Check if this is a special signal to use recommendation service
    if (response === 'USE_RECOMMENDATION_SERVICE') {
      return await this.handleRecommendationWithContext(intent, property, message, conversation);
    }
    
    return response;
  }

  // ✅ NEW: Update conversation and respond with context tracking
  private async updateConversationAndRespond(phoneNumber: string, intent: string, response: string, conversation: Conversation) {
    const context = conversation.conversation_context || {};
    const conversationFlow = context.conversation_flow || {};
    
    // Update conversation flow
    const updatedFlow = ConversationContextTracker.updateConversationFlow(
      conversationFlow,
      intent,
      '',
      response
    );
    
    await this.conversationManager.updateConversationState(phoneNumber, {
      last_message_type: intent,
      conversation_context: {
        ...context,
        conversation_flow: updatedFlow,
        lastIntent: intent
      }
    });
    
    return {
      response: MessageUtils.ensureSmsLimit(response),
      shouldUpdateState: false
    };
  }

  // ✅ NEW: Enhanced contextual fallback
  private async generateContextualFallback(conversation: Conversation, property: Property, intent?: string, message?: string) {
    const context = conversation.conversation_context || {};
    const conversationFlow = context.conversation_flow || {};
    
    // Check if this could be a food/restaurant request that wasn't caught
    if (message && this.couldBeFoodRequest(message)) {
      console.log('🍽️ Fallback detected potential food request:', message);
      return await this.handleRecommendationWithContext('ask_food_recommendations', property, message, conversation);
    }
    
    // Check if this could be an activity/attraction request  
    if (message && this.couldBeActivityRequest(message)) {
      console.log('🎯 Fallback detected potential activity request:', message);
      return await this.handleRecommendationWithContext('ask_activities', property, message, conversation);
    }
    
    // Try ConversationalResponseGenerator first
    const response = ConversationalResponseGenerator.generateContextualResponse(
      intent || 'general_inquiry',
      conversationFlow,
      property,
      message || '',
      context.guest_name
    );
    
    // If it signals to use recommendation service, do that
    if (response === 'USE_RECOMMENDATION_SERVICE') {
      return await this.handleRecommendationWithContext(intent || 'ask_food_recommendations', property, message || '', conversation);
    }
    
    // Update conversation flow for fallback
    const updatedFlow = ConversationContextTracker.updateConversationFlow(
      conversationFlow,
      intent || 'general_inquiry',
      message || '',
      response
    );
    
    await this.conversationManager.updateConversationState(conversation.phone_number, {
      conversation_context: {
        ...context,
        conversation_flow: updatedFlow
      },
      last_message_type: intent || 'general_inquiry'
    });
    
    return {
      response: MessageUtils.ensureSmsLimit(response),
      shouldUpdateState: false
    };
  }

  // ✅ NEW: Check if message could be a food request not caught by intent recognition
  private couldBeFoodRequest(message: string): boolean {
    const lowerMessage = message.toLowerCase();
    const foodIndicators = [
      'recommend', 'suggestion', 'good place', 'favorite', 'try',
      'hungry', 'eat', 'taste', 'dish', 'cuisine', 'flavor',
      'local', 'nearby', 'close', 'around here'
    ];
    
    return foodIndicators.some(indicator => lowerMessage.includes(indicator)) &&
           (lowerMessage.includes('food') || lowerMessage.includes('restaurant') || 
            lowerMessage.includes('coffee') || lowerMessage.includes('dinner') ||
            lowerMessage.includes('lunch') || lowerMessage.includes('breakfast'));
  }

  // ✅ NEW: Check if message could be an activity request
  private couldBeActivityRequest(message: string): boolean {
    const lowerMessage = message.toLowerCase();
    const activityIndicators = [
      'recommend', 'suggestion', 'good place', 'favorite', 'try',
      'visit', 'see', 'check out', 'explore', 'experience',
      'local', 'nearby', 'close', 'around here'
    ];
    
    return activityIndicators.some(indicator => lowerMessage.includes(indicator)) &&
           (lowerMessage.includes('attraction') || lowerMessage.includes('activity') || 
            lowerMessage.includes('fun') || lowerMessage.includes('sightseeing') ||
            lowerMessage.includes('family') || lowerMessage.includes('kids'));
  }

  // Extract food filters from message
  private extractFoodFilters(message: string): string[] {
    const filters: string[] = [];
    const lowerMessage = message.toLowerCase();
    
    // Cuisine filters
    if (lowerMessage.includes('italian')) filters.push('italian');
    if (lowerMessage.includes('mexican')) filters.push('mexican');
    if (lowerMessage.includes('chinese')) filters.push('chinese');
    if (lowerMessage.includes('pizza')) filters.push('pizza');
    if (lowerMessage.includes('seafood')) filters.push('seafood');
    if (lowerMessage.includes('burger')) filters.push('burger');
    
    // Style filters
    if (lowerMessage.includes('upscale') || lowerMessage.includes('fancy')) filters.push('upscale');
    if (lowerMessage.includes('casual')) filters.push('casual');
    if (lowerMessage.includes('kid friendly') || lowerMessage.includes('family')) filters.push('family-friendly');
    
    // Location filters
    if (lowerMessage.includes('nearby') || lowerMessage.includes('close')) filters.push('nearby');
    if (lowerMessage.includes('walking')) filters.push('walking distance');
    
    return filters;
  }

  // Check if intent is recommendation-related
  private isRecommendationIntent(intent: string): boolean {
    const recommendationIntents = [
      'ask_food_recommendations',
      'ask_activities',
      'ask_attractions',
      'ask_coffee_shops',
      'ask_local_events'
    ];
    return recommendationIntents.includes(intent);
  }

  private async handleEnhancedWiFiTroubleshooting(conversation: Conversation, message: string, property: Property) {
    const lowerMessage = message.toLowerCase();
    
    // Check for WiFi-related keywords
    const wifiKeywords = ['wifi', 'wi-fi', 'internet', 'connection', 'network', 'password', 'slow internet'];
    const hasWifiKeyword = wifiKeywords.some(keyword => lowerMessage.includes(keyword));
    
    if (!hasWifiKeyword) {
      return null;
    }
    
    console.log('📶 WiFi troubleshooting request detected');
    
    // Get WiFi troubleshooting response
    const wifiResponse = WiFiTroubleshootingService.handleWiFiQuery(message, property);
    
    if (wifiResponse) {
      // Update conversation context to track WiFi troubleshooting
      const context = conversation.conversation_context || {};
      await this.conversationManager.updateConversationState(conversation.phone_number, {
        conversation_context: {
          ...context,
          wifi_troubleshooting_active: true,
          last_wifi_step: wifiResponse.step || 'initial'
        },
        last_message_type: 'wifi_troubleshooting'
      });
      
      return {
        response: MessageUtils.ensureSmsLimit(wifiResponse.response),
        shouldUpdateState: false
      };
    }
    
    return null;
  }

  private async handleMenuQueries(conversation: Conversation, message: string, property: Property) {
    const lowerMessage = message.toLowerCase();
    
    // Check for menu-related keywords
    const menuKeywords = ['menu', 'food delivery', 'order food', 'restaurant menu', 'delivery options'];
    const hasMenuKeyword = menuKeywords.some(keyword => lowerMessage.includes(keyword));
    
    if (!hasMenuKeyword) {
      return null;
    }
    
    console.log('🍽️ Menu query detected');
    
    // Get menu information
    const menuResponse = MenuService.getMenuInfo(property, message);
    
    if (menuResponse) {
      // Update conversation context
      const context = conversation.conversation_context || {};
      await this.conversationManager.updateConversationState(conversation.phone_number, {
        conversation_context: {
          ...context,
          menu_query_active: true
        },
        last_message_type: 'menu_query'
      });
      
      return {
        response: MessageUtils.ensureSmsLimit(menuResponse),
        shouldUpdateState: false
      };
    }
    
    return null;
  }

  private async handleMultipleRequests(subIntents: string[], property: Property, conversation: Conversation, message: string) {
    console.log('🔄 Processing multiple requests:', subIntents);
    
    const responses: string[] = [];
    
    for (const intent of subIntents) {
      try {
        // Process each sub-intent
        const response = await this.handlePropertyIntentWithDataExtraction(intent, property, conversation, message);
        if (response) {
          responses.push(response);
        }
      } catch (error) {
        console.error('❌ Error processing sub-intent:', intent, error);
      }
    }
    
    if (responses.length > 0) {
      const combinedResponse = responses.join('\n\n');
      
      // Update conversation context
      const context = conversation.conversation_context || {};
      await this.conversationManager.updateConversationState(conversation.phone_number, {
        conversation_context: {
          ...context,
          multi_request_processed: true
        },
        last_message_type: 'multiple_requests'
      });
      
      return {
        response: MessageUtils.ensureSmsLimit(combinedResponse),
        shouldUpdateState: false
      };
    }
    
    return null;
  }

  private async handlePropertyContextQueries(intent: string, property: Property, conversation: Conversation, message: string) {
    // Handle property-specific context queries
    const context = conversation.conversation_context || {};
    
    // Check if this is a property-specific query that needs context
    const propertyContextIntents = [
      'ask_property_amenities',
      'ask_property_rules',
      'ask_property_location',
      'ask_property_contact'
    ];
    
    if (!propertyContextIntents.includes(intent)) {
      return null;
    }
    
    console.log('🏠 Property context query:', intent);
    
    // Generate property-specific response
    let response = '';
    
    switch (intent) {
      case 'ask_property_amenities':
        const amenityInfo = PropertyDataExtractor.extractAmenityInfo(property, message);
        response = amenityInfo.content;
        break;
      case 'ask_property_contact':
        const contactInfo = PropertyDataExtractor.extractEmergencyContact(property);
        response = contactInfo.content;
        break;
      default:
        response = `I can help you with information about ${property.property_name}. What specific details would you like to know?`;
    }
    
    return response;
  }

  private async handlePropertyIdInput(conversation: Conversation, message: string) {
    console.log('🏠 Processing property ID input:', message);
    
    const propertyCode = message.trim();
    
    try {
      // Look up property by code
      const property = await this.propertyService.findPropertyByCode(propertyCode);
      
      if (!property) {
        return {
          response: `I couldn't find property ${propertyCode}. Please double-check the code and try again.`,
          shouldUpdateState: false
        };
      }
      
      // Update conversation with property info and move to confirmation state
      await this.conversationManager.updateConversationState(conversation.phone_number, {
        property_id: property.id,
        conversation_state: 'awaiting_confirmation',
        conversation_context: {
          ...conversation.conversation_context,
          pending_property: property
        }
      });
      
      return {
        response: `Great! I found ${property.property_name} at ${property.property_address}. Is this correct? Reply Y for yes or N for no.`,
        shouldUpdateState: false
      };
      
    } catch (error) {
      console.error('❌ Error processing property ID:', error);
      return {
        response: "I'm having trouble looking up that property code. Please try again.",
        shouldUpdateState: false
      };
    }
  }

  private async handleConfirmation(conversation: Conversation, message: string) {
    console.log('✅ Processing confirmation:', message);
    
    const lowerMessage = message.toLowerCase().trim();
    const isYes = ['y', 'yes', 'yeah', 'yep', 'correct', 'right'].includes(lowerMessage);
    const isNo = ['n', 'no', 'nope', 'wrong', 'incorrect'].includes(lowerMessage);
    
    if (isYes) {
      const context = conversation.conversation_context || {};
      const pendingProperty = context.pending_property;
      
      if (!pendingProperty) {
        return {
          response: "Something went wrong. Please send your property code again.",
          shouldUpdateState: false
        };
      }
      
      // Link phone number to property and confirm
      await PropertyService.linkPhoneToProperty(this.supabase, conversation.phone_number, pendingProperty.id);
      
      // Update conversation to confirmed state
      await this.conversationManager.updateConversationState(conversation.phone_number, {
        conversation_state: 'confirmed',
        conversation_context: {
          ...context,
          confirmed_property: pendingProperty,
          pending_property: null
        }
      });
      
      return {
        response: `Perfect! I've linked your number to ${pendingProperty.property_name}. I'm ready to help with local recommendations, amenities, and any questions about your stay. What would you like to know?`,
        shouldUpdateState: false
      };
      
    } else if (isNo) {
      // Reset to awaiting property ID
      await this.conversationManager.updateConversationState(conversation.phone_number, {
        conversation_state: 'awaiting_property_id',
        conversation_context: {
          ...conversation.conversation_context,
          pending_property: null
        }
      });
      
      return {
        response: "No problem! Please send the correct property code.",
        shouldUpdateState: false
      };
      
    } else {
      return {
        response: "Please reply Y for yes or N for no to confirm the property.",
        shouldUpdateState: false
      };
    }
  }

  private getTimeOfDay(): string {
    const hour = new Date().getHours();
    if (hour < 12) return 'morning';
    if (hour < 17) return 'afternoon'; 
    return 'evening';
  }

  private categorizeRequestType(intent: string, message: string): string {
    const lowerMessage = message.toLowerCase();
    const lowerIntent = intent.toLowerCase();
    
    // Check for specific food/dining requests
    if (lowerMessage.includes('dinner') || lowerMessage.includes('restaurant') || lowerIntent.includes('food')) {
      return 'dinner';
    }
    
    if (lowerMessage.includes('coffee') || lowerMessage.includes('cafe')) {
      return 'coffee';
    }
    
    if (lowerMessage.includes('attraction') || lowerMessage.includes('activity') || lowerMessage.includes('things to do')) {
      return 'attractions';
    }
    
    if (lowerMessage.includes('breakfast')) {
      return 'breakfast';
    }
    
    if (lowerMessage.includes('lunch')) {
      return 'lunch';
    }
    
    // Default mapping from intent
    if (lowerIntent.includes('food') || lowerIntent.includes('restaurant')) {
      return 'restaurant';
    }
    
    return lowerIntent.replace('ask_', '');
  }

  private async updateConversationState(phoneNumber: string, updates: any) {
    await this.conversationManager.updateConversationState(phoneNumber, updates);
  }
}

interface ProcessingResult {
  response: string;
  shouldUpdateState: boolean;
}
