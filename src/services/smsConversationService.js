
// SMS Conversation Service - handles the logic for property identification flow
export class SmsConversationService {
  constructor(supabase) {
    this.supabase = supabase;
  }

  async getOrCreateConversation(phoneNumber) {
    // Try to get existing conversation
    const { data: existing, error } = await this.supabase
      .from('sms_conversations')
      .select('*')
      .eq('phone_number', phoneNumber)
      .single();

    if (existing) {
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
      throw new Error(`Failed to create conversation: ${createError.message}`);
    }

    return newConversation;
  }

  async updateConversationState(phoneNumber, updates) {
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
      throw new Error(`Failed to update conversation: ${error.message}`);
    }

    return data;
  }

  async findPropertyByCode(code) {
    const { data, error } = await this.supabase
      .from('property_codes')
      .select('*')
      .eq('code', code.toString())
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 is "no rows returned"
      throw new Error(`Database error: ${error.message}`);
    }

    return data;
  }

  async processMessage(phoneNumber, messageBody) {
    const conversation = await this.getOrCreateConversation(phoneNumber);
    const cleanMessage = messageBody.trim().toLowerCase();

    switch (conversation.conversation_state) {
      case 'awaiting_property_id':
        return await this.handlePropertyIdInput(conversation, cleanMessage);
      
      case 'awaiting_confirmation':
        return await this.handleConfirmation(conversation, cleanMessage);
      
      case 'confirmed':
        return await this.handleGeneralInquiry(conversation, messageBody);
      
      default:
        return this.getWelcomeMessage();
    }
  }

  async handlePropertyIdInput(conversation, input) {
    // Extract numbers from the message (in case they type "Property 1234" or "1234")
    const propertyCode = input.match(/\d+/)?.[0];
    
    if (!propertyCode) {
      return {
        response: "Hi! To get started, please text me your property ID number. You should have received this in your booking confirmation.",
        shouldUpdateState: false
      };
    }

    const property = await this.findPropertyByCode(propertyCode);
    
    if (!property) {
      return {
        response: `I couldn't find a property with ID ${propertyCode}. Please check your booking confirmation and try again with the correct property ID.`,
        shouldUpdateState: false
      };
    }

    // Update conversation with property info and move to confirmation state
    await this.updateConversationState(conversation.phone_number, {
      property_id: property.property_id,
      conversation_state: 'awaiting_confirmation'
    });

    return {
      response: `Great! It looks like you're staying at ${property.property_name} (${property.address}). Is this correct? Please reply Y for Yes or N for No.`,
      shouldUpdateState: true
    };
  }

  async handleConfirmation(conversation, input) {
    const isYes = input === 'y' || input === 'yes' || input === 'yeah' || input === 'yep';
    const isNo = input === 'n' || input === 'no' || input === 'nope';

    if (isYes) {
      await this.updateConversationState(conversation.phone_number, {
        property_confirmed: true,
        conversation_state: 'confirmed'
      });

      return {
        response: "Perfect! How can I help you today? You can ask me about check-in/check-out times, WiFi, parking, amenities, or anything else about your stay.",
        shouldUpdateState: true
      };
    } else if (isNo) {
      await this.updateConversationState(conversation.phone_number, {
        property_id: null,
        conversation_state: 'awaiting_property_id'
      });

      return {
        response: "No problem! Let's make sure we have the correct property ID. Can you please provide your property ID again? You can find this in your booking confirmation.",
        shouldUpdateState: true
      };
    } else {
      return {
        response: "Please reply with Y for Yes or N for No to confirm if this is the correct property.",
        shouldUpdateState: false
      };
    }
  }

  async handleGeneralInquiry(conversation, messageBody) {
    // This is where you could integrate with AI/FAQ system
    // For now, return a simple acknowledgment
    return {
      response: "Thanks for your message! I've received your inquiry and will get back to you shortly. If you have any urgent questions, please don't hesitate to call the property directly.",
      shouldUpdateState: false
    };
  }

  getWelcomeMessage() {
    return {
      response: "Welcome! To get started, please text me your property ID number. You should have received this in your booking confirmation.",
      shouldUpdateState: false
    };
  }
}
