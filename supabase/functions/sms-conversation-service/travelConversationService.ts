
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
    
    // Basic validation for city, state format or ZIP code
    const cityStateRegex = /^[a-zA-Z\s]+,\s*[A-Z]{2}$/i;
    const zipRegex = /^\d{5}$/;
    
    return cityStateRegex.test(message.trim()) || zipRegex.test(message.trim());
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
    
    // Simple geocoding logic - in production you'd use Google Maps API or similar
    const cityStateRegex = /^([^,]+),?\s*([A-Z]{2})\s*(\d{5})?$/i;
    const zipRegex = /^\d{5}$/;
    
    let city, state, zip;
    
    if (zipRegex.test(locationString.trim())) {
      // ZIP code only - for demo purposes, return a mock location
      zip = locationString.trim();
      city = 'Unknown City';
      state = 'XX';
    } else {
      const match = locationString.match(cityStateRegex);
      if (match) {
        city = match[1].trim();
        state = match[2].toUpperCase();
        zip = match[3] || null;
      } else {
        return null; // Unable to parse
      }
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

    // Create new location (with mock coordinates for demo)
    const { data: newLocation, error } = await this.supabase
      .from('locations')
      .insert({
        city,
        state,
        zip,
        lat: 33.7490, // Mock Atlanta coordinates
        lon: -84.3880
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
    let nextStep = conversation.step;

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
          console.log('🌍 Updating conversation with location_id:', location.id);
          
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
        
        // Get recommendations based on preferences
        const recs = await this.getRecommendations(conversation.location_id!, messageBody);
        response = recs + "\n\nSound good? Want more hidden-gem coffee spots or maybe a scenic hike?";
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
        
        // Handle ongoing assistance
        const assistRecs = await this.getRecommendations(conversation.location_id!, messageBody);
        response = assistRecs + "\n\nAnything else you'd like to explore?";
        break;

      default:
        console.log('🌍 Default case - asking for location');
        response = "Hi there! 🌎 Where will you be exploring?\nJust drop a city & state or ZIP code.";
        nextStep = 'ASK_LOCATION';
    }

    // Store AI response
    await this.addTravelMessage(conversation.id, 'ai', response);

    console.log('🌍 Travel service response:', response);
    return [response];
  }

  private async getRecommendations(locationId: string, query: string): Promise<string> {
    // Try to get curated links first
    const curatedLinks = await this.getCuratedLinks(locationId);
    
    if (curatedLinks.length > 0) {
      // Return top 3 curated recommendations
      const topLinks = curatedLinks.slice(0, 3);
      return topLinks.map(link => 
        `**${link.title}**: ${link.description || 'Great local spot!'}`
      ).join('\n\n');
    }

    // Fallback to generic recommendations
    const keywords = query.toLowerCase();
    if (keywords.includes('food') || keywords.includes('eat') || keywords.includes('restaurant')) {
      return "**Local Favorite Diner** (0.8 mi, ⭐4.6): Classic comfort food with a twist—try the bourbon burger.\n\n**Artisan Coffee House** (0.5 mi, ⭐4.8): Third-wave coffee with house-made pastries. Get the lavender latte.\n\n**Farm-to-Table Bistro** (1.2 mi, ⭐4.7): Seasonal menu with local ingredients—the chef's tasting menu is worth it.";
    } else if (keywords.includes('outdoor') || keywords.includes('hike') || keywords.includes('nature')) {
      return "**Riverside Trail** (3 mi, free): Easy 2-mile loop with scenic views—perfect for morning walks.\n\n**City Park** (1.5 mi, free): 50-acre green space with playground and duck pond—great for families.\n\n**Lookout Point** (8 mi, $5 parking): Moderate hike with panoramic city views—best at sunset.";
    } else {
      return "**Downtown Arts District** (2 mi): Gallery walk with local artists—first Friday is special.\n\n**Historic Main Street** (1 mi): Charming shops and cafes in restored buildings.\n\n**Farmers Market** (0.7 mi): Saturday mornings for fresh produce and local crafts.";
    }
  }
}
