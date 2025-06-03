
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
    console.log(`Getting or creating conversation for: ${phoneNumber}`);
    
    // Try to get existing conversation
    const { data: existing, error } = await this.supabase
      .from('sms_conversations')
      .select('*')
      .eq('phone_number', phoneNumber)
      .maybeSingle();

    if (error) {
      console.error('Error fetching existing conversation:', error);
    }

    if (existing) {
      console.log('Found existing conversation:', existing);
      return existing;
    }

    console.log('Creating new conversation...');
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
      console.error('Error creating conversation:', createError);
      throw new Error(`Failed to create conversation: ${createError.message}`);
    }

    console.log('Created new conversation:', newConversation);
    return newConversation;
  }

  async updateConversationState(phoneNumber, updates) {
    console.log(`Updating conversation state for ${phoneNumber}:`, updates);
    
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
      console.error('Error updating conversation:', error);
      throw new Error(`Failed to update conversation: ${error.message}`);
    }

    console.log('Updated conversation:', data);
    return data;
  }

  async findPropertyByCode(code) {
    console.log(`Looking up property with code: ${code}`);
    
    const { data, error } = await this.supabase
      .from('property_codes')
      .select('*')
      .eq('code', code.toString())
      .maybeSingle();

    if (error && error.code !== 'PGRST116') {
      console.error('Database error finding property:', error);
      throw new Error(`Database error: ${error.message}`);
    }

    console.log('Property lookup result:', data);
    return data;
  }

  async processMessage(phoneNumber, messageBody) {
    console.log(`Processing message from ${phoneNumber}: "${messageBody}"`);
    
    const conversation = await this.getOrCreateConversation(phoneNumber);
    const cleanMessage = messageBody.trim().toLowerCase();

    console.log(`Current conversation state: ${conversation.conversation_state}`);

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
    console.log(`Handling property ID input: "${input}"`);
    
    const propertyCode = input.match(/\d+/)?.[0];
    
    if (!propertyCode) {
      console.log('No property code found in message');
      return {
        response: "Hi! To get started, please text me your property ID number. You should have received this in your booking confirmation.",
        shouldUpdateState: false
      };
    }

    console.log(`Extracted property code: ${propertyCode}`);
    const property = await this.findPropertyByCode(propertyCode);
    
    if (!property) {
      console.log(`Property not found for code: ${propertyCode}`);
      return {
        response: `I couldn't find a property with ID ${propertyCode}. Please check your booking confirmation and try again with the correct property ID.`,
        shouldUpdateState: false
      };
    }

    console.log(`Found property: ${property.property_name}`);
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
    console.log(`Handling confirmation input: "${input}"`);
    
    const isYes = input === 'y' || input === 'yes' || input === 'yeah' || input === 'yep';
    const isNo = input === 'n' || input === 'no' || input === 'nope';

    if (isYes) {
      console.log('User confirmed property');
      await this.updateConversationState(conversation.phone_number, {
        property_confirmed: true,
        conversation_state: 'confirmed'
      });

      return {
        response: "Perfect! How can I help you today? You can ask me about check-in/check-out times, WiFi, parking, amenities, or anything else about your stay.",
        shouldUpdateState: true
      };
    } else if (isNo) {
      console.log('User rejected property');
      await this.updateConversationState(conversation.phone_number, {
        property_id: null,
        conversation_state: 'awaiting_property_id'
      });

      return {
        response: "No problem! Let's make sure we have the correct property ID. Can you please provide your property ID again? You can find this in your booking confirmation.",
        shouldUpdateState: true
      };
    } else {
      console.log('Invalid confirmation response');
      return {
        response: "Please reply with Y for Yes or N for No to confirm if this is the correct property.",
        shouldUpdateState: false
      };
    }
  }

  async handleGeneralInquiry(conversation, messageBody) {
    console.log(`Handling general inquiry: "${messageBody}"`);
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
  console.log(`\n=== NEW REQUEST ===`);
  console.log(`Method: ${req.method}`);
  console.log(`URL: ${req.url}`);
  console.log(`Headers:`, Object.fromEntries(req.headers.entries()));

  if (req.method === 'OPTIONS') {
    console.log('Handling CORS preflight');
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    console.log('Supabase client created successfully');

    const webhookSecret = Deno.env.get('OPENPHONE_WEBHOOK_SECRET')
    console.log('Webhook secret configured:', !!webhookSecret);
    
    if (!webhookSecret) {
      console.error('OPENPHONE_WEBHOOK_SECRET not configured')
      return new Response('Webhook secret not configured', { status: 500 })
    }

    // Get the raw body for signature verification
    const body = await req.text()
    console.log('Raw body received:', body);
    
    // Verify webhook signature
    const signature = req.headers.get('x-openphone-signature')
    console.log('Signature header:', signature);
    
    if (signature) {
      const crypto = await import('node:crypto')
      const expectedSignature = crypto.createHmac('sha256', webhookSecret)
        .update(body)
        .digest('hex')
      
      const expectedSignatureWithPrefix = `sha256=${expectedSignature}`;
      console.log('Expected signature:', expectedSignatureWithPrefix);
      
      if (expectedSignatureWithPrefix !== signature) {
        console.error('Invalid webhook signature - Expected:', expectedSignatureWithPrefix, 'Got:', signature)
        return new Response('Invalid signature', { status: 401 })
      }
      console.log('Signature verification passed');
    } else {
      console.log('No signature header found - proceeding without verification');
    }

    const payload = JSON.parse(body)
    console.log('Parsed payload:', JSON.stringify(payload, null, 2));

    // Handle different event types
    if (payload.type === 'message.received') {
      const message = payload.data.object
      console.log('Processing message.received event:', message);
      
      // Only process incoming messages
      if (message.direction === 'incoming') {
        console.log('Processing incoming SMS:', message)
        
        // Create or get conversation record first
        let conversationId;
        
        // Try to find existing conversation by OpenPhone conversation ID
        const { data: existingConversation } = await supabase
          .from('conversations')
          .select('id')
          .eq('id', message.conversationId)
          .maybeSingle();

        if (existingConversation) {
          conversationId = existingConversation.id;
          console.log('Using existing conversation:', conversationId);
        } else {
          // Create new conversation record
          const { data: newConversation, error: convError } = await supabase
            .from('conversations')
            .insert({
              id: message.conversationId, // Use OpenPhone conversation ID
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            })
            .select('id')
            .single();

          if (convError) {
            console.error('Error creating conversation:', convError);
            // If conversation creation fails, use a generated UUID
            conversationId = crypto.randomUUID();
          } else {
            conversationId = newConversation.id;
            console.log('Created new conversation:', conversationId);
          }
        }
        
        // Store the raw message with valid conversation ID
        const messageContent = message.body || message.text;
        console.log('Storing message:', messageContent);
        
        const { error: insertError } = await supabase
          .from('conversation_messages')
          .insert({
            id: crypto.randomUUID(),
            conversation_id: conversationId,
            role: 'user',
            content: messageContent,
            timestamp: new Date(message.createdAt).toISOString()
          })

        if (insertError) {
          console.error('Error storing message:', insertError)
        } else {
          console.log('Message stored successfully');
        }

        // Process the conversation flow
        const conversationService = new SmsConversationService(supabase)
        
        try {
          const result = await conversationService.processMessage(
            message.from, 
            messageContent
          )

          console.log('Conversation processing result:', result)

          // Send automated response via OpenPhone
          if (result.response) {
            const apiKey = Deno.env.get('OPENPHONE_API_KEY')
            console.log('OpenPhone API key configured:', !!apiKey);
            
            if (!apiKey) {
              console.error('OPENPHONE_API_KEY not configured')
              return new Response('API key not configured', { status: 500 })
            }

            console.log('Sending SMS response...')
            console.log('Response text:', result.response);
            console.log('To:', message.from, 'From:', message.to);

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
            console.log('OpenPhone API response status:', smsResponse.status);
            console.log('OpenPhone API response data:', responseData);
            
            if (!smsResponse.ok) {
              console.error('Failed to send SMS response:', responseData)
              console.error('Response status:', smsResponse.status)
              console.error('Response headers:', Object.fromEntries(smsResponse.headers.entries()))
            } else {
              console.log('Automated SMS response sent successfully')
              
              // Store the automated response
              await supabase
                .from('conversation_messages')
                .insert({
                  id: crypto.randomUUID(),
                  conversation_id: conversationId,
                  role: 'assistant',
                  content: result.response,
                  timestamp: new Date().toISOString()
                })
              console.log('Automated response stored in database');
            }
          }

        } catch (conversationError) {
          console.error('Error processing conversation:', conversationError)
          
          // Send fallback message
          const apiKey = Deno.env.get('OPENPHONE_API_KEY')
          if (apiKey) {
            try {
              console.log('Sending fallback message...');
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
              console.log('Fallback message sent');
            } catch (fallbackError) {
              console.error('Error sending fallback message:', fallbackError)
            }
          }
        }
      } else {
        console.log('Ignoring outgoing message');
      }
    } else {
      console.log('Ignoring non-message event type:', payload.type);
    }

    console.log('Request processed successfully');
    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200
    })

  } catch (error) {
    console.error('Webhook error:', error)
    console.error('Stack trace:', error.stack);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    )
  }
})
