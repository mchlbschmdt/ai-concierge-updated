import { Property, Conversation } from './types.ts';

export interface PerplexityRecommendationRequest {
  query: string;
  propertyAddress: string;
  requestType: string;
  rejectedOptions?: string[];
  guestContext?: any;
}

export class PerplexityRecommendationService {
  private static readonly PERPLEXITY_API_URL = 'https://api.perplexity.ai/chat/completions';
  
  static async getLocalRecommendations(
    property: Property,
    query: string,
    conversation: Conversation,
    requestType: string,
    rejectedOptions: string[] = []
  ): Promise<string> {
    console.log('🔍 [PERPLEXITY] Starting recommendation request:', { 
      query, 
      requestType, 
      propertyAddress: property.address,
      rejectedOptions 
    });
    
    const perplexityApiKey = Deno.env.get('PERPLEXITY_API_KEY');
    if (!perplexityApiKey) {
      console.log('❌ [PERPLEXITY] API key not found - returning fallback message');
      throw new Error('Perplexity API key not configured');
    }

    try {
      const prompt = this.buildPerplexityPrompt(property, query, requestType, rejectedOptions);
      console.log('📝 [PERPLEXITY] Built prompt:', prompt.substring(0, 150) + '...');
      
      const requestBody = {
        model: 'llama-3.1-sonar-small-128k-online',
        messages: [
          {
            role: 'system',
            content: 'You are a local concierge providing specific, actionable recommendations. Be concise and include practical details like distance and why locals love each place.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.3,
        max_tokens: 300,
        return_related_questions: false,
      };
      
      console.log('🚀 [PERPLEXITY] Making API request...');
      const response = await fetch(this.PERPLEXITY_API_URL, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${perplexityApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody)
      });

      console.log('📊 [PERPLEXITY] Response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`❌ [PERPLEXITY] API error: ${response.status} - ${errorText}`);
        throw new Error(`Perplexity API failed with status ${response.status}`);
      }

      const data = await response.json();
      const recommendation = data.choices?.[0]?.message?.content;

      if (!recommendation) {
        console.log('❌ [PERPLEXITY] No recommendation in response');
        throw new Error('Empty recommendation from Perplexity');
      }

      // Grounding guard: model told us it could not verify any real result.
      if (/NO_VERIFIED_RESULTS/i.test(recommendation)) {
        console.log('⚠️ [PERPLEXITY] No verified results — refusing to hallucinate.');
        throw new Error('No verified nearby results');
      }

      console.log('✅ [PERPLEXITY] Raw recommendation received:', recommendation.substring(0, 150) + '...');
      const formatted = this.formatRecommendation(recommendation);
      console.log('✅ [PERPLEXITY] Formatted recommendation:', formatted.substring(0, 150) + '...');

      return formatted;
      
    } catch (error) {
      console.error('❌ [PERPLEXITY] Error:', error.message);
      throw error; // Re-throw to allow fallback chain to continue
    }
  }

  private static buildPerplexityPrompt(
    property: Property,
    query: string,
    requestType: string,
    rejectedOptions: string[]
  ): string {
    // GROUNDING GUARD: never fabricate. Require a real address so results are
    // anchored to the property's actual city, not a hardcoded region.
    if (!property.address || property.address.trim().length < 5) {
      throw new Error('Missing property address — refusing to generate ungrounded recommendations.');
    }
    const baseLocation = property.address;

    const lowerQ = (query || '').toLowerCase();
    const wantsQuick = /\b(quick|fast|grab|takeout|to[- ]?go|in a hurry|in a rush)\b/.test(lowerQ);
    const wantsClose = /\b(close|closest|nearby|near ?me|walk(able|ing)?|short walk|around the corner)\b/.test(lowerQ);

    let prompt = `You are recommending real, currently-open places within a short distance of this exact address: "${baseLocation}".\n\n`;
    prompt += `Guest asked: "${query}" (category: ${requestType}).\n\n`;
    prompt += `HARD RULES:\n`;
    prompt += `- Only suggest places that actually exist near that address. Do NOT invent names.\n`;
    prompt += `- Do NOT suggest places from other cities, states, or resorts.\n`;
    prompt += `- Each pick MUST be a real named restaurant/venue with an active Google or Yelp listing — NOT a district, plaza, or neighborhood name.\n`;
    if (wantsQuick) {
      prompt += `- Guest wants FAST service: fast-casual / counter / takeout only. NO sit-down or fine-dining.\n`;
    }
    if (wantsClose) {
      prompt += `- Guest wants CLOSE: prioritize ≤ 1.0 mi walk or ≤ 5 min drive from the address.\n`;
    }
    prompt += `- Do NOT invent walk/drive times. Use conservative approximate distances only.\n`;
    prompt += `- If you cannot verify at least one nearby real option that matches these rules, reply exactly: NO_VERIFIED_RESULTS.\n`;
    prompt += `- Include name, approximate distance from the address, and one specific reason to go.\n`;

    if (rejectedOptions.length > 0) {
      prompt += `- Do NOT suggest: ${rejectedOptions.join(', ')}.\n`;
    }

    // Category hints — kept neutral, no hardcoded region flavor.
    switch (requestType.toLowerCase()) {
      case 'dinner':
      case 'restaurant':
      case 'food':
        prompt += `- Focus on dinner-service restaurants (4★+, real local favorites).\n`;
        break;
      case 'coffee':
      case 'cafe':
        prompt += `- Focus on independent coffee shops / cafés (avoid chains unless exceptional).\n`;
        break;
      case 'attractions':
      case 'activities':
      case 'things to do':
        prompt += `- Focus on attractions, parks, museums, or scenic spots.\n`;
        break;
    }

    prompt += `\nKeep total response under 160 characters. Format each pick as: "Name (X.X mi) — reason".`;

    return prompt;
  }

  private static formatRecommendation(recommendation: string): string {
    // Fix enumeration cutting off issue
    if (recommendation.includes('1.') && !recommendation.includes('2.')) {
      // If we see "1." but not "2.", there might be a formatting issue
      console.log('⚠️ Detected potential formatting issue in recommendation:', recommendation.substring(0, 100));
      
      // Try to extract meaningful content after "1."
      const parts = recommendation.split('1.');
      if (parts.length > 1) {
        const content = parts[1].trim();
        if (content.length > 10) {
          recommendation = content;
        }
      }
    }
    
    // Ensure SMS-friendly length
    if (recommendation.length > 160) {
      const sentences = recommendation.split('. ');
      let result = sentences[0];
      
      for (let i = 1; i < sentences.length; i++) {
        if ((result + '. ' + sentences[i]).length <= 160) {
          result += '. ' + sentences[i];
        } else {
          break;
        }
      }
      
      return result + (result.endsWith('.') ? '' : '.');
    }
    
    return recommendation;
  }

  // NEW: OpenAI fallback for high-quality recommendations
  private static async getOpenAIFallback(property: Property, query: string, requestType: string, rejectedOptions: string[] = []): Promise<string> {
    try {
      const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
      if (!openAIApiKey) {
        console.log('🔄 No OpenAI key, using local fallback');
        return this.getFallbackRecommendation(property, requestType);
      }

      const prompt = this.buildOpenAIPrompt(property, query, requestType, rejectedOptions);
      
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${openAIApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            { role: 'system', content: 'You are a local concierge providing specific recommendations with ratings and distances. Be concise but helpful.' },
            { role: 'user', content: prompt }
          ],
          max_tokens: 300,
          temperature: 0.7,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        const recommendation = data.choices[0].message.content;
        console.log('✅ OpenAI recommendation received:', recommendation);
        return this.formatRecommendation(recommendation);
      } else {
        console.error(`❌ OpenAI API error: ${response.status}`);
        return this.getFallbackRecommendation(property, requestType);
      }
    } catch (error) {
      console.error('❌ OpenAI fallback error:', error);
      return this.getFallbackRecommendation(property, requestType);
    }
  }

