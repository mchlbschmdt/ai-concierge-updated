
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  console.log(`=== OpenPhone Webhook Request ===`);
  console.log(`Method: ${req.method}`);
  console.log(`URL: ${req.url}`);

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
      
      const payload = JSON.parse(body)
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
              conversation_id: message.conversationId || crypto.randomUUID(),
              role: 'user',
              content: message.body || message.text || '',
              timestamp: new Date().toISOString()
            })

          if (storeError) {
            console.error('Error storing message:', storeError)
          } else {
            console.log('Message stored successfully in database');
          }

          // Check if this is a property code inquiry
          const messageText = (message.body || message.text || '').trim();
          const apiKey = Deno.env.get('OPENPHONE_API_KEY');
          
          if (apiKey && messageText === '1001') {
            console.log('Sending automated response for property code 1001...');
            
            try {
              const smsResponse = await fetch('https://api.openphone.com/v1/messages', {
                method: 'POST',
                headers: {
                  'Authorization': `Bearer ${apiKey}`,
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  to: [message.from],
                  text: "Great! It looks like you're staying at Downtown Loft (123 Main St, Downtown). Is this correct? Please reply Y for Yes or N for No.",
                  from: message.to
                })
              });

              const smsResult = await smsResponse.json();
              console.log('OpenPhone API response:', smsResult);
              
              if (smsResponse.ok) {
                console.log('Automated response sent successfully');
              } else {
                console.error('Failed to send automated response:', smsResult);
              }
            } catch (smsError) {
              console.error('Error sending automated SMS response:', smsError);
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
