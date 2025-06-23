
import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { ConversationManager } from './conversationManager.ts';
import { PropertyService } from './propertyService.ts';
import { FuzzyMatchingService } from './fuzzyMatchingService.ts';
import { RecommendationService } from './recommendationService.ts';
import { ResponseGenerator } from './responseGenerator.ts';
import { IntentRecognitionService } from './intentRecognitionService.ts';
import { ResetHandler } from './resetHandler.ts';
import { NameHandler } from './nameHandler.ts';
import { MultiPartResponseFormatter } from './multiPartResponseFormatter.ts';
import { ConversationMemoryManager } from './conversationMemoryManager.ts';
import { TravelConversationService } from './travelConversationService.ts';

export class EnhancedConversationService {
  private conversationManager: ConversationManager;
  private propertyService: PropertyService;
  private fuzzyMatchingService: FuzzyMatchingService;
  private recommendationService: RecommendationService;
  private responseGenerator: ResponseGenerator;
  private memoryManager: ConversationMemoryManager;
  private travelService: TravelConversationService;

  constructor(private supabase: SupabaseClient) {
    this.conversationManager = new ConversationManager(supabase);
    this.propertyService = new PropertyService(supabase);
    this.fuzzyMatchingService = new FuzzyMatchingService();
    this.recommendationService = new RecommendationService(supabase);
    this.responseGenerator = new ResponseGenerator();
    this.memoryManager = new ConversationMemoryManager();
    this.travelService = new TravelConversationService(supabase);
  }

