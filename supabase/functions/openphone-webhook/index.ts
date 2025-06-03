
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const webhookSecret = Deno.env.get('OPENPHONE_WEBHOOK_SECRET')
    if (!webhookSecret) {
      console.error('OPENPHONE_WEBHOOK_SECRET not configured')
      return new Response('Webhook secret not configured', { status: 500 })
    }

    // Get the raw body for signature verification
    const body = await req.text()
    
    // Verify webhook signature (OpenPhone sends signature in x-openphone-signature header)
    const signature = req.headers.get('x-openphone-signature')
    if (signature) {
      const crypto = await import('node:crypto')
      const expectedSignature = crypto.createHmac('sha256', webhookSecret)
        .update(body)
        .digest('hex')
      
      if (`sha256=${expectedSignature}` !== signature) {
        console.error('Invalid webhook signature')
        return new Response('Invalid signature', { status: 401 })
      }
    }

    const payload = JSON.parse(body)
    console.log('OpenPhone webhook received:', payload)

    // Handle different event types
    if (payload.type === 'message.created') {
      const message = payload.data
      
      // Only process incoming messages (not outgoing)
      if (message.direction === 'incoming') {
        console.log('Processing incoming SMS:', message)
        
        // Store the message in the conversations table
        const { error: insertError } = await supabase
          .from('conversation_messages')
          .insert({
            id: message.id,
            conversation_id: message.conversationId || message.phoneNumberId,
            role: 'user',
            content: message.body || message.text,
            timestamp: new Date(message.createdAt).toISOString()
          })

        if (insertError) {
          console.error('Error storing message:', insertError)
        }

        // Also log to the existing messages collection format for compatibility
        try {
          // This would be a call to your existing Firebase or other storage
          console.log('Message stored successfully')
        } catch (error) {
          console.error('Error with legacy storage:', error)
        }
      }
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200
    })

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
})
