import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { IntentRecognitionService } from './intentRecognitionService.ts';
import { ConversationMemoryManager } from './conversationMemoryManager.ts';
import { ConversationContextTracker } from './conversationContextTracker.ts';
import { ConversationalResponseGenerator } from './conversationalResponseGenerator.ts';
import { RecommendationService } from './recommendationService.ts';
import { ResponseGenerator } from './responseGenerator.ts';
import { MessageUtils } from './messageUtils.ts';
import { ConversationManager } from './conversationManager.ts';
import { PropertyService } from './propertyService.ts';
import { ResetHandler } from './resetHandler.ts';
import { VibeDetectionService } from './vibeDetectionService.ts';
import { PropertyKnowledgeService } from './propertyKnowledgeService.ts';
import { LocationService } from './locationService.ts';
import { MenuService } from './menuService.ts';
import { AmenityService } from './amenityService.ts';
import { WiFiTroubleshootingService } from './wifiTroubleshootingService.ts';
import { ContextualResponseService } from './contextualResponseService.ts';
import { Property } from './types.ts';

export class EnhancedConversationService {
  private conversationManager: ConversationManager;
  private propertyService: PropertyService;
  private recommendationService: RecommendationService;

  constructor(private supabase: SupabaseClient) {
    this.conversationManager = new ConversationManager(supabase);
    this.propertyService = new PropertyService(supabase);
    this.recommendationService = new RecommendationService(supabase, this.conversationManager);
  }

