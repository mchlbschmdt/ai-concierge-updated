import { ConversationManager } from './conversationManager.ts';
import { PropertyService } from './propertyService.ts';
import { FuzzyMatchingService } from './fuzzyMatchingService.ts';
import { NameHandler } from './nameHandler.ts';

export class EnhancedConversationService {
  private conversationManager: ConversationManager;
  private propertyService: PropertyService;

  constructor(supabase: any) {
    this.conversationManager = new ConversationManager(supabase);
    this.propertyService = new PropertyService(supabase);
  }

  async processMessage(phoneNumber: string, messageBody: string) {
    console.log('=== PROCESSING ENHANCED MESSAGE ===');
    console.log('Phone:', phoneNumber);
    console.log('Message:', messageBody);
    
    try {
      const conversation = await this.conversationManager.getOrCreateConversation(phoneNumber);
      const cleanMessage = messageBody.trim().toLowerCase();
      
      console.log('Current conversation state:', conversation.conversation_state);

      // Handle reset commands first
      if (cleanMessage === 'reset' || cleanMessage === 'restart' || cleanMessage === 'start over') {
        await this.conversationManager.resetConversation(phoneNumber);
        return {
          messages: ["I've reset our conversation. Please text your property ID to get started."],
          shouldUpdateState: true
        };
      }

      switch (conversation.conversation_state) {
        case 'awaiting_property_id':
          return await this.handlePropertyIdInput(conversation, cleanMessage);
        
        case 'awaiting_confirmation':
          return await this.handleConfirmation(conversation, cleanMessage);
        
        case 'confirmed':
          return await this.handleConfirmedGuestInquiry(conversation, messageBody);
        
        default:
          await this.conversationManager.resetConversation(phoneNumber);
          return this.getWelcomeMessage();
      }
    } catch (error) {
      console.error('Error processing enhanced message:', error);
      return {
        messages: ["Sorry, I encountered an error. Please try again or text 'reset'."],
        shouldUpdateState: false
      };
    }
  }

  async handleConfirmedGuestInquiry(conversation: any, messageBody: string) {
    const property = await this.propertyService.getPropertyInfo(conversation.property_id);
    const message = messageBody.trim().toLowerCase();
    const guestName = conversation.conversation_context?.guest_name;
    
    // Handle greeting messages
    const isGreeting = this.matchesAnyKeywords(message, [
      'hi', 'hello', 'hey', 'good morning', 'good afternoon', 'good evening'
    ]);

    if (isGreeting) {
      let response = guestName ? `Hello${guestName ? `, ${guestName}` : ''}!` : 'Hello!';
      response += ' How can I help with your stay?';
      return {
        messages: [response],
        shouldUpdateState: false
      };
    }

    // Check if we have a pending request (after name capture)
    if (conversation.conversation_context?.pending_request && !conversation.conversation_context?.name_request_processed) {
      console.log("🔄 Processing pending request after name capture");
      
      // Mark pending request as processed
      await this.conversationManager.updateConversationState(conversation.phone_number, {
        conversation_context: {
          ...conversation.conversation_context,
          name_request_processed: true
        }
      });
      
      // Process the original pending request
      return await this.handleSpecificInquiry(conversation, property, conversation.conversation_context.pending_request, conversation.conversation_context.pending_request);
    }

    // Handle the current inquiry
    return await this.handleSpecificInquiry(conversation, property, message, messageBody);
  }

  async handleSpecificInquiry(conversation: any, property: any, message: string, originalMessage: string) {
    const guestName = conversation.conversation_context?.guest_name;

    // First check property data for direct answers
    const propertyResponse = this.propertyService.checkPropertyDataForQuery(property, originalMessage);
    
    if (propertyResponse) {
      console.log("✅ Found answer in property data");
      
      let response = propertyResponse;
      if (guestName && !propertyResponse.toLowerCase().includes(guestName.toLowerCase())) {
        response = `Here you go, ${guestName}!\n\n${propertyResponse}\n\nAnything else?`;
      }

      return {
        messages: [response],
        shouldUpdateState: false
      };
    }

    // If no property data found, use OpenAI with enhanced context
    return await this.getEnhancedRecommendations(conversation, property, originalMessage);
  }

