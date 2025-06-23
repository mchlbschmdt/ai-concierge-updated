
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
    console.log('🎯 Enhanced Conversation Service V2.1 - Processing message:', message);

    // Get conversation and property
    const conversation = await this.conversationManager.getOrCreateConversation(phoneNumber);
    const property = conversation.property_id ? await this.propertyService.getPropertyById(conversation.property_id) : null;

    if (!property) {
      console.log('❌ No property found for conversation');
      return {
        messages: ["I need your property code to assist you. Please send your unique property code to get started."],
        conversationalResponse: false,
        intent: 'missing_property'
      };
    }

    // Recognize intent
    const intentResult = IntentRecognitionService.recognizeIntent(message);
    console.log('🧠 Intent recognized:', intentResult);

    // Handle conversation reset
    if (intentResult.intent === 'conversation_reset') {
      const resetResult = ConversationMemoryManager.handleConversationReset(
        conversation.conversation_context,
        conversation.conversation_context?.guest_name
      );
      
      await this.conversationManager.updateConversationState(phoneNumber, {
        conversation_context: resetResult.context
      });

      return {
        messages: [resetResult.response],
        conversationalResponse: true,
        intent: 'conversation_reset'
      };
    }

    // Check for repetition prevention
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

    // Handle recommendation intents with property data first, then OpenAI
    if (this.isRecommendationIntent(intentResult.intent)) {
      console.log('🍽️ Processing recommendation request');
      
      // First check if property has specific recommendations
      const propertyRecommendations = this.checkPropertyRecommendations(property, intentResult.intent, message);
      
      if (propertyRecommendations) {
        console.log('🏠 Using property-specific recommendations');
        
        // Update conversation memory with property recommendation
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
        // Use OpenAI recommendations service
        const result = await this.recommendationService.getEnhancedRecommendations(property, message, conversation);
        
        // Update conversation memory with OpenAI recommendation
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

  private isRecommendationIntent(intent: string): boolean {
    const recommendationIntents = [
      'ask_food_recommendations',
      'ask_activities',
      'ask_grocery_stores'
    ];
    return recommendationIntents.includes(intent);
  }

  private checkPropertyRecommendations(property: Property, intent: string, message: string): string | null {
    const localRecs = property.local_recommendations;
    
    if (!localRecs) {
      return null;
    }

    const lowerMessage = message.toLowerCase();
    const guestName = property.knowledge_base?.guest_name;
    const namePrefix = guestName ? `${guestName}, ` : '';

    // Check for food/restaurant recommendations
    if (intent === 'ask_food_recommendations') {
      if (localRecs.includes('restaurant') || localRecs.includes('food') || localRecs.includes('dining')) {
        return `${namePrefix}here are my top local dining recommendations: ${localRecs}\n\nWould you like directions to any of these places?`;
      }
    }

    // Check for activities
    if (intent === 'ask_activities') {
      if (localRecs.includes('activity') || localRecs.includes('attraction') || localRecs.includes('visit')) {
        return `${namePrefix}here are some great local activities: ${localRecs}\n\nNeed more details about any of these?`;
      }
    }

    // Check for grocery/shopping
    if (intent === 'ask_grocery_stores') {
      if (localRecs.includes('grocery') || localRecs.includes('store') || localRecs.includes('market')) {
        return `${namePrefix}here are nearby shopping options: ${localRecs}\n\nWant directions to any of these stores?`;
      }
    }

    return null;
  }
}
