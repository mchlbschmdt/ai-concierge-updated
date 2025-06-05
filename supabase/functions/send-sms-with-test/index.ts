
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.8'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  console.log(`🔍 send-sms-with-test function called - Method: ${req.method}`)

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const requestBody = await req.text()
    const parsedBody = JSON.parse(requestBody)
    const { action, apiKey, testType, to, message, phoneNumberId } = parsedBody

    console.log(`🔍 Action: ${action}, TestType: ${testType}`)

    // Health check endpoint
    if (action === 'health') {
      return new Response(
        JSON.stringify({ 
          status: 'healthy',
          message: 'send-sms-with-test function is working',
          timestamp: new Date().toISOString()
        }),
        { 
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // API key testing functionality
    if (action === 'test-api-key') {
      if (!apiKey) {
        return new Response(
          JSON.stringify({ 
            success: false,
            error: 'API key is required for testing' 
          }),
          { 
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        )
      }

      if (testType === 'validate') {
        console.log('🔍 Validating API key by fetching phone numbers')
        
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
      }

      if (testType === 'sms') {
        console.log('🔍 Testing SMS sending with provided API key')
        
        const response = await fetch('https://api.openphone.com/v1/messages', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            to: ['+12627453798'],
            text: 'TEST: OpenPhone API key test - please ignore',
            from: '+18333301032'
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
    }

    // Regular SMS sending functionality (existing code)
    const currentApiKey = Deno.env.get('OPENPHONE_API_KEY')
    
    if (!currentApiKey) {
      return new Response(
        JSON.stringify({ 
          success: false,
          error: 'OPENPHONE_API_KEY not configured' 
        }),
        { 
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    if (action === 'send-sms') {
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

      console.log('🔍 Sending SMS with current API key')
      
      const response = await fetch('https://api.openphone.com/v1/messages', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${currentApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          to: Array.isArray(to) ? to : [to],
          text: message,
          from: phoneNumberId || '+18333301032'
        })
      })

      if (!response.ok) {
        const errorText = await response.text()
        console.error('🔥 SMS sending failed:', response.status, errorText)
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
        details: error.toString()
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    )
  }
})
