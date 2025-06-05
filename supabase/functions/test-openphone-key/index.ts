
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 })
  }

  try {
    const { apiKey, testType = 'validate' } = await req.json()

    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: 'API key is required' }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    console.log(`Testing OpenPhone API key with type: ${testType}`)

    if (testType === 'validate') {
      // Test API key by fetching phone numbers
      const response = await fetch('https://api.openphone.com/v1/phone-numbers', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        }
      })

      if (!response.ok) {
        const errorText = await response.text()
        console.error('API key validation failed:', response.status, errorText)
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
      console.log('API key validation successful:', data)
      
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

      if (!response.ok) {
        const errorText = await response.text()
        console.error('SMS test failed:', response.status, errorText)
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
      console.log('SMS test successful:', responseData)

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

    return new Response(
      JSON.stringify({ error: 'Invalid test type' }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400
      }
    )

  } catch (error) {
    console.error('Test OpenPhone key error:', error)
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
