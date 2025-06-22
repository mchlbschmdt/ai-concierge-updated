
import { getEnhancedSystemPrompt } from './promptBuilders.ts';

export async function callOpenAI(enhancedPrompt: string, isFollowUpQuestion: boolean, openAIApiKey: string) {
  console.log('🚀 Enhanced prompt built, calling OpenAI API...');

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
          content: getEnhancedSystemPrompt(isFollowUpQuestion)
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
