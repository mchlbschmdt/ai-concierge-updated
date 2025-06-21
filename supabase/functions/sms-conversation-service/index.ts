
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

console.log("Enhanced SMS Conversation Service starting up...")

// Enhanced SMS Conversation Service with continuity, personalization, and time-awareness
class EnhancedSmsConversationService {
  constructor(supabase) {
    this.supabase = supabase;
    this.SMS_CHAR_LIMIT = 160;
  }

  async getOrCreateConversation(phoneNumber) {
    console.log('Getting or creating conversation for:', phoneNumber);
    
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
    console.log('Updating conversation state for:', phoneNumber);
    
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

  isConversationPaused(lastInteractionTimestamp) {
    if (!lastInteractionTimestamp) return false;
    
    const now = new Date();
    const lastInteraction = new Date(lastInteractionTimestamp);
    const diffMinutes = (now - lastInteraction) / (1000 * 60);
    
    return diffMinutes > 30;
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

  ensureSmsLimit(response) {
    if (response.length <= this.SMS_CHAR_LIMIT) {
      return response;
    }
    return response.substring(0, this.SMS_CHAR_LIMIT - 3) + '...';
  }

  generateContextualFollowUp(conversation) {
    const lastRecommendations = conversation.last_recommendations;
    const lastMessageType = conversation.last_message_type;

    if (lastMessageType === 'recommendations' && lastRecommendations) {
      const followUps = [
        "Hope you enjoyed my suggestions! ",
        "Did my recommendations work out? ",
        "Hope those spots were great! "
      ];
      return followUps[Math.floor(Math.random() * followUps.length)];
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

      console.log('Current state:', conversation.conversation_state);
      console.log('Is paused:', isPaused);

      // Handle reset commands
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
          return await this.handleConfirmedGuestInquiry(conversation, messageBody, isPaused);
        
        default:
          await this.resetConversation(phoneNumber);
          return this.getWelcomeMessage();
      }
    } catch (error) {
      console.error('Error processing message:', error);
      return {
        response: "Sorry, I encountered an error. Please try again or text 'reset'.",
        shouldUpdateState: false
      };
    }
  }

  async handleConfirmedGuestInquiry(conversation, messageBody, isPaused) {
    const property = await this.getPropertyInfo(conversation.property_id);
    const message = messageBody.trim().toLowerCase();
    const greeting = this.getTimeAwareGreeting(conversation.timezone || 'UTC');
    
    const isGreeting = this.matchesAnyKeywords(message, [
      'hi', 'hello', 'hey', 'good morning', 'good afternoon', 'good evening'
    ]);

    const contextualFollowUp = this.generateContextualFollowUp(conversation);

    if (isGreeting && isPaused) {
      let response = `${greeting}! Welcome back! ${contextualFollowUp}How can I help?`;
      return {
        response: this.ensureSmsLimit(response),
        shouldUpdateState: false
      };
    } else if (isGreeting) {
      let response = `${greeting}! How can I help with your stay?`;
      return {
        response: this.ensureSmsLimit(response),
        shouldUpdateState: false
      };
    }

    return await this.handleSpecificInquiry(conversation, property, message, messageBody);
  }

  async handleSpecificInquiry(conversation, property, message, originalMessage) {
    // WiFi requests
    if (this.matchesAnyKeywords(message, ['wifi', 'wi-fi', 'internet', 'password', 'network'])) {
      if (property?.wifi_name && property?.wifi_password) {
        const response = `WiFi: ${property.wifi_name}\nPassword: ${property.wifi_password}\n\nAnything else?`;
        await this.updateConversationContext(conversation, 'wifi');
        return {
          response: this.ensureSmsLimit(response),
          shouldUpdateState: false
        };
      } else {
        return {
          response: "WiFi details should be in your check-in instructions. Contact property if needed.",
          shouldUpdateState: false
        };
      }
    }

    // Parking requests
    if (this.matchesAnyKeywords(message, ['parking', 'park', 'car', 'garage'])) {
      if (property?.parking_instructions) {
        await this.updateConversationContext(conversation, 'parking');
        return {
          response: this.ensureSmsLimit(property.parking_instructions + "\n\nOther questions?"),
          shouldUpdateState: false
        };
      } else {
        return {
          response: "Check your booking for parking info or contact the property.",
          shouldUpdateState: false
        };
      }
    }

    // Check-in/out times
    if (this.matchesAnyKeywords(message, ['check in', 'check out', 'checkin', 'checkout'])) {
      const checkIn = property?.check_in_time || '4:00 PM';
      const checkOut = property?.check_out_time || '11:00 AM';
      const response = `Check-in: ${checkIn}\nCheck-out: ${checkOut}\n\nAnything else?`;
      return {
        response: this.ensureSmsLimit(response),
        shouldUpdateState: false
      };
    }

    // Location/recommendation requests
    if (this.matchesLocationKeywords(message)) {
      await this.updateConversationContext(conversation, 'recommendations');
      return await this.getContextualRecommendations(property, originalMessage, conversation);
    }

    // Default to contextual response
    return await this.getContextualRecommendations(property, `general: ${originalMessage}`, conversation);
  }

  async updateConversationContext(conversation, messageType) {
    try {
      const context = conversation.conversation_context || {};
      const askedAbout = context.askedAbout || [];
      
      if (messageType && !askedAbout.includes(messageType)) {
        askedAbout.push(messageType);
      }

      await this.updateConversationState(conversation.phone_number, {
        conversation_context: { ...context, askedAbout },
        last_message_type: messageType
      });
    } catch (error) {
      console.error('Error updating context:', error);
    }
  }

  async getContextualRecommendations(property, type, conversation) {
    try {
      const propertyName = property?.property_name || 'your accommodation';
      const propertyAddress = property?.address || 'the property';
      const context = conversation?.conversation_context || {};
      const previousAskedAbout = context.askedAbout || [];
      
      let contextNote = '';
      if (previousAskedAbout.length > 0) {
        contextNote = `Guest previously asked about: ${previousAskedAbout.join(', ')}. `;
      }

      const prompt = `You are a local concierge. Guest at ${propertyName}, ${propertyAddress}. ${contextNote}Request: ${type}

CRITICAL: Response must be under 160 characters for SMS. Be warm and conversational. If recommendations don't fit, give 1-2 best options briefly.

${contextNote ? 'Reference previous interests naturally if relevant.' : ''}`;

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
        
        await this.updateConversationState(conversation.phone_number, {
          last_recommendations: data.recommendation
        });
        
        return {
          response: this.ensureSmsLimit(data.recommendation),
          shouldUpdateState: false
        };
      } else {
        throw new Error(`OpenAI API failed: ${response.status}`);
      }
    } catch (error) {
      console.error('Error getting recommendations:', error);
      return {
        response: "Having trouble with recommendations. Try asking about WiFi, parking, or check-in details.",
        shouldUpdateState: false
      };
    }
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

      await this.updateConversationState(conversation.phone_number, {
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
      
      await this.updateConversationState(conversation.phone_number, {
        property_confirmed: true,
        conversation_state: 'confirmed',
        timezone: timezone
      });

      const greeting = this.getTimeAwareGreeting(timezone);
      const response = `${greeting}! I'm your AI concierge. I can help with WiFi, parking, directions, and local tips. What do you need?`;
      
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

  matchesAnyKeywords(message, keywords) {
    const lowerMessage = message.toLowerCase();
    return keywords.some(keyword => lowerMessage.includes(keyword.toLowerCase()));
  }

  matchesLocationKeywords(message) {
    const keywords = [
      'beach', 'restaurant', 'food', 'eat', 'dining', 'drink', 'bar',
      'things to do', 'attractions', 'activities', 'directions'
    ];
    return this.matchesAnyKeywords(message, keywords);
  }

  getWelcomeMessage() {
    return {
      response: "Welcome! Text your property ID to get started. Text 'reset' anytime to restart.",
      shouldUpdateState: false
    };
  }
}

serve(async (req) => {
  console.log(`=== Enhanced SMS Conversation Service Request ===`);
  console.log(`Method: ${req.method}`);

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  if (req.method === 'GET') {
    return new Response(
      JSON.stringify({ 
        status: 'healthy', 
        service: 'enhanced-sms-conversation-service',
        features: ['continuity', 'personalization', 'time-awareness', 'sms-limits'],
        timestamp: new Date().toISOString()
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    )
  }

  if (req.method === 'POST') {
    try {
      const supabase = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
      )

      const body = await req.json()
      console.log('Enhanced SMS Service - Action:', body.action);

      const service = new EnhancedSmsConversationService(supabase);

      switch (body.action) {
        case 'getOrCreateConversation':
          const conversation = await service.getOrCreateConversation(body.phoneNumber);
          return new Response(
            JSON.stringify({ conversation }),
            {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
              status: 200
            }
          )

        case 'processMessage':
          const result = await service.processMessage(body.phoneNumber, body.messageBody);
          console.log('✅ Enhanced processing result:', result);
          return new Response(
            JSON.stringify(result),
            {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
              status: 200
            }
          )

        default:
          return new Response(
            JSON.stringify({ error: 'Unknown action' }),
            {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
              status: 400
            }
          )
      }

    } catch (error) {
      console.error('❌ Enhanced SMS Service Error:', error);
      return new Response(
        JSON.stringify({ 
          error: 'Internal server error',
          message: error.message,
          timestamp: new Date().toISOString()
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500
        }
      )
    }
  }

  return new Response(
    JSON.stringify({ error: 'Method not allowed' }), 
    { 
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    }
  )
})

console.log("Enhanced SMS Conversation Service is ready with continuity, personalization, and time-awareness features")
