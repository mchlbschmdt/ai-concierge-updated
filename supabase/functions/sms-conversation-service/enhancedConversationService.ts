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
import { EnhancedPropertyKnowledgeService } from './enhancedPropertyKnowledgeService.ts';
import { EnhancedIntentRouter } from './enhancedIntentRouter.ts';
import { TroubleshootingDetectionService } from './troubleshootingDetectionService.ts';
import { HostContactService } from './hostContactService.ts';
import { PropertyDataExtractorEnhanced } from './propertyDataExtractorEnhanced.ts';
import { PropertyLocationAnalyzer } from './propertyLocationAnalyzer.ts';
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

  async processMessage(phoneNumber: string, message: string, messageTimestamp?: string) {
    try {
      console.log('🚀 Enhanced Conversation Service V2.5 - Processing:', { phoneNumber, message });

      // PHASE 0: Get conversation and check conversation depth
      let conversation = await this.conversationManager.getOrCreateConversation(phoneNumber);
      
      // Check conversation depth to prevent loops
      const conversationContext = conversation.conversation_context as any || {};
      const conversationDepth = conversationContext.conversation_flow?.conversationDepth || 0;
      
      if (conversationDepth > 50) {
        console.warn(`⚠️ Conversation depth (${conversationDepth}) exceeds threshold, suggesting reset`);
        conversationContext.needs_reset = true;
        
        // Auto-reset if depth is extremely high
        if (conversationDepth > 100) {
          console.log('🔄 Auto-resetting conversation due to excessive depth');
          await this.conversationManager.resetConversation(phoneNumber);
          conversation = await this.conversationManager.getOrCreateConversation(phoneNumber);
        }
      }
      
      // Validate message ordering to prevent out-of-order processing
      if (messageTimestamp && conversation.last_interaction_timestamp) {
        const lastTimestamp = new Date(conversation.last_interaction_timestamp).getTime();
        const currentTimestamp = new Date(messageTimestamp).getTime();
        
        if (currentTimestamp < lastTimestamp) {
          console.log('⏭️ Out-of-order message detected, skipping older message');
          return {
            success: true,
            response: null,
            reason: 'out_of_order'
          };
        }
      }

      // PHASE 1: Property Context Switching Detection
      const currentProperty = await PropertyService.getPropertyByPhone(this.supabase, phoneNumber);
      
      const propertySwitchResult = PropertyContextSwitcher.detectPropertySwitch(message, currentProperty);
      if (propertySwitchResult.isPropertySwitch) {
        return await this.handlePropertySwitch(phoneNumber, propertySwitchResult, conversation);
      }

      // PHASE 2: Troubleshooting Detection (MUST RUN BEFORE multi-query parser)
      // Troubleshooting messages should NOT be split into multiple queries
      const troubleshootingResult = TroubleshootingDetectionService.detectTroubleshootingIntent(message);
      if (troubleshootingResult.isTroubleshooting) {
        console.log('🔧 PRIORITY: Troubleshooting detected BEFORE multi-query - blocking multi-query parser:', troubleshootingResult);
        // Skip multi-query parsing and go straight to confirmed guest inquiry
        // The enhanced processing will handle troubleshooting properly
      } else {
        // PHASE 3: Multi-Query Detection (only if NOT troubleshooting)
        const parsedQuery = MultiQueryParser.parseMessage(message);
        if (parsedQuery.isMultiQuery) {
          console.log('🔍 Multi-query detected:', parsedQuery);
          // Process multi-query immediately, don't use setTimeout to avoid race conditions
          return await this.processMultiQuerySequentially(phoneNumber, parsedQuery, conversation);
        }
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

      // State 2: Awaiting Confirmation - Auto-confirm if user asks meaningful questions
      if (conversation.conversation_state === 'awaiting_confirmation') {
        const intentResult = IntentRecognitionService.recognizeIntent(message);
        
        // If user asks a real question instead of Y/N, auto-confirm the property
        if (this.shouldAutoConfirmProperty(intentResult.intent, message)) {
          console.log('🔄 Auto-confirming property due to meaningful question:', intentResult.intent);
          const confirmationResult = await this.handleConfirmation(conversation, 'yes');
          
          // After auto-confirming, process the original request
          if (confirmationResult.response.includes("Perfect! I've linked")) {
            // Property confirmed, now process the original request
            const property = await PropertyService.getPropertyByPhone(this.supabase, phoneNumber);
            if (property) {
              // Process the original intent now that property is confirmed
              return await this.processConfirmedStateMessage(message, conversation, property, phoneNumber);
            }
          }
          return confirmationResult;
        }
        
        // Otherwise handle normal Y/N confirmation
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

        // ✅ PHASE 1: Enhanced Knowledge-First Response System (HIGHEST PRIORITY)
        console.log('🎯 Processing with enhanced knowledge-first approach:', intentResult.intent);
        
        // CRITICAL: Check property data FIRST for all property-related intents
        const propertyDataResponse = await this.checkPropertyDataFirst(intentResult.intent, message, property, conversation);
        if (propertyDataResponse) {
          console.log('✅ Property data response generated');
          return propertyDataResponse;
        }
        
        const enhancedResponse = await this.processWithKnowledgeFirst(intentResult.intent, message, property, conversation);
        if (enhancedResponse && enhancedResponse.response && enhancedResponse.response.length > 10) {
          console.log('✅ Enhanced knowledge-first response generated');
          return enhancedResponse;
        }

        // ✅ Follow-up intents after knowledge check
        const conversationFlow = conversation.conversation_context?.conversation_flow;
        if (conversationFlow) {
          const followUpIntent = ConversationContextTracker.detectFollowUpIntent(message, conversationFlow);
          if (followUpIntent) {
            console.log('🔄 Follow-up intent detected:', followUpIntent);
            return await this.handleFollowUpIntent(followUpIntent, conversation, message, property);
          }
        }

        // Enhanced WiFi Troubleshooting Integration
        const wifiTroubleshootingResponse = await this.handleEnhancedWiFiTroubleshooting(conversation, message, property);
        if (wifiTroubleshootingResponse) {
          return wifiTroubleshootingResponse;
        }

        // Menu and Food Query Integration
        const menuResponse = await this.handleMenuQueries(conversation, message, property);
        if (menuResponse) {
          return menuResponse;
        }

        // Handle multi-part requests
        if (intentResult.intent === 'ask_multiple_requests' && intentResult.subIntents) {
          return await this.handleMultipleRequests(intentResult.subIntents, property, conversation, message);
        }

        // Final fallback - only if no enhanced response was generated
        console.log('⚠️ No enhanced response found, using contextual fallback');
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

  // ✅ ENHANCED: Process multi-query sequentially with better error handling
  private async processMultiQuerySequentially(phoneNumber: string, parsedQuery: any, conversation: Conversation) {
    console.log('🔄 Processing multi-query sequentially:', parsedQuery.queries);
    
    const responses: string[] = [];
    const numQueries = parsedQuery.queries.length;
    
    // Add immediate acknowledgment
    responses.push(`Got it! Let me find ${numQueries} things for you...`);
    
    let successCount = 0;
    
    for (const query of parsedQuery.queries) {
      try {
        console.log('🔍 Processing individual query:', query.type);
        
        // Process each query component
        const response = await this.processIndividualQuery(query, conversation);
        
        if (response && this.isValidRecommendation(response)) {
          console.log('✅ Valid response for', query.type);
          responses.push(response);
          successCount++;
        } else if (response) {
          // Response exists but not validated as recommendation
          console.log('⚠️ Non-recommendation response for', query.type);
          responses.push(response);
          successCount++;
        } else {
          console.log('❌ No response for', query.type);
          responses.push(`Still working on ${query.type} options - I'll have those shortly!`);
        }
      } catch (error) {
        console.error('❌ Error processing query component:', query.type, error);
        // Don't fail entire multi-query if one part fails
        responses.push(`Had trouble finding ${query.type}, but here's what else I found:`);
      }
    }
    
    // Add summary if some failed
    if (successCount < numQueries) {
      const property = await PropertyService.getPropertyByPhone(this.supabase, phoneNumber);
      if (property?.emergency_contact) {
        responses.push(`For more help: ${property.emergency_contact}`);
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
      messages: MessageUtils.ensureSmsLimit(combinedResponse),
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
    console.log('✅ No diversification needed, using standard recommendation');
    return await this.handleRecommendationWithContext(intent, property, message, conversation);
  }

  /**
   * Enhanced recommendation with diversification (food, coffee, attractions)
   */
  async handleEnhancedRecommendationWithDiversification(intent: string, property: Property, message: string, conversation: Conversation): Promise<ProcessingResult> {
    console.log('🎯 Enhanced recommendation intent with diversification:', intent);
    
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
      
      // Try Perplexity first
      try {
        console.log('🔍 Attempting Perplexity recommendations...');
        const perplexityRecommendation = await PerplexityRecommendationService.getLocalRecommendations(
          property,
          message,
          conversation,
          requestType,
          diversificationResult.rejectedOptions
        );
        
        console.log('📊 Perplexity response received:', perplexityRecommendation?.substring(0, 100));
        
        // Check if Perplexity returned valid content
        if (this.isValidRecommendation(perplexityRecommendation)) {
          console.log('✅ Using valid Perplexity recommendation');
          
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
        }
        console.log('⚠️ Perplexity response invalid, trying OpenAI');
      } catch (error) {
        console.log('❌ Perplexity failed:', error.message, '- Trying OpenAI');
      }
      
      // Try OpenAI as second option (better than local data)
      try {
        console.log('🔍 Attempting OpenAI recommendations...');
        const openaiResponse = await this.recommendationService.getEnhancedRecommendations(
          property,
          message,
          conversation,
          { intent, confidence: 0.9 }
        );
        
        console.log('📊 OpenAI response received:', openaiResponse?.response?.substring(0, 100));
        
        if (this.isValidRecommendation(openaiResponse?.response)) {
          console.log('✅ Using valid OpenAI recommendation');
          
          await this.updateConversationState(conversation.phone_number, {
            last_recommendations: JSON.stringify([openaiResponse.response]),
            last_message_type: intent,
            conversation_context: {
              ...context,
              lastIntent: intent,
              last_interaction: new Date().toISOString()
            }
          });
          
          return {
            response: openaiResponse.response,
            shouldUpdateState: true
          };
        }
        console.log('⚠️ OpenAI response invalid, trying local data');
      } catch (error) {
        console.log('❌ OpenAI failed:', error.message, '- Trying local property data');
      }
      
      // Try local property data as last resort
      try {
        console.log('🔍 Attempting local property data fallback...');
        const localResponse = await this.getLocalRecommendationsFallback(property, requestType, message, context);
        
        console.log('📊 Local response:', localResponse?.substring(0, 100));
        
        if (localResponse && this.isValidRecommendation(localResponse)) {
          console.log('✅ Using valid local recommendation');
          
          await this.updateConversationState(conversation.phone_number, {
            last_recommendations: JSON.stringify([localResponse]),
            last_message_type: intent,
            conversation_context: {
              ...context,
              lastIntent: intent,
              last_interaction: new Date().toISOString()
            }
          });
          
          return {
            response: localResponse,
            shouldUpdateState: true
          };
        }
      } catch (error) {
        console.log('❌ Local fallback failed:', error.message);
      }
      
      // If everything fails, provide helpful error with emergency contact
      console.log('❌ All recommendation sources failed, providing helpful error');
      return {
        response: this.generateHelpfulError(property, requestType),
        shouldUpdateState: false
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
    
    // Special handling for distance follow-ups - use LocationService
    if (followUpIntent === 'ask_distance_followup') {
      const restaurantName = this.extractRestaurantFromMessage(message);
      if (restaurantName) {
        try {
          const distanceInfo = await LocationService.getAccurateDistance(
            property.address,
            restaurantName
          );
          
          if (distanceInfo) {
            const walkableText = distanceInfo.walkable ? '🚶‍♂️ You can walk there!' : '🚗 You\'ll need to drive or take an Uber.';
            const namePrefix = context.guest_name ? `${context.guest_name}, ` : '';
            const response = `${namePrefix}${restaurantName} is ${distanceInfo.distance} away (about ${distanceInfo.duration} by car). ${walkableText}`;
            
            return await this.updateConversationAndReturnResponse(conversation, followUpIntent, message, response);
          }
        } catch (error) {
          console.error('Error getting distance info:', error);
        }
      }
    }
    
    // Generate contextual response using ConversationalResponseGenerator
    const response = ConversationalResponseGenerator.generateContextualResponse(
      followUpIntent,
      conversationFlow,
      property,
      message,
      context.guest_name
    );
    
    // Check if response signals to use recommendation service
    if (response === 'USE_RECOMMENDATION_SERVICE') {
      return await this.handleRecommendationWithContext('ask_food_recommendations', property, message, conversation);
    }
    
    return await this.updateConversationAndReturnResponse(conversation, followUpIntent, message, response);
  }
  
  private extractRestaurantFromMessage(message: string): string | null {
    // Look for restaurant names in the message
    const commonRestaurants = ['coopershawk', 'cooper hawk', 'paddlefish', 'homecomin', 'boathouse', 'wharf', 'eleven'];
    
    for (const restaurant of commonRestaurants) {
      if (message.toLowerCase().includes(restaurant)) {
        return restaurant;
      }
    }
    
    return null;
  }
  
  private async updateConversationAndReturnResponse(conversation: Conversation, intent: string, message: string, response: string) {
    const context = conversation.conversation_context || {};
    const conversationFlow = context.conversation_flow || {};
    
    // Update conversation flow
    const updatedFlow = ConversationContextTracker.updateConversationFlow(
      conversationFlow,
      intent,
      message,
      response
    );
    
    // Update conversation state
    await this.conversationManager.updateConversationState(conversation.phone_number, {
      conversation_context: {
        ...context,
        conversation_flow: updatedFlow
      },
      last_message_type: intent
    });
    
    return {
      response: MessageUtils.ensureSmsLimit(response).join('\n'),
      shouldUpdateState: false
    };
  }

  /**
   * NEW: Check property data FIRST before any AI calls
   * Enhanced with service request and general knowledge routing
   */
  private async checkPropertyDataFirst(intent: string, message: string, property: Property, conversation: Conversation): Promise<any> {
    console.log('🔍 Checking property data first for intent:', intent);
    
    const conversationContext = conversation.conversation_context as any || {};
    
    // HIGHEST PRIORITY: Service requests (action-based, require host coordination)
    if (intent.startsWith('request_')) {
      console.log('🛎️ Service request detected, routing to host coordination');
      return await this.handleServiceRequest(intent, property, message, conversationContext, conversation.phone_number);
    }
    
    // HIGH PRIORITY: General knowledge queries (external to property)
    if (intent === 'ask_general_knowledge') {
      console.log('🌐 General knowledge query, routing to AI service');
      return await this.handleGeneralKnowledgeQuery(property, message, conversationContext, conversation.phone_number);
    }
    
    // Check for repetition BEFORE property data extraction
    const topic = this.extractTopicFromIntent(intent, message);
    const recentShare = ConversationMemoryManager.hasAlreadySharedInformation(conversationContext, topic, 5);
    
    if (recentShare.shared) {
      console.log(`✅ Topic "${topic}" was shared ${recentShare.minutesAgo} minutes ago - providing abbreviated response`);
      const abbreviated = ConversationMemoryManager.abbreviateResponse('', topic, recentShare.summary);
      return {
        messages: [abbreviated],
        shouldUpdateState: false
      };
    }
    
    // STEP 1: Detect if this is a troubleshooting request
    const troubleshootingResult = TroubleshootingDetectionService.detectTroubleshootingIntent(message);
    
    if (troubleshootingResult.isTroubleshooting) {
      console.log('🔧 Troubleshooting detected - handling exclusively:', troubleshootingResult);
      // CRITICAL: Return immediately to prevent any further processing
      // This ensures no amenity extraction or other handlers run
      const result = await this.handleTroubleshootingRequest(message, property, conversation, troubleshootingResult);
      console.log('✅ Troubleshooting handler complete - blocking further processing');
      return result;
    }
    
    // STEP 3: Check all property-related intents (including new ones)
    const propertyIntents = [
      'ask_checkout_time', 'ask_checkin_time', 'ask_access', 
      'ask_wifi', 'ask_parking', 'ask_amenity', 'ask_emergency_contact',
      'ask_property_specific', 'ask_additional_services', 'ask_resort_amenities',
      'ask_weather', 'ask_packing_tips', 'ask_best_time_to_visit', 
      'ask_transportation', 'ask_local_events',
      'troubleshoot_tv', 'troubleshoot_wifi', 'troubleshoot_equipment', 'troubleshoot_general'
    ];
    
    if (propertyIntents.includes(intent)) {
      // Try enhanced extractors for new intents
      let extractionResult = null;
      
      if (intent === 'troubleshoot_tv' || message.toLowerCase().includes('tv')) {
        extractionResult = PropertyDataExtractorEnhanced.extractTvInfo(property, message, conversationContext);
      } else if (intent === 'ask_additional_services') {
        extractionResult = PropertyDataExtractorEnhanced.extractAdditionalServices(property, message, conversationContext);
      } else if (intent === 'ask_resort_amenities') {
        extractionResult = PropertyDataExtractorEnhanced.extractResortAmenityInfo(property, message, conversationContext);
      } else if (intent === 'ask_weather') {
        extractionResult = PropertyDataExtractorEnhanced.extractWeatherInfo(property, message, conversationContext);
      } else if (intent === 'ask_packing_tips') {
        extractionResult = PropertyDataExtractorEnhanced.extractPackingTips(property, message, conversationContext);
      } else if (intent === 'ask_best_time_to_visit') {
        extractionResult = PropertyDataExtractorEnhanced.extractBestTimeToVisit(property, message, conversationContext);
      } else if (intent === 'ask_transportation') {
        const destination = this.extractDestinationFromMessage(message);
        const TransportationService = await import('./transportationService.ts').then(m => m.TransportationService);
        const transportResponse = destination 
          ? TransportationService.getTransportationOptions(property, destination, message)
          : TransportationService.getGeneralTransportation(PropertyLocationAnalyzer.analyzePropertyLocation(property.address), 'the area');
        extractionResult = { response: transportResponse, hasData: true };
      } else if (intent === 'ask_local_events') {
        const LocalEventsService = await import('./localEventsService.ts').then(m => m.LocalEventsService);
        const eventsResponse = LocalEventsService.getLocalEvents(property, message);
        extractionResult = { response: eventsResponse, hasData: true };
      } else {
        // Use original extractor for standard intents
        const dataResponse = PropertyDataExtractor.extractPropertyData(property, intent, message);
        extractionResult = { response: dataResponse.content, hasData: dataResponse.hasData };
      }
      
      if (extractionResult && extractionResult.hasData && extractionResult.response) {
        console.log('✅ Property data found');
        
        let response = extractionResult.response;
        
        // Track shared information
        const summary = response.length > 100 ? response.substring(0, 97) + '...' : response;
        const updatedContext = { ...conversationContext };
        ConversationMemoryManager.trackSharedInformation(updatedContext, {
          topic,
          content: response,
          summary
        });
        
        // Add helpful follow-up
        response += '\n\n' + this.getContextualFollowUp(intent, message);
        
        // Update conversation context
        try {
          await this.conversationManager.updateConversationState(conversation.phone_number, {
            last_intent: intent,
            last_response: response,
            conversation_context: updatedContext
          });
        } catch (logError) {
          console.warn('⚠️ Non-critical: Failed to log intent/response:', logError);
        }
        
        return {
          messages: MessageUtils.ensureSmsLimit(response),
          shouldUpdateState: false
        };
      } else {
        // STEP 4: Search knowledge base if structured data not found
        console.log('📚 Searching knowledge base for information');
        const kbResult = EnhancedPropertyKnowledgeService.searchPropertyKnowledge(property, message);
        
        if (kbResult.found && kbResult.content) {
          console.log('✅ Knowledge base match found');
          
          let response = kbResult.content;
          
          // Track shared information and get updated context
          const summary = response.length > 100 ? response.substring(0, 97) + '...' : response;
          const updatedContext = ConversationMemoryManager.trackSharedInformation(conversationContext, {
            topic,
            content: response,
            summary
          });
          
          response += '\n\n' + this.getContextualFollowUp(intent, message);
          
          try {
            await this.conversationManager.updateConversationState(conversation.phone_number, {
              conversation_context: updatedContext
            });
          } catch (logError) {
            console.warn('⚠️ Non-critical: Failed to update context:', logError);
          }
          
          return {
            messages: MessageUtils.ensureSmsLimit(response),
            shouldUpdateState: false
          };
        }
        
        // STEP 5: Offer host contact if no information found
        console.log('❌ No property data or knowledge found, offering host contact');
        return await this.handleMissingPropertyDataWithHostContact(intent, property, message, conversationContext);
      }
    }
    
    return null;
  }
  
  /**
   * Handle troubleshooting requests with proper escalation
   */
  private async handleTroubleshootingRequest(
    message: string, 
    property: Property, 
    conversation: Conversation,
    troubleshootingResult: any
  ): Promise<any> {
    console.log('🔧 Handling EXCLUSIVE troubleshooting request:', troubleshootingResult.category);
    console.log('🚫 Blocking all other intent processing');
    
    const conversationContext = conversation.conversation_context as any || {};
    let response = '';
    let hasData = false;
    
    // Try to extract troubleshooting info from knowledge base
    if (troubleshootingResult.equipmentType) {
      const troubleshootingInfo = PropertyDataExtractorEnhanced.extractEquipmentTroubleshooting(
        property, 
        message, 
        troubleshootingResult.equipmentType,
        conversationContext
      );
      
      if (troubleshootingInfo.hasData) {
        response = troubleshootingInfo.response;
        hasData = true;
      }
    }
    
    // Generate host contact offer based on context
    const hostContactOffer = HostContactService.generateHostContactOffer(property, {
      knowledgeFound: hasData,
      isTroubleshooting: true,
      isUrgent: troubleshootingResult.urgency === 'critical' || troubleshootingResult.urgency === 'high',
      category: troubleshootingResult.category,
      equipmentType: troubleshootingResult.equipmentType
    }, conversationContext);
    
    if (hasData) {
      response += '\n\n' + hostContactOffer;
    } else {
      response = hostContactOffer;
    }
    
    // Track that we offered host contact
    const updatedContext = { ...conversationContext };
    updatedContext.last_host_contact_offer_timestamp = new Date().toISOString();
    
    try {
      await this.conversationManager.updateConversationState(conversation.phone_number, {
        conversation_context: updatedContext
      });
    } catch (error) {
      console.warn('⚠️ Failed to update context:', error);
    }
    
    // Mark response type to ensure no other handlers interfere
    console.log('✅ Troubleshooting response generated - no further processing allowed');
    
    return {
      messages: MessageUtils.ensureSmsLimit(response),
      shouldUpdateState: false,
      responseType: 'troubleshooting' // Marker to prevent mixing
    };
  }
  
  /**
   * Handle missing property data by offering host contact
   */
  private async handleMissingPropertyDataWithHostContact(
    intent: string, 
    property: Property, 
    message: string,
    conversationContext: any
  ): Promise<any> {
    const topic = this.extractTopicFromIntent(intent, message);
    
    const hostContactOffer = HostContactService.generateHostContactOffer(property, {
      knowledgeFound: false,
      isTroubleshooting: false,
      isUrgent: false,
      topic
    }, conversationContext);
    
    // Track that we offered host contact
    const updatedContext = { ...conversationContext };
    updatedContext.last_host_contact_offer_timestamp = new Date().toISOString();
    
    return {
      messages: [hostContactOffer],
      shouldUpdateState: false
    };
  }
  
  /**
   * Extract topic from intent for memory tracking
   */
  private extractTopicFromIntent(intent: string, message: string): string {
    const lowerMessage = message.toLowerCase();
    
    // Extract specific topics from common queries
    if (lowerMessage.includes('wifi')) return 'wifi_info';
    if (lowerMessage.includes('parking')) return 'parking_info';
    if (lowerMessage.includes('pool')) return 'pool_info';
    if (lowerMessage.includes('checkout')) return 'checkout_info';
    if (lowerMessage.includes('tv')) return 'tv_info';
    
    // Fall back to intent-based topics
    const intentTopicMap: Record<string, string> = {
      'ask_wifi': 'wifi_info',
      'ask_parking': 'parking_info',
      'ask_amenity': 'amenity_info',
      'ask_checkout_time': 'checkout_info',
      'ask_access': 'access_info',
      'ask_additional_services': 'additional_services',
      'ask_resort_amenities': 'resort_amenities',
      'troubleshoot_tv': 'troubleshoot_tv',
      'troubleshoot_wifi': 'troubleshoot_wifi'
    };
    
    return intentTopicMap[intent] || 'general_info';
  }
  
  /**
   * Get contextual follow-up based on intent
   */
  private getContextualFollowUp(intent: string, message: string): string {
    const lowerMessage = message.toLowerCase();
    
    if (intent === 'ask_wifi' && !lowerMessage.includes('not working')) {
      return 'Let me know if you have any trouble connecting!';
    } else if (intent === 'ask_checkout_time') {
      return 'Need help with anything else before you leave?';
    } else if (intent === 'ask_amenity') {
      return 'What else can I help with?';
    } else if (intent === 'ask_additional_services') {
      return 'Let me know if you need anything else!';
    } else if (intent === 'ask_resort_amenities') {
      return 'Would you like more details about any of these amenities?';
    } else if (intent === 'ask_weather') {
      return 'Need packing tips based on the weather? Just ask!';
    } else if (intent === 'ask_packing_tips') {
      return 'Want to know about local attractions or dining options? I\'m here to help!';
    } else if (intent === 'ask_best_time_to_visit') {
      return 'Want transportation options or directions to the parks? Just ask!';
    } else if (intent === 'ask_transportation') {
      return 'Need directions or best times to visit? I can help with that!';
    } else if (intent === 'ask_local_events') {
      return 'Need tickets or directions to any of these? I can help with that!';
    }
    
    return 'Hope that helps! Let me know if you need anything else! 😊';
  }
  
  private extractDestinationFromMessage(message: string): string {
    const lowerMsg = message.toLowerCase();
    
    // Extract "to [destination]" pattern
    const toMatch = lowerMsg.match(/(?:to|get to|getting to)\s+([^?]+)/);
    if (toMatch) return toMatch[1].trim();
    
    // Check for common destinations
    if (lowerMsg.includes('disney')) return 'Disney';
    if (lowerMsg.includes('universal')) return 'Universal';
    if (lowerMsg.includes('airport')) return 'airport';
    
    return '';
  }
  
  /**
   * Detect urgent issues that need immediate attention
   */
  private detectUrgentIssue(message: string): boolean {
    const urgentKeywords = [
      'not working', 'doesn\'t work', 'can\'t get in', 'locked out',
      'code not working', 'code doesn\'t work', 'won\'t open',
      'can\'t access', 'trouble entering', 'access problem',
      'broken', 'emergency', 'urgent', 'help', 'stuck'
    ];
    
    const lowerMessage = message.toLowerCase();
    return urgentKeywords.some(keyword => lowerMessage.includes(keyword));
  }
  
  /**
   * Handle urgent issues with immediate response + emergency contact
   */
  private async handleUrgentIssue(message: string, property: Property): Promise<any> {
    const lowerMessage = message.toLowerCase();
    let response = '';
    
    // Detect issue type
    if (lowerMessage.includes('code') || lowerMessage.includes('access') || lowerMessage.includes('get in') || lowerMessage.includes('locked')) {
      response = '🚨 I see you\'re having trouble accessing the property. Let me help!\n\n';
      
      if (property.access_instructions) {
        response += `🔑 Access Code: ${property.access_instructions}\n\n`;
      }
      
      response += 'If the code still isn\'t working: ';
    } else if (lowerMessage.includes('wifi') || lowerMessage.includes('internet')) {
      response = '🚨 WiFi trouble? Let me help!\n\n';
      
      if (property.wifi_name && property.wifi_password) {
        response += `📶 Network: ${property.wifi_name}\nPassword: ${property.wifi_password}\n\n`;
        response += 'Try forgetting the network and reconnecting. If still not working: ';
      }
    } else {
      response = '🚨 I see there\'s an issue. ';
    }
    
    // Always provide emergency contact for urgent issues
    if (property.emergency_contact) {
      response += `Contact your host immediately: ${property.emergency_contact}`;
    } else {
      response += 'Contact your host immediately for assistance.';
    }
    
    return {
      messages: MessageUtils.ensureSmsLimit(response),
      shouldUpdateState: false
    };
  }
  
  /**
   * Handle missing property data gracefully
   */
  private async handleMissingPropertyData(intent: string, property: Property, message: string): Promise<any> {
    let response = '';
    
    // Provide emergency contact for critical info
    if (intent === 'ask_emergency_contact' || intent === 'ask_access') {
      response = '🚨 ';
      if (property.emergency_contact) {
        response += `For any issues, contact: ${property.emergency_contact}`;
      } else {
        response += 'I don\'t have the emergency contact info. Let me get that for you.';
      }
    } else if (intent === 'ask_checkout_time') {
      response = 'I don\'t have the checkout time in my records. ';
      if (property.emergency_contact) {
        response += `Contact your host for details: ${property.emergency_contact}`;
      } else {
        response += 'Let me get that information from your host.';
      }
    } else if (intent === 'ask_wifi') {
      response = '📶 I don\'t have the WiFi details. ';
      if (property.emergency_contact) {
        response += `Contact your host: ${property.emergency_contact}`;
      } else {
        response += 'Check your welcome email or contact your host.';
      }
    } else {
      response = 'I don\'t have that information right now. Let me help you find what you need! What would you like to know about?';
    }
    
    return {
      messages: MessageUtils.ensureSmsLimit(response),
      shouldUpdateState: false
    };
  }

  // ✅ NEW: Handle location/direction queries WITHOUT food AI
  private async handleLocationInfoWithContext(intent: string, property: Property, message: string, conversation: Conversation) {
    console.log('🗺️ Processing location/direction query (NO FOOD AI):', intent);
    
    const context = conversation.conversation_context || {};
    const locationContext = PropertyLocationAnalyzer.analyzePropertyLocation(property.address);
    const lowerMessage = message.toLowerCase();
    
    let response = '';
    
    // Parse what attraction/destination they're asking about
    if (lowerMessage.includes('disney') || lowerMessage.includes('magic kingdom') || 
        lowerMessage.includes('epcot') || lowerMessage.includes('animal kingdom') || 
        lowerMessage.includes('hollywood studios')) {
      response = locationContext.distanceToDisney 
        ? `You're about ${locationContext.distanceToDisney} from Disney World. Driving or rideshare is best—no easy walking route from ${locationContext.neighborhood || 'your area'}.`
        : "Disney World is about 10-15 minutes away by car. I'd recommend using a rideshare or driving!";
    } else if (lowerMessage.includes('universal')) {
      response = locationContext.distanceToUniversal
        ? `You're about ${locationContext.distanceToUniversal} from Universal Studios. Best to drive or take an Uber.`
        : "Universal is about 20-30 minutes away. You'll want to drive or use rideshare to get there!";
    } else if (lowerMessage.includes('old san juan') || lowerMessage.includes('san juan')) {
      response = "Old San Juan is about 45 minutes from your property. Great for a day trip—lots of history and amazing food!";
    } else if (locationContext.nearbyAttractions.length > 0) {
      response = `You're close to ${locationContext.nearbyAttractions.join(' and ')}. ${locationContext.distanceToDisney || 'About 10-15 minutes by car'} to the main parks!`;
    } else {
      response = "Let me help with directions! Could you specify which attraction or area you're asking about?";
    }
    
    // Clear any food recommendations from memory since this is a location query
    const updatedContext = {
      ...context,
      last_request_category: 'directions',
      last_recommended_restaurant: null,
      last_restaurant_context: null
    };
    
    await this.conversationManager.updateConversationState(conversation.phone_number, {
      conversation_context: updatedContext,
      last_message_type: intent,
      last_intent: intent,
      last_response: response
    });
    
    console.log('✅ Location response generated (NO FOOD):', response.substring(0, 50));
    return {
      response,
      shouldUpdateState: false
    };
  }

  // ✅ Handle recommendations with full conversation context
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
    
    // Ensure response is a string before storing
    const responseString = Array.isArray(recommendationResponse.response) 
      ? recommendationResponse.response.join('\n')
      : recommendationResponse.response;
    
    // Update conversation flow after recommendation
    const conversationFlow = context.conversation_flow || {};
    const updatedFlow = ConversationContextTracker.updateConversationFlow(
      conversationFlow,
      intent,
      message,
      responseString
    );
    
    // PHASE 2: Track request category and clear memory when category changes
    const requestCategory = recommendationResponse.requestCategory || context.last_request_category || 'general';
    const lastCategory = context.last_request_category;
    
    console.log('📊 Request category:', requestCategory, '| Last category:', lastCategory);
    
    // If we moved away from food categories, clear restaurant memory
    const movedAwayFromFood = lastCategory && 
      (lastCategory.includes('food') || lastCategory.includes('dining') || 
       lastCategory.includes('breakfast') || lastCategory.includes('lunch') || 
       lastCategory.includes('dinner') || lastCategory.includes('coffee')) &&
      !(requestCategory.includes('food') || requestCategory.includes('dining') ||
        requestCategory.includes('breakfast') || requestCategory.includes('lunch') || 
        requestCategory.includes('dinner') || requestCategory.includes('coffee'));
    
    // If category changed OR moved away from food, clear previous recommendations
    if (movedAwayFromFood || (lastCategory && lastCategory !== requestCategory && !requestCategory.includes('general'))) {
      console.log('🔄 Category changed from', lastCategory, 'to', requestCategory, '- clearing previous recommendations');
      updatedFlow.last_recommendations = null;
      context.last_recommended_restaurant = null;
      context.last_restaurant_context = null;
    }
    
    // Update conversation state with flow tracking and category
    await this.conversationManager.updateConversationState(conversation.phone_number, {
      conversation_context: {
        ...context,
        conversation_flow: updatedFlow,
        last_request_category: requestCategory
      },
      last_message_type: intent,
      last_recommendations: responseString
    });
    
    console.log('✅ Returning recommendation with proper format:', { hasResponse: !!responseString });
    return {
      response: responseString,
      shouldUpdateState: false
    };
  }

  // ENHANCED: Handle property intents with data extraction and graceful fallbacks
  private async handlePropertyIntentWithDataExtraction(intent: string, property: Property, conversation: Conversation, message: string): Promise<string | null> {
    const context = conversation?.conversation_context || {};
    
    // Handle specific property intents with data extraction
    switch (intent) {
      case 'ask_property_specific':
      case 'ask_amenity': {
        const amenityResponse = PropertyDataExtractor.extractAmenityInfo(property, message);
        const checkoutResponse = PropertyDataExtractor.extractCheckoutInfo(property);
        
        let combinedResponse = '';
        
        // Handle amenity questions (including grill, pool, hot tub, etc.)
        if (message.toLowerCase().includes('amenities') || message.toLowerCase().includes('pool') || 
            message.toLowerCase().includes('hot tub') || message.toLowerCase().includes('game room') ||
            message.toLowerCase().includes('grill') || message.toLowerCase().includes('bbq') ||
            message.toLowerCase().includes('wifi') || message.toLowerCase().includes('ac') ||
            message.toLowerCase().includes('air conditioning')) {
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
      
      case 'ask_food_recommendations': {
        // Check if property has local_recommendations with restaurant info
        if (property?.local_recommendations) {
          const recommendations = property.local_recommendations;
          
          // Extract restaurant section if it exists
          const diningSection = recommendations.match(/\*\*\*Dining[^*]*\*\*\*(.*?)(\*\*\*|$)/is);
          if (diningSection) {
            let diningText = diningSection[1].trim();
            
            // Format the dining recommendations more conversationally
            let response = "🍽️ Here are some great local spots I recommend:\n\n";
            
            // Clean up the formatting
            diningText = diningText
              .replace(/--/g, '🍴 ')
              .replace(/\n\n/g, '\n')
              .replace(/\n+/g, '\n')
              .trim();
            
            response += diningText;
            response += "\n\nWhat sounds good? Want directions or more details about any of these? 😊";
            
            return response;
          }
        }
        
        // Fallback to AI recommendations if no property data
        return null; // Let the recommendation service handle this
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
          const recResult = await this.handleRecommendationWithContext('ask_food_recommendations', property, message, conversation);
          return recResult.response;
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
      const recResult = await this.handleRecommendationWithContext(intent, property, message, conversation);
      return recResult.response;
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
      response: MessageUtils.ensureSmsLimit(response).join('\n'),
      shouldUpdateState: false
    };
  }

  // ✅ Enhanced contextual fallback - NO MORE GENERIC RESPONSES, WITH EMPATHY AND SPECIFIC HELP
  private async generateContextualFallback(conversation: Conversation, property: Property, intent?: string, message?: string): Promise<ProcessingResult> {
    const context = conversation.conversation_context || {};
    const isUrgent = message ? IntentRecognitionService.detectUrgency(message) : false;
    
    console.log('🔧 Generating contextual fallback for:', { intent, message: message?.substring(0, 50), isUrgent });
    
    // Handle urgent issues with empathy and immediate help
    if (isUrgent) {
      if (intent === 'ask_access' || (message && (message.toLowerCase().includes('get in') || message.toLowerCase().includes('code')))) {
        return await this.handleUrgentAccessIssue(property, message || '', conversation);
      }
      
      return {
        response: [`I understand you're having trouble. Let me help you right away. ${property.emergency_contact ? `You can also contact: ${property.emergency_contact}` : 'I can connect you with the host if needed.'}`],
        shouldUpdateState: false
      };
    }
    
    // Check for distance questions that weren't caught as follow-ups
    if (message && this.isDistanceQuestion(message)) {
      console.log('📍 Fallback detected distance question:', message);
      const restaurantName = this.extractRestaurantFromMessage(message);
      
      if (restaurantName) {
        try {
          const distanceInfo = await LocationService.getAccurateDistance(
            property.address,
            restaurantName
          );
          
          if (distanceInfo) {
            const walkableText = distanceInfo.walkable ? '🚶‍♂️ You can walk there!' : '🚗 You\'ll need to drive or take an Uber.';
            const namePrefix = context.guest_name ? `${context.guest_name}, ` : '';
            const response = `${namePrefix}${restaurantName} is ${distanceInfo.distance} away (about ${distanceInfo.duration} by car). ${walkableText}`;
            
            return await this.updateConversationAndReturnResponse(conversation, 'ask_distance_info', message, response);
          }
        } catch (error) {
          console.error('Error getting distance info:', error);
        }
      }
      
      // Fallback for distance questions without specific restaurant
      const namePrefix = context.guest_name ? `${context.guest_name}, ` : '';
      const response = `${namePrefix}Which restaurant are you asking about? I can give you distance and direction info! 📍`;
      return await this.updateConversationAndReturnResponse(conversation, 'ask_distance_info', message, response);
    }
    
    // Check if this could be a location-based request (food, activities, etc.)
    if (message && (this.couldBeFoodRequest(message) || this.couldBeActivityRequest(message) || this.isLocationBasedQuery(intent || '', message))) {
      console.log('🌍 Fallback detected location-based request, routing to AI');
      const recommendationIntent = this.determineRecommendationIntent(message);
      return await this.handleRecommendationWithDiversification(recommendationIntent, property, message, conversation);
    }
    
    // Smart fallback based on intent type with specific actionable messages (Phase 2)
    const emergencyContact = property?.emergency_contact || 'Mike & Lauren at (321) 340-6333';
    
    switch (intent) {
      case 'ask_food_recommendations':
        return {
          response: [`I couldn't find restaurant info just now. Would you like me to ask your host?\n\n📞 ${emergencyContact}`],
          shouldUpdateState: false
        };
      
      case 'ask_coffee_recommendations':
        return {
          response: [`I couldn't find coffee shops just now. Would you like me to ask your host?\n\n📞 ${emergencyContact}`],
          shouldUpdateState: false
        };
      
      case 'ask_attractions':
        return {
          response: [`I couldn't find attractions just now. Would you like me to ask your host?\n\n📞 ${emergencyContact}`],
          shouldUpdateState: false
        };
      
      case 'ask_amenity':
        return {
          response: [`I couldn't access amenity details right now.\n\n📞 Please contact: ${emergencyContact}`],
          shouldUpdateState: false
        };
      
      case 'ask_checkout_time':
        return {
          response: [`I couldn't access checkout details right now.\n\n📞 Please contact: ${emergencyContact}`],
          shouldUpdateState: false
        };
      
      case 'ask_garbage':
        return {
          response: [`For garbage collection schedule:\n\n📞 ${emergencyContact}`],
          shouldUpdateState: false
        };
      
      case 'ask_grocery':
        return {
          response: [`For grocery store recommendations:\n\n📞 ${emergencyContact}`],
          shouldUpdateState: false
        };
      
      case 'ask_transportation_no_car':
        return {
          response: [`For transportation options:\n\n📞 ${emergencyContact}`],
          shouldUpdateState: false
        };
      
      case 'ask_grocery_transport':
        return {
          response: [`For grocery and transportation info:\n\n📞 ${emergencyContact}`],
          shouldUpdateState: false
        };
      
      case 'ask_access':
        if (property.access_instructions) {
          return {
            response: [`🔑 Here are your access instructions:\n${property.access_instructions}\n\nIf you're still having trouble, let me know!`],
            shouldUpdateState: false
          };
        }
        return {
          response: [`I can help you get into ${property.property_name || 'your property'}. Are you having trouble with the door code, key, or building entrance?`],
          shouldUpdateState: false
        };
      
      case 'ask_wifi':
        if (property.wifi_name && property.wifi_password) {
          return {
            response: [`📶 WiFi Details:\nNetwork: ${property.wifi_name}\nPassword: ${property.wifi_password}\n\nHaving trouble connecting? Let me know!`],
            shouldUpdateState: false
          };
        }
        return {
          response: [`I can help with WiFi! Are you having trouble finding the network or connecting?`],
          shouldUpdateState: false
        };
      
      case 'ask_parking':
        if (property.parking_instructions) {
          return {
            response: [`🚗 Parking Info:\n${property.parking_instructions}\n\nNeed directions or have other questions?`],
            shouldUpdateState: false
          };
        }
        return {
          response: [`I can help with parking information. Are you looking for where to park or how to access the parking area?`],
          shouldUpdateState: false
        };
      
      default:
        // Use contextual response service for helpful fallback
        const helpfulResponse = ContextualResponseService.generateHelpfulFallback(
          context, 
          intent, 
          this.getPropertyType(property)
        );
        
        return {
          response: [helpfulResponse],
          shouldUpdateState: false
        };
    }
    
    return await this.updateConversationAndReturnResponse(conversation, intent || 'general_inquiry', message || '', helpfulResponse);
  }

  /**
   * Determine the appropriate recommendation intent based on message content
   */
  private determineRecommendationIntent(message: string): string {
    const lowerMessage = message.toLowerCase();
    
    if (lowerMessage.includes('coffee') || lowerMessage.includes('cafe')) {
      return 'ask_coffee_recommendations';
    }
    if (lowerMessage.includes('food') || lowerMessage.includes('restaurant') || lowerMessage.includes('eat') || lowerMessage.includes('dining')) {
      return 'ask_food_recommendations';
    }
    if (lowerMessage.includes('activity') || lowerMessage.includes('attraction') || lowerMessage.includes('fun') || lowerMessage.includes('visit')) {
      return 'ask_attractions';
    }
    
    // Default to food recommendations for location queries
    return 'ask_food_recommendations';
  }

  /**
   * Check if intent is property-specific
   */
  private isPropertySpecificIntent(intent: string): boolean {
    const propertyIntents = [
      'ask_wifi', 'ask_parking', 'ask_checkin_time', 'ask_checkout_time',
      'ask_emergency_contact', 'ask_amenity', 'ask_access', 'ask_property_specific'
    ];
    return propertyIntents.includes(intent);
  }

  /**
   * Generate helpful response instead of generic fallback
   */
  private generateHelpfulResponse(intent: string | undefined, property: Property, namePrefix: string, message?: string): string {
    // Avoid the generic "Need more help with your stay..." responses
    if (message) {
      const lowerMessage = message.toLowerCase();
      
      // If they're asking about something we should know, offer to check with property
      if (lowerMessage.includes('pool') || lowerMessage.includes('hot tub') || lowerMessage.includes('amenity')) {
        return `${namePrefix}Let me check the property details for you. What specific amenity information do you need?`;
      }
      
      if (lowerMessage.includes('direction') || lowerMessage.includes('location') || lowerMessage.includes('address')) {
        return `${namePrefix}I can help with directions! What specific location are you trying to get to?`;
      }
    }
    
    // Provide specific options instead of generic help
    return `${namePrefix}I can help you with local recommendations, property amenities, or directions. What would you like to know?`;
  }
  
  private isDistanceQuestion(message: string): boolean {
    const lowerMessage = message.toLowerCase();
    const distancePatterns = [
      'how far away is', 'how far is', 'distance to', 'distance from',
      'how close is', 'how long to get to', 'walk to', 'drive to',
      'far away is', 'close to', 'near to'
    ];
    
    return distancePatterns.some(pattern => lowerMessage.includes(pattern));
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
      'ask_coffee_recommendations',
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
        messages: MessageUtils.ensureSmsLimit(wifiResponse.response),
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
        messages: MessageUtils.ensureSmsLimit(menuResponse),
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
        messages: MessageUtils.ensureSmsLimit(combinedResponse),
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
      await PropertyService.linkPhoneToProperty(this.supabase, conversation.phone_number, pendingProperty.property_id);
      
      // Update conversation to confirmed state
      await this.conversationManager.updateConversationState(conversation.phone_number, {
        conversation_state: 'confirmed',
        property_confirmed: true,
        conversation_context: {
          ...context,
          confirmed_property: pendingProperty,
          pending_property: null,
          property_switch: false
        }
      });
      
      // Create a welcoming message with property name and location
      const welcomeMessage = context.property_switch 
        ? `Welcome to ${pendingProperty.property_name} in ${this.extractCityFromAddress(pendingProperty.address)}! I'm ready to help with local recommendations, amenities, and any questions about your stay. What would you like to know?`
        : `Perfect! I've linked your number to ${pendingProperty.property_name}. I'm ready to help with local recommendations, amenities, and any questions about your stay. What would you like to know?`;
      
      return {
        response: welcomeMessage,
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
    
    // Check for attractions first (highest priority for clear intent)
    if (lowerIntent.includes('attraction') || lowerMessage.includes('attraction') || 
        lowerMessage.includes('activity') || lowerMessage.includes('things to do') ||
        lowerMessage.includes('scenic') || lowerMessage.includes('visit') || lowerMessage.includes('beach')) {
      return 'attractions';
    }
    
    // Check for coffee specifically (before general food)
    if (lowerMessage.includes('coffee') || lowerMessage.includes('cafe') || 
        lowerMessage.includes('espresso') || lowerMessage.includes('cappuccino')) {
      return 'coffee';
    }
    
    // Check for specific meal times
    if (lowerMessage.includes('breakfast') || lowerMessage.includes('morning')) {
      return 'breakfast';
    }
    
    if (lowerMessage.includes('lunch') || lowerMessage.includes('brunch')) {
      return 'lunch';
    }
    
    // Check for dinner/restaurant (but not if coffee was already detected)
    if (lowerMessage.includes('dinner') || lowerMessage.includes('restaurant') || 
        lowerMessage.includes('dining') || lowerMessage.includes('eat')) {
      return 'dinner';
    }
    
    // Default mapping from intent
    if (lowerIntent.includes('food') || lowerIntent.includes('restaurant')) {
      return 'dinner';
    }
    
    if (lowerIntent.includes('attraction')) {
      return 'attractions';
    }
    
    return lowerIntent.replace('ask_', '');
  }

  private extractCityFromAddress(address: string): string {
    if (!address) return 'your area';
    
    // Extract city from address patterns like "123 Main St, City, State" 
    const parts = address.split(',');
    if (parts.length >= 2) {
      return parts[parts.length - 2].trim();
    }
    
    return 'your area';
  }

  private async updateConversationState(phoneNumber: string, updates: any) {
    await this.conversationManager.updateConversationState(phoneNumber, updates);
  }

  /**
   * RELAXED: Validate if a recommendation is actually useful content
   * Phase 3: Even more lenient validation logic
   */
  private isValidRecommendation(recommendation: string | undefined | null): boolean {
    if (!recommendation || typeof recommendation !== 'string') {
      console.log('❌ Validation failed: null or non-string');
      return false;
    }
    
    // PRIMARY CHECK: Length-based validation (most reliable)
    if (recommendation.length < 20) {
      console.log('❌ Validation failed: too short (<20 chars)');
      return false;
    }
    
    // Auto-accept if contains emergency contact (always valid)
    if (recommendation.includes('321') || recommendation.toLowerCase().includes('contact')) {
      console.log('✅ Auto-accepted: Contains emergency contact');
      return true;
    }
    
    // Auto-accept if contains property-specific markers
    const propertyMarkers = ['pool', 'hot tub', 'checkout', 'garbage', 'grocery', 'resort', 'publix', 'aldi'];
    const hasPropertyMarker = propertyMarkers.some(marker => recommendation.toLowerCase().includes(marker));
    if (hasPropertyMarker) {
      console.log('✅ Auto-accepted: Contains property marker');
      return true;
    }
    
    // Quick pass for longer content (likely valid)
    if (recommendation.length > 100) {
      console.log('✅ Validation passed: content length >100 chars');
      return true;
    }
    
    // Check for error indicators
    const errorPhrases = [
      'sorry', 'having trouble', 'try again', 
      'don\'t have', 'can\'t find', 'unable to',
      'error', 'failed', 'issue'
    ];
    
    const lower = recommendation.toLowerCase();
    const hasError = errorPhrases.some(phrase => lower.includes(phrase));
    
    if (hasError) {
      console.log('❌ Validation failed: contains error phrase');
      return false;
    }
    
    // RELAXED: Check for actual content indicators
    const hasDistance = /\d+\.?\d*\s*(mi|miles|min|minutes|walk)/i.test(recommendation);
    const hasRating = /⭐|stars?|rated|rating|\d\.\d/i.test(recommendation);
    const hasProperNames = /[A-Z][a-z]+(?:\s+[A-Z][a-z]+)+/.test(recommendation);
    const hasDescriptors = /(great|best|popular|local|famous|authentic|delicious|recommend|try)/i.test(recommendation);
    const hasAddress = /\d+\s+[A-Z][a-z]+\s+(Street|St|Avenue|Ave|Road|Rd|Drive|Dr|Boulevard|Blvd)/i.test(recommendation);
    
    // VERY RELAXED: Accept if has any indicator OR length > 50
    const validIndicators = [hasDistance, hasRating, hasProperNames, hasDescriptors, hasAddress].filter(Boolean).length;
    
    if (validIndicators >= 1) {
      console.log('✅ Recommendation validated with indicators:', { 
        hasDistance, hasRating, hasProperNames, hasDescriptors, hasAddress,
        count: validIndicators 
      });
      return true;
    }
    
    // Very lenient fallback - accept most responses over 50 chars
    const isValid = recommendation.length > 50;
    console.log(isValid ? '✅ Accepted: Length validation passed (>50 chars)' : '❌ Rejected: Too short (<50 chars)');
    return isValid;
  }

  /**
   * Generate helpful error message with emergency contact
   */
  private generateHelpfulError(property: Property, requestType: string): string {
    const emergency = property.emergency_contact || 'your host';
    const guestName = '';
    
    let response = `I'm having trouble finding ${requestType} recommendations right now. `;
    
    // Provide emergency contact for immediate help
    response += `For immediate assistance, contact ${emergency}. `;
    
    // Add context-specific helpful message
    if (requestType.includes('coffee')) {
      response += 'Meanwhile, check if your property has coffee amenities!';
    } else if (requestType.includes('dinner') || requestType.includes('restaurant')) {
      response += 'I\'ll keep working on getting you great dining options!';
    } else if (requestType.includes('attractions')) {
      response += 'I\'ll gather some activity ideas for you!';
    } else {
      response += 'Let me know if you need anything else!';
    }
    
    return MessageUtils.ensureSmsLimit(response);
  }

  private shouldAutoConfirmProperty(intent: string, message: string): boolean {
    // Auto-confirm if user asks meaningful questions instead of just Y/N
    const meaningfulIntents = [
      'ask_food_recommendations', 'ask_amenity', 'ask_property_specific',
      'ask_local_recommendations', 'ask_emergency_contact', 'ask_checkout',
      'ask_multiple_requests', 'ask_venue_vibe', 'general_inquiry'
    ];
    
    const meaningfulKeywords = [
      'restaurant', 'coffee', 'dinner', 'food', 'eat', 'drink',
      'amenity', 'pool', 'wifi', 'parking', 'emergency', 'help',
      'recommendation', 'attraction', 'checkout', 'where', 'what', 'how'
    ];
    
    const lowerMessage = message.toLowerCase();
    const hasIntent = meaningfulIntents.includes(intent);
    const hasKeywords = meaningfulKeywords.some(keyword => lowerMessage.includes(keyword));
    
    return hasIntent || hasKeywords;
  }

  // ✅ ENHANCED: Get local recommendations fallback from property data with smart SMS formatting
  private async getLocalRecommendationsFallback(property: Property, requestType: string, message: string, context: any): Promise<string | null> {
    console.log('🏠 Using local recommendations fallback for:', requestType);
    
    if (!property.local_recommendations) {
      console.log('❌ No local recommendations in property data');
      return null;
    }
    
    const lowerMessage = message.toLowerCase();
    const lowerRequestType = requestType.toLowerCase();
    
    // Extract relevant sections based on request type
    let relevantSection = '';
    
    if (lowerRequestType.includes('coffee') || lowerMessage.includes('coffee')) {
      relevantSection = this.extractSectionFromRecommendations(property.local_recommendations, ['coffee', 'cafe', 'morning', 'starbucks']);
    } else if (lowerRequestType.includes('dinner') || lowerMessage.includes('dinner') || lowerMessage.includes('restaurant')) {
      relevantSection = this.extractSectionFromRecommendations(property.local_recommendations, ['restaurant', 'dining', 'eat', 'food']);
    } else if (lowerRequestType.includes('breakfast') || lowerMessage.includes('breakfast')) {
      relevantSection = this.extractSectionFromRecommendations(property.local_recommendations, ['breakfast', 'morning', 'coffee']);
    } else if (lowerRequestType.includes('attractions') || lowerMessage.includes('attraction') || lowerMessage.includes('activity')) {
      relevantSection = this.extractSectionFromRecommendations(property.local_recommendations, ['attraction', 'beach', 'museum', 'park', 'tour', 'scenic', 'historic', 'rainforest', 'fort', 'old san juan']);
    } else if (lowerRequestType.includes('grocery') || lowerMessage.includes('grocery') || lowerMessage.includes('store')) {
      relevantSection = this.extractSectionFromRecommendations(property.local_recommendations, ['grocery', 'groceries', 'aldi', 'publix', 'walmart', 'store']);
    } else {
      // General food/dining fallback
      relevantSection = this.extractSectionFromRecommendations(property.local_recommendations, ['restaurant', 'dining', 'eat', 'food']);
    }
    
    if (relevantSection && relevantSection.length > 10) {
      console.log('✅ Found relevant section:', relevantSection.substring(0, 100));
      
      // Smart format for SMS with complete recommendations
      let formatted = this.formatLocalRecommendationForSMS(relevantSection, requestType);
      
      // Add personal touch if guest name available
      const guestName = context?.guest_name;
      if (guestName) {
        formatted = `${guestName}, ${formatted}`;
      }
      
      return MessageUtils.ensureSmsLimit(formatted);
    }
    
    console.log('❌ No relevant section found in local recommendations');
    return null;
  }
  
  // ✅ NEW: Extract specific sections from local recommendations
  private extractSectionFromRecommendations(recommendations: string, keywords: string[]): string {
    const lines = recommendations.split('\n');
    let relevantLines: string[] = [];
    let foundSection = false;
    
    for (const line of lines) {
      const lowerLine = line.toLowerCase();
      
      // Check if this line contains any of our keywords
      const hasKeyword = keywords.some(keyword => lowerLine.includes(keyword));
      
      if (hasKeyword || foundSection) {
        relevantLines.push(line.trim());
        foundSection = true;
        
        // Stop if we hit a new section (lines starting with ***)
        if (foundSection && line.startsWith('***') && relevantLines.length > 1) {
          break;
        }
      }
    }
    
    return relevantLines.join(' ').trim();
  }
  
  // ✅ ENHANCED: Format local recommendation for SMS with smart truncation
  private formatLocalRecommendationForSMS(content: string, requestType: string): string {
    // Clean up formatting
    let formatted = content
      .replace(/\*\*\*/g, '') // Remove section markers
      .replace(/--/g, '•')    // Replace -- with bullets
      .replace(/\n+/g, ' ')   // Replace line breaks with spaces
      .replace(/\s+/g, ' ')   // Clean up multiple spaces
      .trim();
    
    // Extract first complete recommendation if too long
    if (formatted.length > 140) {
      const firstRec = this.extractFirstCompleteRecommendation(formatted);
      if (firstRec) {
        formatted = firstRec + ' Want more?';
      } else {
        // Truncate at sentence boundary
        formatted = this.truncateAtSentence(formatted, 140);
      }
    }
    
    // Add context based on request type
    let prefix = '';
    if (requestType.includes('coffee')) {
      prefix = '☕ ';
    } else if (requestType.includes('dinner') || requestType.includes('restaurant')) {
      prefix = '🍽️ ';
    } else if (requestType.includes('attractions') || requestType.includes('activity')) {
      prefix = '🎯 ';
    } else if (requestType.includes('grocery')) {
      prefix = '🛒 ';
    }
    
    return prefix + formatted;
  }

  /**
   * Extract first complete recommendation from text
   */
  private extractFirstCompleteRecommendation(text: string): string | null {
    // Try to split by bullets or dashes
    const items = text.split(/•|—|--|\n/);
    
    for (const item of items) {
      const trimmed = item.trim();
      // Look for items that are substantial (>30 chars) and contain location names
      if (trimmed.length > 30 && trimmed.length < 140) {
        // Check if it looks like a recommendation (has location name or description)
        if (/[A-Z][a-z]+/.test(trimmed) || /\d+\s*min/.test(trimmed)) {
          return trimmed;
        }
      }
    }
    
    // If no bullet-separated items, try sentences
    const sentences = text.split(/\.\s+/);
    for (const sentence of sentences) {
      const trimmed = sentence.trim();
      if (trimmed.length > 30 && trimmed.length < 140) {
        return trimmed + '.';
      }
    }
    
    return null;
  }

  /**
   * Truncate text at sentence boundary
   */
  private truncateAtSentence(text: string, maxLength: number): string {
    if (text.length <= maxLength) {
      return text;
    }
    
    // Find last sentence ending before maxLength
    const upToMax = text.substring(0, maxLength);
    const lastPeriod = upToMax.lastIndexOf('.');
    const lastExclaim = upToMax.lastIndexOf('!');
    const lastQuestion = upToMax.lastIndexOf('?');
    
    const lastSentenceEnd = Math.max(lastPeriod, lastExclaim, lastQuestion);
    
    if (lastSentenceEnd > maxLength / 2) {
      // Good sentence boundary found
      return text.substring(0, lastSentenceEnd + 1);
    }
    
    // No good boundary, just truncate with ellipsis
    return text.substring(0, maxLength - 3) + '...';
  }

  // ✅ NEW: Helper functions for enhanced recommendation handling
  private categorizeRequestTypeByIntent(intent: string, message: string): string {
    switch (intent) {
      case 'ask_coffee_recommendations':
        return 'coffee';
      case 'ask_attractions':
        return 'attractions';
      case 'ask_food_recommendations':
        if (message.toLowerCase().includes('dinner')) return 'dinner';
        if (message.toLowerCase().includes('lunch')) return 'lunch';
        if (message.toLowerCase().includes('breakfast')) return 'breakfast';
        return 'restaurant';
      default:
        return intent.replace('ask_', '');
    }
  }

  private extractFiltersForIntent(intent: string, message: string): string[] {
    const filters: string[] = [];
    const lowerMessage = message.toLowerCase();
    
    if (intent === 'ask_coffee_recommendations') {
      if (lowerMessage.includes('pastry') || lowerMessage.includes('pastries')) filters.push('pastries');
      if (lowerMessage.includes('breakfast')) filters.push('breakfast');
      if (lowerMessage.includes('espresso') || lowerMessage.includes('latte')) filters.push('specialty coffee');
    } else if (intent === 'ask_food_recommendations') {
      if (lowerMessage.includes('seafood')) filters.push('seafood');
      if (lowerMessage.includes('vegetarian')) filters.push('vegetarian');
      if (lowerMessage.includes('authentic') || lowerMessage.includes('local')) filters.push('local cuisine');
    } else if (intent === 'ask_attractions') {
      if (lowerMessage.includes('outdoor') || lowerMessage.includes('nature')) filters.push('outdoor');
      if (lowerMessage.includes('historic') || lowerMessage.includes('museum')) filters.push('historic');
      if (lowerMessage.includes('family')) filters.push('family-friendly');
    }
    
    return filters;
  }

  private extractRejectedOptions(conversation: Conversation, message: string): string[] {
    const rejected: string[] = [];
    const context = conversation.conversation_context || {};
    
    // Look for "not" phrases in current message
    if (message.toLowerCase().includes('not ') || message.toLowerCase().includes("don't")) {
      // Extract what they don't want - this is a simplified version
      if (message.toLowerCase().includes('not chains')) rejected.push('chain restaurants');
      if (message.toLowerCase().includes('not fast food')) rejected.push('fast food');
    }
    
    // Look at conversation history for previous suggestions they may have rejected
    const lastRecommendations = conversation.last_recommendations;
    if (lastRecommendations && (message.toLowerCase().includes('different') || 
                               message.toLowerCase().includes('other') ||
                               message.toLowerCase().includes('something else'))) {
      // They want different recommendations, so add previous ones to rejected list
      // This is a simplified extraction - could be enhanced further
      if (lastRecommendations.includes('Starbucks')) rejected.push('Starbucks');
      if (lastRecommendations.includes('McDonald')) rejected.push("McDonald's");
    }
    
    return rejected;
  }

  /**
   * ✅ PHASE 1: Enhanced Knowledge-First Processing with Urgency Handling
   * Implements hierarchical response system: Urgency → Property Knowledge → External AI → Fallback
   */
  private async processWithKnowledgeFirst(intent: string, message: string, property: Property, conversation: Conversation) {
    console.log('🔍 Enhanced knowledge-first processing:', { intent, message: message.substring(0, 50) });
    
    // PRIORITY 1: Handle urgent access issues immediately
    if (intent === 'ask_access' && IntentRecognitionService.detectUrgency(message)) {
      console.log('🚨 URGENT ACCESS ISSUE DETECTED');
      return await this.handleUrgentAccessIssue(property, message, conversation);
    }
    
    // PRIORITY 2: Property knowledge base search for property-specific intents
    if (this.isPropertyIntent(intent)) {
      console.log('🏠 Property intent detected, searching knowledge base first');
      const propertyResponse = await this.handlePropertyKnowledgeFirst(intent, message, property, conversation);
      if (propertyResponse) {
        return propertyResponse;
      }
    }
    
    // PRIORITY 3: Direction/distance queries - use direct location handler (NO food AI!)
    if (this.isDirectionIntent(intent)) {
      console.log('🗺️ Direction intent detected, using location analyzer');
      return await this.handleLocationInfoWithContext(intent, property, message, conversation);
    }
    
    // PRIORITY 4: Food/recommendation queries - route to restaurant AI
    if (this.isLocationIntent(intent)) {
      console.log('🌍 Location intent detected, routing to external AI');
      return await this.handleRecommendationWithContext(intent, property, message, conversation);
    }

    // STEP 1: Route the query intelligently for other cases
    const routeDecision = EnhancedIntentRouter.routeQuery(message, intent, property);
    console.log('🧭 Route decision:', routeDecision);

    // STEP 2: Handle based on routing decision
    switch (routeDecision.route) {
      case 'property_knowledge':
        console.log('✅ Using property knowledge directly');
        if (routeDecision.needsAI) {
          // Enhance property knowledge with AI context
          const enhancedPrompt = EnhancedIntentRouter.enhancePromptWithPropertyContext(message, property);
          const aiEnhancement = await this.getAIEnhancement(enhancedPrompt, property, conversation);
          const combinedResponse = this.combineKnowledgeWithAI(routeDecision.content!, aiEnhancement);
          return await this.updateConversationAndRespond(conversation.phone_number, intent, combinedResponse, conversation);
        } else {
          // Use property knowledge as-is
          return await this.updateConversationAndRespond(conversation.phone_number, intent, routeDecision.content!, conversation);
        }

      case 'external_ai':
        console.log('🤖 Routing to external AI for location-based query');
        // For location-based queries, always use AI recommendations
        if (this.isLocationBasedQuery(intent, message)) {
          console.log('🌍 Processing location-based query with AI');
          return await this.handleRecommendationWithDiversification(intent, property, message, conversation);
        } else if (this.isRecommendationIntent(intent)) {
          return await this.handleRecommendationWithDiversification(intent, property, message, conversation);
        } else {
          // Handle other AI queries with Perplexity
          const aiResponse = await this.getAIEnhancement(message, property, conversation);
          if (aiResponse && aiResponse.length > 20) {
            return await this.updateConversationAndRespond(conversation.phone_number, intent, aiResponse, conversation);
          }
        }
        // No break - fall through to clarification if AI fails

      case 'clarification':
        console.log('❓ Providing clarification');
        if (routeDecision.content && routeDecision.content.length > 10) {
          return await this.updateConversationAndRespond(conversation.phone_number, intent, routeDecision.content, conversation);
        }
        // No break - fall through to error handling

      case 'error':
      default:
        console.log('⚠️ Knowledge-first processing failed, returning null for fallback');
        return null; // Return null so the main flow can handle fallback
    }
  }

  // NEW: Handle urgent access issues with immediate property data response
  private async handleUrgentAccessIssue(property: Property, message: string, conversation: Conversation): Promise<ProcessingResult> {
    console.log('🚨 Handling urgent access issue');
    
    let response = "I see you're having trouble getting in. Let me help you right away.\n\n";
    
    // Get access instructions from property data
    if (property.access_instructions) {
      response += `🔑 Access Instructions:\n${property.access_instructions}\n\n`;
    }
    
    // Add emergency contact if available
    if (property.emergency_contact) {
      response += `📞 If you still can't get in, contact:\n${property.emergency_contact}`;
    } else {
      response += `📞 If you still need help, please let me know and I'll connect you with the host immediately.`;
    }
    
    return {
      response: [response],
      shouldUpdateState: false
    };
  }

  // NEW: Check if intent is property-specific (should search knowledge base first)
  private isPropertyIntent(intent: string): boolean {
    const propertyIntents = [
      'ask_access', 'ask_wifi', 'ask_parking', 'ask_checkout_time', 
      'ask_checkin_time', 'ask_amenity', 'ask_emergency_contact'
    ];
    return propertyIntents.includes(intent);
  }

  // NEW: Check if intent is direction-based (should use location analyzer, NOT food AI)
  private isDirectionIntent(intent: string): boolean {
    const directionIntents = ['ask_directions', 'ask_attractions'];
    return directionIntents.includes(intent);
  }

  // NEW: Check if intent is location-based (should route to AI)
  private isLocationIntent(intent: string): boolean {
    const locationIntents = [
      'ask_food_recommendations', 'ask_coffee_recommendations', 'ask_grocery_transport'
    ];
    return locationIntents.includes(intent);
  }

  // NEW: Handle property knowledge first for property intents
  private async handlePropertyKnowledgeFirst(intent: string, message: string, property: Property, conversation: Conversation): Promise<ProcessingResult | null> {
    const dataResponse = PropertyDataExtractor.extractPropertyData(property, intent, message);
    
    if (dataResponse.hasData) {
      console.log('✅ Property data found:', dataResponse.dataType);
      
      // Add conversational context based on intent
      let response = dataResponse.content;
      
      if (intent === 'ask_access' && IntentRecognitionService.detectUrgency(message)) {
        response = "I see you need access help. " + response;
        if (property.emergency_contact) {
          response += `\n\n📞 If you need immediate assistance: ${property.emergency_contact}`;
        }
      }
      
      return {
        response: [response],
        shouldUpdateState: false
      };
    }
    
    return null;
  }

  /**
   * Check if query is location-based
   */
  private isLocationBasedQuery(intent: string, message: string): boolean {
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

    const locationKeywords = [
      'how far', 'distance', 'directions', 'drive to', 'walk to',
      'restaurant', 'food', 'coffee', 'attraction', 'activity',
      'nearby', 'close', 'around here', 'local'
    ];

    const lowerMessage = message.toLowerCase();
    return locationKeywords.some(keyword => lowerMessage.includes(keyword));
  }

  /**
   * Get AI enhancement for property knowledge
   */
  private async getAIEnhancement(prompt: string, property: Property, conversation: Conversation): Promise<string> {
    try {
      // Try Perplexity first for real-time local information
      const perplexityResponse = await PerplexityRecommendationService.getLocalRecommendations(
        property,
        prompt,
        conversation,
        'general',
        []
      );
      
      if (perplexityResponse && perplexityResponse.length > 20) {
        return perplexityResponse;
      }
    } catch (error) {
      console.log('⚠️ Perplexity enhancement failed, using fallback');
    }

    // Fallback to local property data
    return this.generateLocalPropertyResponse(prompt, property);
  }

  /**
   * Combine property knowledge with AI enhancement
   */
  private combineKnowledgeWithAI(propertyKnowledge: string, aiEnhancement: string): string {
    if (!aiEnhancement || aiEnhancement.length < 20) {
      return propertyKnowledge;
    }

    // If both are substantial, combine them intelligently
    if (propertyKnowledge.length > 50 && aiEnhancement.length > 50) {
      return `${propertyKnowledge}\n\n${aiEnhancement}`;
    }

    // Otherwise, use the longer/better response
    return aiEnhancement.length > propertyKnowledge.length ? aiEnhancement : propertyKnowledge;
  }

  /**
   * Generate local property response when AI is unavailable
   */
  private generateLocalPropertyResponse(query: string, property: Property): string {
    const lowerQuery = query.toLowerCase();
    
    // Check for local recommendations in property data
    if (property.local_recommendations) {
      const localRecs = property.local_recommendations.toLowerCase();
      
      if (lowerQuery.includes('food') || lowerQuery.includes('restaurant')) {
        if (localRecs.includes('restaurant') || localRecs.includes('dining')) {
          return property.local_recommendations;
        }
      }
      
      if (lowerQuery.includes('activity') || lowerQuery.includes('attraction')) {
        if (localRecs.includes('activity') || localRecs.includes('attraction') || localRecs.includes('park')) {
          return property.local_recommendations;
        }
      }
    }

    // Fallback to contextual suggestion
    return `I'd love to help you find local recommendations! Let me know what specifically you're looking for near ${property.address || 'your property'}.`;
  }

  private async processConfirmedStateMessage(message: string, conversation: Conversation, property: Property, phoneNumber: string) {
    // Re-run the main processing logic now that we're in confirmed state
    const intentResult = IntentRecognitionService.recognizeIntent(message);
    console.log('🎯 Processing confirmed state message with intent:', intentResult.intent);

    // PHASE 3: Enhanced intent detection for food, coffee & attraction queries with diversification
    if (intentResult.intent === 'ask_food_recommendations' || 
        intentResult.intent === 'ask_coffee_recommendations' || 
        intentResult.intent === 'ask_attractions') {
      const enhancedResponse = await this.handleEnhancedRecommendationWithDiversification(intentResult.intent, property, message, conversation);
      if (enhancedResponse) {
        return enhancedResponse;
      }
    }

    // Handle recommendation intents with enhanced context and diversification
    console.log('🎯 Detected recommendation intent:', intentResult.intent);
    if (this.isRecommendationIntent(intentResult.intent)) {
      const result = await this.handleRecommendationWithDiversification(intentResult.intent, property, message, conversation);
      console.log('📋 Recommendation result:', typeof result, result);
      return result;
    }

    // Property context enhancement
    const propertyContextResponse = await this.handlePropertyContextQueries(intentResult.intent, property, conversation, message);
    if (propertyContextResponse) {
      return await this.updateConversationAndRespond(phoneNumber, intentResult.intent, propertyContextResponse, conversation);
    }

    // For any other intents, continue with standard flow
    return null;
  }

  /**
   * Handle service requests that require host coordination
   */
  /**
   * Extract service information with 3-tier fallback system
   */
  private async extractServiceInfo(
    property: Property,
    serviceType: string
  ): Promise<{
    price?: number;
    unit?: string;
    description?: string;
    notes?: string;
    managementName?: string;
    contactInfo?: string;
    source: 'structured' | 'ai_extracted' | 'generic';
  }> {
    const managementName = property.management_company_name || 'your property management';
    const contactInfo = property.emergency_contact || 'your host';
    
    // Priority 1: Check structured service_fees
    if (property.service_fees && property.service_fees[serviceType]) {
      const serviceData = property.service_fees[serviceType];
      console.log(`✅ Found structured data for ${serviceType}`);
      return {
        ...serviceData,
        managementName,
        contactInfo,
        source: 'structured'
      };
    }
    
    // Priority 2: AI extraction from knowledge base
    console.log(`🤖 Attempting AI extraction for ${serviceType}`);
    const aiExtracted = await this.aiExtractServiceInfo(property, serviceType, managementName);
    if (aiExtracted) {
      return {
        ...aiExtracted,
        managementName,
        contactInfo,
        source: 'ai_extracted'
      };
    }
    
    // Priority 3: Generic fallback
    console.log(`ℹ️ Using generic fallback for ${serviceType}`);
    return {
      managementName,
      contactInfo,
      source: 'generic'
    };
  }

  /**
   * Use AI to extract service information from knowledge base
   */
  private async aiExtractServiceInfo(
    property: Property,
    serviceType: string,
    managementName: string
  ): Promise<{ price?: number; unit?: string; description?: string; notes?: string } | null> {
    const knowledgeText = [
      property.knowledge_base,
      property.special_notes,
      property.local_recommendations
    ].filter(Boolean).join('\n\n').substring(0, 2000);
    
    if (!knowledgeText || knowledgeText.length < 20) {
      return null;
    }
    
    try {
      const prompt = `Extract ${serviceType.replace(/_/g, ' ')} service information from this property knowledge base.
      
Knowledge Base:
${knowledgeText}

Return ONLY a JSON object with these fields (or empty object if not found):
{
  "price": number (if mentioned),
  "unit": "per_day" | "per_booking" | "per_person" | "flat_fee" (if mentioned),
  "description": "brief description" (if mentioned),
  "notes": "any special instructions" (if mentioned)
}`;

      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${Deno.env.get('OPENAI_API_KEY')}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            { role: 'system', content: 'You are a data extraction assistant. Return only valid JSON.' },
            { role: 'user', content: prompt }
          ],
          temperature: 0.3,
          max_tokens: 300
        }),
      });

      if (!response.ok) {
        console.warn('AI extraction failed:', response.status);
        return null;
      }

      const data = await response.json();
      const extracted = JSON.parse(data.choices[0].message.content);
      
      if (Object.keys(extracted).length > 0 && (extracted.price || extracted.description)) {
        console.log('✅ AI successfully extracted service info');
        return extracted;
      }
      
      return null;
    } catch (error) {
      console.warn('AI extraction error:', error);
      return null;
    }
  }

  private async handleServiceRequest(
    intent: string,
    property: Property,
    message: string,
    conversationContext: any,
    phoneNumber: string
  ): Promise<any> {
    let response = '';
    
    switch (intent) {
      case 'request_pool_heat_service': {
        const serviceInfo = await this.extractServiceInfo(property, 'pool_heat');
        
        if (serviceInfo.source === 'structured' || serviceInfo.source === 'ai_extracted') {
          const priceText = serviceInfo.price 
            ? `$${serviceInfo.price}${serviceInfo.unit ? ' ' + serviceInfo.unit.replace(/_/g, ' ') : ''}`
            : 'Contact for pricing';
          
          response = `I can help you coordinate pool heating! 🏊‍♀️\n\n` +
            `Pool heating is ${priceText} and needs to be arranged through ${serviceInfo.managementName}.\n\n`;
          
          if (serviceInfo.notes) {
            response += `${serviceInfo.notes}\n\n`;
          }
          
          response += `Please text them at ${serviceInfo.contactInfo} to add this to your reservation, or I can notify them for you. ` +
            `Would you like me to send them a message?`;
        } else {
          response = `I can help coordinate pool heating! Please contact ${serviceInfo.managementName} at ${serviceInfo.contactInfo} ` +
            `for pricing and availability. They'll be happy to set this up for you.`;
        }
        break;
      }
        
      case 'request_amenity_access': {
        const amenityType = this.detectRequestedAmenity(message);
        const serviceInfo = await this.extractServiceInfo(property, 'resort_amenities');
        
        if (amenityType === 'waterpark' || amenityType === 'resort_amenities') {
          if (serviceInfo.source === 'structured' || serviceInfo.source === 'ai_extracted') {
            const priceText = serviceInfo.price 
              ? `$${serviceInfo.price}${serviceInfo.unit ? ' ' + serviceInfo.unit.replace(/_/g, ' ') : ''}`
              : 'Contact for pricing';
            
            const description = serviceInfo.description || 'the waterpark, pools, golf, gym, tennis, and more';
            
            response = `Great choice! Resort amenity access includes ${description}. 🎉\n\n` +
              `**Cost:** ${priceText}\n\n`;
            
            if (serviceInfo.notes) {
              response += `${serviceInfo.notes}\n\n`;
            } else {
              response += `${serviceInfo.managementName} will coordinate your access. `;
            }
            
            response += `Contact them at ${serviceInfo.contactInfo} to get this set up!`;
          } else {
            response = `Great choice! Please contact ${serviceInfo.managementName} at ${serviceInfo.contactInfo} ` +
              `to arrange resort amenity access. They'll provide pricing and get everything set up for you.`;
          }
        } else {
          response = `I can help coordinate that! Please contact ${serviceInfo.managementName} at ${serviceInfo.contactInfo} to arrange access. ` +
            `They'll get everything set up for you.`;
        }
        break;
      }
        
      case 'request_additional_service': {
        const detectedService = this.detectRequestedService(message);
        const serviceKey = detectedService.toLowerCase().replace(/\s+/g, '_');
        const serviceInfo = await this.extractServiceInfo(property, serviceKey);
        
        if (serviceInfo.source === 'structured' || serviceInfo.source === 'ai_extracted') {
          const priceText = serviceInfo.price 
            ? `$${serviceInfo.price}${serviceInfo.unit ? ' ' + serviceInfo.unit.replace(/_/g, ' ') : ''}`
            : 'available';
          
          response = `${serviceInfo.managementName} offer ${detectedService} services! ${priceText ? `Pricing: ${priceText}.` : ''}\n\n`;
          
          if (serviceInfo.description) {
            response += `${serviceInfo.description}\n\n`;
          }
          
          response += `Contact them at ${serviceInfo.contactInfo} for details and to coordinate. 🌟`;
        } else {
          response = `${serviceInfo.managementName} may offer ${detectedService} services! Contact them at ${serviceInfo.contactInfo} ` +
            `for pricing and availability. They'll be happy to coordinate this for your stay. 🌟`;
        }
        break;
      }
        
      default: {
        const serviceInfo = await this.extractServiceInfo(property, 'general');
        response = `I can help coordinate that with ${serviceInfo.managementName}. Contact them at ${serviceInfo.contactInfo} for assistance!`;
      }
    }
    
    // Track this as shared information
    const updatedContext = ConversationMemoryManager.trackSharedInformation(conversationContext, {
      topic: 'service_request_' + intent,
      content: response,
      summary: `Service request: ${intent}`
    });
    
    await this.conversationManager.updateConversationState(phoneNumber, {
      conversation_context: updatedContext,
      last_intent: intent,
      last_response: response
    });
    
    return {
      messages: MessageUtils.ensureSmsLimit(response),
      shouldUpdateState: false
    };
  }

  /**
   * Handle general knowledge queries (external to property)
   */
  private async handleGeneralKnowledgeQuery(
    property: Property,
    message: string,
    conversationContext: any,
    phoneNumber: string
  ): Promise<any> {
    console.log('🌐 Routing general knowledge query to AI service');
    
    // Build context-aware prompt for OpenAI
    const locationContext = PropertyLocationAnalyzer.analyzePropertyLocation(property.address);
    
    const systemPrompt = `You are a helpful local travel concierge for guests staying near ${locationContext.nearbyAttractions.join(', ')}. 
Property location: ${property.address}

Provide CURRENT, ACCURATE information about:
- Theme park hours (Disney, Universal, etc.)
- Ticket purchasing options
- Crowd calendars and best times to visit
- General Orlando area attractions and dining

Keep responses concise (under 300 characters) and practical. Include specific details like hours, prices, or booking websites when relevant.`;
    
    // Route to recommendation service's OpenAI integration
    const aiResponse = await RecommendationService.getGeneralInformation(
      message,
      systemPrompt,
      locationContext
    );
    
    if (aiResponse && aiResponse.content) {
      // Track shared information
      const updatedContext = ConversationMemoryManager.trackSharedInformation(conversationContext, {
        topic: 'general_knowledge',
        content: aiResponse.content,
        summary: 'General info: ' + message.substring(0, 50)
      });
      
      await this.conversationManager.updateConversationState(phoneNumber, {
        conversation_context: updatedContext,
        last_intent: 'ask_general_knowledge',
        last_response: aiResponse.content
      });
      
      return {
        messages: MessageUtils.ensureSmsLimit(aiResponse.content),
        shouldUpdateState: false
      };
    }
    
    // Fallback
    return {
      messages: ["I'd recommend checking the official websites or apps for the most current information. Is there anything specific about your property or local area I can help with?"],
      shouldUpdateState: false
    };
  }

  /**
   * Detect requested amenity type from message
   */
  private detectRequestedAmenity(message: string): string {
    const lowerMsg = message.toLowerCase();
    
    if (lowerMsg.includes('waterpark') || lowerMsg.includes('water park')) {
      return 'waterpark';
    }
    if (lowerMsg.includes('gym') || lowerMsg.includes('fitness')) {
      return 'gym';
    }
    if (lowerMsg.includes('golf')) {
      return 'golf';
    }
    if (lowerMsg.includes('resort amenities') || lowerMsg.includes('resort access')) {
      return 'resort_amenities';
    }
    
    return 'general';
  }

  /**
   * Detect requested service type from message
   */
  private detectRequestedService(message: string): string {
    const lowerMsg = message.toLowerCase();
    
    if (lowerMsg.includes('grocery') || lowerMsg.includes('groceries')) {
      return 'grocery delivery';
    }
    if (lowerMsg.includes('chef') || lowerMsg.includes('cooking')) {
      return 'private chef';
    }
    if (lowerMsg.includes('massage') || lowerMsg.includes('spa')) {
      return 'massage/spa';
    }
    if (lowerMsg.includes('clean')) {
      return 'cleaning';
    }
    
    return 'additional';
  }

  /**
   * Get topic from intent for repetition tracking
   */
  private extractTopicFromIntent(intent: string, message: string): string {
    const intentTopicMap: Record<string, string> = {
      'ask_wifi': 'wifi',
      'ask_parking': 'parking',
      'ask_checkout_time': 'checkout',
      'ask_checkin_time': 'checkin',
      'ask_access': 'access',
      'ask_amenity': 'amenities',
      'ask_emergency_contact': 'emergency_contact',
      'ask_weather': 'weather',
      'ask_packing_tips': 'packing',
      'ask_best_time_to_visit': 'best_time_visit',
      'ask_transportation': 'transportation',
      'ask_local_events': 'local_events',
      'ask_resort_amenities': 'resort_amenities',
      'request_pool_heat_service': 'pool_heat',
      'request_amenity_access': 'amenity_access',
      'ask_general_knowledge': 'general_info'
    };
    
    return intentTopicMap[intent] || intent;
  }

  /**
   * Extract destination from transportation query
   */
  private extractDestinationFromMessage(message: string): string | null {
    const lowerMsg = message.toLowerCase();
    
    if (lowerMsg.includes('disney')) return 'Disney';
    if (lowerMsg.includes('universal')) return 'Universal';
    if (lowerMsg.includes('airport') || lowerMsg.includes('mco')) return 'airport';
    if (lowerMsg.includes('downtown')) return 'downtown';
    
    return null;
  }

  /**
   * Update conversation state helper
   */
  private async updateConversationState(phoneNumber: string, updates: any): Promise<void> {
    try {
      await this.conversationManager.updateConversationState(phoneNumber, updates);
    } catch (error) {
      console.error('❌ Error updating conversation state:', error);
    }
  }
}

interface ProcessingResult {
  response: string;
  shouldUpdateState: boolean;
}