  async processMessage(
    phoneNumber: string,
    message: string
  ): Promise<{ messages: string[]; conversationalResponse: boolean; intent: string }> {
    console.log('🎯 Enhanced Conversation Service V2.5 - Processing message:', message);

    // Get conversation
    const conversation = await this.conversationManager.getOrCreateConversation(phoneNumber);
    console.log('📋 Current conversation state:', conversation.conversation_state);
    console.log('🏠 Current property_id:', conversation.property_id);

    // PRIORITY: Handle "travel" code before property validation
    const lowerMessage = message.toLowerCase().trim();
    if (lowerMessage === 'travel') {
      console.log('🌍 Travel code detected - routing to travel planner');
      
      if (conversation.property_id && conversation.conversation_state !== 'awaiting_property_id') {
        return {
          messages: ["You're currently assigned to a property. Text 'reset' first if you want to use the travel planner."],
          conversationalResponse: false,
          intent: 'travel_code_blocked'
        };
      }
      
      return {
        messages: ["Welcome to the Travel Planner! I can help you discover amazing destinations. Where would you like to explore?"],
        conversationalResponse: true,
        intent: 'travel_code_detected'
      };
    }

    // PRIORITY: Handle property code validation if user is awaiting property ID
    if (conversation.conversation_state === 'awaiting_property_id' && !conversation.property_id) {
      console.log('🔍 User in awaiting_property_id state, checking for property code...');
      return await this.handlePropertyCodeValidation(phoneNumber, message, conversation);
    }

    // Get property after potential code validation
    const property = conversation.property_id ? await this.propertyService.getPropertyById(conversation.property_id) : null;

    if (!property) {
      console.log('❌ No property found for conversation');
      return {
        messages: ["I need your property code to assist you. Please send your unique property code to get started."],
        conversationalResponse: false,
        intent: 'missing_property'
      };
    }

    // Get property type for enhanced context
    const propertyType = LocationService.determinePropertyType(property.address || '');
    console.log('🏠 Property type determined:', propertyType);

    // WiFi Troubleshooting Flow
    const wifiTroubleshootingState = conversation.conversation_context?.wifi_troubleshooting_state;
    
    if (wifiTroubleshootingState === 'awaiting_troubleshooting_result') {
      return await this.handleWiFiTroubleshootingResponse(property, message, conversation, phoneNumber);
    }
    
    if (wifiTroubleshootingState === 'offering_host_contact') {
      return await this.handleHostContactResponse(property, message, conversation, phoneNumber);
    }

    // Check for WiFi issues (only after WiFi-related responses)
    if (WiFiTroubleshootingService.detectWiFiIssue(message, conversation.last_message_type)) {
      console.log('📶 WiFi issue detected, starting troubleshooting flow');
      return await this.handleWiFiTroubleshooting(property, message, conversation, phoneNumber);
    }

    // Enhanced menu-related queries with specific food detection
    if (MenuService.extractMenuIntent(message)) {
      console.log('📄 Menu intent detected');
      return await this.handleMenuRequest(property, message, conversation, phoneNumber);
    }

    // Enhanced amenity queries
    const amenityType = AmenityService.detectAmenityQuery(message);
    if (amenityType) {
      console.log('🏊 Amenity query detected:', amenityType);
      return await this.handleAmenityRequest(property, message, conversation, phoneNumber, amenityType);
    }

    // Check for contextual responses needed
    if (ContextualResponseService.shouldUseContextualResponse(message, conversation.conversation_context)) {
      console.log('🎯 Contextual response needed');
      return await this.handleContextualResponse(property, message, conversation, phoneNumber, propertyType);
    }

    // Enhanced dining follow-up OR new food request
    const diningState = conversation.conversation_context?.dining_conversation_state;
    const isFoodRelated = this.isFoodRelatedMessage(message);
    
    if (diningState === 'awaiting_vibe_preference' || (isFoodRelated && diningState === 'provided_additional_recs')) {
      console.log('🍽️ Detected dining follow-up or new food request');
      
      if (diningState === 'provided_additional_recs' && isFoodRelated) {
        console.log('🔄 Resetting dining state for new food request');
        await this.conversationManager.updateConversationState(phoneNumber, {
          conversation_context: {
            ...conversation.conversation_context,
            dining_conversation_state: 'awaiting_vibe_preference',
            dining_curated_used: []
          }
        });
      }
      
      return await this.handleDiningFollowUp(property, message, conversation.conversation_context, '', phoneNumber);
    }

    // Recognize intent with enhanced detection
    const intentResult = IntentRecognitionService.recognizeIntent(message);
    console.log('🧠 Intent recognized:', intentResult);

    // Handle vibe questions
    if (intentResult.intent === 'ask_venue_vibe') {
      console.log('✨ Processing vibe question');
      return await this.handleVibeQuestion(property, message, conversation, phoneNumber);
    }

    // Handle busyness questions
    if (intentResult.intent === 'ask_venue_busyness') {
      console.log('👥 Processing busyness question');
      return await this.handleBusynessQuestion(property, message, conversation, phoneNumber);
    }

    // Handle property-specific questions
    if (intentResult.intent === 'ask_property_specific') {
      console.log('🏠 Processing property-specific question');
      return await this.handlePropertySpecificQuestion(property, message, conversation, phoneNumber);
    }

    // Override generic intent for food-related messages
    if ((intentResult.intent === 'general_inquiry' || intentResult.intent === 'ask_multiple_requests') && isFoodRelated) {
      console.log('🍽️ Overriding intent to food recommendations due to food keywords');
      intentResult.intent = 'ask_food_recommendations';
      intentResult.confidence = 0.9;
    }

    // Handle conversation reset
    if (intentResult.intent === 'conversation_reset') {
      console.log('🔄 PROCESSING RESET - Using ResetHandler for complete property clearing');
      
      const resetUpdates = ResetHandler.getCompleteResetUpdates(conversation.conversation_context);
      console.log('🧹 Reset updates prepared:', resetUpdates);
      
      await this.conversationManager.updateConversationState(phoneNumber, resetUpdates);
      
      const resetResponse = ResetHandler.generateResetResponse();
      console.log('✅ Reset response generated:', resetResponse);

      return {
        messages: [resetResponse],
        conversationalResponse: true,
        intent: 'conversation_reset'
      };
    }

    // Handle food recommendation with enhanced conversational flow
    if (intentResult.intent === 'ask_food_recommendations') {
      console.log('🍽️ Processing food recommendation with enhanced conversational flow');
      return await this.handleConversationalDining(property, message, conversation, phoneNumber);
    }

    // Check for repetition prevention for other intents
    if (ConversationMemoryManager.shouldPreventRepetition(conversation.conversation_context, intentResult.intent)) {
      const repetitionResponse = ConversationMemoryManager.generateRepetitionResponse(
        intentResult.intent, 
        conversation.conversation_context?.guest_name
      );
      return {
        messages: [repetitionResponse],
        conversationalResponse: true,
        intent: intentResult.intent
      };
    }

    // Handle other recommendation intents with existing logic
    if (this.isOtherRecommendationIntent(intentResult.intent)) {
      console.log('🎯 Processing other recommendation request');
      
      const propertyRecommendations = this.checkPropertyRecommendations(property, intentResult.intent, message);
      
      if (propertyRecommendations) {
        console.log('🏠 Using property-specific recommendations');
        
        const updatedContext = ConversationMemoryManager.updateMemory(
          conversation.conversation_context,
          intentResult.intent,
          'property_recommendation',
          { type: intentResult.intent, content: propertyRecommendations }
        );

        await this.conversationManager.updateConversationState(phoneNumber, {
          conversation_context: updatedContext,
          last_message_type: intentResult.intent,
          last_recommendations: propertyRecommendations
        });

        // Add helpful next step
        const nextStep = ContextualResponseService.generateNextStepSuggestion(
          intentResult.intent, 
          propertyType, 
          conversation.conversation_context
        );
        const responseWithNextStep = `${propertyRecommendations}\n\n${nextStep}`;

        return {
          messages: [MessageUtils.ensureSmsLimit(responseWithNextStep)],
          conversationalResponse: true,
          intent: intentResult.intent
        };
      } else {
        console.log('🤖 Using OpenAI recommendations');
        const result = await this.recommendationService.getEnhancedRecommendations(property, message, conversation);
        
        const updatedContext = ConversationMemoryManager.updateMemory(
          conversation.conversation_context,
          intentResult.intent,
          'openai_recommendation',
          { type: intentResult.intent, content: result.response }
        );

        await this.conversationManager.updateConversationState(phoneNumber, {
          conversation_context: updatedContext,
          last_message_type: intentResult.intent
        });

        return {
          messages: [result.response],
          conversationalResponse: true,
          intent: intentResult.intent
        };
      }
    }

    // Check for follow-up intents
    const followUpIntent = ConversationContextTracker.detectFollowUpIntent(
      message, 
      conversation.conversation_context?.conversationFlow || {}
    );

    const finalIntent = followUpIntent || intentResult.intent;
    console.log('🔄 Final intent after follow-up detection:', finalIntent);

    // Handle general inquiry with enhanced contextual response
    if (finalIntent === 'general_inquiry') {
      console.log('❓ Handling general inquiry with contextual response');
      
      const contextualResponse = ContextualResponseService.generateClarificationQuestion(
        message, 
        conversation.conversation_context
      );
      
      const updatedContext = ConversationMemoryManager.updateMemory(
        conversation.conversation_context,
        finalIntent,
        'contextual_clarification'
      );

      await this.conversationManager.updateConversationState(phoneNumber, {
        conversation_context: updatedContext,
        last_message_type: finalIntent
      });

      return {
        messages: [MessageUtils.ensureSmsLimit(contextualResponse)],
        conversationalResponse: true,
        intent: finalIntent
      };
    }

    // Update conversation flow
    const existingFlow = conversation.conversation_context?.conversationFlow || {};
    const response = ConversationalResponseGenerator.generateContextualResponse(
      finalIntent,
      existingFlow,
      property,
      message,
      conversation.conversation_context?.guest_name
    );

    // Check if we need to use recommendation service
    if (response === 'USE_RECOMMENDATION_SERVICE') {
      console.log('🔄 Routing to recommendation service');
      const result = await this.recommendationService.getEnhancedRecommendations(property, message, conversation);
      
      const updatedContext = ConversationMemoryManager.updateMemory(
        conversation.conversation_context,
        finalIntent,
        'openai_recommendation',
        { type: finalIntent, content: result.response }
      );

      await this.conversationManager.updateConversationState(phoneNumber, {
        conversation_context: updatedContext,
        last_message_type: finalIntent
      });

      return {
        messages: [result.response],
        conversationalResponse: true,
        intent: finalIntent
      };
    }

    // Update conversation flow and memory
    const updatedFlow = ConversationContextTracker.updateConversationFlow(
      existingFlow,
      finalIntent,
      message,
      response
    );

    const updatedContext = ConversationMemoryManager.updateMemory(
      conversation.conversation_context,
      finalIntent,
      'conversational_response'
    );

    updatedContext.conversationFlow = updatedFlow;

    await this.conversationManager.updateConversationState(phoneNumber, {
      conversation_context: updatedContext,
      last_message_type: finalIntent
    });

    // Add helpful next step if it's a standard response
    const responseWithNextStep = response.includes('?') ? response : 
      `${response}\n\n${ContextualResponseService.generateNextStepSuggestion(finalIntent, propertyType, updatedContext)}`;

    return {
      messages: [MessageUtils.ensureSmsLimit(responseWithNextStep)],
      conversationalResponse: true,
      intent: finalIntent
    };
  }

