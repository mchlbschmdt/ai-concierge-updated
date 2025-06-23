
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
  private travelService: TravelConversationService;

  constructor(private supabase: SupabaseClient) {
    this.conversationManager = new ConversationManager(supabase);
    this.propertyService = new PropertyService(supabase);
    this.fuzzyMatchingService = new FuzzyMatchingService();
    this.recommendationService = new RecommendationService(supabase);
    this.responseGenerator = new ResponseGenerator();
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
          const fallbackResponse = "Hi! I'm your Hostly AI Concierge. I can help with property info, local recommendations, and more! To get started, please send me your property code (the numbers from your booking confirmation).";
          return { messages: [fallbackResponse], resetDetected: true, error: 'reset_fallback' };
        }
      }

      // Check if message looks like a property code (numbers)
      const possiblePropertyCode = cleanMessage.match(/\d+/)?.[0];
      console.log("🔍 Possible property code detected:", possiblePropertyCode);

      // FIXED PROPERTY CODE HANDLING - Must be awaiting_property_id to process property codes
      if (conversation.conversation_state === 'awaiting_property_id' && possiblePropertyCode) {
        console.log("🏠 Processing property ID input in correct state...");
        
        try {
          console.log("🔍 Looking up property with code:", possiblePropertyCode);
          const propertyResult = await this.propertyService.findPropertyByCode(possiblePropertyCode);
          console.log("🏠 Property lookup result:", propertyResult);
          
          if (propertyResult) {
            console.log("✅ Property found:", propertyResult.property_name);
            
            // CRITICAL FIX: Update conversation state to awaiting_confirmation (NOT confirmed)
            await this.conversationManager.updateConversationState(phoneNumber, {
              property_id: propertyResult.property_id,
              conversation_state: 'awaiting_confirmation', // THIS IS THE KEY FIX
              conversation_context: {
                ...conversation.conversation_context,
                pending_property: propertyResult
              }
            });
            
            const confirmationResponse = `Great! You're staying at ${propertyResult.property_name}, ${propertyResult.address}. Correct? Reply Y or N.`;
            console.log("📝 Generated confirmation response:", confirmationResponse);
            const messages = MultiPartResponseFormatter.formatResponse(confirmationResponse);
            return { messages, propertyFound: true, awaitingConfirmation: true };
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

      // Handle if property code sent but not in correct state
      if (possiblePropertyCode && conversation.conversation_state !== 'awaiting_property_id') {
        console.log("⚠️ Property code sent but conversation not in awaiting_property_id state");
        const contextualResponse = this.generateContextualResponse(conversation, cleanMessage);
        const messages = MultiPartResponseFormatter.formatResponse(contextualResponse);
        return { messages, contextualResponse: true };
      }

      // HANDLE CONFIRMATION RESPONSES
      if (conversation.conversation_state === 'awaiting_confirmation') {
        console.log("🎯 Processing confirmation response");
        
        const normalizedInput = cleanMessage.toLowerCase().trim();
        const isYes = ['y', 'yes', 'yeah', 'yep', 'correct', 'right', 'true', '1', 'ok', 'okay', 'yup', 'sure', 'absolutely', 'definitely'].includes(normalizedInput);
        const isNo = ['n', 'no', 'nope', 'wrong', 'incorrect', 'false', '0', 'nah', 'negative'].includes(normalizedInput);

        if (isYes) {
          console.log("✅ User confirmed property");
          
          await this.conversationManager.updateConversationState(phoneNumber, {
            property_confirmed: true,
            conversation_state: 'confirmed',
            conversation_context: {
              ...conversation.conversation_context,
              property_confirmed_at: new Date().toISOString()
            }
          });
          
          const welcomeResponse = "Perfect! I'm your Hostly AI Concierge. I can help with property info, local recommendations, and more! What's your name so I can personalize our conversation?";
          console.log("📝 Generated welcome response:", welcomeResponse);
          const messages = MultiPartResponseFormatter.formatResponse(welcomeResponse);
          return { messages, propertyConfirmed: true, askingForName: true };
          
        } else if (isNo) {
          console.log("❌ User rejected property - resetting to awaiting_property_id");
          
          await this.conversationManager.updateConversationState(phoneNumber, {
            property_id: null,
            conversation_state: 'awaiting_property_id',
            conversation_context: {
              ...conversation.conversation_context,
              pending_property: null
            }
          });
          
          const retryResponse = "No problem! Let's try again. Please send me your correct property code (the numbers from your booking confirmation).";
          const messages = MultiPartResponseFormatter.formatResponse(retryResponse);
          return { messages, propertyRejected: true };
          
        } else {
          console.log("❓ Unclear confirmation response");
          const clarificationResponse = "Please reply with Y for Yes or N for No to confirm if this is the correct property.";
          const messages = MultiPartResponseFormatter.formatResponse(clarificationResponse);
          return { messages, needsClarification: true };
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
          // Handle name detection first
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
            
            const nameResponse = `Great to meet you, ${nameDetection.extractedName}! How can I assist you today?`;
            const messages = MultiPartResponseFormatter.formatResponse(nameResponse);
            return { messages, nameDetected: true };
          }
          
          // Generate contextual response based on conversation history and current message
          const contextualResponse = this.generateContextualResponse(conversation, cleanMessage, property);
          const messages = MultiPartResponseFormatter.formatResponse(contextualResponse);
          return { messages, contextualResponse: true };
          
        } catch (confirmedError) {
          console.error("❌ Error processing confirmed guest message:", confirmedError);
          const fallbackResponse = conversation.guest_name 
            ? `${conversation.guest_name}, I'm here to help! What can I assist you with?`
            : "I'm here to help! What can I assist you with?";
          return { messages: [fallbackResponse], error: 'confirmed_processing_error' };
        }
      }

      console.log("❓ Unhandled conversation state:", conversation.conversation_state);
      const defaultResponse = "Hi! I'm your Hostly AI Concierge. To get started, please send me your property code (the numbers from your booking confirmation).";
      const messages = MultiPartResponseFormatter.formatResponse(defaultResponse);
      return { messages, unhandled: true };

    } catch (error) {
      console.error("❌ CRITICAL ERROR in EnhancedConversationService:", error);
      console.error("❌ Error stack:", error.stack);
      
      // Enhanced fallback based on the type of error
      let errorMessage = "Hi! I'm your Hostly AI Concierge. ";
      
      if (error.message?.includes('property')) {
        errorMessage += "To get started, please send me your property code (the numbers from your booking confirmation).";
      } else if (error.message?.includes('recommendation')) {
        errorMessage += "I can help with property info, local recommendations, and more! What can I assist you with?";
      } else {
        errorMessage += "I can help with property info, local recommendations, and more! What can I assist you with?";
      }
      
      console.log("🚨 Using enhanced error fallback response:", errorMessage);
      return { messages: [errorMessage], error: 'service_error', details: error.message };
    }
  }

  private generateContextualResponse(conversation: any, message: string, property?: any): string {
    const guestName = conversation.guest_name;
    const namePrefix = guestName ? `${guestName}, ` : '';
    const context = conversation.conversation_context || {};
    const lastIntent = context.last_intent;
    
    // Recognize current intent
    const intentResult = IntentRecognitionService.recognizeIntent(message);
    console.log("🎯 Intent recognition result:", intentResult);
    
    // Handle specific property questions with detailed responses
    if (intentResult.intent.includes('checkin') && property) {
      const checkInTime = property.check_in_time || '4:00 PM';
      
      // Check if this is about early check-in
      if (message.toLowerCase().includes('early')) {
        return `${namePrefix}standard check-in is at ${checkInTime}. For early check-in, I'd recommend contacting the property directly. They may be able to accommodate depending on availability. Would you like me to help with anything else for your stay?`;
      } else {
        return `${namePrefix}check-in is at ${checkInTime}. Let me know if you need early check-in or have other questions about your arrival!`;
      }
    }
    
    if (intentResult.intent.includes('checkout') && property) {
      const checkOutTime = property.check_out_time || '11:00 AM';
      return `${namePrefix}check-out is at ${checkOutTime}. Need help with late checkout or anything else for your departure?`;
    }
    
    if (intentResult.intent.includes('wifi') && property) {
      if (property.wifi_name && property.wifi_password) {
        return `${namePrefix}here are your WiFi details:\n\nNetwork: ${property.wifi_name}\nPassword: ${property.wifi_password}\n\nLet me know if you need help connecting!`;
      } else {
        return `${namePrefix}WiFi details should be in your check-in instructions. Contact the property if you need assistance.`;
      }
    }
    
    if (intentResult.intent.includes('parking') && property) {
      if (property.parking_instructions) {
        return `${namePrefix}here are the parking details:\n\n${property.parking_instructions}\n\nAny other questions?`;
      } else {
        return `${namePrefix}check your booking confirmation for parking information or contact the property directly.`;
      }
    }
    
    if (intentResult.intent.includes('access') && property) {
      if (property.access_instructions) {
        return `${namePrefix}here are the access details:\n\n${property.access_instructions}\n\nIf you have trouble, contact our emergency line!`;
      } else {
        return `${namePrefix}access details should be in your check-in instructions. Contact the property if you need assistance.`;
      }
    }
    
    // Handle greetings more conversationally
    if (intentResult.intent === 'greeting') {
      if (lastIntent) {
        return `${namePrefix}hello! How can I help you today? I can assist with property questions, local recommendations, or anything else about your stay.`;
      } else {
        return `${namePrefix}hi there! What can I help you with today?`;
      }
    }
    
    // Handle follow-up questions more naturally
    if (lastIntent === 'ask_checkin_time' && (message.toLowerCase().includes('early') || message.toLowerCase().includes('before'))) {
      return `${namePrefix}for early check-in requests, I'd recommend contacting the property directly. They'll let you know if they can accommodate based on availability. Is there anything else I can help you with?`;
    }
    
    // Default contextual response
    const helpfulResponses = [
      `${namePrefix}I'm here to help! I can assist with property information, local recommendations, check-in details, or any other questions about your stay. What would you like to know?`,
      `${namePrefix}happy to help! What can I assist you with? I can provide property details, local dining suggestions, directions, or answer other questions about your stay.`,
      `${namePrefix}I'd love to help! Are you looking for property information, local recommendations, or do you have other questions about your stay?`
    ];
    
    // Rotate responses to avoid repetition
    const responseIndex = (context.conversation_depth || 0) % helpfulResponses.length;
    return helpfulResponses[responseIndex];
  }
}