  async getEnhancedRecommendations(conversation: any, property: any, originalMessage: string) {
    console.log(`🎯 Getting enhanced recommendations for: ${originalMessage}`);
    
    try {
      const propertyAddress = property?.address || 'the property';
      const propertyName = property?.property_name || 'your accommodation';
      const guestName = conversation?.conversation_context?.guest_name;
      
      // Build enhanced context including property data
      const enhancedContext = {
        guestName: guestName,
        propertyInfo: {
          name: propertyName,
          address: propertyAddress,
          localRecommendations: property?.local_recommendations,
          specialNotes: property?.special_notes,
          amenities: property?.amenities
        },
        timeOfDay: this.getTimeContext(),
        dayOfWeek: new Date().toLocaleDateString('en-US', { weekday: 'long' })
      };

      const enhancedPayload = {
        prompt: `You are a knowledgeable local concierge assistant with access to premium local guides, food blogs, and insider recommendations. A guest${guestName ? `, ${guestName}` : ''} is staying at ${propertyName} located at ${propertyAddress}. 

Their request: "${originalMessage}"

IMPORTANT GUIDELINES:
- Source recommendations from TOP LOCAL FOOD BLOGS, hospitality guides, and trusted local websites
- Avoid generic chain restaurants unless they're truly exceptional
- Include hidden gems and local favorites that locals actually recommend
- Mention specific dishes or specialties when relevant
- Provide practical details: distance, price range, and why it's special
- Keep response under 160 characters for SMS
- Be warm and personalized${guestName ? ` using ${guestName}'s name` : ''}

Focus on quality over quantity - 1-2 outstanding recommendations are better than many generic ones.`,
        propertyAddress: `${propertyName}, ${propertyAddress}`,
        guestContext: enhancedContext,
        requestType: 'enhanced_local_recommendations',
        previousRecommendations: conversation?.last_recommendations || null
      };

      const response = await fetch('https://zutwyyepahbbvrcbsbke.supabase.co/functions/v1/openai-recommendations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp1dHd5eWVwYWhiYnZyY2JzYmtlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDU0MDg3MDMsImV4cCI6MjA2MDk4NDcwM30.kUje38W2D2vXjYos6laaZ_rOzADLGiftoHAztFqSP9g`
        },
        body: JSON.stringify(enhancedPayload)
      });

      if (response.ok) {
        const data = await response.json();
        console.log('✅ Enhanced recommendations received');
        
        // Store recommendations for future context
        await this.conversationManager.updateConversationState(conversation.phone_number, {
          last_recommendations: data.recommendation,
          conversation_context: {
            ...conversation.conversation_context,
            lastRecommendationType: 'enhanced_local'
          }
        });
        
        return {
          messages: [this.ensureSmsLimit(data.recommendation)],
          shouldUpdateState: false
        };
      } else {
        throw new Error(`Enhanced recommendations API failed: ${response.status}`);
      }
    } catch (error) {
      console.error('❌ Error getting enhanced recommendations:', error);
      
      return {
        messages: ["Having trouble with recommendations right now. Try again soon or ask about WiFi, parking, or check-in details."],
        shouldUpdateState: false
      };
    }
  }

  getTimeContext() {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) return 'morning';
    if (hour >= 12 && hour < 17) return 'afternoon';
    if (hour >= 17 && hour < 22) return 'evening';
    return 'night';
  }

  ensureSmsLimit(response: string) {
    const SMS_CHAR_LIMIT = 160;
    if (response.length <= SMS_CHAR_LIMIT) {
      return response;
    }
    return response.substring(0, SMS_CHAR_LIMIT - 3) + '...';
  }

  matchesAnyKeywords(message: string, keywords: string[]) {
    const lowerMessage = message.toLowerCase();
    return keywords.some(keyword => lowerMessage.includes(keyword.toLowerCase()));
  }

  async handlePropertyIdInput(conversation: any, input: string) {
    const propertyCode = input.match(/\d+/)?.[0];
    
    if (!propertyCode) {
      return {
        messages: ["Hi! Please text your property ID from your booking confirmation. Text 'reset' if needed."],
        shouldUpdateState: false
      };
    }

    try {
      const property = await this.propertyService.findPropertyByCode(propertyCode);
      
      if (!property) {
        return {
          messages: [`Property ID ${propertyCode} not found. Check your booking or text 'reset'.`],
          shouldUpdateState: false
        };
      }

      await this.conversationManager.updateConversationState(conversation.phone_number, {
        property_id: property.property_id || property.id,
        conversation_state: 'awaiting_confirmation'
      });

      const response = `Great! You're staying at ${property.property_name}. Correct? Reply Y or N.`;
      return {
        messages: [this.ensureSmsLimit(response)],
        shouldUpdateState: true
      };
    } catch (error) {
      return {
        messages: ["Trouble looking up that property ID. Try again or text 'reset'."],
        shouldUpdateState: false
      };
    }
  }

  async handleConfirmation(conversation: any, input: string) {
    const normalizedInput = input.toLowerCase().trim();
    const isYes = ['y', 'yes', 'yeah', 'yep', 'correct', 'right', 'ok', 'okay'].includes(normalizedInput);
    const isNo = ['n', 'no', 'nope', 'wrong', 'incorrect'].includes(normalizedInput);

    if (isYes) {
      await this.conversationManager.updateConversationState(conversation.phone_number, {
        property_confirmed: true,
        conversation_state: 'confirmed'
      });

      return {
        messages: ["Perfect! I'm your AI concierge. I can help with WiFi, parking, directions, and local recommendations. What do you need?"],
        shouldUpdateState: true
      };
    } else if (isNo) {
      await this.conversationManager.updateConversationState(conversation.phone_number, {
        property_id: null,
        conversation_state: 'awaiting_property_id'
      });

      return {
        messages: ["No problem! Please provide your correct property ID from booking confirmation."],
        shouldUpdateState: true
      };
    } else {
      return {
        messages: ["Please reply Y for Yes or N for No to confirm. Text 'reset' to start over."],
        shouldUpdateState: false
      };
    }
  }

  getWelcomeMessage() {
    return {
      messages: ["Welcome! Text your property ID to get started. Text 'reset' anytime to restart."],
      shouldUpdateState: false
    };
  }
}
