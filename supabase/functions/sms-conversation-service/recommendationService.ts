
import { Conversation, Property } from './types.ts';
import { ResponseGenerator } from './responseGenerator.ts';
import { MessageUtils } from './messageUtils.ts';
import { LocationService } from './locationService.ts';
import { ConversationMemoryManager } from './conversationMemoryManager.ts';

export class RecommendationService {
  constructor(private supabase: any, private conversationManager: any) {}

  async getEnhancedRecommendations(property: Property, originalMessage: string, conversation: Conversation, intentResult?: any) {
    console.log(`🎯 Getting enhanced recommendations for: ${originalMessage}`);
    
    try {
      const propertyAddress = property?.address || 'the property';
      const propertyName = property?.property_name || 'your accommodation';
      const context = conversation?.conversation_context || {};
      const timezone = conversation?.timezone || 'UTC';
      const guestName = context?.guest_name;
      
      const greeting = ResponseGenerator.getTimeAwareGreeting(timezone);
      const personalizedGreeting = ResponseGenerator.getPersonalizedFoodGreeting(originalMessage, greeting, guestName);
      const clarifyingQuestion = this.getSmartFollowUpQuestion(originalMessage, intentResult);
      const helpfulOffer = ResponseGenerator.getHelpfulOffer(this.categorizeRequest(originalMessage));
      
      const guestContext = this.extractGuestContext(originalMessage, context, conversation, intentResult);
      const requestType = this.categorizeRequest(originalMessage);
      const previousRecommendations = conversation?.last_recommendations || null;
      
      const memoryContext = this.getRecommendationMemoryContext(context);
      
      console.log('📍 Guest context extracted:', guestContext);
      console.log('🏷️ Request type:', requestType);
      console.log('📝 Previous recommendations:', previousRecommendations);
      console.log('🧠 Memory context:', memoryContext);

      // Phase 3: Enhanced payload with distance and rating requirements
      const enhancedPayload = {
        prompt: `${originalMessage}\n\nIMPORTANT: Include real distance calculations, star ratings, and vibe descriptions for each recommendation. Use format: "Restaurant Name (X.X mi, 🚗 ~X min drive, ⭐️ X.X) — Description with vibe"`,
        propertyAddress: `${propertyName}, ${propertyAddress}`,
        guestContext: guestContext,
        requestType: requestType,
        previousRecommendations: previousRecommendations
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
        
        // Phase 3: Extract restaurant names for menu context
        const recommendationText = data.recommendation;
        const restaurantNames = this.extractRestaurantNames(recommendationText);
        
        // Store last recommended restaurant for menu queries
        const updatedContext = {
          ...context,
          lastRecommendationType: requestType,
          lastGuestContext: guestContext
        };
        
        if (restaurantNames.length > 0) {
          updatedContext.last_recommended_restaurant = restaurantNames[0]; // Store first restaurant
        }
        
        // Store recommendations in travel database for future use
        await this.storeTravelRecommendation(propertyAddress, requestType, data.recommendation);
        
        await this.conversationManager.updateConversationState(conversation.phone_number, {
          last_recommendations: data.recommendation,
          conversation_context: updatedContext
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
      
      // Phase 5: Better error fallback
      const context = conversation?.conversation_context || {};
      const guestName = context?.guest_name;
      const namePrefix = guestName ? `${guestName}, ` : '';
      
      return {
        response: `${namePrefix}having trouble with recommendations right now. Can I help with WiFi, parking, or property details instead?`,
        shouldUpdateState: false
      };
    }
  }

  // Phase 3: Extract restaurant names from recommendations
  private extractRestaurantNames(recommendationText: string): string[] {
    const restaurants = [];
    const lines = recommendationText.split('\n');
    
    for (const line of lines) {
      // Look for restaurant names in bold format or before parentheses
      const boldMatch = line.match(/\*\*([^*]+)\*\*/);
      if (boldMatch) {
        restaurants.push(boldMatch[1].trim());
      } else {
        // Look for restaurant names before distance/rating info
        const nameMatch = line.match(/^([^(]+)\s*\(/);
        if (nameMatch) {
          restaurants.push(nameMatch[1].trim());
        }
      }
    }
    
    return restaurants;
  }

  private getSmartFollowUpQuestion(message: string, intentResult?: any): string {
    const lowerMessage = message.toLowerCase();
    
    // Family-specific follow-ups
    if (intentResult?.hasKids) {
      if (lowerMessage.includes('food') || lowerMessage.includes('restaurant')) {
        return "Want somewhere with a kids menu or family-friendly vibe?";
      }
      if (lowerMessage.includes('activity') || lowerMessage.includes('things to do')) {
        return "Looking for something interactive for the kids?";
      }
    }
    
    // Checkout-aware follow-ups
    if (intentResult?.isCheckoutSoon) {
      return "Want something quick and nearby since you're heading out?";
    }
    
    // Standard follow-ups based on request type
    if (lowerMessage.includes('food') || lowerMessage.includes('restaurant')) {
      return "What's your vibe—quick bite, date night, or somewhere with drinks?";
    }
    
    if (lowerMessage.includes('activity') || lowerMessage.includes('things to do')) {
      return "Are you looking for outdoor fun, something cultural, or family-friendly?";
    }
    
    return "Want something casual or more upscale?";
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

  async getContextualRecommendations(property: Property, type: string, conversation: Conversation, intentResult?: any) {
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
      
      // Add family and checkout context
      const familyNote = intentResult?.hasKids ? 'Guest is traveling with kids - prioritize family-friendly options. ' : '';
      const checkoutNote = intentResult?.isCheckoutSoon ? 'Guest is checking out soon - prioritize quick/nearby options. ' : '';

      const prompt = `You are a local concierge. Guest at ${propertyName}, ${propertyAddress}. ${guestNameNote}${contextNote}${avoidRepetition}${familyNote}${checkoutNote}Request: ${type}

CRITICAL PROXIMITY FOCUS: Only recommend places within 5 miles of ${propertyAddress}. Prioritize closest options.

Response must be under 160 characters for SMS. Be warm and conversational. Give 3 fresh recommendations with distances and star ratings using format: "Name (X.X mi, ⭐️ X.X) — Description"

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
      
      // Phase 5: Better error fallback
      const context = conversation?.conversation_context || {};
      const guestName = context?.guest_name;
      const namePrefix = guestName ? `${guestName}, ` : '';
      
      return {
        response: `${namePrefix}having trouble with recommendations. Can I help with WiFi, parking, or property details instead?`,
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

  private extractGuestContext(message: string, context: any, conversation: Conversation, intentResult?: any): any {
    const guestContext = {
      guestName: context?.guest_name,
      previousInterests: context?.previousInterests || [],
      lastActivity: context?.lastActivity,
      timeOfDay: this.getTimeOfDay(),
      dayOfWeek: this.getDayOfWeek(),
      isCheckoutSoon: intentResult?.isCheckoutSoon || false,
      hasKids: intentResult?.hasKids || false
    };

    return guestContext;
  }

  private getTimeOfDay(): string {
    const hour = new Date().getHours();
    if (hour < 12) return 'morning';
    if (hour < 17) return 'afternoon';
    return 'evening';
  }

  private getDayOfWeek(): string {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    return days[new Date().getDay()];
  }

  private categorizeRequest(message: string): string {
    const lowerMessage = message.toLowerCase();
    
    if (lowerMessage.includes('food') || lowerMessage.includes('restaurant') || lowerMessage.includes('eat') || lowerMessage.includes('dining')) {
      return 'food_recommendations';
    }
    
    if (lowerMessage.includes('activity') || lowerMessage.includes('things to do') || lowerMessage.includes('attractions')) {
      return 'activities';
    }
    
    if (lowerMessage.includes('grocery') || lowerMessage.includes('shopping')) {
      return 'grocery_stores';
    }
    
    if (lowerMessage.includes('wifi') || lowerMessage.includes('internet')) {
      return 'wifi';
    }
    
    if (lowerMessage.includes('parking')) {
      return 'parking';
    }
    
    return 'general';
  }
}
