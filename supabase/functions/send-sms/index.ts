
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  console.log(`🔍 send-sms function called - Method: ${req.method}`)
  
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  // Handle GET requests as health checks
  if (req.method === 'GET') {
    return new Response(
      JSON.stringify({ 
        status: 'healthy',
        message: 'send-sms function is working',
        timestamp: new Date().toISOString(),
        method: req.method
      }),
      { 
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }

  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed. Use POST for SMS sending or GET for health check.' }),
      { 
        status: 405,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }

  try {
    const { to, message, phoneNumberId } = await req.json()

    if (!to || !message) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: to, message' }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    const apiKey = Deno.env.get('OPENPHONE_API_KEY')
    if (!apiKey) {
      console.error('OPENPHONE_API_KEY not configured')
      return new Response(
        JSON.stringify({ error: 'API key not configured' }),
        { 
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    console.log('🔍 Sending SMS via OpenPhone API...')

    // Send SMS via OpenPhone API
    const openPhoneResponse = await fetch('https://api.openphone.com/v1/messages', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        to: [to],
        text: message,
        from: phoneNumberId || '+18333301032'
      })
    })

    const responseData = await openPhoneResponse.json()

    if (!openPhoneResponse.ok) {
      console.error('OpenPhone API error:', responseData)
      return new Response(
        JSON.stringify({ 
          error: 'Failed to send SMS',
          details: responseData 
        }),
        { 
          status: openPhoneResponse.status,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    console.log('✅ SMS sent successfully:', responseData)

    return new Response(
      JSON.stringify({ 
        success: true, 
        messageId: responseData.id,
        data: responseData 
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    )

  } catch (error) {
    console.error('🔥 Send SMS error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    )
  }
})
