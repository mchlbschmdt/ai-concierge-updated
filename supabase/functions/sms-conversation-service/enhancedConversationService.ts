
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
    console.log("=== ENHANCED CONVERSATION SERVICE DEBUGGING ===");
    console.log("Phone:", phoneNumber);
    console.log("Message:", messageBody);

    try {
      const cleanMessage = messageBody.trim();
      console.log("📝 Clean message:", cleanMessage);
      
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
        console.log("ℹ️ No existing travel conversation, proceeding with property mode");
      }

      // Get or create conversation with enhanced error handling
      console.log("🔍 Getting or creating conversation...");
      let conversation;
      try {
        conversation = await this.conversationManager.getOrCreateConversation(phoneNumber);
        console.log("✅ Conversation retrieved:", {
          id: conversation.id,
          state: conversation.conversation_state,
          property_id: conversation.property_id,
          property_confirmed: conversation.property_confirmed,
          guest_name: conversation.guest_name
        });
      } catch (convError) {
        console.error("❌ CRITICAL: Failed to get conversation:", convError);
        const fallbackResponse = "I'm having trouble accessing your conversation. Please try again or text 'reset' to start over.";
        return { messages: [fallbackResponse], error: 'conversation_access_error' };
      }

      // Handle reset commands first
      if (ResetHandler.isResetCommand(cleanMessage)) {
        console.log("🔄 Reset command detected - performing complete conversation reset");
        
        try {
          const context = conversation.conversation_context || {};
          console.log("📋 Current context before reset:", context);
          
          const resetUpdates = ResetHandler.getCompleteResetUpdates(context);
          console.log("🔄 Applying complete reset updates:", resetUpdates);
          
          await this.conversationManager.updateConversationState(phoneNumber, resetUpdates);
          console.log("✅ Conversation completely reset to awaiting_property_id state");
          
          const resetResponse = ResetHandler.generateResetResponse();
          console.log("🔄 Generated reset response:", resetResponse);
          
          const messages = MultiPartResponseFormatter.formatResponse(resetResponse);
          console.log("✅ Reset response formatted successfully:", messages);
          return { messages, resetDetected: true, conversationReset: true };
        } catch (resetError) {
          console.error("❌ Error processing complete reset command:", resetError);
          const fallbackResponse = "No problem! I've reset our conversation. Please send me your property code to get started.";
          return { messages: [fallbackResponse], resetDetected: true, error: 'reset_fallback' };
        }
      }

      // Check if message looks like a property code (numbers)
      const possiblePropertyCode = cleanMessage.match(/\d+/)?.[0];
      console.log("🔍 Possible property code detected:", possiblePropertyCode);

      // ENHANCED PROPERTY CODE HANDLING
      if (conversation.conversation_state === 'awaiting_property_id' || 
          (possiblePropertyCode && !conversation.property_confirmed)) {
        console.log("🏠 Processing property ID input...");
        
        if (!possiblePropertyCode) {
          console.log("❌ No property code found in message");
          const errorResponse = "Hi! Please send me your property code (the numbers from your booking confirmation).";
          const messages = MultiPartResponseFormatter.formatResponse(errorResponse);
          return { messages, propertyCodeMissing: true };
        }

        try {
          console.log("🔍 Looking up property with code:", possiblePropertyCode);
          const propertyResult = await this.propertyService.findPropertyByCode(possiblePropertyCode);
          console.log("🏠 Property lookup result:", propertyResult);
          
          if (propertyResult) {
            console.log("✅ Property found:", propertyResult.property_name);
            
            // Update conversation state to confirmed
            await this.conversationManager.updateConversationState(phoneNumber, {
              property_id: propertyResult.property_id,
              property_confirmed: true,
              conversation_state: 'confirmed'
            });
            
            const welcomeResponse = this.responseGenerator.generateWelcomeMessage(propertyResult);
            console.log("📝 Generated welcome response:", welcomeResponse);
            const messages = MultiPartResponseFormatter.formatResponse(welcomeResponse);
            return { messages, propertyConfirmed: true };
          } else {
            console.log("❌ Property not found for code:", possiblePropertyCode);
            const errorResponse = `I couldn't find property code ${possiblePropertyCode}. Please check your booking confirmation and try again.`;
            const messages = MultiPartResponseFormatter.formatResponse(errorResponse);
            return { messages, propertyNotFound: true };
          }
        } catch (propertyError) {
          console.error("❌ Error in property lookup:", propertyError);
          const fallbackResponse = "I'm having trouble finding that property code. Could you try again?";
          return { messages: [fallbackResponse], error: 'property_lookup_error' };
        }
      }

      // ENHANCED CONFIRMED GUEST PROCESSING
      if (conversation.conversation_state === 'confirmed') {
        console.log("🎯 Processing confirmed guest message");
        
        // Validate we have property information
        if (!conversation.property_id) {
          console.error("❌ CRITICAL: Confirmed conversation missing property_id");
          const errorResponse = "I'm sorry, I seem to have lost your property information. Please send me your property code again.";
          
          // Reset conversation state
          await this.conversationManager.updateConversationState(phoneNumber, {
            conversation_state: 'awaiting_property_id',
            property_confirmed: false
          });
          
          return { messages: [errorResponse], error: 'missing_property_id' };
        }

        // Get property information for processing
        let property;
        try {
          console.log("🏠 Fetching property information for ID:", conversation.property_id);
          property = await this.propertyService.getPropertyById(conversation.property_id);
          console.log("✅ Property retrieved:", property ? property.property_name : 'null');
        } catch (propertyError) {
          console.error("❌ Error fetching property:", propertyError);
          const errorResponse = "I'm having trouble accessing your property information. Please try again.";
          return { messages: [errorResponse], error: 'property_fetch_error' };
        }

        if (!property) {
          console.error("❌ CRITICAL: Property not found in database for ID:", conversation.property_id);
          const errorResponse = "I'm sorry, I couldn't find your property information. Please send me your property code again.";
          
          // Reset conversation state
          await this.conversationManager.updateConversationState(phoneNumber, {
            conversation_state: 'awaiting_property_id',
            property_confirmed: false,
            property_id: null
          });
          
          return { messages: [errorResponse], error: 'property_not_found_in_db' };
        }

        try {
          // Handle name detection
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
            const messages = MultiPartResponseFormatter.formatResponse(nameResponse);
            return { messages, nameDetected: true };
          }
          
          // Recognize intent with enhanced logging
          console.log("🎯 Recognizing intent for message:", cleanMessage);
          const intentResult = IntentRecognitionService.recognizeIntent(cleanMessage);
          console.log("🎯 Intent recognition result:", intentResult);
          
          let context = conversation.conversation_context || {};
          context = this.memoryManager.updateContext(context, { type: 'general', category: intentResult.intent }, cleanMessage);
          
          // ENHANCED PROPERTY-SPECIFIC QUESTION HANDLING
          if (intentResult.intent.includes('ask_') || intentResult.intent === 'general_inquiry') {
            console.log("🔍 Processing specific property question with intent:", intentResult.intent);
            
            // Handle property-specific questions with detailed responses
            if (intentResult.intent.includes('checkin') || intentResult.intent.includes('checkout')) {
              console.log("🏠 Processing check-in/check-out question");
              
              const checkInTime = property.check_in_time || '4:00 PM';
              const checkOutTime = property.check_out_time || '11:00 AM';
              
              let response;
              if (intentResult.intent.includes('checkin')) {
                response = conversation.guest_name 
                  ? `${conversation.guest_name}, check-in is at ${checkInTime}. Let me know if you need early check-in!`
                  : `Check-in is at ${checkInTime}. Let me know if you need early check-in!`;
              } else {
                response = conversation.guest_name 
                  ? `${conversation.guest_name}, check-out is at ${checkOutTime}. Need help with late checkout?`
                  : `Check-out is at ${checkOutTime}. Need help with late checkout?`;
              }
              
              await this.conversationManager.updateConversationContext(conversation, intentResult.intent);
              const messages = MultiPartResponseFormatter.formatResponse(response);
              return { messages, propertyInfoProvided: true };
            }
            
            if (intentResult.intent.includes('wifi')) {
              console.log("🏠 Processing WiFi question");
              
              if (property.wifi_name && property.wifi_password) {
                const response = conversation.guest_name 
                  ? `${conversation.guest_name}, here are your WiFi details:\n\nNetwork: ${property.wifi_name}\nPassword: ${property.wifi_password}\n\nLet me know if you need help connecting!`
                  : `Here are your WiFi details:\n\nNetwork: ${property.wifi_name}\nPassword: ${property.wifi_password}\n\nLet me know if you need help connecting!`;
                
                await this.conversationManager.updateConversationContext(conversation, intentResult.intent);
                const messages = MultiPartResponseFormatter.formatResponse(response);
                return { messages, propertyInfoProvided: true };
              } else {
                const response = "WiFi details should be in your check-in instructions. Contact the property if you need assistance.";
                const messages = MultiPartResponseFormatter.formatResponse(response);
                return { messages, propertyInfoProvided: true };
              }
            }
            
            if (intentResult.intent.includes('parking')) {
              console.log("🏠 Processing parking question");
              
              if (property.parking_instructions) {
                const response = conversation.guest_name 
                  ? `${conversation.guest_name}, here are the parking details:\n\n${property.parking_instructions}\n\nAny other questions?`
                  : `Here are the parking details:\n\n${property.parking_instructions}\n\nAny other questions?`;
                
                await this.conversationManager.updateConversationContext(conversation, intentResult.intent);
                const messages = MultiPartResponseFormatter.formatResponse(response);
                return { messages, propertyInfoProvided: true };
              } else {
                const response = "Check your booking confirmation for parking information or contact the property directly.";
                const messages = MultiPartResponseFormatter.formatResponse(response);
                return { messages, propertyInfoProvided: true };
              }
            }
            
            if (intentResult.intent.includes('access')) {
              console.log("🏠 Processing access question");
              
              if (property.access_instructions) {
                const response = conversation.guest_name 
                  ? `${conversation.guest_name}, here are the access details:\n\n${property.access_instructions}\n\nIf you have trouble, contact our emergency line!`
                  : `Here are the access details:\n\n${property.access_instructions}\n\nIf you have trouble, contact our emergency line!`;
                
                await this.conversationManager.updateConversationContext(conversation, intentResult.intent);
                const messages = MultiPartResponseFormatter.formatResponse(response);
                return { messages, propertyInfoProvided: true };
              } else {
                const response = "Access details should be in your check-in instructions. Contact the property if you need assistance.";
                const messages = MultiPartResponseFormatter.formatResponse(response);
                return { messages, propertyInfoProvided: true };
              }
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
                
                const messages = MultiPartResponseFormatter.formatResponse(recommendations.response);
                return { messages, recommendationsProvided: true };
              }
            }
          }
          
          console.log("🎯 Generating general response for unmatched intent");
          const generalResponse = this.responseGenerator.generateGeneralResponse(
            cleanMessage, 
            conversation.guest_name
          );
          const messages = MultiPartResponseFormatter.formatResponse(generalResponse);
          return { messages, generalResponse: true };
          
        } catch (confirmedError) {
          console.error("❌ Error processing confirmed guest message:", confirmedError);
          const fallbackResponse = conversation.guest_name 
            ? `${conversation.guest_name}, I'm here to help! What can I assist you with?`
            : "I'm here to help! What can I assist you with?";
          return { messages: [fallbackResponse], error: 'confirmed_processing_error' };
        }
      }

      console.log("❓ Unhandled conversation state:", conversation.conversation_state);
      const defaultResponse = "I'm not sure how to help with that. Could you try sending your property code?";
      const messages = MultiPartResponseFormatter.formatResponse(defaultResponse);
      return { messages, unhandled: true };

    } catch (error) {
      console.error("❌ CRITICAL ERROR in EnhancedConversationService:", error);
      console.error("❌ Error stack:", error.stack);
      
      // Enhanced fallback based on the type of error
      let errorMessage = "I'm here to help! ";
      
      if (error.message?.includes('property')) {
        errorMessage += "Could you try sending your property code?";
      } else if (error.message?.includes('recommendation')) {
        errorMessage += "What would you like recommendations for?";
      } else {
        errorMessage += "What can I assist you with today?";
      }
      
      console.log("🚨 Using enhanced error fallback response:", errorMessage);
      return { messages: [errorMessage], error: 'service_error', details: error.message };
    }
  }
}
