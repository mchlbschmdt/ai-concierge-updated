import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { message, property, conversationHistory, guestName, slimContext } = await req.json();

    const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
    if (!OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY is not configured');
    }

    let systemPrompt: string;
    if (slimContext) {
      systemPrompt = buildSlimPropertyContext(slimContext);
    } else {
      systemPrompt = buildPropertyContext(property, guestName);
    }

    const messages: any[] = [
      { role: 'system', content: systemPrompt },
    ];

    if (conversationHistory && Array.isArray(conversationHistory)) {
      for (const msg of conversationHistory.slice(-10)) {
        messages.push({
          role: msg.role === 'user' ? 'user' : 'assistant',
          content: msg.content,
        });
      }
    }

    messages.push({ role: 'user', content: message });

    console.log(`🤖 AI Concierge for ${property?.property_name || slimContext?.propertyName}: "${message}" (${messages.length} msgs, slim: ${!!slimContext})`);

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages,
        max_tokens: 300,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error('OpenAI API error:', response.status, errText);
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    const aiResponse = data.choices?.[0]?.message?.content?.trim();

    if (!aiResponse) {
      throw new Error('No response from AI');
    }

    console.log(`✅ AI response (${aiResponse.length} chars): "${aiResponse.substring(0, 100)}..."`);

    return new Response(JSON.stringify({ response: aiResponse }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('AI Concierge error:', error);
    return new Response(JSON.stringify({ 
      error: error.message,
      response: "I'm having a moment — could you try asking again? If it's urgent, reach out to your host directly."
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

function buildPropertyContext(property: any, guestName?: string): string {
  if (!property) {
    return `You are a helpful vacation rental concierge. You don't have specific property details right now, so give general helpful advice and suggest the guest contact their host for property-specific questions. Be warm and conversational — like a friend texting, not a hotel front desk.`;
  }

  const greeting = guestName ? `The guest's name is ${guestName}. Use their name occasionally to be personal.` : '';

  const amenitiesList = property.amenities 
    ? (Array.isArray(property.amenities) ? property.amenities.join(', ') : JSON.stringify(property.amenities))
    : 'Not specified';

  const serviceFees = property.service_fees
    ? Object.entries(property.service_fees).map(([k, v]: [string, any]) => `${k}: $${v.price || 'N/A'} ${v.unit || ''} - ${v.description || ''}`).join('\n')
    : '';

  return `You are the personal concierge for guests staying at "${property.property_name}" at ${property.address}.
${greeting}

PERSONALITY: You're a warm, knowledgeable local — like a trusted friend who lives nearby. Casual, helpful, never robotic or corporate. Think "texting a helpful neighbor."

═══ PROPERTY DETAILS ═══
• WiFi: ${property.wifi_name || 'Not provided'} / ${property.wifi_password || 'Not provided'}
• Check-in: ${property.check_in_time || 'Not specified'}
• Check-out: ${property.check_out_time || 'Not specified'}
• Parking: ${property.parking_instructions || 'Not specified'}
• Access: ${property.access_instructions || 'Not specified'}
• Host Contact: ${property.emergency_contact || 'Not provided'}
• Directions: ${property.directions_to_property || 'Not provided'}
• House Rules: ${property.house_rules || 'None specified'}
• Amenities: ${amenitiesList}
${serviceFees ? `• Service Fees:\n${serviceFees}` : ''}

═══ KNOWLEDGE BASE ═══
${property.knowledge_base || 'No additional knowledge.'}

═══ LOCAL RECOMMENDATIONS ═══
${property.local_recommendations || 'None provided by host.'}

${property.uploaded_files_content ? `═══ UPLOADED FILES ═══\n${property.uploaded_files_content}` : ''}

═══ RULES ═══
1. PROPERTY QUESTIONS: Check details/knowledge base FIRST. If info exists above, use it. Never say "I don't see that in the property guide."
2. RECOMMENDATIONS: Give 2-3 specific places with names and why they're great. Never say "There are many great restaurants." Be specific or ask what they're in the mood for.
3. STYLE: SMS-friendly (under 280 chars ideal, max 450). Natural and warm. No numbered multi-part responses (1/2, 2/2). Single conversational flow.
4. UNKNOWN INFO: Say "Let me check on that for you" or "I can confirm that with your host." ${property.emergency_contact ? `Host: ${property.emergency_contact}` : ''} Never invent property-specific details.
5. NEVER: Generic filler, "property guide" language, corporate tone, repeated recommendations, numbered response parts.`;
}

function buildSlimPropertyContext(slimContext: any): string {
  const greeting = slimContext.guestName
    ? `The guest's name is ${slimContext.guestName}. Use their name occasionally.`
    : '';

  const snippets = slimContext.propertySnippets || {};
  const rules = (slimContext.responseRules || []).map((r: string, i: number) => `${i + 1}. ${r}`).join('\n');
  const requestType = slimContext.requestType || 'unknown';

  return `You are the personal concierge for guests at "${slimContext.propertyName}" (${slimContext.propertyAddress}).
${greeting}

PERSONALITY: Warm local friend, not a hotel desk. Casual, helpful, SMS-friendly.

CONTEXT: Intent=${slimContext.intent}, Type=${requestType}
${slimContext.memorySummary}

═══ RELEVANT PROPERTY INFO ═══
${snippets.relevant_knowledge ? `${snippets.relevant_knowledge}\n` : ''}
${snippets.local_recommendations ? `Host's local recs:\n${snippets.local_recommendations}\n` : ''}
${snippets.special_notes ? `Notes: ${snippets.special_notes}\n` : ''}
${snippets.emergency_contact ? `Host: ${snippets.emergency_contact}` : ''}

═══ RULES ═══
${rules}

CRITICAL:
- Never invent property facts (codes, passwords, prices).
- If you don't know, say "Let me check on that" or "I can confirm with the host." NEVER say "I don't see that in the property guide."
- No generic filler. Be specific or ask what they want.
- No multi-part numbered responses. Single natural flow.
- SMS-friendly: concise, warm, actionable.`;
}
