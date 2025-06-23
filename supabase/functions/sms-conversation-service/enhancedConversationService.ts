
import { ConversationManager } from './conversationManager.ts';
import { PropertyService } from './propertyService.ts';
import { IntentRecognitionService } from './intentRecognitionService.ts';
import { EnhancedPropertyDataChecker } from './enhancedPropertyDataChecker.ts';
import { MultiPartResponseFormatter } from './multiPartResponseFormatter.ts';
import { ConversationMemoryManager } from './conversationMemoryManager.ts';
import { NameHandler } from './nameHandler.ts';

export class EnhancedConversationService {
  constructor(private supabase: any) {}

  async processMessage(phoneNumber: string, messageBody: string): Promise<any> {
    console.log('🚀 Enhanced conversation service processing:', messageBody);
    
    const conversationManager = new ConversationManager(this.supabase);
    const propertyService = new PropertyService(this.supabase);
    
    const conversation = await conversationManager.getOrCreateConversation(phoneNumber);
    const property = await propertyService.getPropertyInfo(conversation.property_id);
    
    // Get guest name from context
    const guestName = conversation.conversation_context?.guest_name;
    
    // Recognize intent(s)
    const intentResult = IntentRecognitionService.recognizeIntent(messageBody);
    console.log('🎯 Intent recognized:', intentResult);
    
    // Handle conversation reset FIRST with highest priority
    if (intentResult.intent === 'conversation_reset') {
      console.log('🔄 Processing conversation reset for:', guestName);
      const resetResult = ConversationMemoryManager.handleConversationReset(
        conversation.conversation_context, 
        guestName
      );
      
      // CRITICAL: Clear last_recommendations field in database too
      await conversationManager.updateConversationState(conversation.phone_number, {
        conversation_context: resetResult.context,
        last_recommendations: null // Clear previous recommendations completely
      });

      return {
        messages: [resetResult.response],
        shouldUpdateState: true
      };
    }
    
    // Check for repetition prevention (but allow resets)
    if (ConversationMemoryManager.shouldPreventRepetition(conversation.conversation_context, intentResult.intent)) {
      console.log('🔄 Preventing repetition for intent:', intentResult.intent);
      const repetitionResponse = ConversationMemoryManager.generateRepetitionResponse(intentResult.intent, guestName);
      
      return {
        messages: [repetitionResponse],
        shouldUpdateState: false
      };
    }

    // Handle multi-part messages
    if (intentResult.isMultiPart && intentResult.subIntents) {
      console.log('📝 Processing multi-part message with intents:', intentResult.subIntents);
      return await this.handleMultiPartMessage(
        intentResult.subIntents, 
        property, 
        messageBody, 
        guestName,
        conversation,
        conversationManager
      );
    }

    // Handle single intent
    return await this.handleSingleIntent(
      intentResult.intent,
      property,
      messageBody,
      guestName,
      conversation,
      conversationManager
    );
  }

  private async handleMultiPartMessage(
    intents: string[],
    property: any,
    originalMessage: string,
    guestName: string | undefined,
    conversation: any,
    conversationManager: ConversationManager
  ): Promise<any> {
    const propertyResponses = new Map<string, string>();
    const openAIResponses = new Map<string, string>();

    // Process each intent
    for (const intent of intents) {
      const propertyResponse = EnhancedPropertyDataChecker.checkPropertyDataForIntent(
        property, 
        intent, 
        originalMessage, 
        guestName
      );

      if (propertyResponse.hasAnswer) {
        propertyResponses.set(intent, propertyResponse.response);
      } else {
        // Use OpenAI for this part
        try {
          const openAIResponse = await this.getOpenAIResponse(property, intent, originalMessage, guestName, conversation);
          openAIResponses.set(intent, openAIResponse);
        } catch (error) {
          console.error('OpenAI error for intent:', intent, error);
        }
      }
    }

    // Format multi-part response
    const multiPartResponse = MultiPartResponseFormatter.formatMultiPartResponse(
      intents,
      propertyResponses,
      openAIResponses,
      guestName
    );

    const finalResponse = MultiPartResponseFormatter.combineResponses(multiPartResponse, guestName);

    // Update conversation memory
    const updatedContext = ConversationMemoryManager.updateMemory(
      conversation.conversation_context,
      'ask_multiple_requests',
      'multi_part_response'
    );

    await conversationManager.updateConversationState(conversation.phone_number, {
      conversation_context: updatedContext
    });

    return {
      messages: [finalResponse],
      shouldUpdateState: true
    };
  }

