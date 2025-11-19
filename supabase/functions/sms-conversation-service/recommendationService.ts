
import { Conversation, Property } from './types.ts';
import { ResponseGenerator } from './responseGenerator.ts';
import { MessageUtils } from './messageUtils.ts';
import { LocationService } from './locationService.ts';
import { ConversationMemoryManager } from './conversationMemoryManager.ts';
import { PropertyLocationAnalyzer } from './propertyLocationAnalyzer.ts';

export class RecommendationService {
  constructor(private supabase: any, private conversationManager: any) {}

  async getEnhancedRecommendations(property: Property, originalMessage: string, conversation: Conversation, intentResult?: any) {
    console.log(`🎯 [OPENAI] Getting enhanced recommendations for: ${originalMessage}`);
    console.log(`📍 [OPENAI] Property: ${property.property_name}, ${property.address}`);
    
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
      
      // Detect follow-up questions
      const isFollowUp = ConversationMemoryManager.isFollowUpQuestion(originalMessage);
      const lastContext = ConversationMemoryManager.getLastQuestionContext(context);
      
      // Enhanced food query detection with improved filters
      const foodFilters = this.extractFoodFilters(originalMessage);
      const guestContext = this.extractGuestContext(originalMessage, context, conversation, intentResult);
      const requestType = this.categorizeRequest(originalMessage);
      const previousRecommendations = conversation?.last_recommendations || null;
      const rejectedRestaurants = ConversationMemoryManager.getRejectedRestaurants(context);
      
      // Get location context for the property
      const locationContext = PropertyLocationAnalyzer.analyzePropertyLocation(property.address);
      console.log('📍 Location context:', locationContext);
      
      const memoryContext = this.getRecommendationMemoryContext(context);
      
      if (isFollowUp && lastContext) {
        console.log('🔄 Detected follow-up question. Previous context:', lastContext.topic);
      }
      
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
        guestContext: { 
          ...guestContext, 
          foodFilters,
          locationContext
        },
        requestType: requestType,
        previousRecommendations: isRejection ? null : previousRecommendations,
        rejectedRestaurants: rejectedRestaurants,
        previousContext: (isFollowUp && lastContext) ? {
          lastQuestion: lastContext.question,
          lastAnswer: lastContext.answer,
          topic: lastContext.topic
        } : undefined
      };

      console.log('🔄 [OPENAI] Enhanced payload being sent:', JSON.stringify(enhancedPayload).substring(0, 200));

