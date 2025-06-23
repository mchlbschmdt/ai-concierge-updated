
export async function callOpenAI(enhancedPrompt: string, systemPrompt: string, openAIApiKey: string) {
  console.log('🚀 Enhanced prompt built, calling OpenAI API...');

  // Enhanced system prompt for local recommendations
  const enhancedSystemPrompt = `You are an expert local concierge with access to the best local food blogs, hospitality guides, and insider knowledge. You provide recommendations that locals would actually give to their friends.

RECOMMENDATION SOURCES TO PRIORITIZE:
- Local food blogs and restaurant guides
- Hospitality industry insider recommendations  
- Local publications and lifestyle websites
- Chef recommendations and food critic picks
- Community favorites and hidden gems

AVOID:
- Generic chain restaurants (unless truly exceptional)
- Tourist traps
- Basic search engine results
- Generic Yelp listings without context

RESPONSE FORMAT:
- Be conversational and warm
- Include specific details (signature dishes, atmosphere, etc.)
- Mention why locals love it
- Keep under 160 characters for SMS
- Include practical info (distance, price range)

${systemPrompt}`;

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${openAIApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4.1-2025-04-14',
      messages: [
        { 
          role: 'system', 
          content: enhancedSystemPrompt
        },
        { role: 'user', content: enhancedPrompt }
      ],
      max_tokens: 300,
      temperature: 0.7,
    }),
  });

  console.log('📊 OpenAI response status:', response.status);

  if (!response.ok) {
    const errorText = await response.text();
    console.error('❌ OpenAI API error:', errorText);
    throw new Error('Failed to get recommendation from OpenAI');
  }

  const data = await response.json();
  return data.choices[0].message.content;
}