  private static buildOpenAIPrompt(property: Property, query: string, requestType: string, rejectedOptions: string[]): string {
    if (!property.address || property.address.trim().length < 5) {
      throw new Error('Missing property address — refusing to generate ungrounded recommendations.');
    }
    const location = property.address;
    let specificRequest = '';
    
    switch (requestType.toLowerCase()) {
      case 'coffee':
        specificRequest = 'coffee shops and cafés with ratings 4+ stars, include pastries/breakfast options';
        break;
      case 'attractions':
        specificRequest = 'tourist attractions, scenic spots, museums, parks, or cultural sites with ratings 4+ stars';
        break;
      case 'dinner':
      case 'restaurant':
        specificRequest = 'restaurants for dinner with ratings 4+ stars, various cuisines';
        break;
      default:
        specificRequest = `${requestType} recommendations with ratings 4+ stars`;
    }

    let prompt = `Find 3 highly-rated ${specificRequest} near ${location}. 

For each recommendation, provide:
- Name and brief description
- Walking/driving distance from ${location}
- Why it's recommended (cuisine type, specialties, atmosphere)

Requirements:
- Only 4+ star rated establishments
- Include distance estimates
- Keep descriptions concise for SMS
- Focus on local favorites and quality options`;

    if (rejectedOptions.length > 0) {
      prompt += `\n\nAvoid these previously suggested places: ${rejectedOptions.join(', ')}`;
    }

    return prompt;
  }

