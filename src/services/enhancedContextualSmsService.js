
// Enhanced SMS Conversation Service with Context-Aware Memory & Personalization
export class EnhancedContextualSmsService {
  constructor(supabase) {
    this.supabase = supabase;
    this.SMS_CHAR_LIMIT = 160;
    this.GOOGLE_PLACES_API_KEY = process.env.GOOGLE_PLACES_API_KEY || '';
  }

  async getOrCreateConversation(phoneNumber) {
    console.log('Getting or creating enhanced conversation for:', phoneNumber);
    
    const { data: existing, error } = await this.supabase
      .from('sms_conversations')
      .select('*')
      .eq('phone_number', phoneNumber)
      .maybeSingle();

    if (error) {
      console.error('Error fetching conversation:', error);
    }

    if (existing) {
      console.log('Found existing conversation with context:', existing);
      return existing;
    }

    const { data: newConversation, error: createError } = await this.supabase
      .from('sms_conversations')
      .insert({
        phone_number: phoneNumber,
        conversation_state: 'awaiting_property_id',
        conversation_context: {},
        preferences: {},
        guest_profile: {},
        location_context: {},
        time_context: {},
        timezone: 'UTC',
        last_interaction_timestamp: new Date().toISOString()
      })
      .select()
      .single();

    if (createError) {
      console.error('Failed to create conversation:', createError);
      throw new Error(`Failed to create conversation: ${createError.message}`);
    }

    console.log('Created new enhanced conversation:', newConversation);
    return newConversation;
  }

  async updateConversationContext(phoneNumber, updates) {
    console.log('Updating enhanced conversation context for:', phoneNumber);
    
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

    return data;
  }

  extractGuestNameFromMessage(message) {
    // Simple name extraction patterns
    const patterns = [
      /my name is (\w+)/i,
      /i'm (\w+)/i,
      /this is (\w+)/i,
      /(\w+) here/i
    ];

    for (const pattern of patterns) {
      const match = message.match(pattern);
      if (match && match[1] && match[1].length > 1) {
        return match[1].charAt(0).toUpperCase() + match[1].slice(1).toLowerCase();
      }
    }
    return null;
  }

  buildPersonalizedGreeting(conversation, property) {
    const guestProfile = conversation.guest_profile || {};
    const guestName = conversation.guest_name || guestProfile.name;
    const lastActivity = conversation.last_activity_type;
    const checkOutDate = conversation.check_out_date;
    
    let greeting = '';
    
    if (guestName) {
      greeting += `Hi ${guestName}! `;
    }
    
    // Check if checkout is tomorrow
    if (checkOutDate) {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const checkOut = new Date(checkOutDate);
      
      if (checkOut.toDateString() === tomorrow.toDateString()) {
        greeting += "It's almost checkout tomorrow—let me know if you need anything packed or stored early! ";
      }
    }
    
    // Personalized follow-up based on last activity
    if (lastActivity === 'restaurant' && guestProfile.lastDining) {
      greeting += `Since you liked ${guestProfile.lastDining} last night, want me to recommend a breakfast spot near the water? `;
    } else if (lastActivity === 'beach' && this.isEvening()) {
      greeting += "After your beach day, how about a sunset cocktail spot? ";
    }
    
    return greeting.trim();
  }

