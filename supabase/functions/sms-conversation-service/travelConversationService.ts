
import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';

export interface TravelConversation {
  id: string;
  phone_number: string;
  name?: string;
  location_id?: string;
  location_json?: any;
  preferences_json?: any;
  step: string;
  created_at: string;
  updated_at: string;
}

export interface TravelMessage {
  id: string;
  conversation_id: string;
  role: 'user' | 'ai';
  body: string;
  intent_tag?: string;
  created_at: string;
}

export class TravelConversationService {
  constructor(private supabase: SupabaseClient) {}

  private isTravelKeyword(message: string): boolean {
    const normalizedMessage = message.trim().toLowerCase();
    const travelKeywords = [
      'travel',
      'travel guide',
      'travel help', 
      'local guide'
    ];
    
    return travelKeywords.some(keyword => normalizedMessage === keyword);
  }

  private isValidLocationInput(message: string): boolean {
    if (this.isTravelKeyword(message)) {
      return false;
    }
    
    const cityStateRegex = /^[a-zA-Z\s]+,\s*[A-Z]{2}$/i;
    const zipRegex = /^\d{5}(-\d{4})?$/;
    const cityOnlyRegex = /^[a-zA-Z\s]{2,50}$/;
    
    const trimmed = message.trim();
    return cityStateRegex.test(trimmed) || zipRegex.test(trimmed) || cityOnlyRegex.test(trimmed);
  }

  private isValidNameInput(message: string): boolean {
    if (this.isTravelKeyword(message)) {
      return false;
    }
    
    const trimmed = message.trim();
    return trimmed.length >= 2 && trimmed.length <= 50 && /[a-zA-Z]/.test(trimmed);
  }

  async getExistingTravelConversation(phoneNumber: string): Promise<TravelConversation | null> {
    console.log('Checking for existing travel conversation for:', phoneNumber);
    
    const { data: existing, error } = await this.supabase
      .from('travel_conversations')
      .select('*')
      .eq('phone_number', phoneNumber)
      .maybeSingle();

    if (error) {
      console.error('Error fetching travel conversation:', error);
      return null;
    }

    return existing;
  }

  async clearCorruptedTravelData(phoneNumber: string): Promise<void> {
    console.log('🧹 Clearing corrupted travel data for:', phoneNumber);
    
    try {
      const { error } = await this.supabase
        .from('travel_conversations')
        .delete()
        .eq('phone_number', phoneNumber);
      
      if (error) {
        console.error('Error clearing corrupted travel data:', error);
      } else {
        console.log('✅ Successfully cleared corrupted travel data');
      }
    } catch (error) {
      console.error('Error in clearCorruptedTravelData:', error);
    }
  }

  async getOrCreateTravelConversation(phoneNumber: string, forceReset: boolean = false): Promise<TravelConversation> {
    console.log('Getting or creating travel conversation for:', phoneNumber, 'forceReset:', forceReset);
    
    const existing = await this.getExistingTravelConversation(phoneNumber);
    
    if (existing && !forceReset) {
      const hasCorruptedData = (
        this.isTravelKeyword(existing.name || '') ||
        (existing.location_json && this.isTravelKeyword(existing.location_json.city || '')) ||
        (existing.preferences_json && this.isTravelKeyword(existing.preferences_json.vibe || ''))
      );
      
      if (hasCorruptedData) {
        console.log('🚨 Detected corrupted travel data, clearing and resetting...');
        await this.clearCorruptedTravelData(phoneNumber);
      } else {
        console.log('Found existing clean travel conversation:', existing);
        return existing;
      }
    }

    console.log('Creating/resetting travel conversation to initial state');
    
    const { data: conversationId, error: rpcError } = await this.supabase.rpc('rpc_upsert_travel_conversation', {
      _phone_number: phoneNumber,
      _name: null,
      _location_id: null,
      _location_json: null,
      _preferences_json: null,
      _step: 'ASK_LOCATION'
    });

    if (rpcError) {
      console.error('Error calling rpc_upsert_travel_conversation:', rpcError);
      throw rpcError;
    }

    if (!conversationId) {
      throw new Error('Failed to create travel conversation');
    }

    const { data: newConversation, error: fetchError } = await this.supabase
      .from('travel_conversations')
      .select('*')
      .eq('id', conversationId)
      .single();

    if (fetchError) {
      throw fetchError;
    }

    console.log('Created/reset travel conversation:', newConversation);
    return newConversation;
  }

