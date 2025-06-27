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
    console.log('🎯 Enhanced Conversation Service V2.2 - Processing message:', message);

    // Get conversation
    const conversation = await this.conversationManager.getOrCreateConversation(phoneNumber);
    console.log('📋 Current conversation state:', conversation.conversation_state);
    console.log('🏠 Current property_id:', conversation.property_id);

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

    // ENHANCED: Check for dining follow-up OR new food request FIRST
    const diningState = conversation.conversation_context?.dining_conversation_state;
    const lowerMessage = message.toLowerCase();
    
    // Check if this is a food-related request (even if dining state says completed)
    const isFoodRelated = this.isFoodRelatedMessage(message);
    
    if (diningState === 'awaiting_vibe_preference' || (isFoodRelated && diningState === 'provided_additional_recs')) {
      console.log('🍽️ Detected dining follow-up or new food request');
      
      // If they're asking for different food after completing a dining conversation, reset the state
      if (diningState === 'provided_additional_recs' && isFoodRelated) {
        console.log('🔄 Resetting dining state for new food request');
        await this.conversationManager.updateConversationState(phoneNumber, {
          conversation_context: {
            ...conversation.conversation_context,
            dining_conversation_state: 'awaiting_vibe_preference',
            dining_curated_used: [] // Reset used recommendations for fresh start
          }
        });
      }
      
      return await this.handleDiningFollowUp(property, message, conversation.conversation_context, '', phoneNumber);
    }

    // Recognize intent with enhanced food detection
    const intentResult = IntentRecognitionService.recognizeIntent(message);
    console.log('🧠 Intent recognized:', intentResult);

    // OVERRIDE: If intent is generic but message is clearly food-related, change to food recommendation
    if ((intentResult.intent === 'general_inquiry' || intentResult.intent === 'ask_multiple_requests') && isFoodRelated) {
      console.log('🍽️ Overriding intent to food recommendations due to food keywords');
      intentResult.intent = 'ask_food_recommendations';
      intentResult.confidence = 0.9;
    }

    // Handle conversation reset - FIXED TO USE PROPER RESET HANDLER
    if (intentResult.intent === 'conversation_reset') {
      console.log('🔄 PROCESSING RESET - Using ResetHandler for complete property clearing');
      
      // Use ResetHandler instead of ConversationMemoryManager for complete reset
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

    // Handle food recommendation with new conversational flow
    if (intentResult.intent === 'ask_food_recommendations') {
      console.log('🍽️ Processing food recommendation with new conversational flow');
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

        return {
          messages: [MessageUtils.ensureSmsLimit(propertyRecommendations)],
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

    // Merge the updated flow into the context
    updatedContext.conversationFlow = updatedFlow;

    await this.conversationManager.updateConversationState(phoneNumber, {
      conversation_context: updatedContext,
      last_message_type: finalIntent
    });

    return {
      messages: [MessageUtils.ensureSmsLimit(response)],
      conversationalResponse: true,
      intent: finalIntent
    };
  }

  // NEW: Handle property code validation
  private async handlePropertyCodeValidation(phoneNumber: string, message: string, conversation: any) {
    console.log('🔍 Processing potential property code:', message);
    
    // Clean the message to extract potential property code
    const cleanedMessage = message.trim().replace(/\D/g, ''); // Remove all non-digits
    
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
      // Look up the property by code
      const property = await this.propertyService.findPropertyByCode(cleanedMessage);
      
      if (property) {
        console.log('✅ Valid property code found! Property:', property.property_name);
        
        // Update conversation with property information
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

        const welcomeMessage = `Welcome to ${property.property_name}! I'm your AI concierge and I'm here to help with any questions about your stay. What would you like to know?`;
        
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

  // NEW: Enhanced food detection method
  private isFoodRelatedMessage(message: string): boolean {
    const lowerMessage = message.toLowerCase();
    const foodKeywords = [
      'food', 'restaurant', 'eat', 'dining', 'hungry', 'meal', 'lunch', 'dinner', 'breakfast',
      'burger', 'pizza', 'sushi', 'italian', 'mexican', 'chinese', 'american', 'cuisine',
      'cafe', 'bistro', 'grill', 'bar', 'pub', 'deli', 'bakery', 'seafood', 'steakhouse',
      'casual', 'upscale', 'fine dining', 'fast food', 'takeout', 'delivery', 'reservation',
      'menu', 'chef', 'cook', 'taste', 'flavor', 'spicy', 'sweet', 'savory',
      'close by', 'nearby restaurant', 'good food', 'best restaurant', 'where to eat',
      'hungry for', 'craving', 'something to eat', 'grab a bite', 'food recommendation'
    ];
    
    return foodKeywords.some(keyword => lowerMessage.includes(keyword));
  }

  private async handleConversationalDining(property: Property, message: string, conversation: any, phoneNumber: string) {
    console.log('🍽️ Starting conversational dining flow');
    
    // FORCE CLEAR ALL DINING MEMORY for fresh start
    console.log('🧹 Force clearing ALL dining and recommendation memory');
    await this.conversationManager.updateConversationState(phoneNumber, {
      conversation_context: {
        ...conversation.conversation_context,
        // Clear ALL recommendation memory
        recommendation_history: {},
        global_recommendation_blacklist: [],
        dining_curated_used: [],
        dining_conversation_state: null,
        dining_vibe_preference: null,
        // Clear recent intents that might interfere
        recent_intents: ['ask_food_recommendations'],
        last_intent: 'ask_food_recommendations',
        last_response_type: null
      },
      last_recommendations: null,
      last_message_type: 'ask_food_recommendations'
    });
    
    const guestName = conversation.conversation_context?.guest_name;
    const namePrefix = guestName ? `${guestName}, ` : '';
    
    // Get ONLY a restaurant recommendation (fixed extraction logic)
    const curatedRestaurant = this.getCuratedRestaurantRecommendation(property);
    
    if (curatedRestaurant) {
      console.log('🏠 Starting with curated restaurant recommendation:', curatedRestaurant);
      
      const response = `${namePrefix}${curatedRestaurant}\n\nWhat's your vibe — casual local spot, rooftop cocktails, or something upscale?`;
      
      // Update context to track dining conversation state
      const updatedContext = {
        ...conversation.conversation_context,
        last_intent: 'ask_food_recommendations',
        dining_conversation_state: 'awaiting_vibe_preference',
        dining_curated_used: [curatedRestaurant],
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
      // Fallback to OpenAI but request just one recommendation with follow-up
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
    
    // FIXED: Only extract from RESTAURANTS section, NEVER from beaches or other sections
    const restaurantMatch = localRecs.match(/RESTAURANTS?:\s*([^A-Z]*?)(?=[A-Z][A-Z]+:|$)/i);
    
    if (!restaurantMatch || !restaurantMatch[1]) {
      console.log('❌ No RESTAURANTS section found in property data');
      return null;
    }
    
    const restaurantText = restaurantMatch[1].trim();
    console.log('📋 Found RESTAURANTS section:', restaurantText);
    
    // Extract the first actual restaurant (not beaches!)
    const lines = restaurantText.split(/[.\n]/).filter(line => line.trim().length > 0);
    
    for (const line of lines) {
      const cleaned = line.trim().replace(/^[-•*]\s*/, '');
      
      // SAFEGUARD: Explicitly reject anything with "beach" in it
      if (cleaned.toLowerCase().includes('beach')) {
        console.log('🚫 Skipping beach entry:', cleaned);
        continue;
      }
      
      // Only accept lines that look like restaurants
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
    
    // SAFEGUARD: Explicitly reject beaches
    if (lowerText.includes('beach') || lowerText.includes('swimming') || lowerText.includes('surfing')) {
      return false;
    }
    
    // Look for restaurant indicators
    const restaurantIndicators = [
      'restaurant', 'dining', 'cuisine', 'menu', 'chef', 'bar', 'cafe', 'bistro', 
      'grill', 'kitchen', 'eatery', 'food', 'tasting', 'cocktail', 'wine'
    ];
    
    const hasRestaurantIndicator = restaurantIndicators.some(indicator => 
      lowerText.includes(indicator)
    );
    
    // Also check if it has proper noun structure (restaurant names)
    const hasProperNoun = /[A-Z][a-z]+/.test(text);
    
    return hasRestaurantIndicator || (hasProperNoun && text.length < 100);
  }

  private async handleDiningFollowUp(property: Property, message: string, context: any, namePrefix: string, phoneNumber: string) {
    console.log('🔄 Processing dining follow-up based on user preference');
    
    const guestName = context?.guest_name;
    const actualNamePrefix = guestName ? `${guestName}, ` : '';
    
    const lowerMessage = message.toLowerCase();
    let vibeType = 'general';
    
    // Determine vibe from user response - enhanced detection
    if (lowerMessage.includes('casual') || lowerMessage.includes('local') || lowerMessage.includes('simple') || lowerMessage.includes('easy')) {
      vibeType = 'casual';
    } else if (lowerMessage.includes('upscale') || lowerMessage.includes('fancy') || lowerMessage.includes('fine')) {
      vibeType = 'upscale';
    } else if (lowerMessage.includes('rooftop') || lowerMessage.includes('cocktail') || lowerMessage.includes('drinks') || lowerMessage.includes('bar')) {
      vibeType = 'rooftop';
    } else if (lowerMessage.includes('burger') || lowerMessage.includes('close') || lowerMessage.includes('quick') || lowerMessage.includes('nearby')) {
      vibeType = 'casual'; // Burger request = casual dining
    }
    
    console.log('🎯 Detected vibe preference:', vibeType, 'from message:', message);
    
    // Get 1-2 additional recommendations based on vibe and user request
    const additionalRecs = this.getAdditionalRestaurantRecommendations(property, vibeType, context.dining_curated_used || []);
    
    let response = '';
    if (additionalRecs.length > 0) {
      // Filter for burger places if they mentioned burger
      if (lowerMessage.includes('burger')) {
        const burgerRecs = additionalRecs.filter(rec => 
          rec.toLowerCase().includes('burger') || 
          rec.toLowerCase().includes('american') || 
          rec.toLowerCase().includes('grill')
        );
        if (burgerRecs.length > 0) {
          response = `${actualNamePrefix}Perfect for burgers! Try:\n${burgerRecs.slice(0, 2).join('\n')}\n\nWant something even closer or different cuisine?`;
        } else {
          response = `${actualNamePrefix}For good casual spots nearby:\n${additionalRecs.slice(0, 2).join('\n')}\n\nWant burger recommendations specifically?`;
        }
      } else {
        response = `${actualNamePrefix}Perfect! You might also like:\n${additionalRecs.slice(0, 2).join('\n')}\n\nWant something quieter or looking for late-night options?`;
      }
    } else {
      // Fallback to OpenAI for vibe-specific recommendations
      console.log('🤖 No curated recs found, using OpenAI for specific request');
      const result = await this.getVibeBasedRecommendations(property, vibeType, message);
      response = result.response;
    }
    
    // Update conversation state - mark as completed
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
    
    // FIXED: Only look in RESTAURANTS section
    const restaurantMatch = localRecs.match(/RESTAURANTS?:\s*([^A-Z]*?)(?=[A-Z][A-Z]+:|$)/i);
    if (!restaurantMatch || !restaurantMatch[1]) return [];
    
    const restaurantText = restaurantMatch[1].trim();
    const recommendations = [];
    const lines = restaurantText.split(/[.\n]/).filter(line => line.trim().length > 0);
    
    for (const line of lines) {
      const cleaned = line.trim().replace(/^[-•*]\s*/, '');
      
      if (cleaned.length < 10) continue;
      if (usedRecs.some(used => cleaned.includes(used) || used.includes(cleaned))) continue;
      
      // SAFEGUARD: Skip beaches
      if (cleaned.toLowerCase().includes('beach')) continue;
      
      const lowerLine = cleaned.toLowerCase();
      const isRestaurant = this.isActualRestaurant(cleaned);
      
      if (!isRestaurant) continue;
      
      // Match vibe preferences
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

  private async getSingleRestaurantRecommendation(property: Property, message: string, conversation: any) {
    console.log('🤖 Getting single restaurant recommendation from OpenAI');
    
    const prompt = `You are a local dining concierge. A guest at ${property.property_name || 'the property'}, ${property.address} is asking: "${message}"

Provide EXACTLY ONE restaurant recommendation in this format:
"[Restaurant Name] ([distance], ⭐[rating]) — [brief insider description]"

Then ask a follow-up question about their vibe: "What's your vibe — casual local spot, rooftop cocktails, or something upscale?"

Keep it conversational and friendly. Total response under 160 characters.`;

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
      console.error('❌ Error getting single restaurant recommendation:', error);
    }
    
    return { response: "Having trouble with dining recommendations right now. Try asking about WiFi or check-in details instead!" };
  }

  private async getVibeBasedRecommendations(property: Property, vibeType: string, message: string) {
    console.log('🤖 Getting vibe-based recommendations from OpenAI');
    
    const vibeDescriptions = {
      casual: 'casual local spots with authentic atmosphere',
      upscale: 'upscale fine dining restaurants',
      rooftop: 'rooftop bars and cocktail lounges',
      general: 'great dining options'
    };
    
    const prompt = `You are a local dining concierge. A guest at ${property.property_name || 'the property'}, ${property.address} wants ${vibeDescriptions[vibeType] || 'dining recommendations'}.

Provide 1-2 restaurants that match their preference:
Format: "[Name] ([distance], ⭐[rating]) — [brief description]"

End with: "Want something quieter or looking for late-night options?"

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
        const response = `${namePrefix}here are some great local activities: ${activitiesSection}\n\nNeed more details about any of these?`;
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
        const response = `${namePrefix}here are nearby shopping options: ${shoppingSection}\n\nWant directions to any of these stores?`;
        return response;
      }
    }

    return null;
  }
}
