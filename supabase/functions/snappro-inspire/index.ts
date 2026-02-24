import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const { mode, imageUrl, currentSettings, userMessage } = await req.json();

    let messages: any[];

    if (mode === "inspire") {
      messages = [
        {
          role: "system",
          content: `You are a professional real estate photographer and photo editor. Analyze this property photo and suggest 4 distinct creative editing directions. Each should be realistic and achievable with photo editing AI. Return a JSON array with 4 objects each having: name (short evocative title 2-4 words), emoji (single relevant emoji), description (1-2 sentences in plain language describing the effect), isRecommended (true for the best option only), settings (object with keys: autoEnhance, hdr, whiteBalance, virtualTwilight as booleans, brightness as number -50 to 50), prompt (the AI processing prompt string), negativePrompt (what to avoid string), vibe (one of: luxury, cozy, modern, rustic, tropical, urban, bright, moody, professional), timeOfDay (one of: golden_hour, morning, midday, blue_hour, night, overcast, none). Base suggestions on what is actually in the photo. Return ONLY the JSON array, no markdown.`
        },
        {
          role: "user",
          content: [
            { type: "text", text: "Analyze this property photo and suggest 4 creative editing directions:" },
            { type: "image_url", image_url: { url: imageUrl } }
          ]
        }
      ];
    } else if (mode === "ask_ai") {
      messages = [
        {
          role: "system",
          content: `You are a photo editing assistant. Given the user's current settings JSON and their natural language request, return an updated settings JSON with only the relevant changes made, plus a brief confirmation message. Current settings: ${JSON.stringify(currentSettings)}. Return JSON only (no markdown): { "updatedSettings": {the full updated settings object}, "confirmationMessage": "brief description of what changed", "versionLabel": "2-4 word label for this version" }`
        },
        { role: "user", content: userMessage }
      ];
    } else {
      return new Response(JSON.stringify({ error: "Invalid mode" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please add credits in workspace settings." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(JSON.stringify({ error: "AI service error" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "";

    // Try to parse JSON from content (strip markdown fences if present)
    let parsed;
    try {
      const cleaned = content.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
      parsed = JSON.parse(cleaned);
    } catch {
      parsed = { raw: content };
    }

    return new Response(JSON.stringify({ result: parsed }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("snappro-inspire error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
