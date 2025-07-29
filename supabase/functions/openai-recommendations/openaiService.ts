
export async function callOpenAI(enhancedPrompt: string, systemPrompt: string, openAIApiKey: string) {
  console.log('🚀 Enhanced prompt built, calling OpenAI API...');

  // Enhanced system prompt for local recommendations
  const enhancedSystemPrompt = `You are a friendly local concierge who knows all the best spots! You chat like a helpful friend who's excited to share amazing recommendations.

TONE & STYLE:
- Conversational and enthusiastic (use "!" and natural language)
- Sound like a local friend giving personal recommendations
- Be specific about what makes each place special
- Keep responses under 160 characters for SMS
- Include practical details (distance, vibe, why locals love it)

RECOMMENDATION QUALITY:
- Prioritize local favorites and hidden gems
- Avoid generic chains unless truly exceptional
- Include signature dishes, atmosphere details
- Mention why locals choose these spots

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
      max_tokens: 600,
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
