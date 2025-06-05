
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  console.log(`🔍 test-openphone-key function called - Method: ${req.method}`)
  console.log(`🔍 Request URL: ${req.url}`)

  if (req.method === 'OPTIONS') {
    console.log('🔍 Handling CORS preflight request')
    return new Response(null, { headers: corsHeaders })
  }

  // Add a health check endpoint
  if (req.method === 'GET') {
    console.log('🔍 Health check endpoint hit')
    return new Response(
      JSON.stringify({ 
        status: 'healthy',
        message: 'test-openphone-key function is deployed and accessible',
        timestamp: new Date().toISOString()
      }),
      { 
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }

  if (req.method !== 'POST') {
    console.log(`🔍 Method ${req.method} not allowed`)
    return new Response('Method not allowed', { 
      status: 405,
      headers: corsHeaders 
    })
  }

  try {
    console.log('🔍 Processing POST request')
    const requestBody = await req.text()
    console.log('🔍 Request body:', requestBody)

    let parsedBody
    try {
      parsedBody = JSON.parse(requestBody)
    } catch (parseError) {
      console.error('🔥 Failed to parse request body:', parseError)
      return new Response(
        JSON.stringify({ 
          success: false,
          error: 'Invalid JSON in request body',
          details: parseError.message
        }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    const { apiKey, testType = 'validate' } = parsedBody
    console.log(`🔍 Parsed request - testType: ${testType}, apiKey length: ${apiKey?.length || 0}`)

    if (!apiKey) {
      console.log('🔥 No API key provided')
      return new Response(
        JSON.stringify({ 
          success: false,
          error: 'API key is required' 
        }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    console.log(`🔍 Testing OpenPhone API key with type: ${testType}`)

    if (testType === 'validate') {
      console.log('🔍 Validating API key by fetching phone numbers')
      
      // Test API key by fetching phone numbers
      const response = await fetch('https://api.openphone.com/v1/phone-numbers', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        }
      })

      console.log(`🔍 OpenPhone API response status: ${response.status}`)

      if (!response.ok) {
        const errorText = await response.text()
        console.error('🔥 API key validation failed:', response.status, errorText)
        return new Response(
          JSON.stringify({ 
            success: false,
            error: `API key validation failed: ${response.status}`,
            details: errorText
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
          phoneNumbers: data.data
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200
        }
      )

    } else if (testType === 'sms') {
      console.log('🔍 Testing SMS sending')
      
      // Test SMS sending
      const response = await fetch('https://api.openphone.com/v1/messages', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          to: ['+12627453798'], // Test phone number
          text: 'TEST: OpenPhone API key test - please ignore',
          from: '+18333301032' // Your OpenPhone number
        })
      })

      console.log(`🔍 OpenPhone SMS API response status: ${response.status}`)

      if (!response.ok) {
        const errorText = await response.text()
        console.error('🔥 SMS test failed:', response.status, errorText)
        return new Response(
          JSON.stringify({ 
            success: false,
            error: `SMS sending failed: ${response.status}`,
            details: errorText
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
          details: responseData
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200
        }
      )
    }

    console.log('🔥 Invalid test type provided')
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

  } catch (error) {
    console.error('🔥 Test OpenPhone key error:', error)
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error.message,
        details: error.toString()
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    )
  }
})
