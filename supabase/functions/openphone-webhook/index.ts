
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  console.log(`=== Webhook Request ===`);
  console.log(`Method: ${req.method}`);
  console.log(`URL: ${req.url}`);

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  // Handle health check
  if (req.method === 'GET') {
    return new Response(
      JSON.stringify({ 
        status: 'healthy', 
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
      const supabase = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
      )

      const body = await req.text()
      console.log('Received body:', body);
      
      const payload = JSON.parse(body)
      console.log('Parsed payload:', payload);

      // Process message.received events
      if (payload.type === 'message.received') {
        const message = payload.data.object
        console.log('Processing message:', message);
        
        if (message.direction === 'incoming') {
          // Store the message
          const { error } = await supabase
            .from('conversation_messages')
            .insert({
              id: crypto.randomUUID(),
              conversation_id: message.conversationId || crypto.randomUUID(),
              role: 'user',
              content: message.body || message.text || '',
              timestamp: new Date().toISOString()
            })

          if (error) {
            console.error('Error storing message:', error)
          }

          // Simple test response for property code 1001
          if ((message.body === '1001' || message.text === '1001') && Deno.env.get('OPENPHONE_API_KEY')) {
            console.log('Sending test response...')
            
            try {
              const response = await fetch('https://api.openphone.com/v1/messages', {
                method: 'POST',
                headers: {
                  'Authorization': `Bearer ${Deno.env.get('OPENPHONE_API_KEY')}`,
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  to: [message.from],
                  text: "Great! It looks like you're staying at Downtown Loft (123 Main St, Downtown). Is this correct? Please reply Y for Yes or N for No.",
                  from: message.to
                })
              })

              const result = await response.json()
              console.log('SMS response:', result)
            } catch (smsError) {
              console.error('SMS send error:', smsError)
            }
          }
        }
      }

      return new Response(
        JSON.stringify({ success: true, received: true }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200
        }
      )

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
  }

  // Method not allowed
  return new Response('Method not allowed', { 
    status: 405,
    headers: corsHeaders 
  })
})