  private static getFallbackRecommendation(property: Property, requestType: string): string {
    console.log('🔄 Using fallback recommendation for:', requestType);
    // Use existing property data as fallback
    const localRecs = property.local_recommendations;
    
    if (localRecs) {
      console.log('📝 Local recommendations available:', localRecs.substring(0, 200) + '...');
      
      // Extract relevant section based on request type
      if ((requestType.includes('coffee') || requestType.includes('cafe')) && localRecs.includes('RESTAURANTS:')) {
        // For coffee, extract from restaurants section
        const restaurantSection = this.extractSectionByPrefix(localRecs, 'RESTAURANTS:', 'ATTRACTIONS:');
        if (restaurantSection) {
          console.log('✅ Found restaurant section for coffee');
          return this.shortenForSMS('For coffee: ' + restaurantSection);
        }
      }
      
      if ((requestType.includes('dinner') || requestType.includes('restaurant') || requestType.includes('food')) && localRecs.includes('RESTAURANTS:')) {
        const restaurantSection = this.extractSectionByPrefix(localRecs, 'RESTAURANTS:', 'ATTRACTIONS:');
        if (restaurantSection) {
          console.log('✅ Found restaurant section for dining');
          return this.shortenForSMS(restaurantSection);
        }
      }
      
      if ((requestType.includes('attraction') || requestType.includes('activities') || requestType.includes('things to do')) && localRecs.includes('ATTRACTIONS:')) {
        const attractionSection = this.extractSectionByPrefix(localRecs, 'ATTRACTIONS:', null);
        if (attractionSection) {
          console.log('✅ Found attractions section');
          return this.shortenForSMS(attractionSection);
        }
      }
    }
    
    console.log('❌ No fallback data found, returning graceful message');
    
    // Provide category-specific graceful messages
    switch (requestType.toLowerCase()) {
      case 'coffee':
      case 'cafe':
        return "I'm sorry, I don't currently have coffee shop recommendations available. I've asked our assistant to look up some top-rated cafés nearby and will update you shortly.";
      case 'attractions':
      case 'activities':
        return "I'm gathering information about local attractions and activities for you. This might take a few moments while I find the best options in your area.";
      default:
        return `I'm looking into ${requestType} options near ${property.property_name || 'your property'}. Let me get some fresh recommendations for you!`;
    }
  }

  private static extractSectionByPrefix(text: string, startPrefix: string, endPrefix: string | null): string | null {
    const startIndex = text.indexOf(startPrefix);
    if (startIndex === -1) return null;
    
    let endIndex = text.length;
    if (endPrefix) {
      const endPrefixIndex = text.indexOf(endPrefix, startIndex + startPrefix.length);
      if (endPrefixIndex !== -1) {
        endIndex = endPrefixIndex;
      }
    }
    
    const section = text.substring(startIndex + startPrefix.length, endIndex).trim();
    return section || null;
  }

  private static shortenForSMS(text: string): string {
    if (text.length <= 160) return text;
    
    // Try to keep the first meaningful sentence
    const sentences = text.split('. ');
    let result = sentences[0];
    
    if (result.length > 160) {
      result = result.substring(0, 157) + '...';
    }
    
    return result;
  }
}