  async processMessage(phoneNumber: string, messageBody: string): Promise<any> {
    console.log("=== ENHANCED CONVERSATION SERVICE ===");
    console.log("Phone:", phoneNumber);
    console.log("Message:", messageBody);

    try {
      const cleanMessage = messageBody.trim();
      
      // Check if this is a travel trigger
      const travelCode = Deno.env.get('DEFAULT_TRAVEL_CODE') || 'TRAVEL';
      if (cleanMessage.toUpperCase() === travelCode.toUpperCase()) {
        console.log("🌎 Travel mode triggered!");
        const messages = await this.travelService.processMessage(phoneNumber, cleanMessage);
        return { messages, mode: 'travel' };
      }

      // Check if we have an existing travel conversation
      try {
        const { data: existingTravel } = await this.supabase
          .from('travel_conversations')
          .select('*')
          .eq('phone_number', phoneNumber)
          .maybeSingle();

        if (existingTravel && existingTravel.step !== 'ASK_LOCATION') {
          console.log("🌎 Continuing travel conversation");
          const messages = await this.travelService.processMessage(phoneNumber, cleanMessage);
          return { messages, mode: 'travel' };
        }
      } catch (error) {
        console.log("No existing travel conversation, proceeding with property mode");
      }

      // Continue with existing property-based conversation logic
      const conversation = await this.conversationManager.getOrCreateConversation(phoneNumber);
      console.log("🔍 Current conversation state:", conversation.conversation_state);
      
      if (ResetHandler.isResetCommand(cleanMessage)) {
        console.log("🔄 Reset command detected - performing complete conversation reset");
        
        try {
          const context = conversation.conversation_context || {};
          console.log("📋 Current context before reset:", context);
          
          // Get complete reset updates including conversation state changes
          const resetUpdates = ResetHandler.getCompleteResetUpdates(context);
          console.log("🔄 Applying complete reset updates:", resetUpdates);
          
          // Apply the complete reset to the conversation
          await this.conversationManager.updateConversationState(phoneNumber, resetUpdates);
          console.log("✅ Conversation completely reset to awaiting_property_id state");
          
          // Generate consistent reset response asking for property code
          const resetResponse = ResetHandler.generateResetResponse();
          console.log("🔄 Generated reset response:", resetResponse);
          
          console.log("📝 Formatting reset response with MultiPartResponseFormatter");
          const messages = MultiPartResponseFormatter.formatResponse(resetResponse);
          console.log("✅ Reset response formatted successfully:", messages);
          return { messages, resetDetected: true, conversationReset: true };
        } catch (resetError) {
          console.error("❌ Error processing complete reset command:", resetError);
          // Provide a safe fallback for reset commands
          const fallbackResponse = "No problem! I've reset our conversation. Please send me your property code to get started.";
          const messages = [fallbackResponse];
          return { messages, resetDetected: true, error: 'reset_fallback' };
        }
      }

      if (conversation.conversation_state === 'awaiting_property_id') {
        console.log("🏠 Looking for property match");
        
        try {
          const propertyMatch = await this.propertyService.findPropertyByCode(cleanMessage);
          
          if (propertyMatch.found && propertyMatch.property) {
            console.log("✅ Property found:", propertyMatch.property.property_name);
            
            await this.conversationManager.updateConversationState(phoneNumber, {
              property_id: propertyMatch.property.id,
              property_confirmed: true,
              conversation_state: 'confirmed'
            });
            
            const welcomeResponse = this.responseGenerator.generateWelcomeMessage(propertyMatch.property);
            console.log("📝 Formatting welcome response");
            const messages = MultiPartResponseFormatter.formatResponse(welcomeResponse);
            return { messages, propertyConfirmed: true };
          } else {
            console.log("❌ Property not found");
            const errorResponse = this.responseGenerator.generatePropertyNotFoundMessage();
            console.log("📝 Formatting error response");
            const messages = MultiPartResponseFormatter.formatResponse(errorResponse);
            return { messages, propertyNotFound: true };
          }
        } catch (propertyError) {
          console.error("❌ Error in property matching:", propertyError);
          const fallbackResponse = "I'm having trouble finding that property code. Could you try again?";
          const messages = [fallbackResponse];
          return { messages, error: 'property_lookup_error' };
        }
      }

      if (conversation.conversation_state === 'confirmed') {
        console.log("🎯 Processing confirmed guest message");
        
        try {
          const nameDetection = NameHandler.detectAndExtractName(cleanMessage);
          if (nameDetection.nameDetected && nameDetection.extractedName) {
            console.log("👋 Name detected:", nameDetection.extractedName);
            
            await this.conversationManager.updateConversationState(phoneNumber, {
              guest_name: nameDetection.extractedName,
              conversation_context: {
                ...conversation.conversation_context,
                name_provided: true,
                name_provided_at: new Date().toISOString()
              }
            });
            
            const nameResponse = NameHandler.generateNameResponse(nameDetection.extractedName);
            console.log("📝 Formatting name response");
            const messages = MultiPartResponseFormatter.formatResponse(nameResponse);
            return { messages, nameDetected: true };
          }
          
          // Use the static method correctly
          const intentResult = IntentRecognitionService.recognizeIntent(cleanMessage);
          console.log("🎯 Detected intent result:", intentResult);
          
          let context = conversation.conversation_context || {};
          context = this.memoryManager.updateContext(context, { type: 'general', category: intentResult.intent }, cleanMessage);
          
          // Handle different intent types based on the IntentResult structure
          if (intentResult.intent.includes('ask_') || intentResult.intent === 'general_inquiry') {
            console.log("🔍 Processing recommendation/property request");
            
            const property = await this.propertyService.getPropertyById(conversation.property_id);
            if (!property) {
              const errorResponse = "I'm sorry, I couldn't find your property information.";
              console.log("📝 Formatting property error response");
              const messages = MultiPartResponseFormatter.formatResponse(errorResponse);
              return { messages, error: 'property_not_found' };
            }
            
            // Handle property-specific questions
            if (intentResult.intent.includes('checkin') || intentResult.intent.includes('checkout') || 
                intentResult.intent.includes('wifi') || intentResult.intent.includes('parking') || 
                intentResult.intent.includes('access')) {
              console.log("🏠 Processing property-specific question");
              
              const propertyResponse = this.responseGenerator.generatePropertyResponse(
                cleanMessage, 
                property, 
                conversation.guest_name
              );
              
              await this.conversationManager.updateConversationContext(conversation, intentResult.intent);
              
              console.log("📝 Formatting property info response");
              const messages = MultiPartResponseFormatter.formatResponse(propertyResponse);
              return { messages, propertyInfoProvided: true };
            }
            
            // Handle recommendation requests
            if (intentResult.intent.includes('food') || intentResult.intent.includes('grocery') || 
                intentResult.intent.includes('activities') || intentResult.intent === 'general_inquiry') {
              console.log("🔍 Processing recommendation request");
              
              const blacklist = this.memoryManager.getRecommendationBlacklist(context);
              console.log("🚫 Current blacklist:", blacklist);
              
              const recommendations = await this.recommendationService.getRecommendations({
                query: cleanMessage,
                propertyAddress: property.address,
                messageType: intentResult.intent,
                guestContext: {
                  currentLocation: property.address,
                  previousAskedAbout: context.askedAbout || [],
                  guestName: conversation.guest_name
                },
                blacklistedPlaces: blacklist
              });
              
              if (recommendations.response) {
                context = this.memoryManager.addRecommendationsToContext(
                  context, 
                  recommendations.response,
                  intentResult.intent
                );
                
                await this.conversationManager.updateConversationState(phoneNumber, {
                  conversation_context: context,
                  last_message_type: intentResult.intent,
                  last_recommendations: recommendations.response
                });
                
                console.log("📝 Formatting recommendation response");
                const messages = MultiPartResponseFormatter.formatResponse(recommendations.response);
                return { messages, recommendationsProvided: true };
              }
            }
          }
          
          console.log("🎯 Generating general response");
          const generalResponse = this.responseGenerator.generateGeneralResponse(
            cleanMessage, 
            conversation.guest_name
          );
          console.log("📝 Formatting general response");
          const messages = MultiPartResponseFormatter.formatResponse(generalResponse);
          return { messages, generalResponse: true };
        } catch (confirmedError) {
          console.error("❌ Error processing confirmed guest message:", confirmedError);
          const fallbackResponse = conversation.guest_name 
            ? `${conversation.guest_name}, I'm here to help! What can I assist you with?`
            : "I'm here to help! What can I assist you with?";
          const messages = [fallbackResponse];
          return { messages, error: 'confirmed_processing_error' };
        }
      }

      console.log("❓ Unhandled conversation state:", conversation.conversation_state);
      const defaultResponse = "I'm not sure how to help with that. Could you try sending your property code?";
      console.log("📝 Formatting default response");
      const messages = MultiPartResponseFormatter.formatResponse(defaultResponse);
      return { messages, unhandled: true };

    } catch (error) {
      console.error("❌ Critical error in EnhancedConversationService:", error);
      
      // More specific fallback based on the type of error
      let errorMessage = "I'm here to help! ";
      
      if (error.message?.includes('property')) {
        errorMessage += "Could you try sending your property code?";
      } else if (error.message?.includes('recommendation')) {
        errorMessage += "What would you like recommendations for?";
      } else {
        errorMessage += "What can I assist you with today?";
      }
      
      console.log("🚨 Using enhanced error fallback response:", errorMessage);
      const messages = [errorMessage];
      return { messages, error: 'service_error', details: error.message };
    }
  }
}