  // Handle WiFi troubleshooting
  private async handleWiFiTroubleshooting(property: Property, message: string, conversation: any, phoneNumber: string) {
    console.log('📶 Starting WiFi troubleshooting flow');
    
    const response = WiFiTroubleshootingService.generateTroubleshootingSteps();
    
    const updatedContext = {
      ...conversation.conversation_context,
      wifi_troubleshooting_state: 'awaiting_troubleshooting_result',
      wifi_issue_reported: new Date().toISOString(),
      last_interaction: new Date().toISOString()
    };
    
    await this.conversationManager.updateConversationState(phoneNumber, {
      conversation_context: updatedContext
    });
    
    return {
      messages: [MessageUtils.ensureSmsLimit(response)],
      conversationalResponse: true,
      intent: 'wifi_troubleshooting'
    };
  }

  // Handle WiFi troubleshooting response
  private async handleWiFiTroubleshootingResponse(property: Property, message: string, conversation: any, phoneNumber: string) {
    console.log('📶 Processing WiFi troubleshooting response');
    
    const responseType = WiFiTroubleshootingService.detectTroubleshootingResponse(message);
    
    if (responseType === 'yes') {
      const updatedContext = {
        ...conversation.conversation_context,
        wifi_troubleshooting_state: null,
        wifi_resolved: new Date().toISOString()
      };
      
      await this.conversationManager.updateConversationState(phoneNumber, {
        conversation_context: updatedContext
      });
      
      return {
        messages: ["Great! Glad that helped get you connected. Need help with anything else—maybe checkout time or local recommendations?"],
        conversationalResponse: true,
        intent: 'wifi_resolved'
      };
    } else if (responseType === 'no') {
      const response = WiFiTroubleshootingService.generateHostContactOffer();
      
      const updatedContext = {
        ...conversation.conversation_context,
        wifi_troubleshooting_state: 'offering_host_contact'
      };
      
      await this.conversationManager.updateConversationState(phoneNumber, {
        conversation_context: updatedContext
      });
      
      return {
        messages: [response],
        conversationalResponse: true,
        intent: 'wifi_troubleshooting_escalation'
      };
    } else {
      return {
        messages: ["Did the troubleshooting steps help fix the WiFi connection? Reply with 'yes' if it's working or 'no' if you're still having trouble."],
        conversationalResponse: true,
        intent: 'wifi_troubleshooting_clarification'
      };
    }
  }

  // Handle host contact response
  private async handleHostContactResponse(property: Property, message: string, conversation: any, phoneNumber: string) {
    console.log('📞 Processing host contact response');
    
    const responseType = WiFiTroubleshootingService.detectTroubleshootingResponse(message);
    
    if (responseType === 'yes') {
      const response = WiFiTroubleshootingService.generateHostContactedConfirmation();
      
      const updatedContext = {
        ...conversation.conversation_context,
        wifi_troubleshooting_state: 'host_contacted',
        host_contacted_timestamp: new Date().toISOString()
      };
      
      await this.conversationManager.updateConversationState(phoneNumber, {
        conversation_context: updatedContext
      });
      
      return {
        messages: [response],
        conversationalResponse: true,
        intent: 'host_contacted'
      };
    } else {
      const updatedContext = {
        ...conversation.conversation_context,
        wifi_troubleshooting_state: null
      };
      
      await this.conversationManager.updateConversationState(phoneNumber, {
        conversation_context: updatedContext
      });
      
      return {
        messages: ["No problem! Feel free to try the troubleshooting steps again later, or let me know if you need help with anything else."],
        conversationalResponse: true,
        intent: 'wifi_troubleshooting_declined'
      };
    }
  }

  // Handle menu requests
  private async handleMenuRequest(property: Property, message: string, conversation: any, phoneNumber: string) {
    console.log('📄 Processing enhanced menu request');
    
    const lastRecommendedRestaurant = conversation.conversation_context?.last_recommended_restaurant;
    const specificFoodQuery = MenuService.detectSpecificFoodQuery(message);
    
    if (lastRecommendedRestaurant) {
      console.log('🍽️ Found last recommended restaurant:', lastRecommendedRestaurant);
      
      // Check for specific food queries
      if (specificFoodQuery) {
        const specificResponse = MenuService.generateSpecificFoodResponse(message, lastRecommendedRestaurant);
        return {
          messages: [MessageUtils.ensureSmsLimit(specificResponse)],
          conversationalResponse: true,
          intent: 'menu_request_specific'
        };
      }
      
      const menuLink = await MenuService.getMenuLink(lastRecommendedRestaurant);
      
      let response: string;
      if (menuLink) {
        response = `Here's the menu for ${lastRecommendedRestaurant}: ${menuLink}

Want help with reservations or directions?`;
      } else {
        response = MenuService.generateMenuResponse(lastRecommendedRestaurant, property.address);
      }
      
      return {
        messages: [MessageUtils.ensureSmsLimit(response)],
        conversationalResponse: true,
        intent: 'menu_request'
      };
    } else {
      return {
        messages: ["Which restaurant's menu would you like to see? Let me know the name and I'll help you find it!"],
        conversationalResponse: true,
        intent: 'menu_request_clarification'
      };
    }
  }

