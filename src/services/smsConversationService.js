
// SMS Conversation Service - handles the logic for property identification flow
export class SmsConversationService {
  constructor(supabase) {
    this.supabase = supabase;
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

    // Create new conversation
    const { data: newConversation, error: createError } = await this.supabase
      .from('sms_conversations')
      .insert({
        phone_number: phoneNumber,
        conversation_state: 'awaiting_property_id'
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
        updated_at: new Date().toISOString()
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

  async resetConversation(phoneNumber) {
    console.log('Resetting conversation for:', phoneNumber);
    
    return await this.updateConversationState(phoneNumber, {
      conversation_state: 'awaiting_property_id',
      property_id: null,
      property_confirmed: false
    });
  }

  async findPropertyByCode(code) {
    console.log('Looking up property code:', code);
    
    // First try the properties table
    const { data: property, error } = await this.supabase
      .from('properties')
      .select('*')
      .eq('code', code.toString())
      .maybeSingle();

    if (error && error.code !== 'PGRST116') {
      console.error('Database error in properties table:', error);
      throw new Error(`Database error: ${error.message}`);
    }

    if (property) {
      console.log('Found property in properties table:', property);
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

    // Also try the property_codes table as fallback
    const { data: propertyCode, error: codeError } = await this.supabase
      .from('property_codes')
      .select('*')
      .eq('code', code.toString())
      .maybeSingle();

    if (codeError && codeError.code !== 'PGRST116') {
      console.error('Database error in property_codes table:', codeError);
      throw new Error(`Database error: ${codeError.message}`);
    }

    if (propertyCode) {
      console.log('Found property in property_codes table:', propertyCode);
      return {
        property_id: propertyCode.property_id,
        property_name: propertyCode.property_name,
        address: propertyCode.address
      };
    } else {
      console.log('Property code not found in either table');
    }

    return null;
  }

  async processMessage(phoneNumber, messageBody) {
    console.log('=== PROCESSING MESSAGE ===');
    console.log('Phone:', phoneNumber);
    console.log('Message:', messageBody);
    
    try {
      const conversation = await this.getOrCreateConversation(phoneNumber);
      const cleanMessage = messageBody.trim().toLowerCase();

      console.log('Current conversation state:', conversation.conversation_state);
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

      switch (conversation.conversation_state) {
        case 'awaiting_property_id':
          return await this.handlePropertyIdInput(conversation, cleanMessage);
        
        case 'awaiting_confirmation':
          return await this.handleConfirmation(conversation, cleanMessage);
        
        case 'confirmed':
          return await this.handleGeneralInquiry(conversation, messageBody);
        
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

  async handlePropertyIdInput(conversation, input) {
    console.log('Handling property ID input:', input);
    
    // Extract numbers from the message (in case they type "Property 1234" or "1234")
    const propertyCode = input.match(/\d+/)?.[0];
    
    if (!propertyCode) {
      console.log('No property code found in input');
      return {
        response: "Hi! To get started, please text me your property ID number. You should have received this in your booking confirmation. If you need help, text 'reset' to start over.",
        shouldUpdateState: false
      };
    }

    console.log('Extracted property code:', propertyCode);

    try {
      const property = await this.findPropertyByCode(propertyCode);
      
      if (!property) {
        console.log('Property not found for code:', propertyCode);
        return {
          response: `I couldn't find a property with ID ${propertyCode}. Please check your booking confirmation and try again with the correct property ID. You can also text 'reset' to start over.`,
          shouldUpdateState: false
        };
      }

      console.log('Found property, updating conversation state to awaiting_confirmation');
      // Update conversation with property info and move to confirmation state
      await this.updateConversationState(conversation.phone_number, {
        property_id: property.property_id || property.id,
        conversation_state: 'awaiting_confirmation'
      });

      return {
        response: `Great! It looks like you're staying at ${property.property_name} (${property.address}). Is this correct? Please reply Y for Yes or N for No.`,
        shouldUpdateState: true
      };
    } catch (error) {
      console.error('Error finding property:', error);
      return {
        response: "I'm having trouble looking up that property ID. Please try again in a moment or text 'reset' to start over.",
        shouldUpdateState: false
      };
    }
  }

  async handleConfirmation(conversation, input) {
    console.log('Handling confirmation with input:', input);
    
    // Normalize input for comparison
    const normalizedInput = input.toLowerCase().trim();
    console.log('Normalized input:', normalizedInput);
    
    const isYes = ['y', 'yes', 'yeah', 'yep', 'correct', 'right', 'true', '1', 'ok', 'okay', 'yup', 'sure', 'absolutely', 'definitely'].includes(normalizedInput);
    const isNo = ['n', 'no', 'nope', 'wrong', 'incorrect', 'false', '0', 'nah', 'negative'].includes(normalizedInput);

    console.log('Is yes?', isYes);
    console.log('Is no?', isNo);

    if (isYes) {
      console.log('User confirmed property - updating to confirmed state');
      await this.updateConversationState(conversation.phone_number, {
        property_confirmed: true,
        conversation_state: 'confirmed'
      });

      return {
        response: "Perfect! I'm your AI concierge for your stay. I can help you with specific information about WiFi, parking, directions, local recommendations, and more. What would you like to know?",
        shouldUpdateState: true
      };
    } else if (isNo) {
      console.log('User rejected property - resetting to awaiting_property_id');
      await this.updateConversationState(conversation.phone_number, {
        property_id: null,
        conversation_state: 'awaiting_property_id'
      });

      return {
        response: "No problem! Let's make sure we have the correct property ID. Can you please provide your property ID again? You can find this in your booking confirmation.",
        shouldUpdateState: true
      };
    } else {
      console.log('Unclear confirmation response:', input);
      return {
        response: "Please reply with Y for Yes or N for No to confirm if this is the correct property. You can also text 'reset' to start over.",
        shouldUpdateState: false
      };
    }
  }

  async handleGeneralInquiry(conversation, messageBody) {
    console.log('Handling general inquiry:', messageBody);
    
    try {
      // Get property information
      const property = await this.getPropertyInfo(conversation.property_id);
      const message = messageBody.trim().toLowerCase();
      
      console.log('Property info:', property);
      console.log('User message:', message);

      // Enhanced WiFi detection
      if (this.matchesAnyKeywords(message, [
        'wifi', 'wi-fi', 'internet', 'password', 'network', 'connection', 'wireless',
        'what is the wifi', 'whats the wifi', 'wifi password', 'internet password',
        'how do i connect', 'network name', 'network password'
      ])) {
        if (property?.wifi_name && property?.wifi_password) {
          return {
            response: `Here are your WiFi details:\n\nNetwork: ${property.wifi_name}\nPassword: ${property.wifi_password}\n\nJust connect to the network and enter the password. The signal is strongest in the living room. Need help with anything else?`,
            shouldUpdateState: false
          };
        } else {
          return {
            response: "WiFi information should be available in your check-in instructions. If you can't find it, please contact the property directly for WiFi details.",
            shouldUpdateState: false
          };
        }
      }

      // Enhanced parking detection
      if (this.matchesAnyKeywords(message, [
        'parking', 'park', 'car', 'vehicle', 'garage', 'spot', 'valet',
        'where can i park', 'where do i park', 'parking instructions',
        'how to park', 'parking garage', 'parking spot'
      ])) {
        if (property?.parking_instructions) {
          return {
            response: `${property.parking_instructions}\n\nDo you need directions to the parking garage or have other parking questions?`,
            shouldUpdateState: false
          };
        } else {
          return {
            response: "For parking information, please check your booking confirmation or contact the property directly.",
            shouldUpdateState: false
          };
        }
      }

      // Enhanced access/entry detection
      if (this.matchesAnyKeywords(message, [
        'access', 'entry', 'key', 'code', 'door', 'enter', 'get in', 'unlock', 'lock',
        'how do i get in', 'entry code', 'door code', 'access code',
        'building access', 'front door', 'main entrance'
      ])) {
        if (property?.access_instructions) {
          return {
            response: `${property.access_instructions}\n\nIf you have any trouble accessing the building or unit, please contact our emergency line. Need anything else?`,
            shouldUpdateState: false
          };
        } else {
          return {
            response: "Access instructions should be provided closer to your check-in time. If you need immediate access help, please contact the property directly.",
            shouldUpdateState: false
          };
        }
      }

      // Check-in/check-out times
      if (this.matchesAnyKeywords(message, [
        'check in', 'checkin', 'check-in', 'check out', 'checkout', 'check-out',
        'arrival', 'departure', 'time', 'when can i', 'what time'
      ])) {
        const checkInTime = property?.check_in_time || '4:00 PM';
        const checkOutTime = property?.check_out_time || '11:00 AM';
        return {
          response: `Check-in is at ${checkInTime} and check-out is at ${checkOutTime}. If you need to arrange an early check-in or late check-out, please contact the property directly. Is there anything else I can help you with?`,
          shouldUpdateState: false
        };
      }

      // Emergency contact
      if (this.matchesAnyKeywords(message, [
        'emergency', 'urgent', 'contact', 'phone', 'help', 'problem', 'issue',
        'trouble', 'emergency contact', 'property manager', 'need help'
      ])) {
        if (property?.emergency_contact) {
          return {
            response: `For urgent matters, here's the emergency contact:\n\n${property.emergency_contact}\n\nDon't hesitate to call if you need immediate assistance!`,
            shouldUpdateState: false
          };
        } else {
          return {
            response: "For urgent matters, please contact the property directly using the phone number provided in your booking confirmation.",
            shouldUpdateState: false
          };
        }
      }

      // Amenities
      if (this.matchesAnyKeywords(message, [
        'amenities', 'facilities', 'pool', 'gym', 'laundry', 'kitchen',
        'features', 'what does', 'what is available', 'included'
      ])) {
        if (property?.amenities && property.amenities.length > 0) {
          const amenitiesList = Array.isArray(property.amenities) ? property.amenities : JSON.parse(property.amenities || '[]');
          return {
            response: `Your property includes these amenities:\n\n${amenitiesList.map(a => `• ${a}`).join('\n')}\n\nWould you like more details about any specific amenity?`,
            shouldUpdateState: false
          };
        } else {
          return {
            response: "For information about available amenities, please check your booking confirmation or contact the property directly.",
            shouldUpdateState: false
          };
        }
      }

      // House rules
      if (this.matchesAnyKeywords(message, [
        'rules', 'policy', 'allowed', 'smoking', 'pets', 'noise',
        'regulations', 'guidelines', 'house rules', 'policies'
      ])) {
        if (property?.house_rules) {
          return {
            response: `Here are the house rules for your stay:\n\n${property.house_rules}\n\nPlease let me know if you have questions about any of these policies.`,
            shouldUpdateState: false
          };
        } else {
          return {
            response: "For property rules and policies, please check your booking confirmation or contact the property directly.",
            shouldUpdateState: false
          };
        }
      }

      // Handle basic greetings
      if (this.matchesAnyKeywords(message, [
        'hi', 'hello', 'hey', 'good morning', 'good afternoon', 'good evening', 'greetings'
      ])) {
        const propertyName = property?.property_name || 'your property';
        return {
          response: `Hello! Welcome to ${propertyName}! I'm your AI concierge and I'm here to help make your stay comfortable. I can provide specific information about WiFi passwords, parking instructions, local beach and restaurant recommendations, directions, and more. What can I help you with today?`,
          shouldUpdateState: false
        };
      }

      // NEW: Enhanced keyword detection for multi-concept questions
      if (this.matchesLocationOrRecommendationKeywords(message)) {
        return await this.handleLocationOrRecommendationRequest(property, message);
      }

      // For any unmatched complex question, send to OpenAI instead of generic response
      console.log('🤖 Complex question detected - routing to OpenAI for contextual response');
      return await this.getOpenAIRecommendations(property, `general inquiry: ${messageBody}`);

    } catch (error) {
      console.error('Error in handleGeneralInquiry:', error);
      return {
        response: "I'm having trouble accessing your property information right now. Please try again or contact the property directly for assistance.",
        shouldUpdateState: false
      };
    }
  }

  // NEW: Enhanced keyword detection for location/recommendation requests
  matchesLocationOrRecommendationKeywords(message) {
    const locationKeywords = [
      // Beaches
      'beach', 'beaches', 'ocean', 'swimming', 'sand', 'surf', 'water', 'escambron', 'condado', 'isla verde',
      // Restaurants/bars/drinks
      'restaurant', 'food', 'eat', 'dining', 'lunch', 'dinner', 'breakfast', 'drink', 'bar', 'sunset', 'cocktail',
      // Attractions/activities
      'things to do', 'attractions', 'activities', 'sightseeing', 'tourist', 'places to visit', 'explore',
      // Directions/transport
      'directions', 'how to get', 'way to', 'stop on the way', 'route to', 'near', 'close to'
    ];

    return this.matchesAnyKeywords(message, locationKeywords);
  }

  // NEW: Route location/recommendation requests to appropriate OpenAI handlers
  async handleLocationOrRecommendationRequest(property, message) {
    console.log('🎯 Routing location/recommendation request to OpenAI');
    
    // Determine the type of request for better OpenAI prompting
    if (this.matchesAnyKeywords(message, ['beach', 'beaches', 'ocean', 'swimming', 'escambron', 'condado'])) {
      return await this.getOpenAIRecommendations(property, 'beach and coastal recommendations');
    }
    
    if (this.matchesAnyKeywords(message, ['restaurant', 'food', 'eat', 'dining', 'drink', 'bar', 'sunset', 'cocktail'])) {
      return await this.getOpenAIRecommendations(property, 'restaurant and dining recommendations');
    }
    
    if (this.matchesAnyKeywords(message, ['things to do', 'attractions', 'activities', 'sightseeing', 'places to visit'])) {
      return await this.getOpenAIRecommendations(property, 'attractions and activities');
    }
    
    if (this.matchesAnyKeywords(message, ['directions', 'how to get', 'way to', 'route to', 'airport'])) {
      return await this.getOpenAIRecommendations(property, 'directions and transportation');
    }
    
    // Default to contextual inquiry for complex questions
    return await this.getOpenAIRecommendations(property, `contextual travel inquiry: ${message}`);
  }

  async getOpenAIRecommendations(property, type) {
    console.log(`🤖 Getting OpenAI recommendations for ${type}`);
    
    try {
      const propertyAddress = property?.address || 'the property';
      const propertyName = property?.property_name || 'your accommodation';
      
      const prompt = `You are a knowledgeable local concierge assistant. A guest is staying at ${propertyName} located at ${propertyAddress}. They are asking about: ${type}

Please provide 3-4 specific, actionable recommendations with:
- Names and brief descriptions
- Approximate distance/travel time from the property address
- Why each recommendation is good
- A personal touch as if you're a local expert

Keep it conversational and helpful, ending with an offer to provide directions or more information.

Focus ONLY on what they're asking about - don't mix categories unless they specifically ask for multiple types.`;

      console.log('🤖 Calling OpenAI recommendations function with prompt');
      const response = await fetch('https://zutwyyepahbbvrcbsbke.supabase.co/functions/v1/openai-recommendations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp1dHd5eWVwYWhiYnZyY2JzYmtlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDU0MDg3MDMsImV4cCI6MjA2MDk4NDcwM30.kUje38W2D2vXjYos6laaZ_rOzADLGiftoHAztFqSP9g`
        },
        body: JSON.stringify({ prompt })
      });

      console.log('🤖 OpenAI response status:', response.status);

      if (response.ok) {
        const data = await response.json();
        console.log('✅ OpenAI recommendations received successfully');
        
        return {
          response: data.recommendation,
          shouldUpdateState: false
        };
      } else {
        const errorText = await response.text();
        console.error('❌ OpenAI API call failed:', response.status, errorText);
        throw new Error(`OpenAI API call failed: ${response.status}`);
      }
    } catch (error) {
      console.error('❌ Error getting OpenAI recommendations:', error);
      
      return {
        response: "I'm having trouble connecting to our recommendation service right now. Please try again in a moment, or feel free to ask me about other aspects of your stay like WiFi, parking, or check-in details.",
        shouldUpdateState: false
      };
    }
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

  getWelcomeMessage() {
    return {
      response: "Welcome! To get started, please text me your property ID number. You should have received this in your booking confirmation. Text 'reset' anytime to restart.",
      shouldUpdateState: false
    };
  }
}
