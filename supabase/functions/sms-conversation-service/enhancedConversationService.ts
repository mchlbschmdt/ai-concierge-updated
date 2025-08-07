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
      
      try {
        const perplexityRecommendation = await PerplexityRecommendationService.getLocalRecommendations(
          property,
          message,
          conversation,
          requestType,
          diversificationResult.rejectedOptions
        );
        
        console.log('✅ Perplexity recommendation received:', perplexityRecommendation);
        
        // Check if Perplexity returned valid content
        if (perplexityRecommendation && perplexityRecommendation.length > 20 && !perplexityRecommendation.includes('error') && !perplexityRecommendation.includes('sorry')) {
          console.log('✅ Using Perplexity recommendation');
          
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
        } else {
          console.log('⚠️ Perplexity response invalid, falling back to local data');
          throw new Error('Invalid Perplexity response');
        }
      } catch (error) {
        console.log('❌ Perplexity failed, using local property recommendations:', error.message);
        
        // Fallback to local property recommendations
        const localResponse = await this.getLocalRecommendationsFallback(property, requestType, message, context);
        
        if (localResponse) {
          console.log('✅ Using local fallback recommendation');
          
          // Update conversation with the fallback recommendation
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
        
        // If both fail, provide a helpful response
        const guestName = context?.guest_name;
        const namePrefix = guestName ? `${guestName}, ` : '';
        return {
          response: `${namePrefix}I'd love to help with ${requestType} recommendations! Let me check what I have for ${property.property_name}. What specifically are you in the mood for?`,
          shouldUpdateState: false
        };
      }
      
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

  // ✅ Enhanced contextual fallback - NO MORE GENERIC RESPONSES
  private async generateContextualFallback(conversation: Conversation, property: Property, intent?: string, message?: string) {
    const context = conversation.conversation_context || {};
    const conversationFlow = context.conversation_flow || {};
    
    console.log('🔧 Generating contextual fallback for:', { intent, message: message?.substring(0, 50) });
    
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
    
    // For property-specific queries, try to extract information from property data
    if (intent && this.isPropertySpecificIntent(intent)) {
      console.log('🏠 Property-specific query, checking property data');
      const propertyResponse = await this.handlePropertyIntentWithDataExtraction(intent, property, conversation, message || '');
      if (propertyResponse) {
        return propertyResponse;
      }
    }
    
    // Last resort: Provide helpful contextual guidance instead of generic responses
    const namePrefix = context.guest_name ? `${context.guest_name}, ` : '';
    const helpfulResponse = this.generateHelpfulResponse(intent, property, namePrefix, message);
    
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

  // ✅ NEW: Get local recommendations fallback from property data
  private async getLocalRecommendationsFallback(property: Property, requestType: string, message: string, context: any): Promise<string | null> {
    console.log('🏠 Using local recommendations fallback for:', requestType);
    
    if (!property.local_recommendations) {
      console.log('❌ No local recommendations in property data');
      return null;
    }
    
    const localRecs = property.local_recommendations.toLowerCase();
    const lowerMessage = message.toLowerCase();
    const lowerRequestType = requestType.toLowerCase();
    
    // Extract relevant sections based on request type
    let relevantSection = '';
    
    if (lowerRequestType.includes('coffee') || lowerMessage.includes('coffee')) {
      relevantSection = this.extractSectionFromRecommendations(property.local_recommendations, ['coffee', 'cafe', 'morning']);
    } else if (lowerRequestType.includes('dinner') || lowerMessage.includes('dinner') || lowerMessage.includes('restaurant')) {
      relevantSection = this.extractSectionFromRecommendations(property.local_recommendations, ['restaurant', 'dining', 'eat', 'food']);
    } else if (lowerRequestType.includes('breakfast') || lowerMessage.includes('breakfast')) {
      relevantSection = this.extractSectionFromRecommendations(property.local_recommendations, ['breakfast', 'morning', 'coffee']);
    } else if (lowerRequestType.includes('attractions') || lowerMessage.includes('attraction') || lowerMessage.includes('activity')) {
      relevantSection = this.extractSectionFromRecommendations(property.local_recommendations, ['attraction', 'beach', 'museum', 'park', 'tour', 'scenic', 'historic', 'rainforest', 'fort', 'old san juan']);
    } else {
      // General food/dining fallback
      relevantSection = this.extractSectionFromRecommendations(property.local_recommendations, ['restaurant', 'dining', 'eat', 'food']);
    }
    
    if (relevantSection) {
      // Format for SMS and add personal touch
      const guestName = context?.guest_name;
      const namePrefix = guestName ? `${guestName}, ` : '';
      
      // Truncate to SMS length and add helpful context
      const formattedResponse = `${namePrefix}${this.formatLocalRecommendation(relevantSection, requestType)}`;
      
      return formattedResponse.length > 160 ? formattedResponse.substring(0, 157) + '...' : formattedResponse;
    }
    
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
  
  // ✅ NEW: Format local recommendation for SMS
  private formatLocalRecommendation(content: string, requestType: string): string {
    // Clean up formatting
    let formatted = content
      .replace(/\*\*\*/g, '') // Remove section markers
      .replace(/\n+/g, ' ')   // Replace line breaks with spaces
      .replace(/\s+/g, ' ')   // Clean up multiple spaces
      .trim();
    
    // Add context based on request type
    if (requestType.includes('coffee')) {
      formatted = `For coffee: ${formatted}`;
    } else if (requestType.includes('dinner') || requestType.includes('restaurant')) {
      formatted = `For dining: ${formatted}`;
    } else if (requestType.includes('attractions') || requestType.includes('activity')) {
      formatted = `For activities: ${formatted}`;
    }
    
    return formatted;
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
   * ✅ PHASE 1: Enhanced Knowledge-First Processing
   * Implements hierarchical response system: Property Knowledge → External AI → Fallback
   */
  private async processWithKnowledgeFirst(intent: string, message: string, property: Property, conversation: Conversation) {
    console.log('🔍 Enhanced knowledge-first processing:', { intent, message: message.substring(0, 50) });

    // STEP 1: Route the query intelligently
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

    // Fallback response
    return {
      response: "I'm here to help! What would you like to know about your stay?",
      shouldUpdateState: false
    };
  }
}

interface ProcessingResult {
  response: string;
  shouldUpdateState: boolean;
}
