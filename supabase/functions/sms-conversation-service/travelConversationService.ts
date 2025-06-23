
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
    // Don't process travel keywords as location data
    if (this.isTravelKeyword(message)) {
      return false;
    }
    
    // Enhanced validation for city, state format or ZIP code
    const cityStateRegex = /^[a-zA-Z\s]+,\s*[A-Z]{2}$/i;
    const zipRegex = /^\d{5}(-\d{4})?$/;
    const cityOnlyRegex = /^[a-zA-Z\s]{2,50}$/;
    
    const trimmed = message.trim();
    return cityStateRegex.test(trimmed) || zipRegex.test(trimmed) || cityOnlyRegex.test(trimmed);
  }

  private isValidNameInput(message: string): boolean {
    // Don't process travel keywords as name data
    if (this.isTravelKeyword(message)) {
      return false;
    }
    
    // Basic validation for name (should be reasonable length and contain letters)
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
      // Delete the corrupted conversation entirely
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
    
    // Check if existing conversation has corrupted data (travel keywords stored as actual data)
    if (existing && !forceReset) {
      const hasCorruptedData = (
        this.isTravelKeyword(existing.name || '') ||
        (existing.location_json && this.isTravelKeyword(existing.location_json.city || '')) ||
        (existing.preferences_json && this.isTravelKeyword(existing.preferences_json.vibe || ''))
      );
      
      if (hasCorruptedData) {
        console.log('🚨 Detected corrupted travel data, clearing and resetting...');
        await this.clearCorruptedTravelData(phoneNumber);
        // Continue to create fresh conversation below
      } else {
        console.log('Found existing clean travel conversation:', existing);
        return existing;
      }
    }

    // If forceReset is true, corrupted data detected, or no existing conversation, create/reset to initial state
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
    
    // Validate input before processing
    if (!this.isValidLocationInput(locationString)) {
      console.log('Invalid location input, rejecting:', locationString);
      return null;
    }
    
    const trimmed = locationString.trim();
    
    // Enhanced geocoding logic with real ZIP code handling
    const cityStateRegex = /^([^,]+),?\s*([A-Z]{2})\s*(\d{5})?$/i;
    const zipRegex = /^(\d{5})(-\d{4})?$/;
    const cityOnlyRegex = /^[a-zA-Z\s]{2,50}$/;
    
    let city, state, zip;
    
    if (zipRegex.test(trimmed)) {
      // ZIP code - use a basic ZIP to city mapping for common Wisconsin ZIP codes
      zip = trimmed.split('-')[0]; // Get 5-digit ZIP
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
        // For unknown ZIP codes, try to infer from area code
        console.log(`Unknown ZIP code: ${zip}, using generic location`);
        city = 'Unknown City';
        state = 'WI'; // Default to Wisconsin for now
      }
    } else if (cityStateRegex.test(trimmed)) {
      const match = trimmed.match(cityStateRegex);
      if (match) {
        city = match[1].trim();
        state = match[2].toUpperCase();
        zip = match[3] || null;
      }
    } else if (cityOnlyRegex.test(trimmed)) {
      // Just city name provided
      city = trimmed;
      state = 'WI'; // Default to Wisconsin
      zip = null;
    } else {
      return null; // Unable to parse
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

    // Create new location with more accurate coordinates based on city
    const cityCoordinates: Record<string, {lat: number, lon: number}> = {
      'Lake Geneva': { lat: 42.5917, lon: -88.4334 },
      'Kenosha': { lat: 42.5847, lon: -87.8212 },
      'Milwaukee': { lat: 43.0389, lon: -87.9065 },
      'Madison': { lat: 43.0731, lon: -89.4012 },
      'Green Bay': { lat: 44.5133, lon: -88.0133 }
    };

    const coords = cityCoordinates[city] || { lat: 43.0389, lon: -87.9065 }; // Default to Milwaukee area

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

  async processMessage(phoneNumber: string, messageBody: string): Promise<string[]> {
    console.log('🌍 Travel service processing message for:', phoneNumber, 'message:', messageBody);
    
    const conversation = await this.getOrCreateTravelConversation(phoneNumber);
    
    // Store user message
    await this.addTravelMessage(conversation.id, 'user', messageBody);

    let response: string;

    switch (conversation.step) {
      case 'ASK_LOCATION':
        console.log('🌍 Processing location step');
        
        // Validate that this isn't a travel keyword being processed as location
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
        
        // Validate that this isn't a travel keyword being processed as name
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
        
        // Validate that this isn't a travel keyword being processed as preferences
        if (this.isTravelKeyword(messageBody)) {
          response = "What kind of experience are you looking for today?";
          break;
        }
        
        const preferences = { vibe: messageBody.toLowerCase() };
        await this.updateTravelConversation(phoneNumber, {
          preferences_json: preferences,
          step: 'ASSIST'
        });
        
        // Get recommendations based on preferences and location
        const recs = await this.getLocationBasedRecommendations(conversation.location_json, messageBody);
        response = recs + "\n\nSound good? Want more specific recommendations or have other questions?";
        break;

      case 'ASSIST':
        console.log('🌍 Processing assistance step');
        
        // Check if user wants to restart with travel keyword
        if (this.isTravelKeyword(messageBody)) {
          // Reset to initial state
          await this.getOrCreateTravelConversation(phoneNumber, true);
          response = "Hi there! 🌎 Where will you be exploring?\nJust drop a city & state or ZIP code.";
          break;
        }
        
        // Handle ongoing assistance with contextual recommendations
        const assistRecs = await this.getLocationBasedRecommendations(conversation.location_json, messageBody);
        response = assistRecs + "\n\nAnything else you'd like to explore?";
        break;

      default:
        console.log('🌍 Default case - asking for location');
        response = "Hi there! 🌎 Where will you be exploring?\nJust drop a city & state or ZIP code.";
    }

    // Store AI response
    await this.addTravelMessage(conversation.id, 'ai', response);

    console.log('🌍 Travel service response:', response);
    return [response];
  }

  private async getLocationBasedRecommendations(location: any, query: string): Promise<string> {
    if (!location) {
      return "I need to know your location first to give you the best recommendations!";
    }

    const city = location.city;
    const state = location.state;
    const locationContext = `${city}, ${state}`;
    
    console.log(`🌍 Getting recommendations for ${locationContext} with query: ${query}`);
    
    // Try to get curated links first
    const curatedLinks = await this.getCuratedLinks(location.id);
    
    if (curatedLinks.length > 0) {
      // Filter curated links based on query if possible
      const relevantLinks = this.filterLinksByQuery(curatedLinks, query);
      if (relevantLinks.length > 0) {
        return relevantLinks.slice(0, 3).map(link => 
          `**${link.title}**: ${link.description || 'Great local spot!'}`
        ).join('\n\n');
      }
    }

    // Generate location-specific recommendations based on query
    return this.generateLocationSpecificRecommendations(city, state, query);
  }

  private filterLinksByQuery(links: any[], query: string): any[] {
    const queryLower = query.toLowerCase();
    
    // Define keywords for different categories
    const categoryKeywords = {
      food: ['food', 'eat', 'restaurant', 'dining', 'meal', 'hungry', 'cuisine'],
      outdoor: ['outdoor', 'nature', 'hike', 'park', 'lake', 'beach', 'trail', 'fishing', 'swim'],
      culture: ['culture', 'museum', 'art', 'history', 'gallery', 'theater'],
      nightlife: ['bar', 'drink', 'nightlife', 'club', 'entertainment'],
      shopping: ['shop', 'store', 'mall', 'retail', 'buy']
    };

    // Score links based on query relevance
    const scoredLinks = links.map(link => {
      let score = 0;
      const linkText = `${link.title} ${link.description || ''} ${link.category || ''}`.toLowerCase();
      
      // Check for direct keyword matches
      for (const [category, keywords] of Object.entries(categoryKeywords)) {
        if (keywords.some(keyword => queryLower.includes(keyword))) {
          if (linkText.includes(category) || keywords.some(keyword => linkText.includes(keyword))) {
            score += 10;
          }
        }
      }
      
      // Check for category match
      if (link.category && queryLower.includes(link.category.toLowerCase())) {
        score += 5;
      }
      
      return { ...link, score };
    });

    // Return links with score > 0, sorted by score
    return scoredLinks.filter(link => link.score > 0).sort((a, b) => b.score - a.score);
  }

  private generateLocationSpecificRecommendations(city: string, state: string, query: string): string {
    const queryLower = query.toLowerCase();
    const locationName = `${city}, ${state}`;
    
    // Location-specific recommendations based on actual places
    const locationRecommendations: Record<string, any> = {
      'Lake Geneva': {
        lakes: [
          "**Lake Geneva**: Beautiful clear lake perfect for swimming, boating, and fishing. Public beach access downtown.",
          "**Delavan Lake**: Smaller lake just 15 minutes away, great for quiet fishing and kayaking.",
          "**Como Lake**: Hidden gem for peaceful nature walks and bird watching."
        ],
        food: [
          "**Sprecher's Restaurant & Pub**: Local brewery with great burgers and craft beer overlooking the lake.",
          "**Simple Cafe**: Farm-to-table breakfast and lunch spot with amazing pancakes.",
          "**Pier 290**: Upscale dining right on the lake with fresh seafood and steaks."
        ],
        outdoor: [
          "**Geneva Lake Shore Path**: 21-mile walking path around the entire lake with stunning views.",
          "**Big Foot Beach State Park**: Swimming, hiking trails, and picnic areas on Lake Geneva.",
          "**Lake Geneva Canopy Tours**: Zip-lining adventure through the treetops."
        ]
      },
      'Kenosha': {
        lakes: [
          "**Lake Michigan**: Stunning Great Lakes shoreline with Kenosha Harbor and marina.",
          "**Paddock Lake**: Small lake perfect for fishing and quiet reflection.",
          "**Powers Lake**: Great for kayaking and has a nice walking trail around it."
        ],
        food: [
          "**The Spot Drive-In**: Classic 1950s drive-in with amazing burgers and shakes.",
          "**Sazzy B**: Upscale American cuisine in historic downtown Kenosha.",
          "**Tenuta's Italian Restaurant**: Family-owned since 1950, famous for their deli and Italian dishes."
        ],
        outdoor: [
          "**Kenosha HarborMarket**: Seasonal farmers market right by the lake.",
          "**Simmons Island Park**: Beach, lighthouse, and great views of Lake Michigan.",
          "**Petrifying Springs Park**: 360 acres with trails, golf, and fishing pond."
        ]
      }
    };

    // Check if we have specific recommendations for this location
    const locationRecs = locationRecommendations[city];
    
    if (locationRecs) {
      // Determine what type of recommendations to show based on query
      if (queryLower.includes('lake') || queryLower.includes('water') || queryLower.includes('swim') || queryLower.includes('fish')) {
        return locationRecs.lakes?.slice(0, 3).join('\n\n') || this.getFallbackRecommendations(locationName, 'lakes');
      } else if (queryLower.includes('food') || queryLower.includes('eat') || queryLower.includes('restaurant') || queryLower.includes('dining')) {
        return locationRecs.food?.slice(0, 3).join('\n\n') || this.getFallbackRecommendations(locationName, 'food');
      } else if (queryLower.includes('outdoor') || queryLower.includes('nature') || queryLower.includes('hike') || queryLower.includes('park')) {
        return locationRecs.outdoor?.slice(0, 3).join('\n\n') || this.getFallbackRecommendations(locationName, 'outdoor');
      }
    }
    
    // Default to mixed recommendations for the location
    if (locationRecs) {
      const mixed = [
        ...(locationRecs.food?.slice(0, 1) || []),
        ...(locationRecs.outdoor?.slice(0, 1) || []),
        ...(locationRecs.lakes?.slice(0, 1) || [])
      ];
      if (mixed.length > 0) {
        return mixed.join('\n\n');
      }
    }
    
    // Fallback for unknown locations
    return this.getFallbackRecommendations(locationName, this.categorizeQuery(query));
  }

  private getFallbackRecommendations(locationName: string, category: string): string {
    const fallbacks: Record<string, string[]> = {
      lakes: [
        `**Local Lakes**: Check out the nearest lakes and waterways around ${locationName} for swimming and fishing.`,
        `**Water Activities**: Look for boat rentals and fishing spots in the ${locationName} area.`,
        `**Beaches**: Search for public beaches and waterfront parks near ${locationName}.`
      ],
      food: [
        `**Local Diners**: Try the classic American diners and family restaurants in ${locationName}.`,
        `**Farm-to-Table**: Look for restaurants featuring local Wisconsin ingredients.`,
        `**Breweries**: Wisconsin has great local breweries - check what's available in ${locationName}.`
      ],
      outdoor: [
        `**Local Parks**: Explore the parks and nature preserves around ${locationName}.`,
        `**Walking Trails**: Look for hiking and walking trails in the ${locationName} area.`,
        `**State Parks**: Check for Wisconsin State Parks near ${locationName}.`
      ]
    };

    return fallbacks[category]?.slice(0, 3).join('\n\n') || 
           `I'd recommend exploring the local attractions and outdoor spaces around ${locationName}. Check with local visitor centers for current recommendations!`;
  }

  private categorizeQuery(query: string): string {
    const queryLower = query.toLowerCase();
    
    if (queryLower.includes('lake') || queryLower.includes('water') || queryLower.includes('swim') || queryLower.includes('fish')) {
      return 'lakes';
    } else if (queryLower.includes('food') || queryLower.includes('eat') || queryLower.includes('restaurant')) {
      return 'food';
    } else if (queryLower.includes('outdoor') || queryLower.includes('nature') || queryLower.includes('hike')) {
      return 'outdoor';
    }
    
    return 'general';
  }
}
