
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  console.log(`🔍 send-sms function called - Method: ${req.method}`)
  console.log(`🔍 Request URL: ${req.url}`)
  console.log(`🔍 Request headers:`, Object.fromEntries(req.headers.entries()))
  console.log(`🔍 Function deployment timestamp: ${new Date().toISOString()}`)
  
  if (req.method === 'OPTIONS') {
    console.log('🔍 Handling CORS preflight request')
    return new Response(null, { headers: corsHeaders })
  }

  // Handle GET requests as health checks
  if (req.method === 'GET') {
    console.log('🔍 Health check endpoint hit')
    const apiKey = Deno.env.get('OPENPHONE_API_KEY')
    console.log(`🔍 API key configured: ${!!apiKey}`)
    console.log(`🔍 API key length: ${apiKey?.length || 0}`)
    
    return new Response(
      JSON.stringify({ 
        status: 'healthy',
        message: 'send-sms function is working',
        timestamp: new Date().toISOString(),
        method: req.method,
        apiKeyConfigured: !!apiKey,
        apiKeyLength: apiKey?.length || 0,
        deploymentCheck: 'Function successfully deployed and accessible'
      }),
      { 
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }

  if (req.method !== 'POST') {
    console.log(`🔍 Method ${req.method} not allowed`)
    return new Response(
      JSON.stringify({ error: 'Method not allowed. Use POST for SMS sending or GET for health check.' }),
      { 
        status: 405,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }

  try {
    console.log('🔍 Processing POST request for SMS sending')
    
    // Check API key first
    const apiKey = Deno.env.get('OPENPHONE_API_KEY')
    console.log(`🔍 API key check - configured: ${!!apiKey}`)
    console.log(`🔍 API key length: ${apiKey?.length || 0}`)
    
    if (!apiKey) {
      console.error('❌ OPENPHONE_API_KEY not configured')
      return new Response(
        JSON.stringify({ 
          error: 'API key not configured',
          details: 'OPENPHONE_API_KEY environment variable is missing'
        }),
        { 
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Parse request body
    let requestBody
    try {
      const bodyText = await req.text()
      console.log(`🔍 Request body text: ${bodyText}`)
      requestBody = JSON.parse(bodyText)
      console.log(`🔍 Parsed request body:`, requestBody)
    } catch (parseError) {
      console.error('❌ Failed to parse request body:', parseError)
      return new Response(
        JSON.stringify({ 
          error: 'Invalid JSON in request body',
          details: parseError.message
        }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    const { to, message, phoneNumberId } = requestBody

    if (!to || !message) {
      console.log('❌ Missing required fields')
      return new Response(
        JSON.stringify({ error: 'Missing required fields: to, message' }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    console.log(`🔍 Sending SMS to: ${to}`)
    console.log(`🔍 Message: ${message}`)
    console.log(`🔍 Phone Number ID: ${phoneNumberId || 'default'}`)
    console.log(`🔍 Using Authorization header without Bearer prefix`)

    // Send SMS via OpenPhone API - FIXED: Remove Bearer prefix
    const openPhoneResponse = await fetch('https://api.openphone.com/v1/messages', {
      method: 'POST',
      headers: {
        'Authorization': apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        to: [to],
        text: message,
        from: phoneNumberId || '+18333301032'
      })
    })

    console.log(`🔍 OpenPhone API response status: ${openPhoneResponse.status}`)

    let responseData
    try {
      responseData = await openPhoneResponse.json()
      console.log('🔍 OpenPhone API response data:', responseData)
    } catch (jsonError) {
      console.error('❌ Failed to parse OpenPhone response as JSON:', jsonError)
      const responseText = await openPhoneResponse.text()
      console.log('🔍 OpenPhone API response text:', responseText)
      
      return new Response(
        JSON.stringify({ 
          error: 'Failed to parse OpenPhone API response',
          status: openPhoneResponse.status,
          responseText: responseText
        }),
        { 
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    if (!openPhoneResponse.ok) {
      console.error('❌ OpenPhone API error:', responseData)
      return new Response(
        JSON.stringify({ 
          error: 'Failed to send SMS',
          status: openPhoneResponse.status,
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
    console.error('🔥 Error stack:', error.stack)
    return new Response(
      JSON.stringify({ 
        error: error.message,
        stack: error.stack,
        type: error.constructor.name
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    )
  }
})