  async updateTravelConversation(
    phoneNumber: string, 
    updates: Partial<Pick<TravelConversation, 'name' | 'location_id' | 'location_json' | 'preferences_json' | 'step'>>
  ): Promise<TravelConversation> {
    console.log('Updating travel conversation for:', phoneNumber, 'with updates:', updates);

    const { data: conversationId, error: rpcError } = await this.supabase.rpc('rpc_upsert_travel_conversation', {
      _phone_number: phoneNumber,
      _name: updates.name || null,
      _location_id: updates.location_id || null,
      _location_json: updates.location_json || null,
      _preferences_json: updates.preferences_json || null,
      _step: updates.step || null
    });

    if (rpcError) {
      console.error('Error calling rpc_upsert_travel_conversation:', rpcError);
      throw rpcError;
    }

    const { data, error } = await this.supabase
      .from('travel_conversations')
      .select('*')
      .eq('id', conversationId)
      .single();

    if (error) {
      throw error;
    }

    return data;
  }

  async addTravelMessage(conversationId: string, role: 'user' | 'ai', body: string, intentTag?: string): Promise<void> {
    const { error } = await this.supabase
      .from('travel_messages')
      .insert({
        conversation_id: conversationId,
        role,
        body,
        intent_tag: intentTag
      });

    if (error) {
      console.error('Error storing travel message:', error);
      throw error;
    }
  }

