// Enhanced SMS Conversation Service with continuity, personalization, and time-awareness
export class EnhancedSmsConversationService {
  constructor(supabase) {
    this.supabase = supabase;
    this.SMS_CHAR_LIMIT = 160;
  }

  async getOrCreateConversation(phoneNumber) {
    console.log('Getting or creating conversation for:', phoneNumber);
    
    // Try to get existing conversation
    const { data: existing, error } = await this.supabase
      .from('sms_conversations')
      .select('*')
      .eq('phone_number', phoneNumber)
      .maybeSingle();

    if (error) {
      console.error('Error fetching conversation:', error);
    }

    if (existing) {
      console.log('Found existing conversation:', existing);
      return existing;
    }

    // Create new conversation with enhanced fields
    const { data: newConversation, error: createError } = await this.supabase
      .from('sms_conversations')
      .insert({
        phone_number: phoneNumber,
        conversation_state: 'awaiting_property_id',
        conversation_context: {},
        preferences: {},
        timezone: 'UTC',
        last_interaction_timestamp: new Date().toISOString()
      })
      .select()
      .single();

    if (createError) {
      console.error('Failed to create conversation:', createError);
      throw new Error(`Failed to create conversation: ${createError.message}`);
    }

    console.log('Created new conversation:', newConversation);
    return newConversation;
  }

