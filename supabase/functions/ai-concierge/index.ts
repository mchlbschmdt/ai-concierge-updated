import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

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

    // Build system prompt — use slim context when available for focused responses
    let systemPrompt: string;
    if (slimContext) {
      systemPrompt = buildSlimPropertyContext(slimContext);
    } else {
      systemPrompt = buildPropertyContext(property, guestName);
    }

    // Build conversation messages for OpenAI
    const messages: any[] = [
      { role: 'system', content: systemPrompt },
    ];

    // Add conversation history (last 10 messages)
    if (conversationHistory && Array.isArray(conversationHistory)) {
      for (const msg of conversationHistory.slice(-10)) {
        messages.push({
          role: msg.role === 'user' ? 'user' : 'assistant',
          content: msg.content,
        });
      }
    }

    // Add the current message
    messages.push({ role: 'user', content: message });

    console.log(`🤖 AI Concierge request for ${property?.property_name || slimContext?.propertyName}: "${message}" (${messages.length} msgs, slim: ${!!slimContext})`);

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

    console.log(`✅ AI Concierge response (${aiResponse.length} chars): "${aiResponse.substring(0, 100)}..."`);

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
    return `You are a helpful vacation rental concierge. You don't have specific property details right now, so give general helpful advice and suggest the guest contact their host for property-specific questions.`;
  }

  const greeting = guestName ? `The guest's name is ${guestName}. Use their name occasionally to be personal.` : '';

  const amenitiesList = property.amenities 
    ? (Array.isArray(property.amenities) ? property.amenities.join(', ') : JSON.stringify(property.amenities))
    : 'Not specified';

  const serviceFees = property.service_fees
    ? Object.entries(property.service_fees).map(([k, v]: [string, any]) => `${k}: $${v.price || 'N/A'} ${v.unit || ''} - ${v.description || ''}`).join('\n')
    : '';

  return `You are the personal concierge for guests staying at "${property.property_name}" located at ${property.address}.
${greeting}

Your personality: You're a warm, knowledgeable local who genuinely loves this area. You speak casually but helpfully — like a trusted friend who lives nearby. Never sound robotic or corporate. Be specific, not generic.

═══ PROPERTY DETAILS ═══
• WiFi Network: ${property.wifi_name || 'Not provided'}
• WiFi Password: ${property.wifi_password || 'Not provided'}
• Check-in: ${property.check_in_time || 'Not specified'}
• Check-out: ${property.check_out_time || 'Not specified'}
• Parking: ${property.parking_instructions || 'Not specified'}
• Access/Entry: ${property.access_instructions || 'Not specified'}
• Emergency Contact / Host: ${property.emergency_contact || 'Not provided'}
• Directions: ${property.directions_to_property || 'Not provided'}
• House Rules: ${property.house_rules || 'None specified'}
• Amenities: ${amenitiesList}
• Cleaning Instructions: ${property.cleaning_instructions || 'Not specified'}
${serviceFees ? `• Service Fees:\n${serviceFees}` : ''}

═══ PROPERTY KNOWLEDGE BASE ═══
${property.knowledge_base || 'No additional property knowledge available.'}

═══ LOCAL RECOMMENDATIONS (from the host) ═══
${property.local_recommendations || 'No specific local recommendations provided by the host.'}

═══ SPECIAL NOTES ═══
${property.special_notes || 'None.'}

${property.uploaded_files_content ? `═══ UPLOADED KNOWLEDGE BASE FILES ═══\nThe following files were uploaded by the host. Use this information to answer guest questions:\n${property.uploaded_files_content}` : ''}

═══ MANAGEMENT ═══
${property.management_company_name ? `Managed by: ${property.management_company_name}` : ''}

═══ YOUR INSTRUCTIONS ═══
1. PROPERTY QUESTIONS (wifi, A/C, TV, appliances, parking, access, checkout, etc.):
   - ALWAYS check the Property Details and Knowledge Base above FIRST
   - Give specific step-by-step instructions if available
   - If the info exists above, NEVER say "I don't have that information"
   - For troubleshooting (wifi not working, A/C issues, locked out): check knowledge base for specific troubleshooting steps

2. LOCAL RECOMMENDATIONS (restaurants, bars, activities, things to do):
   - Give 2-3 specific places with: name, why it's great, approximate distance/drive time from the property
   - Reference the host's local recommendations above when relevant
   - Add your own knowledge of the area to supplement
   - Match the vibe to the guest's request (romantic, family-friendly, casual, upscale, etc.)

3. CONVERSATION STYLE:
   - Keep responses concise — ideal for SMS (under 280 characters when possible, max 450)
   - If a longer answer is needed, focus on the most important info first
   - Use occasional emojis naturally (not excessively)
   - Remember previous messages in this conversation — reference them naturally for follow-ups
   - If someone says "more like that" or "what else" — give NEW suggestions, don't repeat

4. WHEN YOU DON'T KNOW:
   - Be honest: "I'm not sure about that specific detail"
   - ${property.emergency_contact ? `Offer: "Your host can help with that — reach them at ${property.emergency_contact}"` : 'Suggest they contact their host directly'}
   - Never make up property-specific details (door codes, wifi passwords, etc.)

5. NEVER DO:
   - Never give generic responses like "There are many great restaurants in the area"
   - Never ignore the property context above
   - Never repeat the same recommendations in a conversation
   - Never use corporate/formal language — keep it natural and warm`;
}

/**
 * Build a focused system prompt from slim context.
 * Only includes relevant property snippets and enforces response rules.
 */
function buildSlimPropertyContext(slimContext: any): string {
  const greeting = slimContext.guestName
    ? `The guest's name is ${slimContext.guestName}. Use their name occasionally to be personal.`
    : '';

  const snippets = slimContext.propertySnippets || {};
  const rules = (slimContext.responseRules || []).map((r: string, i: number) => `${i + 1}. ${r}`).join('\n');

  return `You are the personal concierge for guests staying at "${slimContext.propertyName}" located at ${slimContext.propertyAddress}.
${greeting}

Your personality: You're a warm, knowledgeable local who genuinely loves this area. You speak casually but helpfully — like a trusted friend who lives nearby. Never sound robotic or corporate.

═══ GUEST'S CURRENT QUESTION CONTEXT ═══
Intent detected: ${slimContext.intent}
${slimContext.memorySummary}

═══ RELEVANT PROPERTY INFO ═══
${snippets.relevant_knowledge ? `Knowledge base match:\n${snippets.relevant_knowledge}\n` : ''}
${snippets.local_recommendations ? `Host's local recommendations:\n${snippets.local_recommendations}\n` : ''}
${snippets.special_notes ? `Special notes:\n${snippets.special_notes}\n` : ''}
${snippets.emergency_contact ? `Emergency contact: ${snippets.emergency_contact}` : ''}

═══ RESPONSE RULES ═══
${rules}

CRITICAL:
- Never invent property-specific details (door codes, wifi passwords, prices, etc.)
- If you don't have the information, say so honestly and offer to contact the host.
- Never give generic filler like "There are many great restaurants." Be specific or say you don't know.
- Keep responses SMS-friendly: concise, warm, and actionable.`;
}
