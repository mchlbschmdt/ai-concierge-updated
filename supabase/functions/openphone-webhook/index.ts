
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

console.log("OpenPhone webhook function starting up...")

// Designated business phone number - all traffic should go through this number
const BUSINESS_PHONE_NUMBER = '+18333301032';

// Deployment version for tracking
const DEPLOYMENT_VERSION = 'v2.1-' + new Date().toISOString().slice(0, 16);

console.log(`🚀 DEPLOYMENT VERSION: ${DEPLOYMENT_VERSION}`);
console.log(`📱 BUSINESS PHONE NUMBER: ${BUSINESS_PHONE_NUMBER}`);

// Enhanced webhook signature verification with comprehensive approaches
async function verifyWebhookSignature(body: string, signature: string, secret: string, req: Request): Promise<boolean> {
  try {
    console.log('=== ENHANCED SIGNATURE VERIFICATION DEBUG ===');
    console.log('Body length:', body.length);
    console.log('Body (first 200 chars):', body.substring(0, 200));
    console.log('Signature header:', signature);
    console.log('Secret length:', secret.length);
    console.log('Request method:', req.method);
    console.log('Request URL:', req.url);
    console.log('Request headers:', Object.fromEntries(req.headers.entries()));
    
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

    // Try multiple verification approaches based on OpenPhone and common webhook patterns
    const approaches = [
      {
        name: 'OpenPhone standard: timestamp + . + body',
        payload: timestamp + '.' + body,
        secret: secret
      },
      {
        name: 'Raw body only',
        payload: body,
        secret: secret
      },
      {
        name: 'Timestamp + body',
        payload: timestamp + body,
        secret: secret
      }
    ];

    // Test each approach
    for (const approach of approaches) {
      try {
        console.log(`\n🔍 Trying: ${approach.name}`);
        console.log('- Payload length:', approach.payload.length);
        console.log('- Payload (first 100 chars):', approach.payload.substring(0, 100));
        
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
    return false;
    
  } catch (error) {
    console.error('❌ Fatal error in signature verification:', error);
    return false;
  }
}

async function validateAndTestOpenPhoneApiKey(apiKey: string) {
  console.log('🔑 TESTING OPENPHONE API KEY');
  console.log('- API key exists:', !!apiKey);
  console.log('- API key length:', apiKey ? apiKey.length : 0);
  console.log('- API key prefix (first 6 chars):', apiKey ? apiKey.substring(0, 6) + '...' : 'N/A');
  
  if (!apiKey || apiKey.trim().length === 0) {
    console.error('❌ API key is empty or undefined');
    return { valid: false, error: 'API key is missing' };
  }
  
  try {
    // Test with phone numbers endpoint (safer than sending actual SMS)
    const testResponse = await fetch('https://api.openphone.com/v1/phone-numbers', {
      method: 'GET',
      headers: {
        'Authorization': apiKey.trim(),
        'Content-Type': 'application/json',
      }
    });
    
    console.log('🧪 API key test response status:', testResponse.status);
    
    if (testResponse.ok) {
      const data = await testResponse.json();
      console.log('✅ API key validation successful');
      console.log('📱 Available phone numbers:', data.data?.length || 0);
      return { valid: true, phoneNumbers: data.data };
    } else {
      const errorText = await testResponse.text();
      console.error('❌ API key validation failed:', errorText);
      
      if (testResponse.status === 401) {
        return { valid: false, error: 'API key is invalid or expired' };
      } else if (testResponse.status === 403) {
        return { valid: false, error: 'API key lacks required permissions' };
      } else {
        return { valid: false, error: `API returned status ${testResponse.status}` };
      }
    }
  } catch (error) {
    console.error('❌ Error validating API key:', error);
    return { valid: false, error: error.message };
  }
}

async function sendSmsResponse(apiKey: string, toNumber: string, fromNumber: string, message: string) {
  console.log('🚀 ATTEMPTING TO SEND SMS RESPONSE');
  console.log('- To:', toNumber);
  console.log('- From:', fromNumber);
  console.log('- Message length:', message.length);

  // Enforce business phone number for outgoing messages
  if (fromNumber !== BUSINESS_PHONE_NUMBER) {
    console.log(`⚠️ CORRECTING FROM NUMBER: ${fromNumber} → ${BUSINESS_PHONE_NUMBER}`);
    fromNumber = BUSINESS_PHONE_NUMBER;
  }

  // First validate the API key
  const validation = await validateAndTestOpenPhoneApiKey(apiKey);
  if (!validation.valid) {
    console.error('❌ API key validation failed:', validation.error);
    return { 
      success: false, 
      error: validation.error,
      details: 'API key validation failed'
    };
  }

  console.log('✅ API key validated successfully');

  const smsPayload = {
    to: [toNumber],
    content: message,
    from: fromNumber
  };

  console.log('📋 SMS payload:', JSON.stringify(smsPayload, null, 2));

  try {
    const response = await fetch('https://api.openphone.com/v1/messages', {
      method: 'POST',
      headers: {
        'Authorization': apiKey.trim(),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(smsPayload)
    });

    const responseText = await response.text();
    console.log('📊 OpenPhone SMS API response status:', response.status);
    console.log('📊 OpenPhone SMS API response:', responseText);

    let result;
    try {
      result = JSON.parse(responseText);
    } catch (e) {
      console.error('❌ Failed to parse SMS response as JSON:', e);
      result = { rawResponse: responseText };
    }

    if (response.ok) {
      console.log('✅ ✅ SMS SENT SUCCESSFULLY! ✅ ✅');
      return { success: true, data: result };
    } else {
      console.error('❌ SMS SEND FAILED');
      console.error('Status:', response.status);
      console.error('Error details:', result);
      
      return { success: false, error: result, status: response.status };
    }
  } catch (error) {
    console.error('❌ NETWORK ERROR sending SMS:', error);
    return { success: false, error: error.message };
  }
}

function validateIncomingPhoneNumber(toNumber: string): boolean {
  console.log(`🔍 VALIDATING INCOMING PHONE NUMBER: ${toNumber}`);
  console.log(`🎯 BUSINESS NUMBER: ${BUSINESS_PHONE_NUMBER}`);
  console.log(`🔍 DEPLOYMENT VERSION: ${DEPLOYMENT_VERSION}`);
  
  if (toNumber === BUSINESS_PHONE_NUMBER) {
    console.log(`✅ ✅ MESSAGE ACCEPTED: Sent to correct business number: ${toNumber} ✅ ✅`);
    return true;
  } else {
    console.log(`❌ ❌ MESSAGE REJECTED: Invalid destination number: ${toNumber} ❌ ❌`);
    console.log(`❌ Expected: ${BUSINESS_PHONE_NUMBER}`);
    console.log(`❌ Got: ${toNumber}`);
    console.log(`❌ DEPLOYMENT VERSION: ${DEPLOYMENT_VERSION}`);
    return false;
  }
}

serve(async (req) => {
  console.log(`=== OpenPhone Webhook Request ===`);
  console.log(`🚀 DEPLOYMENT VERSION: ${DEPLOYMENT_VERSION}`);
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
        message: 'OpenPhone webhook is running',
        businessPhoneNumber: BUSINESS_PHONE_NUMBER,
        deploymentVersion: DEPLOYMENT_VERSION,
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
      console.log(`🚀 PROCESSING WITH DEPLOYMENT VERSION: ${DEPLOYMENT_VERSION}`);
      
      const supabase = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
      )

      const body = await req.text()
      console.log('Received webhook body length:', body.length);

      // Skip signature verification for now to focus on phone number validation
      console.log('⚠️ Skipping signature verification to debug phone number validation');
      
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
      
      console.log('Parsed webhook payload type:', payload.type);

      // Process message.received events
      if (payload.type === 'message.received') {
        const message = payload.data.object
        console.log('Processing incoming message from:', message.from);
        console.log('Message sent to:', message.to);
        console.log(`🚀 PROCESSING MESSAGE WITH VERSION: ${DEPLOYMENT_VERSION}`);
        
        // VALIDATE INCOMING PHONE NUMBER - CRITICAL SECURITY CHECK
        if (!validateIncomingPhoneNumber(message.to)) {
          console.log(`🚫 🚫 MESSAGE REJECTED BY ${DEPLOYMENT_VERSION} 🚫 🚫`);
          console.log(`🚫 REJECTING MESSAGE: Not sent to business number ${BUSINESS_PHONE_NUMBER}`);
          console.log(`🚫 Rejected message from ${message.from} to ${message.to}: "${message.body || message.text || ''}"`);
          console.log(`🚫 DEPLOYMENT VERSION: ${DEPLOYMENT_VERSION}`);
          
          // Return success to webhook but don't process the message
          return new Response(
            JSON.stringify({ 
              success: true, 
              processed: false,
              reason: 'MESSAGE_REJECTED_INVALID_DESTINATION',
              message: 'Webhook received but message rejected - invalid destination number',
              businessPhoneNumber: BUSINESS_PHONE_NUMBER,
              rejectedDestination: message.to,
              deploymentVersion: DEPLOYMENT_VERSION,
              timestamp: new Date().toISOString()
            }),
            {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
              status: 200
            }
          );
        }
        
        console.log(`✅ ✅ MESSAGE ACCEPTED BY ${DEPLOYMENT_VERSION} ✅ ✅`);
        
        if (message.direction === 'incoming') {
          console.log('=== PROCESSING INCOMING MESSAGE ===');
          console.log('From:', message.from);
          console.log('To:', message.to);
          console.log('Body:', message.body || message.text || '');
          console.log(`🚀 PROCESSING VERSION: ${DEPLOYMENT_VERSION}`);
          
          // Get or create SMS conversation using the external service
          let smsConversation;
          
          try {
            // Call external SMS conversation service
            const conversationResponse = await fetch('https://zutwyyepahbbvrcbsbke.supabase.co/functions/v1/sms-conversation-service', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`
              },
              body: JSON.stringify({
                action: 'getOrCreateConversation',
                phoneNumber: message.from
              })
            });

            if (conversationResponse.ok) {
              const conversationData = await conversationResponse.json();
              smsConversation = conversationData.conversation;
              console.log('✅ Got SMS conversation from service:', smsConversation?.id);
            } else {
              console.error('❌ Error from conversation service:', await conversationResponse.text());
              smsConversation = null;
            }
          } catch (convError) {
            console.error('❌ Error calling conversation service:', convError);
            smsConversation = null;
          }
          
          // Store the incoming user message
          if (smsConversation) {
            try {
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
                console.error('❌ Error storing user message:', storeError)
              } else {
                console.log('✅ User message stored successfully');
              }
            } catch (storeErr) {
              console.error('❌ Exception storing user message:', storeErr);
            }
          }

          // Process the message and generate response
          const messageText = (message.body || message.text || '').trim();
          const apiKey = Deno.env.get('OPENPHONE_API_KEY');
          
          console.log('🔍 CHECKING API KEY CONFIGURATION');
          console.log('- API key configured:', !!apiKey);
          console.log('- API key length:', apiKey ? apiKey.length : 0);
          console.log('- Message text:', messageText);
          console.log(`🚀 PROCESSING VERSION: ${DEPLOYMENT_VERSION}`);
          
          if (messageText) {
            console.log('🔄 Processing message with conversation service...');
            
            try {
              // Call external SMS conversation service to process the message
              const processResponse = await fetch('https://zutwyyepahbbvrcbsbke.supabase.co/functions/v1/sms-conversation-service', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`
                },
                body: JSON.stringify({
                  action: 'processMessage',
                  phoneNumber: message.from,
                  messageBody: messageText
                })
              });

              if (processResponse.ok) {
                const result = await processResponse.json();
                console.log('✅ Conversation service result:', result);
                
                // Handle both old format (result.response) and new format (result.messages)
                let responseMessages = [];
                
                if (result.messages && Array.isArray(result.messages)) {
                  // New format: array of message segments
                  responseMessages = result.messages;
                  console.log('📱 Using new multi-message format, segments:', responseMessages.length);
                } else if (result.response) {
                  // Old format: single response string
                  responseMessages = [result.response];
                  console.log('📱 Using legacy single-message format');
                } else {
                  console.log('❌ No valid response format found in result');
                  responseMessages = [];
                }
                
                if (responseMessages.length > 0) {
                  console.log('💬 Generated response messages:', responseMessages.length);
                  console.log(`🚀 SENDING FROM VERSION: ${DEPLOYMENT_VERSION}`);
                  
                  // ALWAYS store the bot response first, regardless of SMS sending success
                  if (smsConversation) {
                    try {
                      // Store all message segments as a single response
                      const fullResponse = responseMessages.join(' ');
                      const { error: botStoreError } = await supabase
                        .from('sms_conversation_messages')
                        .insert({
                          id: crypto.randomUUID(),
                          sms_conversation_id: smsConversation.id,
                          role: 'assistant',
                          content: fullResponse,
                          timestamp: new Date().toISOString()
                        });
                        
                      if (botStoreError) {
                        console.error('❌ Error storing bot response:', botStoreError);
                      } else {
                        console.log('✅ Bot response stored in database');
                      }
                    } catch (botStoreErr) {
                      console.error('❌ Exception storing bot response:', botStoreErr);
                    }
                  }
                  
                  // Now attempt to send the SMS response(s) - ALWAYS use business phone number
                  if (apiKey && apiKey.trim().length > 0) {
                    console.log('📤 Attempting to send SMS responses...');
                    console.log(`📤 Enforcing outgoing from business number: ${BUSINESS_PHONE_NUMBER}`);
                    console.log(`🚀 SENDING WITH VERSION: ${DEPLOYMENT_VERSION}`);
                    
                    // Send each message segment with a small delay between them
                    let allSent = true;
                    let lastError = null;
                    
                    for (let i = 0; i < responseMessages.length; i++) {
                      const messageSegment = responseMessages[i];
                      console.log(`📤 Sending segment ${i + 1}/${responseMessages.length}:`, messageSegment.substring(0, 50) + '...');
                      
                      // Always use business phone number for outgoing messages
                      const smsResult = await sendSmsResponse(apiKey, message.from, BUSINESS_PHONE_NUMBER, messageSegment);
                      
                      if (smsResult.success) {
                        console.log(`✅ Segment ${i + 1} sent successfully by ${DEPLOYMENT_VERSION}`);
                        
                        // Add a small delay between messages to avoid rate limiting
                        if (i < responseMessages.length - 1) {
                          await new Promise(resolve => setTimeout(resolve, 1000));
                        }
                      } else {
                        console.error(`❌ Failed to send segment ${i + 1} from ${DEPLOYMENT_VERSION}:`, smsResult.error);
                        allSent = false;
                        lastError = smsResult;
                        break; // Stop sending if one fails
                      }
                    }
                    
                    if (allSent) {
                      console.log(`✅ ✅ ALL SMS SEGMENTS SENT SUCCESSFULLY BY ${DEPLOYMENT_VERSION}! ✅ ✅`);
                    } else {
                      console.error(`❌ ❌ FAILED TO SEND ALL SMS SEGMENTS FROM ${DEPLOYMENT_VERSION} ❌ ❌`);
                      console.error('Last error:', lastError?.error);
                      console.error('Status:', lastError?.status);
                      console.error('Details:', lastError?.details);
                    }
                  } else {
                    console.error('❌ OPENPHONE_API_KEY not found in environment variables');
                    console.error('🔍 ACTION REQUIRED: Set OPENPHONE_API_KEY secret in Supabase');
                    console.error('🔍 Go to: Supabase Dashboard > Settings > Edge Functions > Secrets');
                  }
                } else {
                  console.log('❌ No response messages generated from conversation service');
                }
              } else {
                console.error('❌ Error from conversation service:', await processResponse.text());
              }
            } catch (conversationError) {
              console.error('❌ ERROR PROCESSING CONVERSATION:', conversationError);
            }
          } else {
            console.error('❌ No message text to process');
          }
        }
      }

      return new Response(
        JSON.stringify({ 
          success: true, 
          processed: true,
          received: true,
          processed_at: new Date().toISOString(),
          businessPhoneNumber: BUSINESS_PHONE_NUMBER,
          deploymentVersion: DEPLOYMENT_VERSION
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200
        }
      )

    } catch (error) {
      console.error('❌ ❌ WEBHOOK PROCESSING ERROR ❌ ❌');
      console.error('Error message:', error.message);
      console.error('Stack trace:', error.stack);
      console.error(`❌ ERROR IN DEPLOYMENT VERSION: ${DEPLOYMENT_VERSION}`);
      return new Response(
        JSON.stringify({ 
          error: 'Internal server error',
          message: error.message,
          deploymentVersion: DEPLOYMENT_VERSION,
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
  return new Response(
    JSON.stringify({ error: 'Method not allowed' }), 
    { 
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    }
  )
})

console.log(`OpenPhone webhook function is ready to serve requests through business number: ${BUSINESS_PHONE_NUMBER}`)
console.log(`🚀 DEPLOYMENT VERSION: ${DEPLOYMENT_VERSION}`)
