
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
      
      // NEW: Check if this is a rejection of previous recommendation
      const isRejection = ConversationMemoryManager.isRejectionOfPreviousRecommendation(originalMessage, context);
      if (isRejection && context?.last_recommended_restaurant) {
        console.log('🚫 Detected rejection of previous recommendation:', context.last_recommended_restaurant);
        
        // Add rejected restaurant to blacklist
        const updatedContext = ConversationMemoryManager.addToRejectedList(context, context.last_recommended_restaurant);
        
        // Clear the rejected restaurant from memory so we don't recommend it again
        updatedContext.last_recommended_restaurant = null;
        updatedContext.last_restaurant_context = null;
        
        // Update conversation state immediately
        await this.conversationManager.updateConversationState(conversation.phone_number, {
          conversation_context: updatedContext
        });
        
        console.log('✅ Added to rejected list and cleared from memory');
      }
      
      // Enhanced food query detection with improved filters
      const foodFilters = this.extractFoodFilters(originalMessage);
      const guestContext = this.extractGuestContext(originalMessage, context, conversation, intentResult);
      const requestType = this.categorizeRequest(originalMessage);
      const previousRecommendations = conversation?.last_recommendations || null;
      const rejectedRestaurants = ConversationMemoryManager.getRejectedRestaurants(context);
      
      const memoryContext = this.getRecommendationMemoryContext(context);
      
      console.log('📍 Guest context extracted:', guestContext);
      console.log('🏷️ Request type:', requestType);
      console.log('🍽️ Food filters detected:', foodFilters);
      console.log('📝 Previous recommendations:', previousRecommendations);
      console.log('🚫 Rejected restaurants:', rejectedRestaurants);
      console.log('🧠 Memory context:', memoryContext);

      // Enhanced payload with better rejection handling and food-specific instructions
      const enhancedPayload = {
        prompt: this.buildEnhancedPrompt(originalMessage, propertyAddress, foodFilters, rejectedRestaurants, isRejection),
        propertyAddress: `${propertyName}, ${propertyAddress}`,
        guestContext: { ...guestContext, foodFilters },
        requestType: requestType,
        previousRecommendations: isRejection ? null : previousRecommendations,
        rejectedRestaurants: rejectedRestaurants
      };

      console.log('🔄 Enhanced payload being sent to OpenAI:', enhancedPayload);

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
        
        // Extract restaurant names for menu context
        const recommendationText = data.recommendation;
        const restaurantNames = this.extractRestaurantNames(recommendationText);
        
        // Enhanced restaurant memory and preference tracking
        let updatedContext = {
          ...context,
          lastRecommendationType: requestType,
          lastGuestContext: guestContext,
          last_food_preferences: foodFilters.length ? foodFilters : (context.last_food_preferences || [])
        };
        
        // Don't overwrite if we already updated context due to rejection
        if (!isRejection) {
          if (restaurantNames.length > 0) {
            updatedContext.last_recommended_restaurant = restaurantNames[0];
            updatedContext.last_restaurant_context = originalMessage.toLowerCase();
          }
        } else {
          // For rejections, use existing conversation context
          updatedContext = {
            ...context,
            lastRecommendationType: requestType,
            lastGuestContext: guestContext,
            last_food_preferences: foodFilters.length ? foodFilters : (context.last_food_preferences || [])
          };
          
          if (restaurantNames.length > 0) {
            updatedContext.last_recommended_restaurant = restaurantNames[0];
            updatedContext.last_restaurant_context = originalMessage.toLowerCase();
          }
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
      
      // Context-aware error fallback
      const context = conversation?.conversation_context || {};
      const guestName = context?.guest_name;
      const namePrefix = guestName ? `${guestName}, ` : '';
      
      return {
        response: `${namePrefix}let me make sure I get this right—were you asking about dining options, or something else like WiFi or directions?`,
        shouldUpdateState: false
      };
    }
  }

  // NEW: Build enhanced prompt with better rejection handling
  private buildEnhancedPrompt(originalMessage: string, propertyAddress: string, foodFilters: string[], rejectedRestaurants: string[], isRejection: boolean): string {
    let prompt = `${originalMessage}\n\n`;
    
    // Add specific instructions for rejections
    if (isRejection && rejectedRestaurants.length > 0) {
      prompt += `IMPORTANT: Guest rejected these restaurants - DO NOT recommend them again: ${rejectedRestaurants.join(', ')}\n\n`;
    }
    
    // Add food filter instructions
    if (foodFilters.length > 0) {
      prompt += `GUEST WANTS: ${foodFilters.join(', ')} - Focus recommendations on these specific preferences.\n\n`;
    }
    
    // Add general formatting instructions
    prompt += `Use exact GPS distance from ${propertyAddress}. Format: "Restaurant Name (X.X mi, 🚗 ~X min drive, ⭐️ X.X) — Description with vibe".`;
    
    // Add rejection list if applicable
    if (rejectedRestaurants.length > 0) {
      prompt += `\n\nDO NOT RECOMMEND: ${rejectedRestaurants.join(', ')} (guest already declined these)`;
    }
    
    return prompt;
  }

  // Extract restaurant names from recommendations
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

  // NEW: Enhanced recommendation post-processing with real data
  private async enhanceRecommendationWithRealData(recommendation: string, property: Property, context: any, intentAnalysis: any): Promise<string> {
    try {
      const lines = recommendation.split('\n');
      const enhancedLines = [];
      
      for (const line of lines) {
        if (line.includes('**') || line.includes('(') && line.includes('mi')) {
          // Extract restaurant name from the line
          const restaurantMatch = line.match(/\*\*([^*]+)\*\*/) || line.match(/^([^(]+)\s*\(/);
          
          if (restaurantMatch) {
            const restaurantName = restaurantMatch[1].trim();
            
            // Get accurate distance from LocationService
            const distanceInfo = await LocationService.getAccurateDistance(
              property.address,
              restaurantName
            );
            
            if (distanceInfo) {
              // Replace or enhance with accurate distance and walkability info
              let enhancedLine = line.replace(/\(\d+\.\d+\s*mi[^)]*\)/i, 
                `(${distanceInfo.distance}, 🚗 ${distanceInfo.duration}${distanceInfo.walkable ? ', 🚶‍♂️ walkable' : ''})`
              );
              
              // Add star rating if not present
              if (!enhancedLine.includes('⭐')) {
                enhancedLine = enhancedLine.replace(/\)/, ', ⭐️ 4.2)');
              }
              
              enhancedLines.push(enhancedLine);
            } else {
              enhancedLines.push(line);
            }
          } else {
            enhancedLines.push(line);
          }
        } else {
          enhancedLines.push(line);
        }
      }
      
      // Add contextual follow-up for vibe queries
      if (intentAnalysis?.filters?.includes('rooftop') || intentAnalysis?.filters?.includes('outdoor')) {
        enhancedLines.push('\n💡 Want photos or menu info for any of these?');
      }
      
      return enhancedLines.join('\n');
    } catch (error) {
      console.error('❌ Error enhancing recommendation with real data:', error);
      return recommendation; // Return original if enhancement fails
    }
  }

  // NEW: Extract primary restaurant from recommendation for memory
  private extractRestaurantFromRecommendation(recommendation: string): string | null {
    const lines = recommendation.split('\n');
    
    for (const line of lines) {
      const boldMatch = line.match(/\*\*([^*]+)\*\*/);
      if (boldMatch) {
        return boldMatch[1].trim();
      }
      
      const nameMatch = line.match(/^([^(]+)\s*\(/);
      if (nameMatch) {
        return nameMatch[1].trim();
      }
    }
    
    return null;
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
      
      // v3.1 Context-aware error fallback for contextual recommendations
      const context = conversation?.conversation_context || {};
      const guestName = context?.guest_name;
      const namePrefix = guestName ? `${guestName}, ` : '';
      
      return {
        response: `${namePrefix}let me make sure I understand—were you looking for restaurants, activities, or something else?`,
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

  // ENHANCED: Better food filter extraction with improved burger detection
  private extractFoodFilters(message: string): string[] {
    const filters = [];
    const lowerMessage = message.toLowerCase();
    
    // Dining time filters
    if (lowerMessage.includes('lunch')) filters.push('lunch');
    if (lowerMessage.includes('dinner')) filters.push('dinner');
    if (lowerMessage.includes('late night') || lowerMessage.includes('late-night')) filters.push('late night');
    if (lowerMessage.includes('breakfast') || lowerMessage.includes('brunch')) filters.push('breakfast/brunch');
    
    // Family/speed filters
    if (lowerMessage.includes('kid') || lowerMessage.includes('family')) filters.push('kid-friendly');
    if (lowerMessage.includes('fast') || lowerMessage.includes('quick')) filters.push('quick service');
    
    // Atmosphere filters
    if (lowerMessage.includes('rooftop')) filters.push('rooftop');
    if (lowerMessage.includes('upscale') || lowerMessage.includes('fancy') || lowerMessage.includes('fine dining')) filters.push('upscale');
    if (lowerMessage.includes('casual')) filters.push('casual');
    if (lowerMessage.includes('outdoor') || lowerMessage.includes('patio')) filters.push('outdoor seating');
    
    // ENHANCED: Better cuisine and food item detection
    if (lowerMessage.includes('burger') || lowerMessage.includes('burgers')) {
      filters.push('burgers');
      filters.push('american');
    }
    if (lowerMessage.includes('pizza')) filters.push('pizza');
    if (lowerMessage.includes('seafood')) filters.push('seafood');
    if (lowerMessage.includes('italian')) filters.push('italian');
    if (lowerMessage.includes('mexican')) filters.push('mexican');
    if (lowerMessage.includes('asian') || lowerMessage.includes('chinese')) filters.push('asian');
    if (lowerMessage.includes('steak')) filters.push('steakhouse');
    if (lowerMessage.includes('wing') || lowerMessage.includes('wings')) filters.push('wings');
    if (lowerMessage.includes('taco') || lowerMessage.includes('tacos')) filters.push('tacos');
    
    console.log('🔍 Food filters extracted from message:', lowerMessage, '→', filters);
    
    return filters;
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

  // ENHANCED: Better request categorization for food queries
  private categorizeRequest(message: string): string {
    const lowerMessage = message.toLowerCase();
    
    // Enhanced food detection keywords - MUST MATCH enhancedConversationService.ts
    const foodKeywords = [
      'food', 'restaurant', 'eat', 'dining', 'hungry', 'meal', 'lunch', 'dinner', 'breakfast',
      'burger', 'burgers', 'pizza', 'seafood', 'italian', 'mexican', 'chinese', 'steak',
      'bite', 'grab something', 'quick', 'casual', 'upscale', 'fancy', 'rooftop',
      'what\'s good', 'where to eat', 'spot', 'place to eat', 'good food',
      // CRITICAL: Add continuation patterns that indicate food requests
      'let\'s do', 'give me', 'local', 'options', 'recommendations', 'yeah give me',
      'give me local', 'local options', 'other options', 'something else'
    ];
    
    // Check for food-related terms
    if (foodKeywords.some(keyword => lowerMessage.includes(keyword))) {
      console.log('🍽️ Categorized as food_recommendations due to keywords');
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
    
    console.log('🏷️ Categorized as general for message:', lowerMessage);
    return 'general';
  }
}
