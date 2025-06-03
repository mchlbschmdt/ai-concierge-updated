
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// SMS Conversation Service for handling property identification flow
class SmsConversationService {
  constructor(supabase) {
    this.supabase = supabase;
  }

  async getOrCreateConversation(phoneNumber) {
    // Try to get existing conversation
    const { data: existing, error } = await this.supabase
      .from('sms_conversations')
      .select('*')
      .eq('phone_number', phoneNumber)
      .maybeSingle();

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
      .maybeSingle();

    if (error && error.code !== 'PGRST116') {
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

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const webhookSecret = Deno.env.get('OPENPHONE_WEBHOOK_SECRET')
    if (!webhookSecret) {
      console.error('OPENPHONE_WEBHOOK_SECRET not configured')
      return new Response('Webhook secret not configured', { status: 500 })
    }

    // Get the raw body for signature verification
    const body = await req.text()
    
    // Verify webhook signature
    const signature = req.headers.get('x-openphone-signature')
    if (signature) {
      const crypto = await import('node:crypto')
      const expectedSignature = crypto.createHmac('sha256', webhookSecret)
        .update(body)
        .digest('hex')
      
      if (`sha256=${expectedSignature}` !== signature) {
        console.error('Invalid webhook signature')
        return new Response('Invalid signature', { status: 401 })
      }
    }

    const payload = JSON.parse(body)
    console.log('OpenPhone webhook received:', payload)

    // Handle different event types
    if (payload.type === 'message.received') {
      const message = payload.data.object
      
      // Only process incoming messages
      if (message.direction === 'incoming') {
        console.log('Processing incoming SMS:', message)
        
        // Store the raw message
        const { error: insertError } = await supabase
          .from('conversation_messages')
          .insert({
            id: message.id,
            conversation_id: message.conversationId || message.phoneNumberId,
            role: 'user',
            content: message.body || message.text,
            timestamp: new Date(message.createdAt).toISOString()
          })

        if (insertError) {
          console.error('Error storing message:', insertError)
        }

        // Process the conversation flow
        const conversationService = new SmsConversationService(supabase)
        
        try {
          const result = await conversationService.processMessage(
            message.from, 
            message.body || message.text
          )

          console.log('Conversation processing result:', result)

          // Send automated response via OpenPhone
          if (result.response) {
            const apiKey = Deno.env.get('OPENPHONE_API_KEY')
            if (!apiKey) {
              console.error('OPENPHONE_API_KEY not configured')
              return new Response('API key not configured', { status: 500 })
            }

            const smsResponse = await fetch('https://api.openphone.com/v1/messages', {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                to: [message.from],
                text: result.response,
                from: message.to // Reply from the same number they texted
              })
            })

            const responseData = await smsResponse.json()
            
            if (!smsResponse.ok) {
              console.error('Failed to send SMS response:', responseData)
            } else {
              console.log('Automated SMS response sent:', responseData)
              
              // Store the automated response
              await supabase
                .from('conversation_messages')
                .insert({
                  id: responseData.id,
                  conversation_id: message.conversationId || message.phoneNumberId,
                  role: 'assistant',
                  content: result.response,
                  timestamp: new Date().toISOString()
                })
            }
          }

        } catch (conversationError) {
          console.error('Error processing conversation:', conversationError)
          
          // Send fallback message
          const apiKey = Deno.env.get('OPENPHONE_API_KEY')
          if (apiKey) {
            await fetch('https://api.openphone.com/v1/messages', {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                to: [message.from],
                text: "Sorry, I'm having trouble processing your message right now. Please try again or contact us directly.",
                from: message.to
              })
            })
          }
        }
      }
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200
    })

  } catch (error) {
    console.error('Webhook error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    )
  }
})