  // Handle amenity requests
  private async handleAmenityRequest(property: Property, message: string, conversation: any, phoneNumber: string, amenityType: string) {
    console.log('🏊 Processing enhanced amenity request:', amenityType);
    
    const propertyType = LocationService.determinePropertyType(property.address || '');
    const response = AmenityService.generateAmenityResponse(amenityType, propertyType, property.property_name);
    
    const updatedContext = ConversationMemoryManager.updateMemory(
      conversation.conversation_context,
      'amenity_request',
      'amenity_response',
      { type: amenityType, content: response }
    );
    
    await this.conversationManager.updateConversationState(phoneNumber, {
      conversation_context: updatedContext,
      last_message_type: 'amenity_request'
    });
    
    return {
      messages: [MessageUtils.ensureSmsLimit(response)],
      conversationalResponse: true,
      intent: 'amenity_request'
    };
  }

  // Handle contextual responses for vague messages
  private async handleContextualResponse(property: Property, message: string, conversation: any, phoneNumber: string, propertyType: string) {
    console.log('🎯 Processing contextual response for vague message');
    
    const clarificationResponse = ContextualResponseService.generateClarificationQuestion(
      message, 
      conversation.conversation_context
    );
    
    const updatedContext = ConversationMemoryManager.updateMemory(
      conversation.conversation_context,
      'contextual_clarification',
      'clarification_response',
      { type: 'contextual_clarification', content: clarificationResponse }
    );
    
    await this.conversationManager.updateConversationState(phoneNumber, {
      conversation_context: updatedContext,
      last_message_type: 'contextual_clarification'
    });
    
    return {
      messages: [MessageUtils.ensureSmsLimit(clarificationResponse)],
      conversationalResponse: true,
      intent: 'contextual_clarification'
    };
  }

  // Enhanced property code validation with address injection
  private async handlePropertyCodeValidation(phoneNumber: string, message: string, conversation: any) {
    console.log('🔍 Processing potential property code:', message);
    
    const cleanedMessage = message.trim().replace(/\D/g, '');
    
    if (!cleanedMessage || cleanedMessage.length < 3) {
      console.log('❌ Message does not appear to be a valid property code');
      return {
        messages: ["Please send your property code (the numbers from your booking confirmation). For example: 1434"],
        conversationalResponse: false,
        intent: 'invalid_property_code'
      };
    }

    console.log('🔍 Attempting to find property with code:', cleanedMessage);
    
    try {
      const property = await this.propertyService.findPropertyByCode(cleanedMessage);
      
      if (property) {
        console.log('✅ Valid property code found! Property:', property.property_name);
        
        const updatedContext = {
          ...conversation.conversation_context,
          property_confirmed: true,
          last_intent: 'property_code_validated',
          conversation_depth: 1,
          last_interaction: new Date().toISOString()
        };

        await this.conversationManager.updateConversationState(phoneNumber, {
          property_id: property.property_id,
          property_confirmed: true,
          conversation_state: 'property_confirmed',
          conversation_context: updatedContext,
          last_message_type: 'property_code_validation'
        });

        // ENHANCED: Welcome message with address injection
        const welcomeMessage = property.address 
          ? `Welcome to ${property.property_name} at ${property.address}! I'm your AI concierge and I'm here to help with any questions about your stay. How may I help you today?`
          : `Welcome to ${property.property_name}! I'm your AI concierge and I'm here to help with any questions about your stay. How may I help you today?`;
        
        return {
          messages: [welcomeMessage],
          conversationalResponse: true,
          intent: 'property_code_validated'
        };
      } else {
        console.log('❌ Invalid property code entered');
        return {
          messages: [`I couldn't find a property with code "${cleanedMessage}". Please double-check your property code from your booking confirmation and try again.`],
          conversationalResponse: false,
          intent: 'invalid_property_code'
        };
      }
    } catch (error) {
      console.error('❌ Error validating property code:', error);
      return {
        messages: ["There was an error processing your property code. Please try again or contact support."],
        conversationalResponse: false,
        intent: 'property_code_error'
      };
    }
  }

  // Enhanced restaurant recommendation with accurate distance
  private async getSingleRestaurantRecommendation(property: Property, message: string, conversation: any) {
    console.log('🤖 Getting single restaurant recommendation with enhanced distance accuracy');
    
    const propertyAddress = property.address || 'the property';
    const propertyName = property.property_name || 'your accommodation';
    
    const prompt = `You are a local dining concierge. A guest at ${propertyName}, ${propertyAddress} is asking: "${message}"

Provide EXACTLY ONE restaurant recommendation with accurate distance and drive time from the property address.

Format: "[Restaurant Name] ([distance], 🚗 [drive time], ⭐[rating]) — [brief insider description]"

Then ask: "What's your vibe — casual local spot, rooftop cocktails, or something upscale?"

Important: Calculate real distances from ${propertyAddress}. Be accurate with drive times.
Keep conversational and friendly. Total response under 160 characters.`;

    try {
      const response = await fetch('https://zutwyyepahbbvrcbsbke.supabase.co/functions/v1/openai-recommendations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`
        },
        body: JSON.stringify({ prompt })
      });