  async geocodeLocation(locationString: string): Promise<any> {
    console.log('Geocoding location:', locationString);
    
    if (!this.isValidLocationInput(locationString)) {
      console.log('Invalid location input, rejecting:', locationString);
      return null;
    }
    
    const trimmed = locationString.trim();
    
    const cityStateRegex = /^([^,]+),?\s*([A-Z]{2})\s*(\d{5})?$/i;
    const zipRegex = /^(\d{5})(-\d{4})?$/;
    const cityOnlyRegex = /^[a-zA-Z\s]{2,50}$/;
    
    let city, state, zip;
    
    if (zipRegex.test(trimmed)) {
      zip = trimmed.split('-')[0];
      const zipToCityMap: Record<string, {city: string, state: string}> = {
        '53147': { city: 'Lake Geneva', state: 'WI' },
        '53140': { city: 'Kenosha', state: 'WI' },
        '53150': { city: 'Caledonia', state: 'WI' },
        '53158': { city: 'Sturtevant', state: 'WI' },
        '53142': { city: 'Kenosha', state: 'WI' },
        '53144': { city: 'Kenosha', state: 'WI' },
        '53143': { city: 'Kenosha', state: 'WI' },
        '53141': { city: 'Kenosha', state: 'WI' },
        '53149': { city: 'Lake Geneva', state: 'WI' },
        '53125': { city: 'Mukwonago', state: 'WI' },
        '53148': { city: 'Walworth', state: 'WI' }
      };
      
      const locationData = zipToCityMap[zip];
      if (locationData) {
        city = locationData.city;
        state = locationData.state;
      } else {
        console.log(`Unknown ZIP code: ${zip}, using generic location`);
        city = 'Unknown City';
        state = 'WI';
      }
    } else if (cityStateRegex.test(trimmed)) {
      const match = trimmed.match(cityStateRegex);
      if (match) {
        city = match[1].trim();
        state = match[2].toUpperCase();
        zip = match[3] || null;
      }
    } else if (cityOnlyRegex.test(trimmed)) {
      city = trimmed;
      state = 'WI';
      zip = null;
    } else {
      return null;
    }

    // Check if location already exists
    const { data: existing } = await this.supabase
      .from('locations')
      .select('*')
      .eq('city', city)
      .eq('state', state)
      .maybeSingle();

    if (existing) {
      return existing;
    }

    // Create new location with coordinates
    const cityCoordinates: Record<string, {lat: number, lon: number}> = {
      'Lake Geneva': { lat: 42.5917, lon: -88.4334 },
      'Kenosha': { lat: 42.5847, lon: -87.8212 },
      'Milwaukee': { lat: 43.0389, lon: -87.9065 },
      'Madison': { lat: 43.0731, lon: -89.4012 },
      'Green Bay': { lat: 44.5133, lon: -88.0133 }
    };

    const coords = cityCoordinates[city] || { lat: 43.0389, lon: -87.9065 };

    const { data: newLocation, error } = await this.supabase
      .from('locations')
      .insert({
        city,
        state,
        zip,
        lat: coords.lat,
        lon: coords.lon
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating location:', error);
      return null;
    }

    return newLocation;
  }

  async getCuratedLinks(locationId: string, categories?: string[]): Promise<any[]> {
    const { data, error } = await this.supabase.rpc('rpc_get_curated_links', {
      _location_id: locationId,
      _categories: categories
    });

    if (error) {
      console.error('Error fetching curated links:', error);
      return [];
    }

    return data || [];
  }

  async getOpenAIRecommendations(location: any, query: string, userName?: string): Promise<string> {
    console.log('🤖 Getting OpenAI recommendations for location:', location?.city, 'query:', query);
    
    try {
      const locationContext = location ? `${location.city}, ${location.state}` : 'the area';
      const namePrefix = userName ? `${userName}, ` : '';
      
      // Build enhanced prompt for OpenAI
      const prompt = `You are Locale, a knowledgeable local travel guide. A traveler named ${userName || 'someone'} is visiting ${locationContext} and asking about: ${query}

Please provide 3 specific, actionable recommendations with:
- Names and brief descriptions (1-2 sentences each)
- Why each recommendation is special or worth visiting
- Approximate distance/travel time from ${locationContext} if relevant

Keep the response conversational and under 160 characters per recommendation. End with a helpful follow-up question to narrow down their interests further.

Focus on authentic local experiences, not tourist traps. Be warm and personal as if you're a local friend giving advice.`;

      console.log('🤖 Calling OpenAI recommendations function');
      const response = await fetch('https://zutwyyepahbbvrcbsbke.supabase.co/functions/v1/openai-recommendations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`
        },
        body: JSON.stringify({ prompt })
      });

      console.log('🤖 OpenAI response status:', response.status);

      if (response.ok) {
        const data = await response.json();
        console.log('✅ OpenAI recommendations received successfully');
        
        // Store successful recommendations for future use
        if (location?.id) {
          this.storeRecommendationForFuture(location.id, query, data.recommendation);
        }
        
        return data.recommendation;
      } else {
        const errorText = await response.text();
        console.error('❌ OpenAI API call failed:', response.status, errorText);
        throw new Error(`OpenAI API call failed: ${response.status}`);
      }
    } catch (error) {
      console.error('❌ Error getting OpenAI recommendations:', error);
      return "I'm having trouble getting recommendations right now. Please try again in a moment or ask me about something else!";
    }
  }

  private async storeRecommendationForFuture(locationId: string, query: string, recommendation: string): Promise<void> {
    try {
      // Extract potential places from the recommendation to store as curated links
      // This is a simple implementation - could be enhanced with better parsing
      const lines = recommendation.split('\n').filter(line => line.includes('**'));
      
      for (const line of lines) {
        const titleMatch = line.match(/\*\*([^*]+)\*\*/);
        if (titleMatch) {
          const title = titleMatch[1];
          const description = line.replace(/\*\*[^*]+\*\*:?\s*/, '').trim();
          
          // Determine category based on query
          let category = 'general';
          if (query.toLowerCase().includes('food') || query.toLowerCase().includes('restaurant')) {
            category = 'food';
          } else if (query.toLowerCase().includes('lake') || query.toLowerCase().includes('outdoor')) {
            category = 'outdoor';
          } else if (query.toLowerCase().includes('entertainment') || query.toLowerCase().includes('activity')) {
            category = 'entertainment';
          }
          
          // Store as curated link for future use
          await this.supabase
            .from('curated_links')
            .insert({
              location_id: locationId,
              category,
              title,
              description,
              weight: 5 // Lower weight for AI-generated content
            })
            .select()
            .maybeSingle();
        }
      }
    } catch (error) {
      console.error('Error storing recommendation for future:', error);
    }
  }

  async processMessage(phoneNumber: string, messageBody: string): Promise<string[]> {
    console.log('🌍 Travel service processing message for:', phoneNumber, 'message:', messageBody);
    
    const conversation = await this.getOrCreateTravelConversation(phoneNumber);
    
    await this.addTravelMessage(conversation.id, 'user', messageBody);

    let response: string;

    switch (conversation.step) {
      case 'ASK_LOCATION':
        console.log('🌍 Processing location step');
        
        if (this.isTravelKeyword(messageBody)) {
          response = "Hi there! 🌎 Where will you be exploring?\nJust drop a city & state or ZIP code.";
          break;
        }
        
        const location = await this.geocodeLocation(messageBody);
        if (location) {
          console.log('🌍 Location found:', location);
          
          await this.updateTravelConversation(phoneNumber, {
            location_id: location.id,
            location_json: location,
            step: 'ASK_NAME'
          });
          response = `Got it—${location.city}, ${location.state}.\nI'm Locale, your on-demand local guide. What's your name?`;
        } else {
          response = `I'm not sure I caught that location. Could you try again with city & state (like "Atlanta, GA") or a ZIP code?`;
        }
        break;

      case 'ASK_NAME':
        console.log('🌍 Processing name step');
        
        if (this.isTravelKeyword(messageBody)) {
          response = "What's your name so I can personalize your recommendations?";
          break;
        }
        
        if (!this.isValidNameInput(messageBody)) {
          response = "What's your name so I can personalize your recommendations?";
          break;
        }
        
        const name = messageBody.trim();
        await this.updateTravelConversation(phoneNumber, {
          name,
          step: 'ASK_PREFS'
        });
        response = `Awesome, ${name}! 🎉\nTo tailor suggestions, what's today's vibe—food, outdoor fun, culture, nightlife, family-friendly?\n(Feel free to mention any cravings or must-avoids.)`;
        break;

      case 'ASK_PREFS':
        console.log('🌍 Processing preferences step');
        
        if (this.isTravelKeyword(messageBody)) {
          response = "What kind of experience are you looking for today?";
          break;
        }
        
        const preferences = { vibe: messageBody.toLowerCase() };
        await this.updateTravelConversation(phoneNumber, {
          preferences_json: preferences,
          step: 'ASSIST'
        });
        
        // Get recommendations - try curated first, then OpenAI
        const recs = await this.getLocationBasedRecommendations(conversation.location_json, messageBody, conversation.name);
        response = recs + "\n\nSound good? Want more specific recommendations or have other questions?";
        break;

      case 'ASSIST':
        console.log('🌍 Processing assistance step');
        
        if (this.isTravelKeyword(messageBody)) {
          await this.getOrCreateTravelConversation(phoneNumber, true);
          response = "Hi there! 🌎 Where will you be exploring?\nJust drop a city & state or ZIP code.";
          break;
        }
        
        // Handle ongoing assistance with smart follow-up questions
        const assistRecs = await this.getLocationBasedRecommendations(conversation.location_json, messageBody, conversation.name);
        response = assistRecs + "\n\n" + this.generateFollowUpQuestion(messageBody);
        break;

      default:
        console.log('🌍 Default case - asking for location');
        response = "Hi there! 🌎 Where will you be exploring?\nJust drop a city & state or ZIP code.";
    }

    await this.addTravelMessage(conversation.id, 'ai', response);

    console.log('🌍 Travel service response:', response);
    return [response];
  }

  private async getLocationBasedRecommendations(location: any, query: string, userName?: string): Promise<string> {
    if (!location) {
      return "I need to know your location first to give you the best recommendations!";
    }

    console.log(`🌍 Getting recommendations for ${location.city}, ${location.state} with query: ${query}`);
    
    // First try to get curated links from database
    const curatedLinks = await this.getCuratedLinks(location.id);
    
    if (curatedLinks.length > 0) {
      const relevantLinks = this.filterLinksByQuery(curatedLinks, query);
      if (relevantLinks.length > 0) {
        console.log('📚 Using curated database recommendations');
        const namePrefix = userName ? `${userName}, ` : '';
        return namePrefix + relevantLinks.slice(0, 3).map(link => 
          `**${link.title}**: ${link.description || 'Great local spot!'}`
        ).join('\n\n');
      }
    }

    // If no relevant curated content, use OpenAI
    console.log('🤖 No relevant curated content found, using OpenAI');
    return await this.getOpenAIRecommendations(location, query, userName);
  }

  private filterLinksByQuery(links: any[], query: string): any[] {
    const queryLower = query.toLowerCase();
    
    const categoryKeywords = {
      food: ['food', 'eat', 'restaurant', 'dining', 'meal', 'hungry', 'cuisine', 'drink', 'bar'],
      outdoor: ['outdoor', 'nature', 'hike', 'park', 'lake', 'beach', 'trail', 'fishing', 'swim'],
      entertainment: ['culture', 'museum', 'art', 'history', 'gallery', 'theater', 'entertainment', 'activity'],
      nightlife: ['bar', 'drink', 'nightlife', 'club', 'entertainment'],
      shopping: ['shop', 'store', 'mall', 'retail', 'buy']
    };

    const scoredLinks = links.map(link => {
      let score = 0;
      const linkText = `${link.title} ${link.description || ''} ${link.category || ''}`.toLowerCase();
      
      for (const [category, keywords] of Object.entries(categoryKeywords)) {
        if (keywords.some(keyword => queryLower.includes(keyword))) {
          if (linkText.includes(category) || keywords.some(keyword => linkText.includes(keyword))) {
            score += 10;
          }
        }
      }
      
      if (link.category && queryLower.includes(link.category.toLowerCase())) {
        score += 5;
      }
      
      return { ...link, score };
    });

    return scoredLinks.filter(link => link.score > 0).sort((a, b) => b.score - a.score);
  }

  private generateFollowUpQuestion(query: string): string {
    const queryLower = query.toLowerCase();
    
    if (queryLower.includes('food') || queryLower.includes('restaurant') || queryLower.includes('eat')) {
      return "What type of cuisine interests you most? Or are you looking for casual vs. fine dining?";
    } else if (queryLower.includes('lake') || queryLower.includes('water')) {
      return "Are you interested in swimming, fishing, boating, or just scenic lake views?";
    } else if (queryLower.includes('outdoor') || queryLower.includes('activity')) {
      return "Do you prefer active adventures or more relaxing outdoor experiences?";
    } else if (queryLower.includes('shopping') || queryLower.includes('store')) {
      return "Are you looking for unique local shops, outlet malls, or specific types of stores?";
    } else if (queryLower.includes('family') || queryLower.includes('kid')) {
      return "What ages are the kids? That helps me suggest the perfect family activities!";
    }
    
    return "Want to narrow it down? I can suggest specific types of places or activities that match your interests!";
  }
}
