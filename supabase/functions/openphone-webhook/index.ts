import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

console.log("OpenPhone webhook function starting up...")

// Enhanced webhook signature verification with comprehensive approaches
async function verifyWebhookSignature(body: string, signature: string, secret: string): Promise<boolean> {
  try {
    console.log('=== SIGNATURE VERIFICATION DEBUG ===');
    console.log('Body length:', body.length);
    console.log('Body (first 100 chars):', body.substring(0, 100));
    console.log('Signature header:', signature);
    console.log('Secret length:', secret.length);
    console.log('Secret (first 10 chars):', secret.substring(0, 10) + '...');
    
    const encoder = new TextEncoder();
    
    // Parse signature format: "hmac;1;timestamp;signature"
    const parts = signature.split(';');
    if (parts.length !== 4 || parts[0] !== 'hmac') {
      console.error('❌ Invalid signature format. Expected: hmac;1;timestamp;signature, got:', parts);
      return false;
    }

    const [method, version, timestamp, providedSignature] = parts;
    console.log('Parsed signature components:');
    console.log('- Method:', method);
    console.log('- Version:', version);
    console.log('- Timestamp:', timestamp);
    console.log('- Provided signature:', providedSignature);

    // Try multiple verification approaches based on common webhook patterns
    const approaches = [
      // Approach 1: Raw body with original secret
      {
        name: 'Raw body + original secret',
        payload: body,
        secret: secret
      },
      // Approach 2: Timestamp + body with original secret
      {
        name: 'Timestamp + body + original secret',
        payload: timestamp + body,
        secret: secret
      },
      // Approach 3: Timestamp.body format
      {
        name: 'Timestamp.body + original secret',
        payload: timestamp + '.' + body,
        secret: secret
      },
      // Approach 4: Raw body with base64 decoded secret
      {
        name: 'Raw body + base64 decoded secret',
        payload: body,
        secret: (() => {
          try {
            return atob(secret);
          } catch {
            return secret;
          }
        })()
      },
      // Approach 5: Timestamp + body with base64 decoded secret
      {
        name: 'Timestamp + body + base64 decoded secret',
        payload: timestamp + body,
        secret: (() => {
          try {
            return atob(secret);
          } catch {
            return secret;
          }
        })()
      },
      // Approach 6: Version + timestamp + body (some webhooks include version)
      {
        name: 'Version + timestamp + body + original secret',
        payload: version + timestamp + body,
        secret: secret
      },
      // Approach 7: Just timestamp (in case body is not part of signature)
      {
        name: 'Timestamp only + original secret',
        payload: timestamp,
        secret: secret
      }
    ];

    for (const approach of approaches) {
      try {
        console.log(`\n🔍 Trying: ${approach.name}`);
        console.log('- Payload length:', approach.payload.length);
        console.log('- Payload (first 50 chars):', approach.payload.substring(0, 50));
        console.log('- Secret length:', approach.secret.length);
        
        // Import the key for HMAC-SHA256
        const key = await crypto.subtle.importKey(
          'raw',
          encoder.encode(approach.secret),
          { name: 'HMAC', hash: 'SHA-256' },
          false,
          ['sign', 'verify']
        );
        
        // Generate our signature
        const signatureBuffer = await crypto.subtle.sign(
          'HMAC',
          key,
          encoder.encode(approach.payload)
        );
        
        // Convert to base64 for comparison
        const ourSignature = btoa(String.fromCharCode(...new Uint8Array(signatureBuffer)));
        console.log('- Our signature:', ourSignature);
        console.log('- Expected signature:', providedSignature);
        console.log('- Signatures match:', ourSignature === providedSignature);
        
        // Also try direct verification
        let signatureToVerify;
        try {
          signatureToVerify = Uint8Array.from(atob(providedSignature), c => c.charCodeAt(0));
        } catch (e) {
          console.log('- Failed to decode provided signature as base64:', e.message);
          continue;
        }
        
        const isValid = await crypto.subtle.verify(
          'HMAC',
          key,
          signatureToVerify,
          encoder.encode(approach.payload)
        );

        console.log(`- Verification result: ${isValid}`);
        
        if (isValid || ourSignature === providedSignature) {
          console.log(`✅ SUCCESS! Signature verified with: ${approach.name}`);
          return true;
        }
        
      } catch (error) {
        console.log(`- Error with ${approach.name}:`, error.message);
      }
    }

    console.log('❌ All signature verification approaches failed');
    
    // Log additional debug info
    console.log('\n=== ADDITIONAL DEBUG INFO ===');
    console.log('Raw signature header bytes:', Array.from(encoder.encode(signature)));
    console.log('Raw secret bytes (first 20):', Array.from(encoder.encode(secret)).slice(0, 20));
    console.log('Raw body bytes (first 20):', Array.from(encoder.encode(body)).slice(0, 20));
    
    return false;
    
  } catch (error) {
    console.error('❌ Fatal error in signature verification:', error);
    return false;
  }
}

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

    console.log('Updated conversation:', data);
    return data;
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
    } else {
      console.log('Property code not found in either table');
    }

    return propertyCode;
  }

  async processMessage(phoneNumber, messageBody) {
    console.log('Processing message from:', phoneNumber, 'Message:', messageBody);
    
    const conversation = await this.getOrCreateConversation(phoneNumber);
    const cleanMessage = messageBody.trim().toLowerCase();

    console.log('Current conversation state:', conversation.conversation_state);

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

    console.log('Extracted property code:', propertyCode);

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
        message: 'OpenPhone webhook is running with enhanced signature verification',
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

      // Enhanced signature verification with fallback
      const webhookSecret = Deno.env.get('OPENPHONE_WEBHOOK_SECRET');
      const signature = req.headers.get('openphone-signature');
      const bypassSignature = Deno.env.get('BYPASS_SIGNATURE_VERIFICATION') === 'true';
      
      if (webhookSecret && signature && !bypassSignature) {
        console.log('🔐 Starting enhanced signature verification...');
        const isValidSignature = await verifyWebhookSignature(body, signature, webhookSecret);
        
        if (!isValidSignature) {
          console.error('❌ Signature verification failed - rejecting request');
          console.log('💡 To temporarily bypass signature verification, set BYPASS_SIGNATURE_VERIFICATION=true');
          return new Response(
            JSON.stringify({ 
              error: 'Invalid signature',
              timestamp: new Date().toISOString(),
              debug: 'Check function logs for detailed signature verification attempts'
            }),
            {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
              status: 401
            }
          );
        }
        console.log('✅ Signature verification successful!');
      } else {
        if (bypassSignature) {
          console.log('⚠️  BYPASSING signature verification (BYPASS_SIGNATURE_VERIFICATION=true)');
        } else {
          console.log('⚠️  Signature verification skipped:');
          if (!webhookSecret) {
            console.log('   - Missing OPENPHONE_WEBHOOK_SECRET');
          }
          if (!signature) {
            console.log('   - Missing openphone-signature header');
          }
        }
      }
      
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
          
          // Get or create SMS conversation first
          const conversationService = new SmsConversationService(supabase);
          let smsConversation;
          
          try {
            smsConversation = await conversationService.getOrCreateConversation(message.from);
            console.log('Got SMS conversation:', smsConversation);
          } catch (convError) {
            console.error('Error getting SMS conversation:', convError);
            smsConversation = null;
          }
          
          // Store the message in sms_conversation_messages table (if we have a conversation)
          if (smsConversation) {
            const { error: storeError } = await supabase
              .from('sms_conversation_messages')
              .insert({
                id: crypto.randomUUID(),
                sms_conversation_id: smsConversation.id,
                role: 'user',
                content: message.body || message.text || '',
                timestamp: new Date().toISOString()
              })

            if (storeError) {
              console.error('Error storing message:', storeError)
            } else {
              console.log('Message stored successfully in sms_conversation_messages table');
            }
          }

          // Process the message using the conversation service
          const messageText = (message.body || message.text || '').trim();
          const apiKey = Deno.env.get('OPENPHONE_API_KEY');
          
          console.log('Message text:', messageText);
          console.log('API key exists:', !!apiKey);
          console.log('API key length:', apiKey ? apiKey.length : 0);
          
          if (apiKey && messageText) {
            console.log('Processing message with conversation service...');
            
            try {
              const result = await conversationService.processMessage(message.from, messageText);
              
              console.log('Conversation service result:', result);
              
              if (result.response) {
                console.log('Sending automated response:', result.response);
                
                // Prepare the OpenPhone API request
                const smsPayload = {
                  to: [message.from],
                  text: result.response,
                  from: message.to
                };
                
                console.log('SMS payload:', JSON.stringify(smsPayload, null, 2));
                console.log('Using API key (first 10 chars):', apiKey.substring(0, 10) + '...');
                
                const smsResponse = await fetch('https://api.openphone.com/v1/messages', {
                  method: 'POST',
                  headers: {
                    'Authorization': `Bearer ${apiKey.trim()}`,
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify(smsPayload)
                });

                const responseText = await smsResponse.text();
                console.log('OpenPhone API response status:', smsResponse.status);
                console.log('OpenPhone API response text:', responseText);
                
                let smsResult;
                try {
                  smsResult = JSON.parse(responseText);
                } catch (e) {
                  console.error('Failed to parse response as JSON:', e);
                  smsResult = { rawResponse: responseText };
                }
                
                console.log('OpenPhone API parsed response:', smsResult);
                
                if (smsResponse.ok) {
                  console.log('Automated response sent successfully');
                  
                  // Store the bot response in sms_conversation_messages (if we have a conversation)
                  if (smsConversation) {
                    const { error: botStoreError } = await supabase
                      .from('sms_conversation_messages')
                      .insert({
                        id: crypto.randomUUID(),
                        sms_conversation_id: smsConversation.id,
                        role: 'assistant',
                        content: result.response,
                        timestamp: new Date().toISOString()
                      });
                      
                    if (botStoreError) {
                      console.error('Error storing bot response:', botStoreError);
                    } else {
                      console.log('Bot response stored successfully in sms_conversation_messages table');
                    }
                  }
                    
                } else {
                  console.error('Failed to send automated response. Status:', smsResponse.status);
                  console.error('Error details:', smsResult);
                  
                  // Check if it's an authentication error
                  if (smsResponse.status === 401) {
                    console.error('AUTHENTICATION ERROR: The OpenPhone API key appears to be invalid or expired');
                    console.error('Please check that the OPENPHONE_API_KEY secret is set correctly');
                  }
                }
              }
            } catch (conversationError) {
              console.error('Error processing conversation:', conversationError);
              
              // Send fallback message only if we have a valid API key
              if (apiKey && apiKey.trim().length > 0) {
                try {
                  const fallbackResponse = await fetch('https://api.openphone.com/v1/messages', {
                    method: 'POST',
                    headers: {
                      'Authorization': `Bearer ${apiKey.trim()}`,
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
                  } else {
                    const fallbackText = await fallbackResponse.text();
                    console.error('Failed to send fallback message. Status:', fallbackResponse.status);
                    console.error('Fallback error:', fallbackText);
                  }
                } catch (fallbackError) {
                  console.error('Failed to send fallback message:', fallbackError);
                }
              } else {
                console.error('Cannot send fallback message: API key is missing or invalid');
              }
            }
          } else {
            if (!apiKey) {
              console.error('OPENPHONE_API_KEY not found in environment variables');
            }
            if (!messageText) {
              console.error('No message text to process');
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
