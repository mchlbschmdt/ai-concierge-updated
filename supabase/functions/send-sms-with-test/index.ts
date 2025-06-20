
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  console.log(`🔍 send-sms-with-test function called - Method: ${req.method}`)
  console.log(`🔍 Function deployment timestamp: ${new Date().toISOString()}`)

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  // Handle GET requests as health checks
  if (req.method === 'GET') {
    const apiKey = Deno.env.get('OPENPHONE_API_KEY')
    return new Response(
      JSON.stringify({ 
        status: 'healthy',
        message: 'send-sms-with-test function is working',
        timestamp: new Date().toISOString(),
        method: req.method,
        apiKeyConfigured: !!apiKey,
        apiKeyLength: apiKey?.length || 0,
        availableActions: ['health', 'test-api-key', 'send-sms']
      }),
      { 
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }

  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed. Use POST for functionality or GET for health check.' }),
      { 
        status: 405,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }

  try {
    const requestBody = await req.text()
    console.log(`🔍 Request body: ${requestBody}`)
    
    if (!requestBody) {
      return new Response(
        JSON.stringify({ 
          success: false,
          error: 'Empty request body. Please provide JSON with action parameter.' 
        }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    const parsedBody = JSON.parse(requestBody)
    const { action, apiKey, testType, to, message, phoneNumberId } = parsedBody

    console.log(`🔍 Action: ${action}, TestType: ${testType}`)

    // Health check endpoint
    if (action === 'health') {
      const currentApiKey = Deno.env.get('OPENPHONE_API_KEY')
      return new Response(
        JSON.stringify({ 
          status: 'healthy',
          message: 'send-sms-with-test function is working',
          timestamp: new Date().toISOString(),
          apiKeyConfigured: !!currentApiKey,
          apiKeyLength: currentApiKey?.length || 0
        }),
        { 
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // API key testing functionality
    if (action === 'test-api-key') {
      // Use provided API key for testing, or fall back to environment variable
      const testApiKey = apiKey || Deno.env.get('OPENPHONE_API_KEY')
      
      if (!testApiKey) {
        return new Response(
          JSON.stringify({ 
            success: false,
            error: 'No API key available for testing. Provide one in request or configure OPENPHONE_API_KEY.' 
          }),
          { 
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        )
      }

      console.log(`🔍 Testing API key (length: ${testApiKey.length}) with type: ${testType}`)
      console.log(`🔍 Using Authorization header without Bearer prefix`)

      if (testType === 'validate') {
        console.log('🔍 Validating API key by fetching phone numbers')
        
        const response = await fetch('https://api.openphone.com/v1/phone-numbers', {
          method: 'GET',
          headers: {
            'Authorization': testApiKey,
            'Content-Type': 'application/json',
          }
        })

        console.log(`🔍 OpenPhone API validation response status: ${response.status}`)

        if (!response.ok) {
          const errorText = await response.text()
          console.error('🔥 API key validation failed:', response.status, errorText)
          return new Response(
            JSON.stringify({ 
              success: false,
              error: `API key validation failed: ${response.status}`,
              details: errorText,
              suggestion: response.status === 401 
                ? 'Invalid API key - check your OpenPhone developer settings'
                : response.status === 403
                ? 'API key lacks required permissions'
                : 'Network or API error'
            }),
            { 
              status: 200,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            }
          )
        }

        const data = await response.json()
        console.log('✅ API key validation successful:', data)
        
        return new Response(
          JSON.stringify({ 
            success: true,
            message: `✅ API key is valid! Found ${data.data?.length || 0} phone numbers.`,
            phoneNumbers: data.data,
            apiKeyStatus: 'valid',
            testedKeyLength: testApiKey.length
          }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200
          }
        )
      }

      if (testType === 'sms') {
        console.log('🔍 Testing SMS sending with API key')
        
        const response = await fetch('https://api.openphone.com/v1/messages', {
          method: 'POST',
          headers: {
            'Authorization': testApiKey,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            to: ['+12627453798'], // Test phone number
            text: 'TEST: OpenPhone API key test - please ignore',
            from: '+18333301032'
          })
        })

        console.log(`🔍 OpenPhone SMS test response status: ${response.status}`)

        if (!response.ok) {
          const errorText = await response.text()
          console.error('🔥 SMS test failed:', response.status, errorText)
          return new Response(
            JSON.stringify({ 
              success: false,
              error: `SMS sending failed: ${response.status}`,
              details: errorText,
              suggestion: response.status === 401 
                ? 'Invalid API key for SMS sending'
                : 'Check SMS permissions or phone number validity'
            }),
            { 
              status: 200,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            }
          )
        }

        const responseData = await response.json()
        console.log('✅ SMS test successful:', responseData)

        return new Response(
          JSON.stringify({ 
            success: true,
            message: '✅ SMS sent successfully! Check your phone.',
            messageId: responseData.id,
            details: responseData,
            apiKeyStatus: 'valid-for-sms'
          }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200
          }
        )
      }

      return new Response(
        JSON.stringify({ 
          success: false,
          error: 'Invalid test type. Use "validate" or "sms"' 
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400
        }
      )
    }

    // Regular SMS sending functionality
    if (action === 'send-sms') {
      const currentApiKey = Deno.env.get('OPENPHONE_API_KEY')
      
      if (!currentApiKey) {
        return new Response(
          JSON.stringify({ 
            success: false,
            error: 'OPENPHONE_API_KEY not configured in Supabase secrets' 
          }),
          { 
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        )
      }

      if (!to || !message) {
        return new Response(
          JSON.stringify({ 
            success: false,
            error: 'Missing required fields: to, message' 
          }),
          { 
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        )
      }

      console.log('🔍 Sending SMS with current environment API key')
      console.log(`🔍 To: ${to}, Message: ${message}`)
      console.log(`🔍 Using Authorization header without Bearer prefix`)
      
      const response = await fetch('https://api.openphone.com/v1/messages', {
        method: 'POST',
        headers: {
          'Authorization': currentApiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          to: Array.isArray(to) ? to : [to],
          text: message,
          from: phoneNumberId || '+18333301032'
        })
      })

      console.log(`🔍 SMS send response status: ${response.status}`)

      if (!response.ok) {
        const errorText = await response.text()
        console.error('🔥 SMS sending failed:', response.status, errorText)
        return new Response(
          JSON.stringify({ 
            success: false,
            error: `SMS sending failed: ${response.status}`,
            details: errorText,
            suggestion: response.status === 401 
              ? 'API key invalid - update OPENPHONE_API_KEY in Supabase secrets'
              : 'Check SMS permissions or phone number format'
          }),
          { 
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        )
      }

      const responseData = await response.json()
      console.log('✅ SMS sent successfully:', responseData)

      return new Response(
        JSON.stringify({ 
          success: true,
          message: 'SMS sent successfully',
          messageId: responseData.id,
          details: responseData
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200
        }
      )
    }

    return new Response(
      JSON.stringify({ 
        success: false,
        error: 'Invalid action. Use "health", "test-api-key", or "send-sms"' 
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400
      }
    )

  } catch (error) {
    console.error('🔥 Function error:', error)
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error.message,
        details: error.toString(),
        stack: error.stack
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    )
  }
})