      if (response.ok) {
        const data = await response.json();
        
        const restaurantMatch = data.recommendation.match(/^([^(]+)/);
        if (restaurantMatch) {
          const restaurantName = restaurantMatch[1].trim();
          
          // Get accurate distance if available
          const distanceInfo = await LocationService.getAccurateDistance(
            propertyAddress,
            restaurantName
          );
          
          let enhancedRecommendation = data.recommendation;
          if (distanceInfo) {
            enhancedRecommendation = data.recommendation.replace(
              /\([^)]+\)/,
              `(${distanceInfo.distance}, 🚗 ${distanceInfo.duration})`
            );
          }
          
          await this.conversationManager.updateConversationState(conversation.phone_number, {
            conversation_context: {
              ...conversation.conversation_context,
              last_recommended_restaurant: restaurantName,
              last_food_query: message,
              last_interaction: new Date().toISOString()
            }
          });
          
          return { response: enhancedRecommendation };
        }
        
        return { response: data.recommendation };
      }
    } catch (error) {
      console.error('❌ Error getting single restaurant recommendation:', error);
    }
    
    return { response: "Having trouble with dining recommendations right now. Try asking about WiFi or check-in details instead!" };
  }

  // Enhanced amenity request handling with property context
  private async handleAmenityRequest(property: Property, message: string, conversation: any, phoneNumber: string, amenityType: string) {
    console.log('🏊 Processing enhanced amenity request:', amenityType);
    
    const propertyType = LocationService.determinePropertyType(property.address || '');
    const response = AmenityService.generateAmenityResponse(amenityType, propertyType, property.property_name);
    
    const updatedContext = ConversationMemoryManager.updateMemory(
      conversation.conversation_context,
      'amenity_request',
      'amenity_response',
      { type: amenityType, content: response }
    );
    
    await this.conversationManager.updateConversationState(phoneNumber, {
      conversation_context: updatedContext,
      last_message_type: 'amenity_request'
    });
    
    return {
      messages: [MessageUtils.ensureSmsLimit(response)],
      conversationalResponse: true,
      intent: 'amenity_request'
    };
  }

  // Handle vibe questions
  private async handleVibeQuestion(property: Property, message: string, conversation: any, phoneNumber: string) {
    console.log('✨ Handling vibe question');
    
    const placeName = this.extractPlaceNameFromMessage(message);
    
    if (!placeName) {
      return {
        messages: ["What specific place would you like to know the vibe of? For example, 'What's the vibe at Woodsy's Diner?'"],
        conversationalResponse: true,
        intent: 'ask_venue_vibe'
      };
    }
    
    const vibeInfo = this.getVibeFromPropertyRecommendations(property, placeName);
    
    let response: string;
    if (vibeInfo) {
      response = VibeDetectionService.generateVibeResponse(placeName, vibeInfo);
    } else {
      response = await this.getVibeFromOpenAI(property, placeName, message);
    }
    
    const updatedContext = ConversationMemoryManager.updateMemory(
      conversation.conversation_context,
      'ask_venue_vibe',
      'vibe_response',
      { type: 'ask_venue_vibe', content: response, vibe: vibeInfo || 'unknown' }
    );
    
    await this.conversationManager.updateConversationState(phoneNumber, {
      conversation_context: updatedContext
    });
    
    return {
      messages: [MessageUtils.ensureSmsLimit(response)],
      conversationalResponse: true,
      intent: 'ask_venue_vibe'
    };
  }

  // Handle busyness questions
  private async handleBusynessQuestion(property: Property, message: string, conversation: any, phoneNumber: string) {
    console.log('👥 Handling busyness question');
    
    const placeName = this.extractPlaceNameFromMessage(message);
    const currentHour = new Date().getHours();
    
    if (!placeName) {
      return {
        messages: ["Which place are you asking about? For example, 'Is Woodsy's busy right now?'"],
        conversationalResponse: true,
        intent: 'ask_venue_busyness'
      };
    }
    
    const placeType = this.getPlaceTypeFromRecommendations(property, placeName);
    
    const response = VibeDetectionService.generateBusynessResponse(placeName, currentHour, placeType);
    
    const updatedContext = ConversationMemoryManager.updateMemory(
      conversation.conversation_context,
      'ask_venue_busyness',
      'busyness_response',
      { type: 'ask_venue_busyness', content: response }
    );
    
    await this.conversationManager.updateConversationState(phoneNumber, {
      conversation_context: updatedContext
    });
    
    return {
      messages: [MessageUtils.ensureSmsLimit(response)],
      conversationalResponse: true,
      intent: 'ask_venue_busyness'
    };
  }

  // Handle property-specific questions
  private async handlePropertySpecificQuestion(property: Property, message: string, conversation: any, phoneNumber: string) {
    console.log('🏠 Handling property-specific question');
    
    const knowledgeResult = PropertyKnowledgeService.searchKnowledgeBase(property, message);
    
    if (knowledgeResult) {
      const response = `${knowledgeResult}\n\nNeed anything else about the property?`;
      
      const updatedContext = ConversationMemoryManager.updateMemory(
        conversation.conversation_context,
        'ask_property_specific',
        'knowledge_base_response',
        { type: 'ask_property_specific', content: response }
      );
      
      await this.conversationManager.updateConversationState(phoneNumber, {
        conversation_context: updatedContext
      });
      
      return {
        messages: [MessageUtils.ensureSmsLimit(response)],
        conversationalResponse: true,
        intent: 'ask_property_specific'
      };
    } else {
      const clarifyingQuestion = PropertyKnowledgeService.generateClarifyingQuestion(message);
      const hostContactOffer = PropertyKnowledgeService.generateHostContactOffer();
      
      const response = `${clarifyingQuestion}\n\n${hostContactOffer}`;
      
      const updatedContext = {
        ...conversation.conversation_context,
        awaiting_property_clarification: true,
        original_property_question: message,
        last_interaction: new Date().toISOString()
      };
      
      await this.conversationManager.updateConversationState(phoneNumber, {
        conversation_context: updatedContext
      });
      
      return {
        messages: [MessageUtils.ensureSmsLimit(response)],
        conversationalResponse: true,
        intent: 'ask_property_specific'
      };
    }
  }

  // Helper methods for the new functionality
  private extractPlaceNameFromMessage(message: string): string | null {
    const words = message.split(' ');
    const capitalizedWords = words.filter(word => /^[A-Z][a-z]+/.test(word));
    
    if (capitalizedWords.length > 0) {
      return capitalizedWords.join(' ');
    }
    
    return null;
  }

  private getVibeFromPropertyRecommendations(property: Property, placeName: string): string | null {
    if (!property.local_recommendations) return null;
    
    const lowerRecs = property.local_recommendations.toLowerCase();
    const lowerPlaceName = placeName.toLowerCase();
    
    if (lowerRecs.includes(lowerPlaceName)) {
      const vibeWords = ['casual', 'upscale', 'cozy', 'trendy', 'family-friendly', 'romantic', 'lively', 'quiet'];
      const foundVibes = vibeWords.filter(vibe => lowerRecs.includes(vibe));
      
      if (foundVibes.length > 0) {
        return foundVibes.join(', ');
      }
    }
    
    return null;
  }

  private getPlaceTypeFromRecommendations(property: Property, placeName: string): string {
    if (!property.local_recommendations) return 'restaurant';
    
    const lowerRecs = property.local_recommendations.toLowerCase();
    const lowerPlaceName = placeName.toLowerCase();
    
    if (lowerRecs.includes(lowerPlaceName)) {
      if (lowerRecs.includes('breakfast') || lowerRecs.includes('diner')) return 'breakfast';
      if (lowerRecs.includes('bar') || lowerRecs.includes('cocktail')) return 'bar';
      if (lowerRecs.includes('upscale') || lowerRecs.includes('fine dining')) return 'upscale restaurant';
    }
    
    return 'restaurant';
  }

  private async getVibeFromOpenAI(property: Property, placeName: string, message: string): Promise<string> {
    const prompt = `A guest is asking about the vibe at ${placeName} near ${property.address}. Provide a brief, helpful description of the atmosphere and ambiance. Keep it under 100 characters and conversational.`;
    
    try {
      const response = await fetch('https://zutwyyepahbbvrcbsbke.supabase.co/functions/v1/openai-recommendations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`
        },
        body: JSON.stringify({ prompt })
      });

      if (response.ok) {
        const data = await response.json();
        return data.recommendation;
      }
    } catch (error) {
      console.error('❌ Error getting vibe from OpenAI:', error);
    }
    
    return `${placeName} has a great atmosphere! Want more details about their menu or hours?`;
  }

  private isFoodRelatedMessage(message: string): boolean {
    const lowerMessage = message.toLowerCase();
    const foodKeywords = [
      'food', 'restaurant', 'eat', 'dining', 'hungry', 'meal', 'lunch', 'dinner', 'breakfast',
      'burger', 'pizza', 'sushi', 'italian', 'mexican', 'chinese', 'american', 'cuisine',
      'cafe', 'bistro', 'grill', 'bar', 'pub', 'deli', 'bakery', 'seafood', 'steakhouse',
      'casual', 'upscale', 'fine dining', 'fast food', 'takeout', 'delivery', 'reservation',
      'menu', 'chef', 'cook', 'taste', 'flavor', 'spicy', 'sweet', 'savory',
      'close by', 'nearby restaurant', 'good food', 'best restaurant', 'where to eat',
      'hungry for', 'craving', 'something to eat', 'grab a bite', 'food recommendation',
      'family friendly', 'family-friendly', 'kid friendly', 'cheap eats', 'quick bite'
    ];
    
    return foodKeywords.some(keyword => lowerMessage.includes(keyword));
  }

  private async handleConversationalDining(property: Property, message: string, conversation: any, phoneNumber: string) {
    console.log('🍽️ Starting enhanced conversational dining flow');
    
    console.log('🧹 Force clearing ALL dining and recommendation memory');
    await this.conversationManager.updateConversationState(phoneNumber, {
      conversation_context: {
        ...conversation.conversation_context,
        recommendation_history: {},
        global_recommendation_blacklist: [],
        dining_curated_used: [],
        dining_conversation_state: null,
        dining_vibe_preference: null,
        recent_intents: ['ask_food_recommendations'],
        last_intent: 'ask_food_recommendations',
        last_response_type: null
      },
      last_recommendations: null,
      last_message_type: 'ask_food_recommendations'
    });
    
    const guestName = conversation.conversation_context?.guest_name;
    const namePrefix = guestName ? `${guestName}, ` : '';
    
    const curatedRestaurant = this.getCuratedRestaurantRecommendation(property);
    
    if (curatedRestaurant) {
      console.log('🏠 Starting with curated restaurant recommendation:', curatedRestaurant);
      
      // Get accurate distance if available
      const restaurantMatch = curatedRestaurant.match(/^([^(]+)/);
      const restaurantName = restaurantMatch ? restaurantMatch[1].trim() : curatedRestaurant.split(' ')[0];
      
      const distanceInfo = await LocationService.getAccurateDistance(
        property.address || '',
        restaurantName
      );
      
      let enhancedRestaurant = curatedRestaurant;
      if (distanceInfo) {
        enhancedRestaurant = curatedRestaurant.replace(
          /\([^)]+\)/,
          `(${distanceInfo.distance}, 🚗 ${distanceInfo.duration})`
        );
      }
      
      const response = `${namePrefix}${enhancedRestaurant}\n\nWhat's your vibe — casual local spot, rooftop cocktails, or something upscale?`;
      
      const updatedContext = {
        ...conversation.conversation_context,
        last_intent: 'ask_food_recommendations',
        dining_conversation_state: 'awaiting_vibe_preference',
        dining_curated_used: [enhancedRestaurant],
        last_recommended_restaurant: restaurantName,
        recommendation_history: {},
        global_recommendation_blacklist: [],
        conversation_depth: 1,
        last_interaction: new Date().toISOString()
      };
      
      await this.conversationManager.updateConversationState(phoneNumber, {
        conversation_context: updatedContext,
        last_message_type: 'ask_food_recommendations'
      });
      
      return {
        messages: [MessageUtils.ensureSmsLimit(response)],
        conversationalResponse: true,
        intent: 'ask_food_recommendations'
      };
    } else {
      console.log('🤖 No curated restaurants - using OpenAI for single recommendation');
      const result = await this.getSingleRestaurantRecommendation(property, message, conversation);
      
      const updatedContext = {
        ...conversation.conversation_context,
        last_intent: 'ask_food_recommendations',
        dining_conversation_state: 'awaiting_vibe_preference',
        recommendation_history: {},
        global_recommendation_blacklist: [],
        conversation_depth: 1,
        last_interaction: new Date().toISOString()
      };
      
      await this.conversationManager.updateConversationState(phoneNumber, {
        conversation_context: updatedContext,
        last_message_type: 'ask_food_recommendations'
      });
      
      return {
        messages: [result.response],
        conversationalResponse: true,
        intent: 'ask_food_recommendations'
      };
    }
  }

  private getCuratedRestaurantRecommendation(property: Property): string | null {
    const localRecs = property.local_recommendations;
    if (!localRecs) return null;
    
    console.log('🔍 Extracting ONLY restaurant recommendations from property data');
    
    const restaurantMatch = localRecs.match(/RESTAURANTS?:\s*([^A-Z]*?)(?=[A-Z][A-Z]+:|$)/i);
    
    if (!restaurantMatch || !restaurantMatch[1]) {
      console.log('❌ No RESTAURANTS section found in property data');
      return null;
    }
    
    const restaurantText = restaurantMatch[1].trim();
    console.log('📋 Found RESTAURANTS section:', restaurantText);
    
    const lines = restaurantText.split(/[.\n]/).filter(line => line.trim().length > 0);
    
    for (const line of lines) {
      const cleaned = line.trim().replace(/^[-•*]\s*/, '');
      
      if (cleaned.toLowerCase().includes('beach')) {
        console.log('🚫 Skipping beach entry:', cleaned);
        continue;
      }
      
      if (cleaned.length > 10 && this.isActualRestaurant(cleaned)) {
        console.log('✅ Found valid restaurant recommendation:', cleaned);
        return cleaned;
      }
    }
    
    console.log('❌ No valid restaurant recommendations found');
    return null;
  }

  private isActualRestaurant(text: string): boolean {
    const lowerText = text.toLowerCase();
    
    if (lowerText.includes('beach') || lowerText.includes('swimming') || lowerText.includes('surfing')) {
      return false;
    }
    
    const restaurantIndicators = [
      'restaurant', 'dining', 'cuisine', 'menu', 'chef', 'bar', 'cafe', 'bistro', 
      'grill', 'kitchen', 'eatery', 'food', 'tasting', 'cocktail', 'wine'
    ];
    
    const hasRestaurantIndicator = restaurantIndicators.some(indicator => 
      lowerText.includes(indicator)
    );
    
    const hasProperNoun = /[A-Z][a-z]+/.test(text);
    
    return hasRestaurantIndicator || (hasProperNoun && text.length < 100);
  }

  private async handleDiningFollowUp(property: Property, message: string, context: any, namePrefix: string, phoneNumber: string) {
    console.log('🔄 Processing dining follow-up based on user preference');
    
    const guestName = context?.guest_name;
    const actualNamePrefix = guestName ? `${guestName}, ` : '';
    
    const lowerMessage = message.toLowerCase();
    let vibeType = 'general';
    
    if (lowerMessage.includes('casual') || lowerMessage.includes('local') || lowerMessage.includes('simple') || lowerMessage.includes('easy')) {
      vibeType = 'casual';
    } else if (lowerMessage.includes('upscale') || lowerMessage.includes('fancy') || lowerMessage.includes('fine')) {
      vibeType = 'upscale';
    } else if (lowerMessage.includes('rooftop') || lowerMessage.includes('cocktail') || lowerMessage.includes('drinks') || lowerMessage.includes('bar')) {
      vibeType = 'rooftop';
    } else if (lowerMessage.includes('burger') || lowerMessage.includes('close') || lowerMessage.includes('quick') || lowerMessage.includes('nearby')) {
      vibeType = 'casual';
    }
    
    console.log('🎯 Detected vibe preference:', vibeType, 'from message:', message);
    
    const additionalRecs = this.getAdditionalRestaurantRecommendations(property, vibeType, context.dining_curated_used || []);
    
    let response = '';
    if (additionalRecs.length > 0) {
      // Enhance with accurate distances
      const enhancedRecs = [];
      for (const rec of additionalRecs.slice(0, 2)) {
        const restaurantMatch = rec.match(/^([^(]+)/);
        if (restaurantMatch) {
          const restaurantName = restaurantMatch[1].trim();
          const distanceInfo = await LocationService.getAccurateDistance(
            property.address || '',
            restaurantName
          );
          
          if (distanceInfo) {
            const enhancedRec = rec.replace(
              /\([^)]+\)/,
              `(${distanceInfo.distance}, 🚗 ${distanceInfo.duration})`
            );
            enhancedRecs.push(enhancedRec);
          } else {
            enhancedRecs.push(rec);
          }
        } else {
          enhancedRecs.push(rec);
        }
      }
      
      if (lowerMessage.includes('burger')) {
        const burgerRecs = enhancedRecs.filter(rec => 
          rec.toLowerCase().includes('burger') || 
          rec.toLowerCase().includes('american') || 
          rec.toLowerCase().includes('grill')
        );
        if (burgerRecs.length > 0) {
          response = `${actualNamePrefix}Perfect for burgers! Try:\n${burgerRecs.slice(0, 2).join('\n')}\n\nWant something even closer or different cuisine?`;
        } else {
          response = `${actualNamePrefix}For good casual spots nearby:\n${enhancedRecs.slice(0, 2).join('\n')}\n\nWant burger recommendations specifically?`;
        }
      } else {
        response = `${actualNamePrefix}Perfect! You might also like:\n${enhancedRecs.slice(0, 2).join('\n')}\n\nWant something quieter or looking for late-night options?`;
      }
    } else {
      console.log('🤖 No curated recs found, using OpenAI for specific request');
      const result = await this.getVibeBasedRecommendations(property, vibeType, message);
      response = result.response;
    }
    
    const updatedContext = {
      ...context,
      dining_conversation_state: 'provided_additional_recs',
      dining_vibe_preference: vibeType,
      conversation_depth: (context.conversation_depth || 0) + 1,
      last_interaction: new Date().toISOString()
    };
    
    await this.conversationManager.updateConversationState(phoneNumber, {
      conversation_context: updatedContext
    });
    
    return {
      messages: [MessageUtils.ensureSmsLimit(response)],
      conversationalResponse: true,
      intent: 'ask_food_recommendations'
    };
  }

  private getAdditionalRestaurantRecommendations(property: Property, vibeType: string, usedRecs: string[]): string[] {
    const localRecs = property.local_recommendations;
    if (!localRecs) return [];
    
    console.log('🔍 Getting additional restaurant recommendations for vibe:', vibeType);
    
    const restaurantMatch = localRecs.match(/RESTAURANTS?:\s*([^A-Z]*?)(?=[A-Z][A-Z]+:|$)/i);
    if (!restaurantMatch || !restaurantMatch[1]) return [];
    
    const restaurantText = restaurantMatch[1].trim();
    const recommendations = [];
    const lines = restaurantText.split(/[.\n]/).filter(line => line.trim().length > 0);
    
    for (const line of lines) {
      const cleaned = line.trim().replace(/^[-•*]\s*/, '');
      
      if (cleaned.length < 10) continue;
      if (usedRecs.some(used => cleaned.includes(used) || used.includes(cleaned))) continue;
      
      if (cleaned.toLowerCase().includes('beach')) continue;
      
      const lowerLine = cleaned.toLowerCase();
      const isRestaurant = this.isActualRestaurant(cleaned);
      
      if (!isRestaurant) continue;
      
      let matches = false;
      if (vibeType === 'casual' && (lowerLine.includes('local') || lowerLine.includes('casual'))) {
        matches = true;
      } else if (vibeType === 'upscale' && (lowerLine.includes('fine') || lowerLine.includes('upscale') || lowerLine.includes('tasting'))) {
        matches = true;
      } else if (vibeType === 'rooftop' && (lowerLine.includes('rooftop') || lowerLine.includes('bar') || lowerLine.includes('cocktail'))) {
        matches = true;
      } else if (vibeType === 'general') {
        matches = true;
      }
      
      if (matches && recommendations.length < 2) {
        recommendations.push(cleaned);
      }
    }
    
    console.log('✅ Found additional recommendations:', recommendations.length);
    return recommendations;
  }

  private async getVibeBasedRecommendations(property: Property, vibeType: string, message: string) {
    console.log('🤖 Getting vibe-based recommendations from OpenAI with enhanced accuracy');
    
    const vibeDescriptions = {
      casual: 'casual local spots with authentic atmosphere',
      upscale: 'upscale fine dining restaurants',
      rooftop: 'rooftop bars and cocktail lounges',
      general: 'great dining options'
    };
    
    const propertyAddress = property.address || 'the property';
    const propertyName = property.property_name || 'your accommodation';
    
    const prompt = `You are a local dining concierge. A guest at ${propertyName}, ${propertyAddress} wants ${vibeDescriptions[vibeType] || 'dining recommendations'}.

Provide 1-2 restaurants that match their preference. Use accurate distances and drive times from the property address.

Format: "[Name] ([accurate distance], 🚗 [drive time], ⭐[rating]) — [brief description]"

End with: "Want something quieter or looking for late-night options?"

Important: Calculate real distances from ${propertyAddress}. Be accurate with drive times.
Keep conversational, under 160 characters total.`;

    try {
      const response = await fetch('https://zutwyyepahbbvrcbsbke.supabase.co/functions/v1/openai-recommendations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`
        },
        body: JSON.stringify({ prompt })
      });

      if (response.ok) {
        const data = await response.json();
        return { response: data.recommendation };
      }
    } catch (error) {
      console.error('❌ Error getting vibe-based recommendations:', error);
    }
    
    return { response: "Having trouble with dining recommendations right now. Try asking about WiFi or check-in details instead!" };
  }

  private isOtherRecommendationIntent(intent: string): boolean {
    const otherRecommendationIntents = [
      'ask_activities',
      'ask_grocery_stores'
    ];
    return otherRecommendationIntents.includes(intent);
  }

  private checkPropertyRecommendations(property: Property, intent: string, message: string): string | null {
    const localRecs = property.local_recommendations;
    
    if (!localRecs) {
      console.log('❌ No local recommendations found in property');
      return null;
    }

    console.log('🔍 Checking property recommendations for intent:', intent);
    const lowerMessage = message.toLowerCase();
    const guestName = property.knowledge_base?.guest_name;
    const namePrefix = guestName ? `${guestName}, ` : '';

    const extractCategorySection = (text: string, category: string): string | null => {
      const upperCategory = category.toUpperCase();
      const regex = new RegExp(`${upperCategory}:\\s*([^A-Z]*?)(?=[A-Z][A-Z]+:|$)`, 'i');
      const match = text.match(regex);
      return match && match[1] ? match[1].trim() : null;
    };

    if (intent === 'ask_activities') {
      console.log('🎯 Processing activities recommendation request');
      
      let activitiesSection = extractCategorySection(localRecs, 'ATTRACTIONS') || extractCategorySection(localRecs, 'ACTIVITIES');
      
      if (!activitiesSection && (localRecs.toLowerCase().includes('activity') || localRecs.toLowerCase().includes('attraction') || localRecs.toLowerCase().includes('visit'))) {
        activitiesSection = localRecs;
      }
      
      if (activitiesSection) {
        const response = `${namePrefix}here are some great local activities: ${activitiesSection}`;
        return response;
      }
    }

    if (intent === 'ask_grocery_stores') {
      console.log('🛒 Processing grocery recommendation request');
      
      let shoppingSection = extractCategorySection(localRecs, 'SHOPPING') || extractCategorySection(localRecs, 'STORES');
      
      if (!shoppingSection && (localRecs.toLowerCase().includes('grocery') || localRecs.toLowerCase().includes('store') || localRecs.toLowerCase().includes('market'))) {
        shoppingSection = localRecs;
      }
      
      if (shoppingSection) {
        const response = `${namePrefix}here are nearby shopping options: ${shoppingSection}`;
        return response;
      }
    }

    return null;
  }
}
