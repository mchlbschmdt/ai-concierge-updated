
import { Conversation, Property } from './types.ts';
import { ResponseGenerator } from './responseGenerator.ts';
import { MessageUtils } from './messageUtils.ts';

export class RecommendationService {
  constructor(private supabase: any, private conversationManager: any) {}

  async getEnhancedRecommendations(property: Property, originalMessage: string, conversation: Conversation) {
    console.log(`🎯 Getting enhanced recommendations for: ${originalMessage}`);
    
    try {
      const propertyAddress = property?.address || 'the property';
      const propertyName = property?.property_name || 'your accommodation';
      const context = conversation?.conversation_context || {};
      const timezone = conversation?.timezone || 'UTC';
      const guestName = context?.guest_name;
      
      const greeting = ResponseGenerator.getTimeAwareGreeting(timezone);
      const personalizedGreeting = ResponseGenerator.getPersonalizedFoodGreeting(originalMessage, greeting, guestName);
      const clarifyingQuestion = ResponseGenerator.getClarifyingQuestion(originalMessage);
      const helpfulOffer = ResponseGenerator.getHelpfulOffer(this.categorizeRequest(originalMessage));
      
      const guestContext = this.extractGuestContext(originalMessage, context, conversation);
      const requestType = this.categorizeRequest(originalMessage);
      const previousRecommendations = conversation?.last_recommendations || null;
      
      const memoryContext = this.getRecommendationMemoryContext(context);
      
      console.log('📍 Guest context extracted:', guestContext);
      console.log('🏷️ Request type:', requestType);
      console.log('📝 Previous recommendations:', previousRecommendations);
      console.log('🧠 Memory context:', memoryContext);

      // Enhanced payload for proximity-based recommendations
      const enhancedPayload = {
        prompt: `${originalMessage}

ENHANCED LOCATION-AWARE RESPONSE FORMAT:
1. Start with: "${personalizedGreeting}"
2. Provide 3 recommendations within 5 miles of ${propertyAddress} with format: "Name (distance, rating★): Brief description—${ResponseGenerator.getDistanceFraming('0.3')}"
3. Ask: "${clarifyingQuestion}"
4. End with: "${helpfulOffer}"

CRITICAL PROXIMITY REQUIREMENTS:
- Focus on places within 5 miles of ${propertyAddress}
- Only show places with 4.0+ ratings
- Include exact distance (e.g., "0.2 mi", "3.5 mi")
- Use distance framing: ≤0.5mi="walking distance", 0.5-1.5mi="short ride", 1.5-5mi="quick drive"
- Prioritize closest options when multiple good choices exist
- Keep total response under 160 characters
- ${memoryContext ? `AVOID REPEATING: ${memoryContext}` : ''}

LOCATION CONTEXT: ${propertyAddress}`,
        propertyAddress: `${propertyName}, ${propertyAddress}`,
        guestContext: guestContext,
        requestType: requestType,
        previousRecommendations: previousRecommendations,
        memoryContext: memoryContext
      };

      const response = await fetch('https://zutwyyepahbbvrcbsbke.supabase.co/functions/v1/openai-recommendations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`
        },
        body: JSON.stringify(enhancedPayload)
      });