  async processPersonalizedMessage(phoneNumber, messageBody) {
    console.log('=== PROCESSING PERSONALIZED MESSAGE ===');
    console.log('Phone:', phoneNumber);
    console.log('Message:', messageBody);
    
    try {
      const conversation = await this.getOrCreateConversation(phoneNumber);
      const cleanMessage = messageBody.trim().toLowerCase();
      
      // Extract guest name if mentioned
      const extractedName = this.extractGuestNameFromMessage(messageBody);
      if (extractedName && !conversation.guest_name) {
        await this.updateConversationContext(phoneNumber, {
          guest_name: extractedName,
          guest_profile: {
            ...conversation.guest_profile,
            name: extractedName
          }
        });
        conversation.guest_name = extractedName;
      }

      console.log('Current conversation state:', conversation.conversation_state);

      // Handle reset commands first
      if (cleanMessage === 'reset' || cleanMessage === 'restart' || cleanMessage === 'start over') {
        await this.resetConversation(phoneNumber);
        return {
          response: "I've reset our conversation. Please text your property ID to get started.",
          shouldUpdateState: true
        };
      }

      switch (conversation.conversation_state) {
        case 'awaiting_property_id':
          return await this.handlePropertyIdInput(conversation, cleanMessage);
        
        case 'awaiting_confirmation':
          return await this.handleConfirmation(conversation, cleanMessage);
        
        case 'confirmed':
          return await this.handlePersonalizedInquiry(conversation, messageBody);
        
        default:
          await this.resetConversation(phoneNumber);
          return this.getWelcomeMessage();
      }
    } catch (error) {
      console.error('Error processing personalized message:', error);
      return {
        response: "Sorry, I encountered an error. Please try again or text 'reset'.",
        shouldUpdateState: false
      };
    }
  }

  async handlePersonalizedInquiry(conversation, messageBody) {
    const property = await this.getPropertyInfo(conversation.property_id);
    const message = messageBody.trim().toLowerCase();
    
    // Build personalized greeting
    const personalizedGreeting = this.buildPersonalizedGreeting(conversation, property);
    
    const isGreeting = this.matchesAnyKeywords(message, [
      'hi', 'hello', 'hey', 'good morning', 'good afternoon', 'good evening'
    ]);

    if (isGreeting) {
      let response = personalizedGreeting || `Hello! How can I help with your stay?`;
      return {
        response: this.ensureSmsLimit(response),
        shouldUpdateState: false
      };
    }

    // Handle specific inquiries with context
    return await this.handleContextualInquiry(conversation, property, message, messageBody);
  }

  async handleContextualInquiry(conversation, property, message, originalMessage) {
    // Track what the guest is asking about for future personalization
    const activityType = this.categorizeActivity(message);
    
    // Update guest profile with interests
    const updatedProfile = {
      ...conversation.guest_profile,
      interests: [...(conversation.guest_profile.interests || []), activityType].slice(-5), // Keep last 5 interests
      lastAskedAbout: activityType,
      lastAskedTime: new Date().toISOString()
    };

    await this.updateConversationContext(conversation.phone_number, {
      guest_profile: updatedProfile,
      last_activity_type: activityType
    });

    // Handle basic property info requests
    if (this.matchesAnyKeywords(message, ['wifi', 'wi-fi', 'internet', 'password', 'network'])) {
      if (property?.wifi_name && property?.wifi_password) {
        const response = `WiFi: ${property.wifi_name}\nPassword: ${property.wifi_password}\n\nAnything else${conversation.guest_name ? `, ${conversation.guest_name}` : ''}?`;
        return {
          response: this.ensureSmsLimit(response),
          shouldUpdateState: false
        };
      }
    }

    // Location and recommendation requests
    if (this.matchesLocationKeywords(message)) {
      return await this.getContextualRecommendations(conversation, property, originalMessage);
    }

    // Default to contextual response
    return await this.getContextualRecommendations(conversation, property, `general: ${originalMessage}`);
  }

  categorizeActivity(message) {
    if (this.matchesAnyKeywords(message, ['beach', 'ocean', 'swimming', 'sand'])) return 'beach';
    if (this.matchesAnyKeywords(message, ['restaurant', 'food', 'eat', 'dining'])) return 'restaurant';
    if (this.matchesAnyKeywords(message, ['drink', 'bar', 'cocktail', 'beer', 'wine'])) return 'drinks';
    if (this.matchesAnyKeywords(message, ['coffee', 'cafe', 'espresso', 'latte'])) return 'coffee';
    if (this.matchesAnyKeywords(message, ['shopping', 'shop', 'buy', 'store'])) return 'shopping';
    if (this.matchesAnyKeywords(message, ['activities', 'things to do', 'fun', 'attractions'])) return 'activities';
    return 'general';
  }

