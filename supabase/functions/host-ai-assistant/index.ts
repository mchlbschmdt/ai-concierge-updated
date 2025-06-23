
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    )

    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { message } = await req.json()

    // Get user's properties and recent guest data for context
    const { data: properties } = await supabase
      .from('properties')
      .select('*')

    const { data: guests } = await supabase
      .from('guests')
      .select('*')
      .limit(20)

    const { data: recentConversations } = await supabase
      .from('sms_conversations')
      .select('*')
      .order('updated_at', { ascending: false })
      .limit(10)

    // Build context for AI
    const context = {
      properties: properties || [],
      guests: guests || [],
      recentConversations: recentConversations || [],
    }

    const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${Deno.env.get('OPENAI_API_KEY')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content: `You are a helpful AI assistant for property hosts. You have access to their property data, guest information, and recent guest conversations. 

Context:
- Properties: ${JSON.stringify(context.properties)}
- Recent Guests: ${JSON.stringify(context.guests)}
- Recent Guest Conversations: ${JSON.stringify(context.recentConversations)}

Provide helpful insights about property management, guest preferences, common issues, and recommendations. Be concise but informative. If asked about specific properties or guests, reference the actual data provided.`
          },
          {
            role: 'user',
            content: message
          }
        ],
        max_tokens: 500,
        temperature: 0.7,
      }),
    })

    const openaiData = await openaiResponse.json()
    const aiResponse = openaiData.choices[0].message.content

    // Store the conversation
    await supabase
      .from('host_ai_conversations')
      .insert({
        user_id: user.id,
        message,
        response: aiResponse,
        conversation_context: context
      })

    return new Response(JSON.stringify({ response: aiResponse }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('Error:', error)
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
