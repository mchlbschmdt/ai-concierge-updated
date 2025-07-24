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
    console.log('🔍 Getting Perplexity recommendations for:', { query, requestType, propertyAddress: property.address });
    
    const perplexityApiKey = Deno.env.get('PERPLEXITY_API_KEY');
    if (!perplexityApiKey) {
      console.log('❌ Perplexity API key not found, falling back to property recommendations');
      return this.getFallbackRecommendation(property, requestType);
    }

    try {
      const prompt = this.buildPerplexityPrompt(property, query, requestType, rejectedOptions);
      
      const response = await fetch(this.PERPLEXITY_API_URL, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${perplexityApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
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
        }),
      });

      if (!response.ok) {
        console.error('❌ Perplexity API error:', response.status, await response.text());
        return this.getFallbackRecommendation(property, requestType);
      }

      const data = await response.json();
      const recommendation = data.choices?.[0]?.message?.content;
      
      if (!recommendation) {
        console.log('❌ No recommendation returned from Perplexity');
        return this.getFallbackRecommendation(property, requestType);
      }

      console.log('✅ Perplexity recommendation generated:', recommendation.substring(0, 100) + '...');
      return this.formatRecommendation(recommendation);
      
    } catch (error) {
      console.error('❌ Error calling Perplexity API:', error);
      return this.getFallbackRecommendation(property, requestType);
    }
  }

  private static buildPerplexityPrompt(
    property: Property,
    query: string,
    requestType: string,
    rejectedOptions: string[]
  ): string {
    const baseLocation = property.address || property.property_name || 'the area';
    
    let prompt = `Find current, specific ${requestType} recommendations near ${baseLocation}. `;
    
    // Add rejection filters
    if (rejectedOptions.length > 0) {
      prompt += `Do NOT suggest: ${rejectedOptions.join(', ')}. `;
    }
    
    // Customize by request type
    switch (requestType.toLowerCase()) {
      case 'dinner':
      case 'restaurant':
      case 'food':
        prompt += `Focus on dinner restaurants with local Florida flavors, highly-rated places locals actually go to. Include name, distance, and why it's special.`;
        break;
      case 'coffee':
      case 'cafe':
        prompt += `Find specific coffee shops and cafes, not chain stores unless exceptional. Include name, distance, and what makes them unique.`;
        break;
      case 'attractions':
      case 'activities':
      case 'things to do':
        prompt += `Suggest specific attractions and activities. Include name, distance, and brief description.`;
        break;
      default:
        prompt += `Provide specific recommendations with names, distances, and key details.`;
    }
    
    prompt += ` Keep response under 160 characters for SMS. Format: \\"Name is X.X mi away - reason locals love it!\\"`;
    
    return prompt;
  }

  private static formatRecommendation(recommendation: string): string {
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

  private static getFallbackRecommendation(property: Property, requestType: string): string {
    // Use existing property data as fallback
    const localRecs = property.local_recommendations;
    
    if (localRecs) {
      // Extract relevant section based on request type
      if (requestType.includes('coffee') && localRecs.includes('Coffee')) {
        const coffeeSection = this.extractSection(localRecs, 'Coffee');
        if (coffeeSection) return this.shortenForSMS(coffeeSection);
      }
      
      if (requestType.includes('dinner') && localRecs.includes('Dining')) {
        const diningSection = this.extractSection(localRecs, 'Dining');
        if (diningSection) return this.shortenForSMS(diningSection);
      }
    }
    
    return `I'm looking into ${requestType} options near ${property.property_name || 'your property'}. Let me get some fresh recommendations for you!`;
  }

  private static extractSection(text: string, keyword: string): string | null {
    const lines = text.split('\n');
    let inSection = false;
    let section = '';
    
    for (const line of lines) {
      if (line.includes(`***${keyword}`)) {
        inSection = true;
        continue;
      }
      
      if (inSection) {
        if (line.startsWith('***') && !line.includes(keyword)) {
          break; // Next section started
        }
        section += line + ' ';
      }
    }
    
    return section.trim() || null;
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