      const startTime = Date.now();
      const response = await fetch('https://zutwyyepahbbvrcbsbke.supabase.co/functions/v1/openai-recommendations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`
        },
        body: JSON.stringify(enhancedPayload)
      });

      const responseTime = Date.now() - startTime;
      console.log(`📊 [OPENAI] Response status: ${response.status}, Time: ${responseTime}ms`);

      if (response.ok) {
        const data = await response.json();
        console.log('✅ [OPENAI] Raw API response:', JSON.stringify(data).substring(0, 300));
        
        // FIX: Handle both { recommendation } and { response } formats
        const recommendationText = data.recommendation || data.response;
        
        if (!recommendationText) {
          console.error('❌ [OPENAI] API returned OK but no recommendation content:', data);
          throw new Error('API returned empty recommendation');
        }
        
        console.log('✅ [OPENAI] Enhanced recommendations received:', recommendationText.substring(0, 150) + '...');
        
        // PHASE 4: Validate recommendation matches intent
        let finalRecommendation = recommendationText;
        const validationResult = this.validateRecommendationMatchesIntent(
          recommendationText, 
          requestType, 
          originalMessage
        );

        if (!validationResult.isValid) {
          console.log('⚠️ Recommendation validation failed, logging and retrying');
          
          // Log the rejection for quality improvement
          await this.logCategoryMismatch(
            conversation,
            property,
            requestType,
            originalMessage,
            recommendationText,
            validationResult.reason || 'Category mismatch detected',
            {
              keywordsFound: validationResult.details?.found || [],
              keywordsMissing: validationResult.details?.missing || []
            }
          );
          
          // Retry with more explicit instructions
          const retryPayload = {
            ...enhancedPayload,
            prompt: this.buildCorrectionPrompt(originalMessage, propertyAddress, requestType, recommendationText)
          };
          
          try {
            const retryResponse = await fetch('https://zutwyyepahbbvrcbsbke.supabase.co/functions/v1/openai-recommendations', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`
              },
              body: JSON.stringify(retryPayload)
            });
            
            if (retryResponse.ok) {
              const retryData = await retryResponse.json();
              const correctedRecommendation = retryData.recommendation || retryData.response;
              
              if (correctedRecommendation) {
                console.log('✅ Retry successful with corrected recommendations');
                finalRecommendation = correctedRecommendation;
                
                // Update rejection log with successful retry
                await this.updateRejectionWithRetryResult(
                  conversation,
                  requestType,
                  originalMessage,
                  true,
                  correctedRecommendation
                );
              } else {
                finalRecommendation = recommendationText;
                await this.updateRejectionWithRetryResult(
                  conversation,
                  requestType,
                  originalMessage,
                  false
                );
              }
            } else {
              console.error('❌ Retry failed');
              await this.updateRejectionWithRetryResult(
                conversation,
                requestType,
                originalMessage,
                false
              );
            }
          } catch (retryError) {
            console.error('❌ Retry error:', retryError);
            await this.updateRejectionWithRetryResult(
              conversation,
              requestType,
              originalMessage,
              false
            );
          }
        }
        
        // Extract restaurant names for menu context
        const restaurantNames = this.extractRestaurantNames(finalRecommendation);
        
        // PHASE 2: Enhanced restaurant memory with category tracking
        let updatedContext = {
          ...context,
          lastRecommendationType: requestType,
          lastGuestContext: guestContext,
          last_food_preferences: foodFilters.length ? foodFilters : (context.last_food_preferences || []),
          last_request_category: requestType // Track category for memory management
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
        await this.storeTravelRecommendation(propertyAddress, requestType, finalRecommendation);
        
        await this.conversationManager.updateConversationState(conversation.phone_number, {
          last_recommendations: finalRecommendation,
          conversation_context: updatedContext
        });
        
        return {
          response: MessageUtils.ensureSmsLimit(finalRecommendation).join('\n'),
          shouldUpdateState: false,
          requestCategory: requestType
        };
      } else {
        const errorText = await response.text();
        const errorDetails = {
          status: response.status,
          statusText: response.statusText,
          error: errorText,
          url: response.url,
          responseTime: responseTime
        };
        console.error('❌ [OPENAI] API failed:', JSON.stringify(errorDetails));
        throw new Error(`OpenAI API error ${response.status}: ${errorText.substring(0, 100)}`);
      }
    } catch (error) {
      console.error('❌ [OPENAI] Error getting enhanced recommendations:', error);
      console.error('❌ [OPENAI] Error stack:', error.stack);
      console.error('❌ [OPENAI] Request details:', { 
        property: property?.property_name, 
        message: originalMessage.substring(0, 50),
        hasApiKey: !!Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
      });
      
      // IMPROVED: Better context-aware error fallback with specific error type
      const context = conversation?.conversation_context || {};
      const guestName = context?.guest_name;
      const namePrefix = guestName ? `${guestName}, ` : '';
      
      // Check error type for specific message
      const errorMessage = error?.message || '';
      if (errorMessage.includes('fetch failed') || errorMessage.includes('network')) {
        return {
          response: MessageUtils.ensureSmsLimit(`${namePrefix}I'm having trouble connecting right now. For immediate help, contact your host: ${property?.emergency_contact || 'see your welcome guide'}`).join('\n'),
          shouldUpdateState: false,
          requestCategory: requestType
        };
      }
      
      if (errorMessage.includes('timeout') || errorMessage.includes('ETIMEDOUT')) {
        return {
          response: MessageUtils.ensureSmsLimit(`${namePrefix}That's taking longer than expected. Try again in a moment, or contact your host for quick recommendations: ${property?.emergency_contact || ''}`).join('\n'),
          shouldUpdateState: false,
          requestCategory: requestType
        };
      }
      
      // Generic fallback with property contact
      return {
        response: MessageUtils.ensureSmsLimit(`${namePrefix}I'm having trouble getting recommendations right now. Contact your host for local tips: ${property?.emergency_contact || ''}`).join('\n'),
        shouldUpdateState: false,
        requestCategory: requestType
      };
    }
  }

  // PHASE 1: Enhanced prompt with explicit meal-type detection
  private buildEnhancedPrompt(originalMessage: string, propertyAddress: string, foodFilters: string[], rejectedRestaurants: string[], isRejection: boolean): string {
    let prompt = `${originalMessage}\n\n`;
    
    // CRITICAL: Detect meal type and add explicit instructions
    const lowerMessage = originalMessage.toLowerCase();
    const mealType = this.detectMealType(lowerMessage);
    
    if (mealType === 'breakfast') {
      prompt += `CRITICAL INSTRUCTION: Guest wants BREAKFAST RESTAURANTS with FULL BREAKFAST MENUS (eggs, pancakes, French toast, omelets, etc.).\n`;
      prompt += `DO NOT recommend coffee shops or cafés unless they explicitly serve sit-down breakfast meals.\n`;
      prompt += `Coffee shops are ONLY for coffee/pastry requests, NOT for breakfast restaurant requests.\n\n`;
    } else if (mealType === 'coffee') {
      prompt += `CRITICAL INSTRUCTION: Guest wants COFFEE SHOPS or CAFÉS specializing in coffee and pastries.\n`;
      prompt += `Focus on places known for quality coffee, not full breakfast restaurants.\n\n`;
    } else if (mealType === 'lunch') {
      prompt += `CRITICAL INSTRUCTION: Guest wants LUNCH restaurants with full lunch menus.\n\n`;
    } else if (mealType === 'dinner') {
      prompt += `CRITICAL INSTRUCTION: Guest wants DINNER restaurants suitable for evening dining.\n\n`;
    }
    
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

  // PHASE 1: Detect specific meal type from message
  private detectMealType(message: string): string {
    if (message.includes('breakfast') || message.includes('morning meal')) {
      return 'breakfast';
    }
    if (message.includes('coffee') || message.includes('café') || message.includes('cafe')) {
      return 'coffee';
    }
    if (message.includes('lunch') || message.includes('midday')) {
      return 'lunch';
    }
    if (message.includes('dinner') || message.includes('evening meal') || message.includes('supper')) {
      return 'dinner';
    }
    return 'general';
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
        
        // FIX: Handle both response formats
        const recommendationText = data.recommendation || data.response;
        
        if (!recommendationText) {
          console.error('❌ [OPENAI-CONTEXTUAL] Empty response from API:', data);
          throw new Error('Empty recommendation from API');
        }
        
        console.log('✅ [OPENAI-CONTEXTUAL] Received:', recommendationText.substring(0, 100));
        
        // Store in travel database
        await this.storeTravelRecommendation(propertyAddress, type, recommendationText);
        
        await this.conversationManager.updateConversationState(conversation.phone_number, {
          last_recommendations: recommendationText
        });
        
        return {
          response: MessageUtils.ensureSmsLimit(recommendationText).join('\n'),
          shouldUpdateState: false
        };
      } else {
        const errorText = await response.text();
        console.error(`❌ [OPENAI-CONTEXTUAL] API error ${response.status}:`, errorText);
        throw new Error(`OpenAI API failed: ${response.status} - ${errorText.substring(0, 100)}`);
      }
    } catch (error) {
      console.error('❌ [OPENAI-CONTEXTUAL] Error getting recommendations:', error);
      console.error('❌ [OPENAI-CONTEXTUAL] Stack:', error.stack);
      
      // IMPROVED: Better context-aware error fallback
      const context = conversation?.conversation_context || {};
      const guestName = context?.guest_name;
      const namePrefix = guestName ? `${guestName}, ` : '';
      
      // Provide specific, helpful fallback
      return {
        response: MessageUtils.ensureSmsLimit(`${namePrefix}I'm having trouble getting those recommendations. Contact your host for local tips: ${property?.emergency_contact || ''}`).join('\n'),
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

  // PHASE 4: Validate recommendation matches intent with detailed tracking
  private validateRecommendationMatchesIntent(
    response: string, 
    requestType: string, 
    message: string
  ): { isValid: boolean; reason?: string; details?: { found: string[]; missing: string[] } } {
    const lowerResponse = response.toLowerCase();
    const lowerMessage = message.toLowerCase();
    
    // Check if breakfast request returned only coffee shops
    if (requestType === 'breakfast_restaurant' && lowerMessage.includes('breakfast')) {
      const coffeeWords = ['café', 'cafe', 'coffee shop'];
      const breakfastWords = ['breakfast', 'eggs', 'pancake', 'omelet'];
      
      const foundCoffee = coffeeWords.filter(w => lowerResponse.includes(w));
      const foundBreakfast = breakfastWords.filter(w => lowerResponse.includes(w));
      
      if (foundCoffee.length > 0 && foundBreakfast.length === 0) {
        console.log(`❌ ${requestType} validation failed: breakfast request returned coffee shops only`);
        return {
          isValid: false,
          reason: 'breakfast request returned coffee shops only',
          details: { found: foundCoffee, missing: breakfastWords }
        };
      }
    }
    
    // Check if coffee request returned breakfast restaurants
    if (requestType === 'coffee_shop' && lowerMessage.includes('coffee')) {
      const breakfastWords = ['breakfast menu', 'full breakfast'];
      const coffeeWords = ['coffee', 'espresso', 'latte'];
      
      const foundBreakfast = breakfastWords.filter(w => lowerResponse.includes(w));
      const foundCoffee = coffeeWords.filter(w => lowerResponse.includes(w));
      
      if (foundBreakfast.length > 0 && foundCoffee.length === 0) {
        console.log(`❌ ${requestType} validation failed: coffee request returned breakfast restaurants`);
        return {
          isValid: false,
          reason: 'coffee request returned breakfast restaurants',
          details: { found: foundBreakfast, missing: coffeeWords }
        };
      }
    }
    
    // Check if lunch request returned fine dining/dinner establishments
    if (requestType === 'lunch_dining') {
      const dinnerWords = ['fine dining', 'upscale', 'evening', 'reservations recommended'];
      const lunchWords = ['lunch', 'sandwich', 'salad', 'quick', 'casual'];
      
      const foundDinner = dinnerWords.filter(w => lowerResponse.includes(w));
      const foundLunch = lunchWords.filter(w => lowerResponse.includes(w));
      
      if (foundDinner.length > 0 && foundLunch.length === 0) {
        console.log(`❌ ${requestType} validation failed: lunch request returned fine dining establishments`);
        return {
          isValid: false,
          reason: 'lunch request returned fine dining establishments',
          details: { found: foundDinner, missing: lunchWords }
        };
      }
    }
    
    // Check if dinner request returned fast-casual/lunch spots
    if (requestType === 'dinner_dining') {
      const lunchWords = ['quick bite', 'fast casual', 'sandwich shop'];
      const dinnerWords = ['dinner', 'evening', 'entree', 'full service'];
      
      const foundLunch = lunchWords.filter(w => lowerResponse.includes(w));
      const foundDinner = dinnerWords.filter(w => lowerResponse.includes(w));
      
      if (foundLunch.length > 0 && foundDinner.length === 0) {
        console.log(`❌ ${requestType} validation failed: dinner request returned fast-casual lunch spots`);
        return {
          isValid: false,
          reason: 'dinner request returned fast-casual lunch spots',
          details: { found: foundLunch, missing: dinnerWords }
        };
      }
    }
    
    // Check if activities request returned restaurants
    if (requestType === 'activities') {
      const restaurantWords = ['restaurant', 'dining', 'café', 'eatery', 'menu'];
      const activityWords = ['museum', 'park', 'beach', 'tour', 'hike', 'attraction', 'scenic'];
      
      const foundRestaurant = restaurantWords.filter(w => lowerResponse.includes(w));
      const foundActivity = activityWords.filter(w => lowerResponse.includes(w));
      
      if (foundRestaurant.length > 0 && foundActivity.length === 0) {
        console.log(`❌ ${requestType} validation failed: activities request returned restaurants instead of attractions`);
        return {
          isValid: false,
          reason: 'activities request returned restaurants instead of attractions',
          details: { found: foundRestaurant, missing: activityWords }
        };
      }
    }
    
    console.log(`✅ ${requestType} validation passed: recommendation matches intent`);
    return { isValid: true };
  }

  // Quality tracking: Log category mismatches for analysis
  private async logCategoryMismatch(
    conversation: any,
    property: any,
    requestType: string,
    originalMessage: string,
    rejectedContent: string,
    rejectionReason: string,
    validationDetails: {
      keywordsFound: string[],
      keywordsMissing: string[]
    }
  ): Promise<void> {
    try {
      const context = conversation?.conversation_context || {};
      
      const { error } = await this.supabase
        .from('recommendation_rejections')
        .insert({
          conversation_id: conversation.id,
          phone_number: conversation.phone_number,
          property_id: property?.id || conversation.property_id,
          requested_category: requestType,
          original_message: originalMessage,
          rejection_reason: rejectionReason,
          mismatched_content: rejectedContent,
          validation_keywords_found: validationDetails.keywordsFound,
          validation_keywords_missing: validationDetails.keywordsMissing,
          retry_attempted: false,
          session_metadata: {
            guest_name: context.guest_name,
            time_of_day: this.getTimeOfDay(),
            day_of_week: this.getDayOfWeek(),
            conversation_turn: context.conversation_turn || 0
          }
        });
      
      if (error) {
        console.error('❌ Failed to log rejection:', error);
      } else {
        console.log('📊 Rejection logged for quality analysis');
      }
    } catch (err) {
      console.error('❌ Error logging rejection:', err);
      // Don't throw - logging failure shouldn't break the flow
    }
  }

  private async updateRejectionWithRetryResult(
    conversation: any,
    requestType: string,
    originalMessage: string,
    retrySuccessful: boolean,
    correctedContent?: string
  ): Promise<void> {
    try {
      // Find the most recent rejection for this conversation and request
      const { data: rejection, error: fetchError } = await this.supabase
        .from('recommendation_rejections')
        .select('id')
        .eq('conversation_id', conversation.id)
        .eq('requested_category', requestType)
        .eq('original_message', originalMessage)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      
      if (fetchError || !rejection) {
        console.warn('⚠️ Could not find rejection to update');
        return;
      }
      
      const { error: updateError } = await this.supabase
        .from('recommendation_rejections')
        .update({
          retry_attempted: true,
          retry_successful: retrySuccessful,
          corrected_content: correctedContent
        })
        .eq('id', rejection.id);
      
      if (updateError) {
        console.error('❌ Failed to update rejection retry result:', updateError);
      } else {
        console.log(`📊 Rejection retry result logged: ${retrySuccessful ? 'SUCCESS' : 'FAILED'}`);
      }
    } catch (err) {
      console.error('❌ Error updating rejection:', err);
    }
  }

  // PHASE 4: Build correction prompt when validation fails
  private buildCorrectionPrompt(originalMessage: string, propertyAddress: string, requestType: string, previousResponse: string): string {
    let prompt = `${originalMessage}\n\n`;
    
    prompt += `CRITICAL CORRECTION NEEDED:\n`;
    prompt += `The previous response was incorrect. The guest asked for ${requestType} but received wrong recommendations.\n\n`;
    
    if (requestType === 'breakfast_restaurant') {
      prompt += `The guest wants BREAKFAST RESTAURANTS with FULL BREAKFAST MENUS (eggs, pancakes, French toast, etc.).\n`;
      prompt += `DO NOT recommend coffee shops or cafés. They want places to SIT DOWN and eat a FULL BREAKFAST MEAL.\n\n`;
    } else if (requestType === 'coffee_shop') {
      prompt += `The guest wants COFFEE SHOPS for coffee and pastries only.\n`;
      prompt += `DO NOT recommend full-service breakfast restaurants.\n\n`;
    } else if (requestType === 'lunch_dining') {
      prompt += `The guest wants LUNCH-APPROPRIATE restaurants (casual, quick service, sandwiches, salads, lighter fare).\n`;
      prompt += `DO NOT recommend fine dining or heavy dinner establishments.\n\n`;
    } else if (requestType === 'dinner_dining') {
      prompt += `The guest wants DINNER restaurants (full-service dining, evening atmosphere, entrees).\n`;
      prompt += `DO NOT recommend quick lunch spots or fast-casual chains.\n\n`;
    } else if (requestType === 'activities') {
      prompt += `The guest wants ACTIVITIES and ATTRACTIONS (museums, parks, tours, scenic spots, things to DO).\n`;
      prompt += `DO NOT recommend restaurants or dining establishments. They want experiences, not food.\n\n`;
    }
    
    prompt += `Previous incorrect response:\n${previousResponse}\n\n`;
    prompt += `Provide DIFFERENT recommendations that match the request type.\n`;
    prompt += `Use exact GPS distance from ${propertyAddress}.`;
    
    console.log(`🔄 Retrying ${requestType} with correction prompt`);
    return prompt;
  }

  // PHASE 1: Enhanced categorization with specific meal types
  private categorizeRequest(message: string): string {
    const lowerMessage = message.toLowerCase();
    
    // PHASE 1: Detect specific meal types first
    if (lowerMessage.includes('breakfast') || lowerMessage.includes('morning meal') || lowerMessage.includes('breakfast spot')) {
      console.log('🍳 Categorized as breakfast_restaurant');
      return 'breakfast_restaurant';
    }
    
    if (lowerMessage.includes('coffee') || lowerMessage.includes('café') || lowerMessage.includes('cafe') || lowerMessage.includes('espresso')) {
      console.log('☕ Categorized as coffee_shop');
      return 'coffee_shop';
    }
    
    if (lowerMessage.includes('lunch') || lowerMessage.includes('midday meal')) {
      console.log('🥗 Categorized as lunch_dining');
      return 'lunch_dining';
    }
    
    if (lowerMessage.includes('dinner') || lowerMessage.includes('evening meal') || lowerMessage.includes('supper')) {
      console.log('🍽️ Categorized as dinner_dining');
      return 'dinner_dining';
    }
    
    // Enhanced food detection keywords for general food requests
    const foodKeywords = [
      'food', 'restaurant', 'eat', 'dining', 'hungry', 'meal',
      'burger', 'burgers', 'pizza', 'seafood', 'italian', 'mexican', 'chinese', 'steak',
      'bite', 'grab something', 'quick', 'casual', 'upscale', 'fancy', 'rooftop',
      'what\'s good', 'where to eat', 'spot', 'place to eat', 'good food',
      'let\'s do', 'give me', 'local', 'options', 'recommendations', 'yeah give me',
      'give me local', 'local options', 'other options', 'something else'
    ];
    
    // Check for food-related terms
    if (foodKeywords.some(keyword => lowerMessage.includes(keyword))) {
      console.log('🍴 Categorized as food_recommendations (general)');
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
