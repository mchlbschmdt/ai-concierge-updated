
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
const GOOGLE_PLACES_API_KEY = Deno.env.get('GOOGLE_PLACES_API_KEY');
const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY');

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(SUPABASE_URL!, SUPABASE_ANON_KEY!);
    const { phoneNumber, location, query, propertyId } = await req.json();

    console.log('📍 Contextual recommendation request:', { phoneNumber, location, query, propertyId });

    // Get conversation and property data
    const conversation = await getConversation(supabase, phoneNumber);
    const property = await getProperty(supabase, propertyId || conversation?.property_id);
    
    if (!conversation || !property) {
      return new Response(
        JSON.stringify({ 
          error: !conversation ? 'Conversation not found' : 'Property not found' 
        }),
        {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Extract time context
    const timeContext = getTimeContext();
    
    // Process location - either from request, or use property location as fallback
    const searchLocation = location || property.address;

    // Get nearby places using Google Places API
    const nearbyPlaces = await getNearbyPlaces(
      searchLocation,
      query || 'restaurant', // Default to restaurants if query type not specified
      conversation.guest_profile
    );

    // Generate AI response with places data and contextual information
    const aiResponse = await generateAIRecommendation(
      conversation,
      property,
      nearbyPlaces,
      timeContext,
      query
    );

    // Update conversation with new context
    await updateConversationContext(supabase, conversation, query, nearbyPlaces);

    return new Response(
      JSON.stringify({ 
        recommendation: aiResponse,
        places: nearbyPlaces.slice(0, 3) // Return top 3 places for reference
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('❌ Error in contextual-recommendations function:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});

async function getConversation(supabase: any, phoneNumber: string) {
  const { data, error } = await supabase
    .from('sms_conversations')
    .select('*')
    .eq('phone_number', phoneNumber)
    .maybeSingle();
  
  if (error) console.error('Error fetching conversation:', error);
  return data;
}

async function getProperty(supabase: any, propertyId: string) {
  if (!propertyId) return null;
  
  const { data, error } = await supabase
    .from('properties')
    .select('*')
    .eq('id', propertyId)
    .maybeSingle();
  
  if (error) console.error('Error fetching property:', error);
  return data;
}

function getTimeContext() {
  const now = new Date();
  const hour = now.getHours();
  const day = now.getDay();
  const isWeekend = day === 0 || day === 6;
  
  let timeOfDay;
  if (hour >= 5 && hour < 12) timeOfDay = 'morning';
  else if (hour >= 12 && hour < 17) timeOfDay = 'afternoon';
  else if (hour >= 17 && hour < 22) timeOfDay = 'evening';
  else timeOfDay = 'night';
  
  return {
    timeOfDay,
    isWeekend,
    dayOfWeek: now.toLocaleDateString('en-US', { weekday: 'long' }),
    hourOfDay: hour
  };
}

async function getNearbyPlaces(location: string, query: string, guestProfile: any) {
  if (!GOOGLE_PLACES_API_KEY) {
    console.warn('⚠️ GOOGLE_PLACES_API_KEY not set - using mock data');
    return getMockPlaces(query);
  }
  
  try {
    // Normalize query based on type
    let searchQuery = query;
    if (query.includes('coffee')) searchQuery = 'coffee shop';
    else if (query.includes('drink') || query.includes('bar')) searchQuery = 'bar';
    else if (query.includes('eat') || query.includes('food')) searchQuery = 'restaurant';
    else if (query.includes('beach')) searchQuery = 'beach';
    
    // Encode address for URL
    const encodedLocation = encodeURIComponent(location);
    const encodedQuery = encodeURIComponent(searchQuery);
    
    const apiUrl = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodedQuery}+near+${encodedLocation}&key=${GOOGLE_PLACES_API_KEY}`;
    
    const response = await fetch(apiUrl);
    if (!response.ok) {
      throw new Error(`Google Places API error: ${response.status}`);
    }
    
    const data = await response.json();
    
    if (!data.results || data.results.length === 0) {
      return getMockPlaces(query);
    }
    
    // Filter and format places
    return data.results
      .filter((place: any) => place.rating >= 4.0)
      .slice(0, 5)
      .map((place: any) => ({
        name: place.name,
        address: place.formatted_address,
        rating: place.rating,
        totalRatings: place.user_ratings_total || 0,
        types: place.types,
        priceLevel: place.price_level,
        distance: '~0.5 mi' // Google Text Search doesn't include distance
      }));
      
  } catch (error) {
    console.error('❌ Error fetching places:', error);
    // Fall back to mock data if API fails
    return getMockPlaces(query);
  }
}

function getMockPlaces(query: string) {
  // Return mock data based on query type
  const mockData: Record<string, Array<any>> = {
    restaurant: [
      {name: 'Ocean Bistro', rating: 4.7, totalRatings: 235, distance: '0.3 mi', priceLevel: 3},
      {name: 'Coastal Kitchen', rating: 4.5, totalRatings: 187, distance: '0.6 mi', priceLevel: 2},
      {name: 'Island Grill', rating: 4.3, totalRatings: 310, distance: '0.8 mi', priceLevel: 2}
    ],
    bar: [
      {name: 'Sunset Bar', rating: 4.8, totalRatings: 412, distance: '0.4 mi', priceLevel: 3},
      {name: 'The Wave Lounge', rating: 4.6, totalRatings: 278, distance: '0.7 mi', priceLevel: 3},
      {name: 'Beachside Brews', rating: 4.4, totalRatings: 195, distance: '0.9 mi', priceLevel: 2}
    ],
    coffee: [
      {name: 'Sunrise Coffee', rating: 4.7, totalRatings: 324, distance: '0.2 mi', priceLevel: 2},
      {name: 'Beach Brew', rating: 4.5, totalRatings: 187, distance: '0.5 mi', priceLevel: 2},
      {name: 'Island Coffee Co', rating: 4.3, totalRatings: 142, distance: '0.7 mi', priceLevel: 1}
    ],
    beach: [
      {name: 'Coral Beach', rating: 4.8, totalRatings: 521, distance: '0.3 mi', priceLevel: undefined},
      {name: 'Sunset Cove', rating: 4.7, totalRatings: 478, distance: '0.8 mi', priceLevel: undefined},
      {name: 'Palm Beach', rating: 4.5, totalRatings: 356, distance: '1.2 mi', priceLevel: undefined}
    ]
  };
  
  // Default to restaurants if no matching category
  let category = 'restaurant';
  if (query.includes('coffee')) category = 'coffee';
  else if (query.includes('drink') || query.includes('bar')) category = 'bar';
  else if (query.includes('beach')) category = 'beach';
  
  return mockData[category] || mockData.restaurant;
}

async function updateConversationContext(supabase: any, conversation: any, query: string, places: any[]) {
  try {
    // Determine activity type from query
    let activityType = 'general';
    if (query.includes('restaurant') || query.includes('eat') || query.includes('food')) {
      activityType = 'restaurant';
    } else if (query.includes('coffee') || query.includes('cafe')) {
      activityType = 'coffee';
    } else if (query.includes('bar') || query.includes('drink')) {
      activityType = 'drinks';
    } else if (query.includes('beach')) {
      activityType = 'beach';
    }
    
    // Build updated guest profile
    const updatedProfile = {
      ...conversation.guest_profile,
      interests: [...(conversation.guest_profile?.interests || []), activityType].slice(-5),
      lastAskedAbout: activityType,
      lastAskedTime: new Date().toISOString()
    };
    
    // Add places to location context
    const locationContext = {
      ...conversation.location_context,
      recentPlaces: places.slice(0, 3).map((place) => ({
        name: place.name,
        rating: place.rating,
        type: activityType
      }))
    };
    
    // Update database
    await supabase
      .from('sms_conversations')
      .update({
        guest_profile: updatedProfile,
        location_context: locationContext,
        last_activity_type: activityType,
        updated_at: new Date().toISOString()
      })
      .eq('id', conversation.id);
      
  } catch (error) {
    console.error('Error updating conversation context:', error);
  }
}

async function generateAIRecommendation(
  conversation: any, 
  property: any, 
  places: any[],
  timeContext: any,
  query: string
) {
  if (!OPENAI_API_KEY) {
    console.warn('⚠️ OPENAI_API_KEY not set - using basic response format');
    return formatBasicResponse(places, conversation.guest_name);
  }
  
  try {
    const guestContext = {
      guestName: conversation.guest_name,
      previousInterests: conversation.guest_profile?.interests || [],
      lastActivity: conversation.last_activity_type,
      timeOfDay: timeContext.timeOfDay,
      dayOfWeek: timeContext.dayOfWeek,
      isCheckoutSoon: false // Would need check_out_date to determine
    };

    const systemPrompt = `You are a helpful local concierge providing recommendations. 
I will give you pre-vetted, high-quality places that match what the guest is looking for.

RESPONSE RULES:
- Use a friendly, conversational tone
${conversation.guest_name ? `- Address the guest as ${conversation.guest_name}` : ''}
- Consider the time context: ${timeContext.timeOfDay} on ${timeContext.dayOfWeek}
- If it's morning, focus on breakfast/coffee
- If it's evening, focus on dinner/drinks
- ALWAYS include the distances and ratings in your response
- For SMS, keep your response under 160 characters
- Format: "Name (distance, rating★). Brief compelling detail!"
- Only recommend 1-2 places maximum
- Reference their interests naturally: "Since you enjoyed X earlier..."`;

    const prompt = `Here are high-quality places matching the guest's search for "${query}" near ${property.property_name} (${property.address}):

${places.slice(0, 3).map((p, i) => `${i+1}. ${p.name} - ${p.distance}, ${p.rating}★ (${p.totalRatings} reviews), Price level: ${p.priceLevel || 'N/A'}`).join('\n')}

Guest context:
- Name: ${conversation.guest_name || 'Unknown'}
- Last activity: ${conversation.last_activity_type || 'Unknown'}
- Previous interests: ${conversation.guest_profile?.interests?.join(', ') || 'None recorded'}
- Time context: ${timeContext.timeOfDay} on ${timeContext.dayOfWeek} (${timeContext.hourOfDay}:00)

Create a personalized recommendation that's conversational, under 160 characters, and references their context naturally.`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4.1-2025-04-14',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: prompt }
        ],
        max_tokens: 300,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    return data.choices[0].message.content;
  } catch (error) {
    console.error('Error generating AI recommendation:', error);
    // Fall back to basic format
    return formatBasicResponse(places, conversation.guest_name);
  }
}

function formatBasicResponse(places: any[], guestName: string) {
  if (places.length === 0) return "Sorry, I couldn't find any places matching your request.";
  
  const place = places[0];
  let response = '';
  
  if (guestName) {
    response += `${guestName}, `;
  }
  
  response += `${place.name} (${place.distance}, ${place.rating}★). `;
  
  if (places.length > 1) {
    response += `Also try ${places[1].name} (${places[1].distance}, ${places[1].rating}★).`;
  } else {
    response += `Rated top spot in the area with ${place.totalRatings} reviews!`;
  }
  
  return response.length > 160 ? response.substring(0, 157) + '...' : response;
}
