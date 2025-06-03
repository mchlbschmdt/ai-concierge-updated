
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

console.log("OpenPhone webhook function starting up...")

// SMS Conversation Service - embedded implementation
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
    // First try the properties table
    const { data: property, error } = await this.supabase
      .from('properties')
      .select('*')
      .eq('code', code.toString())
      .maybeSingle();

    if (error && error.code !== 'PGRST116') { // PGRST116 is "no rows returned"
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

    // Also try the property_codes table as fallback
    const { data: propertyCode, error: codeError } = await this.supabase
      .from('property_codes')
      .select('*')
      .eq('code', code.toString())
      .maybeSingle();

    if (codeError && codeError.code !== 'PGRST116') {
      throw new Error(`Database error: ${codeError.message}`);
    }

    return propertyCode;
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
      property_id: property.property_id || property.id,
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

serve(async (req) => {
  console.log(`=== OpenPhone Webhook Request ===`);
  console.log(`Method: ${req.method}`);
  console.log(`URL: ${req.url}`);
  console.log(`Headers:`, Object.fromEntries(req.headers.entries()));

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    console.log('Handling CORS preflight request');
    return new Response(null, { headers: corsHeaders })
  }

  // Handle health check
  if (req.method === 'GET') {
    console.log('Health check request received');
    return new Response(
      JSON.stringify({ 
        status: 'healthy', 
        service: 'openphone-webhook',
        message: 'OpenPhone webhook is running with SMS automation',
        timestamp: new Date().toISOString()
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    )
  }

  // Handle webhook POST requests
  if (req.method === 'POST') {
    try {
      console.log('Processing webhook POST request');
      
      const supabase = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
      )

      const body = await req.text()
      console.log('Received webhook body:', body);
      
      let payload;
      try {
        payload = JSON.parse(body);
      } catch (parseError) {
        console.error('Failed to parse JSON:', parseError);
        return new Response(
          JSON.stringify({ error: 'Invalid JSON' }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400
          }
        )
      }
      
      console.log('Parsed webhook payload:', JSON.stringify(payload, null, 2));

      // Process message.received events
      if (payload.type === 'message.received') {
        const message = payload.data.object
        console.log('Processing message.received event:', message);
        
        if (message.direction === 'incoming') {
          console.log('Processing incoming message from:', message.from);
          
          // Store the message in conversation_messages table
          const { error: storeError } = await supabase
            .from('conversation_messages')
            .insert({
              id: crypto.randomUUID(),
              conversation_id: crypto.randomUUID(), // Generate a proper UUID for conversation_id
              role: 'user',
              content: message.body || message.text || '',
              timestamp: new Date().toISOString()
            })

          if (storeError) {
            console.error('Error storing message:', storeError)
          } else {
            console.log('Message stored successfully in database');
          }

          // Process the message using the conversation service
          const messageText = (message.body || message.text || '').trim();
          const apiKey = Deno.env.get('OPENPHONE_API_KEY');
          
          console.log('Message text:', messageText);
          console.log('API key exists:', !!apiKey);
          
          if (apiKey && messageText) {
            console.log('Processing message with conversation service...');
            
            try {
              const conversationService = new SmsConversationService(supabase);
              const result = await conversationService.processMessage(message.from, messageText);
              
              console.log('Conversation service result:', result);
              
              if (result.response) {
                console.log('Sending automated response:', result.response);
                
                const smsResponse = await fetch('https://api.openphone.com/v1/messages', {
                  method: 'POST',
                  headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify({
                    to: [message.from],
                    text: result.response,
                    from: message.to
                  })
                });

                const smsResult = await smsResponse.json();
                console.log('OpenPhone API response:', smsResult);
                
                if (smsResponse.ok) {
                  console.log('Automated response sent successfully');
                  
                  // Store the bot response in conversation_messages
                  await supabase
                    .from('conversation_messages')
                    .insert({
                      id: crypto.randomUUID(),
                      conversation_id: crypto.randomUUID(),
                      role: 'assistant',
                      content: result.response,
                      timestamp: new Date().toISOString()
                    });
                    
                } else {
                  console.error('Failed to send automated response:', smsResult);
                }
              }
            } catch (conversationError) {
              console.error('Error processing conversation:', conversationError);
              
              // Send fallback message
              try {
                const fallbackResponse = await fetch('https://api.openphone.com/v1/messages', {
                  method: 'POST',
                  headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify({
                    to: [message.from],
                    text: "Thanks for your message! I'm experiencing some technical difficulties. Please try again in a moment or contact us directly if you need immediate assistance.",
                    from: message.to
                  })
                });
                
                if (fallbackResponse.ok) {
                  console.log('Fallback message sent successfully');
                }
              } catch (fallbackError) {
                console.error('Failed to send fallback message:', fallbackError);
              }
            }
          }
        }
      }

      return new Response(
        JSON.stringify({ 
          success: true, 
          received: true,
          processed_at: new Date().toISOString()
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200
        }
      )

    } catch (error) {
      console.error('Webhook processing error:', error);
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

  // Method not allowed
  console.log('Method not allowed:', req.method);
  return new Response(
    JSON.stringify({ error: 'Method not allowed' }), 
    { 
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    }
  )
})

console.log("OpenPhone webhook function is ready to serve requests")
