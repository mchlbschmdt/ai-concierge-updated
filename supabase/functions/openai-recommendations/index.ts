
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders } from './corsHeaders.ts';
import { checkIfFollowUpQuestion } from './followUpDetection.ts';
import { buildPersonalizedPrompt, getContextualSystemPrompt } from './enhancedPromptBuilders.ts';
import { callOpenAI } from './openaiService.ts';
import type { RecommendationRequest, RecommendationResponse, ErrorResponse } from './types.ts';

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');

serve(async (req) => {
  //Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('🤖 Context-Aware OpenAI recommendations function called');
    
    if (!openAIApiKey) {
      console.error('❌ OPENAI_API_KEY not found in environment');
      return new Response(
        JSON.stringify({ error: 'OpenAI API key not configured' } as ErrorResponse),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const { prompt, propertyAddress, guestContext, requestType, previousRecommendations }: RecommendationRequest = await req.json();
    console.log('📝 Received enhanced prompt:', { prompt, propertyAddress, guestContext, requestType, previousRecommendations });

    if (!prompt) {
      return new Response(
        JSON.stringify({ error: 'Prompt is required' } as ErrorResponse),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Enhanced follow-up question detection
    const isFollowUpQuestion = checkIfFollowUpQuestion(prompt, previousRecommendations);

    // Build personalized context-aware prompt
    const personalizedPrompt = buildPersonalizedPrompt(prompt, propertyAddress, guestContext, requestType, previousRecommendations, isFollowUpQuestion);
    
    // Get personalized system message
    const systemMessage = getContextualSystemPrompt(isFollowUpQuestion, guestContext);

    // Call OpenAI API with enhanced context
    const recommendation = await callOpenAI(personalizedPrompt, systemMessage, openAIApiKey);
    
    console.log('✅ Contextual OpenAI recommendation generated successfully');
    console.log('📝 Recommendation length:', recommendation.length);

    return new Response(
      JSON.stringify({ recommendation } as RecommendationResponse),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('❌ Error in contextual openai-recommendations function:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' } as ErrorResponse),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