  async getContextualRecommendations(conversation, property, originalMessage) {
    console.log(`🎯 Getting contextual recommendations for: ${originalMessage}`);
    
    try {
      const propertyAddress = property?.address || 'the property';
      const propertyName = property?.property_name || 'your accommodation';
      const guestProfile = conversation?.guest_profile || {};
      const guestName = conversation?.guest_name || guestProfile.name;
      
      // Build enhanced context for AI
      const enhancedContext = {
        guestName: guestName,
        previousInterests: guestProfile.interests || [],
        lastActivity: conversation.last_activity_type,
        timeOfDay: this.getTimeContext(),
        dayOfWeek: new Date().toLocaleDateString('en-US', { weekday: 'long' }),
        isCheckoutSoon: this.isCheckoutSoon(conversation.check_out_date),
        personalizedGreeting: guestName ? `Hi ${guestName}! ` : ''
      };

      const enhancedPayload = {
        prompt: originalMessage,
        propertyAddress: `${propertyName}, ${propertyAddress}`,
        guestContext: enhancedContext,
        requestType: this.categorizeActivity(originalMessage.toLowerCase()),
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
        console.log('✅ Contextual recommendations received');
        
        // Store recommendations and context for future use
        await this.updateConversationContext(conversation.phone_number, {
          last_recommendations: data.recommendation,
          time_context: {
            ...conversation.time_context,
            lastRecommendationTime: new Date().toISOString(),
            timeOfDay: this.getTimeContext()
          }
        });
        
        return {
          response: this.ensureSmsLimit(data.recommendation),
          shouldUpdateState: false
        };
      } else {
        throw new Error(`Contextual recommendations API failed: ${response.status}`);
      }
    } catch (error) {
      console.error('❌ Error getting contextual recommendations:', error);
      
      return {
        response: "Having trouble with recommendations right now. Try again soon or ask about WiFi, parking, or check-in details.",
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

  isEvening() {
    const hour = new Date().getHours();
    return hour >= 17 && hour < 22;
  }

  isCheckoutSoon(checkOutDate) {
    if (!checkOutDate) return false;
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const checkOut = new Date(checkOutDate);
    return checkOut.toDateString() === tomorrow.toDateString();
  }

  ensureSmsLimit(response) {
    if (response.length <= this.SMS_CHAR_LIMIT) {
      return response;
    }
    return response.substring(0, this.SMS_CHAR_LIMIT - 3) + '...';
  }

  matchesAnyKeywords(message, keywords) {
    const lowerMessage = message.toLowerCase();
    return keywords.some(keyword => lowerMessage.includes(keyword.toLowerCase()));
  }

  matchesLocationKeywords(message) {
    const keywords = [
      'beach', 'restaurant', 'food', 'eat', 'dining', 'drink', 'bar',
      'coffee', 'things to do', 'attractions', 'activities', 'directions',
      'near me', 'around here', 'walking distance', 'close by'
    ];
    return this.matchesAnyKeywords(message, keywords);
  }

  async handlePropertyIdInput(conversation, input) {
    const propertyCode = input.match(/\d+/)?.[0];
    
    if (!propertyCode) {
      return {
        response: "Hi! Please text your property ID from your booking confirmation. Text 'reset' if needed.",
        shouldUpdateState: false
      };
    }

    try {
      const property = await this.findPropertyByCode(propertyCode);
      
      if (!property) {
        return {
          response: `Property ID ${propertyCode} not found. Check your booking or text 'reset'.`,
          shouldUpdateState: false
        };
      }

      await this.updateConversationContext(conversation.phone_number, {
        property_id: property.property_id || property.id,
        conversation_state: 'awaiting_confirmation'
      });

      const response = `Great! You're staying at ${property.property_name}. Correct? Reply Y or N.`;
      return {
        response: this.ensureSmsLimit(response),
        shouldUpdateState: true
      };
    } catch (error) {
      return {
        response: "Trouble looking up that property ID. Try again or text 'reset'.",
        shouldUpdateState: false
      };
    }
  }

  async handleConfirmation(conversation, input) {
    const normalizedInput = input.toLowerCase().trim();
    const isYes = ['y', 'yes', 'yeah', 'yep', 'correct', 'right', 'ok', 'okay'].includes(normalizedInput);
    const isNo = ['n', 'no', 'nope', 'wrong', 'incorrect'].includes(normalizedInput);

    if (isYes) {
      const property = await this.getPropertyInfo(conversation.property_id);
      const timezone = this.guessTimezoneFromAddress(property?.address) || 'UTC';
      const guestName = conversation.guest_name;
      
      await this.updateConversationContext(conversation.phone_number, {
        property_confirmed: true,
        conversation_state: 'confirmed',
        timezone: timezone
      });

      const greeting = this.getTimeAwareGreeting(timezone);
      let response = `${greeting}! `;
      
      if (guestName) {
        response += `Welcome ${guestName}! `;
      }
      
      response += `I'm your AI concierge. I can help with WiFi, parking, directions, and personalized local tips. What do you need?`;
      
      return {
        response: this.ensureSmsLimit(response),
        shouldUpdateState: true
      };
    } else if (isNo) {
      await this.updateConversationContext(conversation.phone_number, {
        property_id: null,
        conversation_state: 'awaiting_property_id'
      });

      return {
        response: "No problem! Please provide your correct property ID from booking confirmation.",
        shouldUpdateState: true
      };
    } else {
      return {
        response: "Please reply Y for Yes or N for No to confirm. Text 'reset' to start over.",
        shouldUpdateState: false
      };
    }
  }

  getTimeAwareGreeting(timezone = 'UTC') {
    try {
      const now = new Date();
      const localTime = new Date(now.toLocaleString("en-US", {timeZone: timezone}));
      const hour = localTime.getHours();
      
      if (hour >= 5 && hour < 12) return 'Good morning';
      if (hour >= 12 && hour < 17) return 'Good afternoon';
      if (hour >= 17 && hour < 22) return 'Good evening';
      return 'Hello';
    } catch (error) {
      console.error('Error getting time-aware greeting:', error);
      return 'Hello';
    }
  }

  guessTimezoneFromAddress(address) {
    if (!address) return 'UTC';
    
    const addressLower = address.toLowerCase();
    const timezoneMap = {
      'san juan': 'America/Puerto_Rico',
      'puerto rico': 'America/Puerto_Rico',
      'miami': 'America/New_York',
      'new york': 'America/New_York',
      'los angeles': 'America/Los_Angeles',
      'chicago': 'America/Chicago'
    };

    for (const [location, timezone] of Object.entries(timezoneMap)) {
      if (addressLower.includes(location)) {
        return timezone;
      }
    }

    return 'UTC';
  }

  async resetConversation(phoneNumber) {
    return await this.updateConversationContext(phoneNumber, {
      conversation_state: 'awaiting_property_id',
      property_id: null,
      property_confirmed: false,
      conversation_context: {},
      guest_profile: {},
      location_context: {},
      time_context: {},
      last_message_type: null,
      last_recommendations: null,
      last_activity_type: null
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
        check_out_time: property.check_out_time || '11:00 AM'
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

      return error ? null : property;
    } catch (error) {
      console.error('Error getting property info:', error);
      return null;
    }
  }

  getWelcomeMessage() {
    return {
      response: "Welcome! Text your property ID to get started. Text 'reset' anytime to restart.",
      shouldUpdateState: false
    };
  }
}
