import { Conversation, Property } from './types.ts';

export class ConversationManager {
  constructor(private supabase: any) {}

  async getOrCreateConversation(phoneNumber: string): Promise<Conversation> {
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

  async getExistingConversation(phoneNumber: string): Promise<any | null> {
    console.log('Checking for existing property conversation for:', phoneNumber);
    
    const { data: existing, error } = await this.supabase
      .from('sms_conversations')
      .select('*')
      .eq('phone_number', phoneNumber)
      .maybeSingle();

    if (error) {
      console.error('Error fetching existing conversation:', error);
      return null;
    }

    return existing;
  }

  async updateConversationState(phoneNumber: string, updates: any): Promise<Conversation> {
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

  async resetConversation(phoneNumber: string): Promise<Conversation> {
    return await this.updateConversationState(phoneNumber, {
      conversation_state: 'awaiting_property_id',
      property_id: null,
      property_confirmed: false,
      conversation_context: {},
      last_message_type: null,
      last_recommendations: null
    });
  }

  async updateConversationContext(conversation: Conversation, messageType: string): Promise<void> {
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
}