  private async handleSingleIntent(
    intent: string,
    property: any,
    message: string,
    guestName: string | undefined,
    conversation: any,
    conversationManager: ConversationManager
  ): Promise<any> {
    // Check property data first
    const propertyResponse = EnhancedPropertyDataChecker.checkPropertyDataForIntent(
      property,
      intent,
      message,
      guestName
    );

    if (propertyResponse.hasAnswer) {
      console.log('✅ Using property data response for intent:', intent);
      
      // Update conversation memory
      const updatedContext = ConversationMemoryManager.updateMemory(
        conversation.conversation_context,
        intent,
        'property_data'
      );

      await conversationManager.updateConversationState(conversation.phone_number, {
        conversation_context: updatedContext
      });

      return {
        messages: [propertyResponse.response],
        shouldUpdateState: true
      };
    }

    // Fall back to OpenAI for complex queries
    console.log('🤖 Using OpenAI for intent:', intent);
    try {
      const openAIResponse = await this.getOpenAIResponse(property, intent, message, guestName, conversation);
      
      // Track recommendation if this was a recommendation type
      let recommendationData;
      if (['ask_food_recommendations', 'ask_activities', 'ask_grocery_stores'].includes(intent)) {
        recommendationData = {
          type: intent,
          content: openAIResponse.substring(0, 200) // Store more content for better tracking
        };
      }
      
      // Update conversation memory
      const updatedContext = ConversationMemoryManager.updateMemory(
        conversation.conversation_context,
        intent,
        'openai_response',
        recommendationData
      );

      // Update both context and last_recommendations
      await conversationManager.updateConversationState(conversation.phone_number, {
        conversation_context: updatedContext,
        last_recommendations: openAIResponse // Store the full response
      });

      return {
        messages: [openAIResponse],
        shouldUpdateState: true
      };
    } catch (error) {
      console.error('OpenAI error:', error);
      
      const fallbackResponse = guestName 
        ? `${guestName}, I'm having trouble with that request right now. Can you try again or ask about something else?`
        : "I'm having trouble with that request right now. Can you try again or ask about something else?";

      return {
        messages: [fallbackResponse],
        shouldUpdateState: false
      };
    }
  }

  private async getOpenAIResponse(property: any, intent: string, message: string, guestName?: string, conversation?: any): Promise<string> {
    const propertyContext = this.buildPropertyContext(property);
    const conversationContext = ConversationMemoryManager.getRecommendationContext(conversation?.conversation_context);
    const prompt = this.buildIntentSpecificPrompt(intent, message, propertyContext, guestName, conversationContext);

    const response = await fetch('https://zutwyyepahbbvrcbsbke.supabase.co/functions/v1/openai-recommendations', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp1dHd5eWVwYWhiYnZyY2JzYmtlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDU0MDg3MDMsImV4cCI6MjA2MDk4NDcwM30.kUje38W2D2vXjYos6laaZ_rOzADLGiftoHAztFqSP9g`
      },
      body: JSON.stringify({ prompt })
    });

    if (!response.ok) {
      throw new Error(`OpenAI API call failed: ${response.status}`);
    }

    const data = await response.json();
    return data.recommendation;
  }

  private buildPropertyContext(property: any): string {
    if (!property) return '';

    const context = [];
    if (property.property_name) context.push(`Property: ${property.property_name}`);
    if (property.address) context.push(`Address: ${property.address}`);
    if (property.local_recommendations) context.push(`Local info: ${property.local_recommendations}`);
    
    return context.join('\n');
  }

  private buildIntentSpecificPrompt(intent: string, message: string, propertyContext: string, guestName?: string, conversationContext?: string): string {
    const nameContext = guestName ? `The guest's name is ${guestName}.` : '';
    
    // Build enhanced anti-repetition context
    let antiRepetitionContext = '';
    if (conversationContext) {
      antiRepetitionContext = `\n\nCRITICAL ANTI-REPETITION CONTEXT: ${conversationContext}

MANDATORY: You MUST provide completely different recommendations from anything mentioned before. Do NOT repeat any places, restaurants, or activities from the blacklist above. Focus on NEW and DIFFERENT options that have NEVER been suggested to this guest.`;
    }
    
    const intentPrompts: Record<string, string> = {
      'ask_food_recommendations': `You are a local expert providing restaurant recommendations. ${nameContext} ${propertyContext}${antiRepetitionContext}

Provide 2-3 COMPLETELY NEW restaurant recommendations with specific names, brief descriptions, and why locals love them. These must be ENTIRELY DIFFERENT from any previously mentioned places. Keep it under 160 words for SMS. Guest asked: ${message}`,
      
      'ask_grocery_stores': `You are a local expert providing grocery store recommendations. ${nameContext} ${propertyContext}${antiRepetitionContext}

Provide 2-3 nearby grocery store options with names and brief descriptions. Ensure these are COMPLETELY DIFFERENT from any previously mentioned stores. Keep it under 160 words for SMS. Guest asked: ${message}`,
      
      'ask_activities': `You are a local expert providing activity and attraction recommendations. ${nameContext} ${propertyContext}${antiRepetitionContext}

Provide 2-3 COMPLETELY NEW activities or attractions with specific names and brief descriptions. These must be ENTIRELY DIFFERENT from any previously suggested activities. Keep it under 160 words for SMS. Guest asked: ${message}`,
      
      'greeting': `You are a friendly concierge assistant. ${nameContext} Respond warmly and offer to help with their stay. Keep it brief and welcoming. Guest said: ${message}`,
      
      'general_inquiry': `You are a helpful concierge assistant. ${nameContext} ${propertyContext}${antiRepetitionContext}

Provide a helpful response to their question. If this is a request for recommendations, make sure to provide ENTIRELY NEW and DIFFERENT suggestions from anything mentioned before. Keep it concise for SMS (under 160 words). Guest asked: ${message}`
    };

    return intentPrompts[intent] || intentPrompts['general_inquiry'];
  }
}