  async updateConversationState(phoneNumber, updates) {
    console.log('Updating conversation state for:', phoneNumber, 'with:', updates);
    
    const { data, error } = await this.supabase
      .from('sms_conversations')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
        last_interaction_timestamp: new Date().toISOString()
      })
      .eq('phone_number', phoneNumber)
      .select()
      .single();

    if (error) {
      console.error('Failed to update conversation:', error);
      throw new Error(`Failed to update conversation: ${error.message}`);
    }

    console.log('Updated conversation successfully:', data);
    return data;
  }

  // NEW: Check if conversation has been paused (more than 30 minutes since last interaction)
  isConversationPaused(lastInteractionTimestamp) {
    if (!lastInteractionTimestamp) return false;
    
    const now = new Date();
    const lastInteraction = new Date(lastInteractionTimestamp);
    const diffMinutes = (now - lastInteraction) / (1000 * 60);
    
    return diffMinutes > 30; // Consider paused if more than 30 minutes
  }

  // NEW: Get time-aware greeting based on timezone
  getTimeAwareGreeting(timezone = 'UTC') {
    try {
      const now = new Date();
      const localTime = new Date(now.toLocaleString("en-US", {timeZone: timezone}));
      const hour = localTime.getHours();
      
      if (hour >= 5 && hour < 12) return 'Good morning';
      if (hour >= 12 && hour < 17) return 'Good afternoon';
      if (hour >= 17 && hour < 22) return 'Good evening';
      return 'Hello'; // Late night/early morning
    } catch (error) {
      console.error('Error getting time-aware greeting:', error);
      return 'Hello';
    }
  }

  // NEW: Split message into SMS-sized chunks
  splitIntoSmsChunks(message) {
    if (message.length <= this.SMS_CHAR_LIMIT) {
      return [message];
    }

    const chunks = [];
    let remaining = message;

    while (remaining.length > this.SMS_CHAR_LIMIT) {
      // Find the last space before the character limit
      let splitIndex = remaining.lastIndexOf(' ', this.SMS_CHAR_LIMIT);
      if (splitIndex === -1) splitIndex = this.SMS_CHAR_LIMIT;

      chunks.push(remaining.substring(0, splitIndex).trim());
      remaining = remaining.substring(splitIndex).trim();
    }

    if (remaining.length > 0) {
      chunks.push(remaining);
    }

    return chunks;
  }

  // NEW: Generate contextual follow-up based on previous interactions
  generateContextualFollowUp(conversation, messageType) {
    const context = conversation.conversation_context || {};
    const lastRecommendations = conversation.last_recommendations;
    const lastMessageType = conversation.last_message_type;

    // If they previously asked for recommendations and this is a new interaction
    if (lastMessageType === 'recommendations' && lastRecommendations) {
      const followUps = [
        "I hope you enjoyed those spots I recommended!",
        "Did you get a chance to try any of my suggestions?",
        "Hope my recommendations worked out well!"
      ];
      return followUps[Math.floor(Math.random() * followUps.length)];
    }

    // If they asked about beaches before
    if (context.askedAbout?.includes('beach')) {
      return "Since you were interested in beaches earlier, ";
    }

    // If they asked about restaurants before
    if (context.askedAbout?.includes('restaurant') || context.askedAbout?.includes('dining')) {
      return "Following up on dining options, ";
    }

    return "";
  }

  async processMessage(phoneNumber, messageBody) {
    console.log('=== PROCESSING ENHANCED MESSAGE ===');
    console.log('Phone:', phoneNumber);
    console.log('Message:', messageBody);
    
    try {
      const conversation = await this.getOrCreateConversation(phoneNumber);
      const cleanMessage = messageBody.trim().toLowerCase();
      const isPaused = this.isConversationPaused(conversation.last_interaction_timestamp);

      console.log('Current conversation state:', conversation.conversation_state);
      console.log('Is conversation paused:', isPaused);
      console.log('Clean message:', cleanMessage);

      // Handle reset commands first
      if (cleanMessage === 'reset' || cleanMessage === 'restart' || cleanMessage === 'start over') {
        console.log('Processing reset command');
        await this.resetConversation(phoneNumber);
        return {
          response: "I've reset our conversation. Please text me your property ID number to get started.",
          shouldUpdateState: true
        };
      }

      // NEW: Enhanced logic based on conversation state and pause detection
      switch (conversation.conversation_state) {
        case 'awaiting_property_id':
          return await this.handlePropertyIdInput(conversation, cleanMessage);
        
        case 'awaiting_confirmation':
          return await this.handleConfirmation(conversation, cleanMessage);
        
        case 'confirmed':
          return await this.handleConfirmedGuestInquiry(conversation, messageBody, isPaused);
        
        default:
          console.log('Unknown conversation state, resetting to awaiting_property_id');
          await this.resetConversation(phoneNumber);
          return this.getWelcomeMessage();
      }
    } catch (error) {
      console.error('Error processing message:', error);
      return {
        response: "I'm sorry, I encountered an error. Please try again or text 'reset' to start over.",
        shouldUpdateState: false
      };
    }
  }

  // NEW: Enhanced handler for confirmed guests with continuity and personalization
  async handleConfirmedGuestInquiry(conversation, messageBody, isPaused) {
    console.log('Handling confirmed guest inquiry with continuity');
    
    const property = await this.getPropertyInfo(conversation.property_id);
    const message = messageBody.trim().toLowerCase();
    const greeting = this.getTimeAwareGreeting(conversation.timezone || property?.timezone || 'UTC');
    
    // Detect if this is a greeting after a pause
    const isGreeting = this.matchesAnyKeywords(message, [
      'hi', 'hello', 'hey', 'good morning', 'good afternoon', 'good evening', 'greetings'
    ]);

    // Generate contextual follow-up
    const contextualFollowUp = this.generateContextualFollowUp(conversation, 'general');

    // Handle greetings with context and time awareness
    if (isGreeting && isPaused) {
      const propertyName = property?.property_name || 'your property';
      let response = `${greeting}! Welcome back! ${contextualFollowUp}How can I help you today?`;
      
      // Ensure it fits SMS limit
      if (response.length > this.SMS_CHAR_LIMIT) {
        response = `${greeting}! Welcome back! How can I help?`;
      }
      
      return {
        response,
        shouldUpdateState: false
      };
    } else if (isGreeting) {
      const propertyName = property?.property_name || 'your property';
      let response = `${greeting}! I'm here to help with your stay at ${propertyName}. What can I assist you with?`;
      
      if (response.length > this.SMS_CHAR_LIMIT) {
        response = `${greeting}! How can I help with your stay?`;
      }
      
      return {
        response,
        shouldUpdateState: false
      };
    }

    // Handle specific inquiries with enhanced responses
    const inquiryResult = await this.handleSpecificInquiry(conversation, property, message, messageBody);
    
    // Update conversation context
    await this.updateConversationContext(conversation, message, inquiryResult.messageType);
    
    return inquiryResult;
  }

  // NEW: Handle specific inquiries with better context tracking
  async handleSpecificInquiry(conversation, property, message, originalMessage) {
    console.log('Handling specific inquiry with context');

    // Enhanced WiFi detection
    if (this.matchesAnyKeywords(message, [
      'wifi', 'wi-fi', 'internet', 'password', 'network', 'connection', 'wireless'
    ])) {
      if (property?.wifi_name && property?.wifi_password) {
        const response = `WiFi: ${property.wifi_name}\nPassword: ${property.wifi_password}\n\nNeed anything else?`;
        return {
          response: this.ensureSmsLimit(response),
          shouldUpdateState: false,
          messageType: 'wifi'
        };
      } else {
        return {
          response: "WiFi details should be in your check-in instructions. Contact property if needed.",
          shouldUpdateState: false,
          messageType: 'wifi'
        };
      }
    }

    // Enhanced parking detection
    if (this.matchesAnyKeywords(message, [
      'parking', 'park', 'car', 'vehicle', 'garage', 'spot', 'valet'
    ])) {
      if (property?.parking_instructions) {
        const response = `${property.parking_instructions}\n\nOther questions?`;
        return {
          response: this.ensureSmsLimit(response),
          shouldUpdateState: false,
          messageType: 'parking'
        };
      } else {
        return {
          response: "Check your booking confirmation for parking info or contact the property.",
          shouldUpdateState: false,
          messageType: 'parking'
        };
      }
    }

    // Check-in/check-out times
    if (this.matchesAnyKeywords(message, [
      'check in', 'checkin', 'check-in', 'check out', 'checkout', 'check-out'
    ])) {
      const checkIn = property?.check_in_time || '4:00 PM';
      const checkOut = property?.check_out_time || '11:00 AM';
      const response = `Check-in: ${checkIn}\nCheck-out: ${checkOut}\n\nAnything else?`;
      return {
        response: this.ensureSmsLimit(response),
        shouldUpdateState: false,
        messageType: 'checkin_times'
      };
    }

    // Location/recommendation requests - route to OpenAI with enhanced context
    if (this.matchesLocationOrRecommendationKeywords(message)) {
      const result = await this.handleLocationOrRecommendationRequest(property, originalMessage, conversation);
      return {
        ...result,
        messageType: 'recommendations'
      };
    }

    // For any unmatched complex question, send to OpenAI
    const result = await this.getOpenAIRecommendations(property, `general inquiry: ${originalMessage}`, conversation);
    return {
      ...result,
      messageType: 'general'
    };
  }

  // NEW: Update conversation context for continuity
  async updateConversationContext(conversation, message, messageType) {
    try {
      const context = conversation.conversation_context || {};
      const askedAbout = context.askedAbout || [];
      
      // Track what the user has asked about
      if (messageType && !askedAbout.includes(messageType)) {
        askedAbout.push(messageType);
      }

      // Update context
      const updatedContext = {
        ...context,
        askedAbout,
        lastMessageType: messageType,
        lastInquiryTime: new Date().toISOString()
      };

      await this.updateConversationState(conversation.phone_number, {
        conversation_context: updatedContext,
        last_message_type: messageType
      });
    } catch (error) {
      console.error('Error updating conversation context:', error);
    }
  }

  // NEW: Ensure response fits SMS character limit
  ensureSmsLimit(response) {
    if (response.length <= this.SMS_CHAR_LIMIT) {
      return response;
    }
    
    // Try to trim gracefully
    const trimmed = response.substring(0, this.SMS_CHAR_LIMIT - 3) + '...';
    return trimmed;
  }

  // Enhanced OpenAI recommendations with conversation context
  async getOpenAIRecommendations(property, type, conversation) {
    console.log(`🤖 Getting contextual OpenAI recommendations for ${type}`);
    
    try {
      const propertyAddress = property?.address || 'the property';
      const propertyName = property?.property_name || 'your accommodation';
      const context = conversation?.conversation_context || {};
      const previousAskedAbout = context.askedAbout || [];
      
      let contextualNote = '';
      if (previousAskedAbout.length > 0) {
        contextualNote = `The guest has previously asked about: ${previousAskedAbout.join(', ')}. `;
      }

      const prompt = `You are a knowledgeable local concierge. A guest is staying at ${propertyName} at ${propertyAddress}. ${contextualNote}They are asking about: ${type}

IMPORTANT: Keep response under 160 characters for SMS. Be conversational and warm. If recommendations don't fit, prioritize the best 1-2 options with brief descriptions.

${contextualNote ? 'Reference their previous interests naturally if relevant.' : ''}

Focus on what they\'re asking about. End with a brief offer to help more.`;

      const response = await fetch('https://zutwyyepahbbvrcbsbke.supabase.co/functions/v1/openai-recommendations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp1dHd5eWVwYWhiYnZyY2JzYmtlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDU0MDg3MDMsImV4cCI6MjA2MDk4NDcwM30.kUje38W2D2vXjYos6laaZ_rOzADLGiftoHAztFqSP9g`
        },
        body: JSON.stringify({ prompt })
      });

      if (response.ok) {
        const data = await response.json();
        console.log('✅ OpenAI recommendations received successfully');
        
        // Store recommendations for future context
        await this.updateConversationState(conversation.phone_number, {
          last_recommendations: data.recommendation
        });
        
        return {
          response: this.ensureSmsLimit(data.recommendation),
          shouldUpdateState: false
        };
      } else {
        throw new Error(`OpenAI API call failed: ${response.status}`);
      }
    } catch (error) {
      console.error('❌ Error getting OpenAI recommendations:', error);
      
      return {
        response: "Having trouble with recommendations right now. Try again soon or ask about WiFi, parking, or check-in details.",
        shouldUpdateState: false
      };
    }
  }

  // Keep existing methods but enhance them
  async handlePropertyIdInput(conversation, input) {
    const propertyCode = input.match(/\d+/)?.[0];
    
    if (!propertyCode) {
      return {
        response: "Hi! Please text your property ID number from your booking confirmation. Text 'reset' if needed.",
        shouldUpdateState: false
      };
    }

    try {
      const property = await this.findPropertyByCode(propertyCode);
      
      if (!property) {
        return {
          response: `Property ID ${propertyCode} not found. Check your booking confirmation or text 'reset'.`,
          shouldUpdateState: false
        };
      }

      await this.updateConversationState(conversation.phone_number, {
        property_id: property.property_id || property.id,
        conversation_state: 'awaiting_confirmation'
      });

      const response = `Great! You're staying at ${property.property_name} (${property.address}). Correct? Reply Y or N.`;
      return {
        response: this.ensureSmsLimit(response),
        shouldUpdateState: true
      };
    } catch (error) {
      console.error('Error finding property:', error);
      return {
        response: "Trouble looking up that property ID. Try again or text 'reset'.",
        shouldUpdateState: false
      };
    }
  }

  async handleConfirmation(conversation, input) {
    const normalizedInput = input.toLowerCase().trim();
    const isYes = ['y', 'yes', 'yeah', 'yep', 'correct', 'right', 'true', '1', 'ok', 'okay', 'yup', 'sure', 'absolutely', 'definitely'].includes(normalizedInput);
    const isNo = ['n', 'no', 'nope', 'wrong', 'incorrect', 'false', '0', 'nah', 'negative'].includes(normalizedInput);

    if (isYes) {
      // Set timezone based on property if available
      const property = await this.getPropertyInfo(conversation.property_id);
      const timezone = this.guessTimezoneFromAddress(property?.address) || 'UTC';
      
      await this.updateConversationState(conversation.phone_number, {
        property_confirmed: true,
        conversation_state: 'confirmed',
        timezone: timezone
      });

      const greeting = this.getTimeAwareGreeting(timezone);
      const response = `${greeting}! I'm your AI concierge. I can help with WiFi, parking, directions, and local recommendations. What do you need?`;
      
      return {
        response: this.ensureSmsLimit(response),
        shouldUpdateState: true
      };
    } else if (isNo) {
      await this.updateConversationState(conversation.phone_number, {
        property_id: null,
        conversation_state: 'awaiting_property_id'
      });

      return {
        response: "No problem! Please provide your correct property ID from your booking confirmation.",
        shouldUpdateState: true
      };
    } else {
      return {
        response: "Please reply Y for Yes or N for No to confirm the property. Text 'reset' to start over.",
        shouldUpdateState: false
      };
    }
  }

  // NEW: Guess timezone from property address
  guessTimezoneFromAddress(address) {
    if (!address) return 'UTC';
    
    const addressLower = address.toLowerCase();
    
    // Common timezone mappings based on location keywords
    const timezoneMap = {
      'san juan': 'America/Puerto_Rico',
      'puerto rico': 'America/Puerto_Rico',
      'miami': 'America/New_York',
      'new york': 'America/New_York',
      'los angeles': 'America/Los_Angeles',
      'chicago': 'America/Chicago',
      'denver': 'America/Denver',
      'london': 'Europe/London',
      'paris': 'Europe/Paris',
      'tokyo': 'Asia/Tokyo'
    };

    for (const [location, timezone] of Object.entries(timezoneMap)) {
      if (addressLower.includes(location)) {
        return timezone;
      }
    }

    return 'UTC';
  }

  // Keep other existing methods with minimal changes
  async resetConversation(phoneNumber) {
    return await this.updateConversationState(phoneNumber, {
      conversation_state: 'awaiting_property_id',
      property_id: null,
      property_confirmed: false,
      conversation_context: {},
      last_message_type: null,
      last_recommendations: null
    });
  }

  async findPropertyByCode(code) {
    const { data: property, error } = await this.supabase
      .from('properties')
      .select('*')
      .eq('code', code.toString())
      .maybeSingle();

    if (error && error.code !== 'PGRST116') {
      throw new Error(`Database error: ${error.message}`);
    }

    if (property) {
      return {
        property_id: property.id,
        property_name: property.property_name,
        address: property.address,
        check_in_time: property.check_in_time || '4:00 PM',
        check_out_time: property.check_out_time || '11:00 AM',
        knowledge_base: property.knowledge_base || '',
        local_recommendations: property.local_recommendations || ''
      };
    }

    return null;
  }

  async getPropertyInfo(propertyId) {
    if (!propertyId) return null;

    try {
      const { data: property, error } = await this.supabase
        .from('properties')
        .select('*')
        .eq('id', propertyId)
        .maybeSingle();

      if (error) {
        console.error('Error fetching property info:', error);
        return null;
      }

      return property;
    } catch (error) {
      console.error('Error getting property info:', error);
      return null;
    }
  }

  matchesAnyKeywords(message, keywords) {
    const lowerMessage = message.toLowerCase();
    return keywords.some(keyword => lowerMessage.includes(keyword.toLowerCase()));
  }

  matchesLocationOrRecommendationKeywords(message) {
    const locationKeywords = [
      'beach', 'beaches', 'restaurant', 'food', 'eat', 'dining', 'drink', 'bar',
      'things to do', 'attractions', 'activities', 'directions', 'near', 'close to'
    ];
    return this.matchesAnyKeywords(message, locationKeywords);
  }

  async handleLocationOrRecommendationRequest(property, message, conversation) {
    console.log('🎯 Routing enhanced location/recommendation request to OpenAI');
    
    if (this.matchesAnyKeywords(message, ['beach', 'beaches', 'ocean', 'swimming'])) {
      return await this.getOpenAIRecommendations(property, 'beach recommendations', conversation);
    }
    
    if (this.matchesAnyKeywords(message, ['restaurant', 'food', 'eat', 'dining', 'drink', 'bar'])) {
      return await this.getOpenAIRecommendations(property, 'restaurant recommendations', conversation);
    }
    
    if (this.matchesAnyKeywords(message, ['things to do', 'attractions', 'activities'])) {
      return await this.getOpenAIRecommendations(property, 'attractions and activities', conversation);
    }
    
    return await this.getOpenAIRecommendations(property, `travel inquiry: ${message}`, conversation);
  }

  getWelcomeMessage() {
    return {
      response: "Welcome! Text your property ID number to get started. Text 'reset' anytime to restart.",
      shouldUpdateState: false
    };
  }
}