      if (response.ok) {
        const data = await response.json();
        console.log('✅ Enhanced recommendations received');
        
        // Store recommendations in travel database for future use
        await this.storeTravelRecommendation(propertyAddress, requestType, data.recommendation);
        
        await this.conversationManager.updateConversationState(conversation.phone_number, {
          last_recommendations: data.recommendation,
          conversation_context: {
            ...context,
            lastRecommendationType: requestType,
            lastGuestContext: guestContext
          }
        });
        
        return {
          response: MessageUtils.ensureSmsLimit(data.recommendation),
          shouldUpdateState: false
        };
      } else {
        throw new Error(`Enhanced recommendations API failed: ${response.status}`);
      }
    } catch (error) {
      console.error('❌ Error getting enhanced recommendations:', error);
      
      return {
        response: "Having trouble with recommendations right now. Try again soon or ask about WiFi, parking, or check-in details.",
        shouldUpdateState: false
      };
    }
  }

  private async storeTravelRecommendation(location: string, requestType: string, recommendation: string): Promise<void> {
    try {
      // Parse location to get city/state for travel database
      const locationParts = location.split(',');
      if (locationParts.length >= 2) {
        const city = locationParts[0].trim();
        const stateMatch = locationParts[1].match(/[A-Z]{2}/);
        
        if (stateMatch) {
          const state = stateMatch[0];
          
          // Check if location exists in travel database
          const { data: existingLocation } = await this.supabase
            .from('locations')
            .select('*')
            .ilike('city', `%${city}%`)
            .eq('state', state)
            .maybeSingle();
          
          if (existingLocation) {
            // Extract places from recommendation and store as curated links
            const lines = recommendation.split('\n').filter(line => line.includes('**'));
            
            for (const line of lines) {
              const titleMatch = line.match(/\*\*([^*]+)\*\*/);
              if (titleMatch) {
                const title = titleMatch[1];
                const description = line.replace(/\*\*[^*]+\*\*:?\s*/, '').trim();
                
                let category = 'general';
                if (requestType.includes('food') || requestType.includes('restaurant')) {
                  category = 'food';
                } else if (requestType.includes('outdoor') || requestType.includes('activity')) {
                  category = 'outdoor';
                } else if (requestType.includes('entertainment')) {
                  category = 'entertainment';
                }
                
                await this.supabase
                  .from('curated_links')
                  .insert({
                    location_id: existingLocation.id,
                    category,
                    title,
                    description,
                    weight: 3 // Lower weight for property-sourced recommendations
                  })
                  .select()
                  .maybeSingle();
              }
            }
          }
        }
      }
    } catch (error) {
      console.error('Error storing travel recommendation:', error);
    }
  }

  async getContextualRecommendations(property: Property, type: string, conversation: Conversation) {
    try {
      const propertyName = property?.property_name || 'your accommodation';
      const propertyAddress = property?.address || 'the property';
      const context = conversation?.conversation_context || {};
      const previousAskedAbout = context.askedAbout || [];
      const guestName = context?.guest_name;
      
      let contextNote = '';
      if (previousAskedAbout.length > 0) {
        contextNote = `Guest previously asked about: ${previousAskedAbout.join(', ')}. `;
      }

      const guestNameNote = guestName ? `Guest's name is ${guestName}. ` : '';
      const memoryContext = this.getRecommendationMemoryContext(context);
      const avoidRepetition = memoryContext ? `AVOID these previously mentioned places: ${memoryContext}. ` : '';

      const prompt = `You are a local concierge. Guest at ${propertyName}, ${propertyAddress}. ${guestNameNote}${contextNote}${avoidRepetition}Request: ${type}

CRITICAL PROXIMITY FOCUS: Only recommend places within 5 miles of ${propertyAddress}. Prioritize closest options.

Response must be under 160 characters for SMS. Be warm and conversational. Give 3 fresh recommendations with distances.

${contextNote ? 'Reference previous interests naturally if relevant.' : ''}
${guestName ? `Address the guest by name (${guestName}) when appropriate.` : ''}`;

      const response = await fetch('https://zutwyyepahbbvrcbsbke.supabase.co/functions/v1/openai-recommendations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`
        },
        body: JSON.stringify({ prompt })
      });

      if (response.ok) {
        const data = await response.json();
        
        // Store in travel database
        await this.storeTravelRecommendation(propertyAddress, type, data.recommendation);
        
        await this.conversationManager.updateConversationState(conversation.phone_number, {
          last_recommendations: data.recommendation
        });
        
        return {
          response: MessageUtils.ensureSmsLimit(data.recommendation),
          shouldUpdateState: false
        };
      } else {
        throw new Error(`OpenAI API failed: ${response.status}`);
      }
    } catch (error) {
      console.error('Error getting recommendations:', error);
      return {
        response: "Having trouble with recommendations. Try asking about WiFi, parking, or check-in details.",
        shouldUpdateState: false
      };
    }
  }

  private getRecommendationMemoryContext(context: any): string {
    if (!context) return '';
    
    const globalBlacklist = context.global_recommendation_blacklist || [];
    if (globalBlacklist.length > 0) {
      const recentBlacklist = globalBlacklist.slice(-8);
      return recentBlacklist.join(', ');
    }
    
    return '';
  }

  private extractGuestContext(message: string, context: any, conversation: Conversation): string {
    const askedAbout = context.askedAbout || [];
    const lastMessage = conversation.last_message_type;
    
    if (lastMessage === 'recommendations') {
      return message;
    }

    if (askedAbout.includes('wifi')) {
      return message;
    }

    if (askedAbout.includes('parking')) {
      return message;
    }

    return message;
  }

  private categorizeRequest(message: string): string {
    const keywords = [
      'wifi', 'wi-fi', 'internet', 'password', 'network',
      'parking', 'park', 'car', 'garage',
      'check in', 'check out', 'checkin', 'checkout',
      'beach', 'restaurant', 'food', 'eat', 'dining', 'drink', 'bar',
      'things to do', 'attractions', 'activities', 'directions'
    ];

    for (const keyword of keywords) {
      if (message.toLowerCase().includes(keyword)) {
        return keyword;
      }
    }

    return 'general';
  }
}
