
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { corsHeaders } from './corsHeaders.ts';
import { ConversationManager } from './conversationManager.ts';
import { PropertyService } from './propertyService.ts';
import { FuzzyMatchingService } from './fuzzyMatchingService.ts';
import { EnhancedConversationService } from './enhancedConversationService.ts';
import { TravelConversationService } from './travelConversationService.ts';
import { NameHandler } from './nameHandler.ts';
import { ResetHandler } from './resetHandler.ts';

console.log("Enhanced SMS Conversation Service starting up - Version 2.1 with Travel Guide...");

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Get travel keyword from environment or default to "TRAVEL"
const DEFAULT_TRAVEL_CODE = Deno.env.get('DEFAULT_TRAVEL_CODE') || 'TRAVEL';

function isTravelKeyword(message: string): boolean {
  const normalizedMessage = message.trim().toLowerCase();
  const travelKeywords = [
    DEFAULT_TRAVEL_CODE.toLowerCase(),
    'travel guide',
    'travel help',
    'local guide'
  ];
  
  return travelKeywords.some(keyword => normalizedMessage === keyword);
}

function isResetCommand(message: string): boolean {
  const lowerMessage = message.toLowerCase().trim();
  const resetKeywords = [
    'reset', 'restart', 'start over', 'something else', 'different options',
    'what else', 'other recommendations', 'try again', 'nevermind',
    'change topic', 'something different', 'new suggestions', 'new recommendation',
    'different recommendation', 'other options', 'start fresh', 'clear',
    'different suggestions', 'other places', 'something new'
  ];
  
  // Check for exact word matches using word boundaries
  return resetKeywords.some(keyword => {
    if (keyword.includes(' ')) {
      // Multi-word phrases - check if the entire phrase exists
      return lowerMessage.includes(keyword);
    } else {
      // Single words - use word boundary regex for exact matches
      const wordRegex = new RegExp(`\\b${keyword}\\b`);
      return wordRegex.test(lowerMessage);
    }
  });
}

async function handlePropertyCodeInput(conversationManager: ConversationManager, propertyService: PropertyService, phoneNumber: string, messageBody: string) {
  console.log("🏠 Handling property code input:", messageBody);
  
  // Extract property code from message
  const propertyCode = messageBody.trim().match(/\d+/)?.[0];
  
  if (!propertyCode) {
    console.log("❌ No property code found in message");
    return {
      messages: ["Hi! Please text your property ID number from your booking confirmation. Text 'reset' if needed."],
      conversationalResponse: false,
      intent: 'awaiting_property_code'
    };
  }

  console.log("🔍 Looking up property code:", propertyCode);
  
  try {
    const property = await propertyService.findPropertyByCode(propertyCode);
    
    if (!property) {
      console.log("❌ Property not found for code:", propertyCode);
      return {
        messages: [`Property ID ${propertyCode} not found. Check your booking confirmation or text 'reset'.`],
        conversationalResponse: false,
        intent: 'property_not_found'
      };
    }

    console.log("✅ Property found:", property.property_name);
    
    // Update conversation with property ID and move to confirmation state
    await conversationManager.updateConversationState(phoneNumber, {
      property_id: property.property_id,
      conversation_state: 'awaiting_confirmation'
    });

    const confirmationMessage = `Great! You're staying at ${property.property_name} (${property.address}). Correct? Reply Y or N.`;
    
    return {
      messages: [confirmationMessage],
      conversationalResponse: false,
      intent: 'property_confirmation'
    };
  } catch (error) {
    console.error("❌ Error looking up property:", error);
    return {
      messages: ["Trouble looking up that property ID. Try again or text 'reset'."],
      conversationalResponse: false,
      intent: 'property_lookup_error'
    };
  }
}

async function handlePropertyConfirmation(conversationManager: ConversationManager, propertyService: PropertyService, phoneNumber: string, messageBody: string) {
  console.log("✅ Handling property confirmation:", messageBody);
  
  const normalizedInput = messageBody.toLowerCase().trim();
  const isYes = ['y', 'yes', 'yeah', 'yep', 'correct', 'right', 'true', '1', 'ok', 'okay', 'yup', 'sure', 'absolutely', 'definitely'].includes(normalizedInput);
  const isNo = ['n', 'no', 'nope', 'wrong', 'incorrect', 'false', '0', 'nah', 'negative'].includes(normalizedInput);

  if (isYes) {
    console.log("✅ Property confirmed by user");
    
    // Get property info for timezone
    const conversation = await conversationManager.getExistingConversation(phoneNumber);
    const property = conversation?.property_id ? await propertyService.getPropertyById(conversation.property_id) : null;
    const timezone = guessTimezoneFromAddress(property?.address) || 'UTC';
    
    await conversationManager.updateConversationState(phoneNumber, {
      property_confirmed: true,
      conversation_state: 'confirmed',
      timezone: timezone
    });

    const greeting = getTimeAwareGreeting(timezone);
    const response = `${greeting}! I'm your AI concierge. I can help with WiFi, parking, directions, and local recommendations. What do you need?`;
    
    return {
      messages: [response],
      conversationalResponse: true,
      intent: 'property_confirmed'
    };
  } else if (isNo) {
    console.log("❌ Property not confirmed by user");
    
    await conversationManager.updateConversationState(phoneNumber, {
      property_id: null,
      conversation_state: 'awaiting_property_id'
    });

    return {
      messages: ["No problem! Please provide your correct property ID from your booking confirmation."],
      conversationalResponse: false,
      intent: 'property_rejected'
    };
  } else {
    console.log("❓ Unclear confirmation response");
    
    return {
      messages: ["Please reply Y for Yes or N for No to confirm the property. Text 'reset' to start over."],
      conversationalResponse: false,
      intent: 'unclear_confirmation'
    };
  }
}

function getTimeAwareGreeting(timezone = 'UTC'): string {
  try {
    const now = new Date();
    const localTime = new Date(now.toLocaleString("en-US", {timeZone: timezone}));
    const hour = localTime.getHours();
    
    if (hour >= 5 && hour < 12) return 'Good morning';
    if (hour >= 12 && hour < 17) return 'Good afternoon';
    if (hour >= 17 && hour < 22) return 'Good evening';
    return 'Hello'; // Late night/early morning
  } catch (error) {
    console.error('Error getting time-aware greeting:', error);
    return 'Hello';
  }
}

function guessTimezoneFromAddress(address?: string): string {
  if (!address) return 'UTC';
  
  const addressLower = address.toLowerCase();
  
  // Common timezone mappings based on location keywords
  const timezoneMap: Record<string, string> = {
    'san juan': 'America/Puerto_Rico',
    'puerto rico': 'America/Puerto_Rico',
    'miami': 'America/New_York',
    'new york': 'America/New_York',
    'los angeles': 'America/Los_Angeles',
    'chicago': 'America/Chicago',
    'denver': 'America/Denver',
    'london': 'Europe/London',
    'paris': 'Europe/Paris',
    'tokyo': 'Asia/Tokyo'
  };

  for (const [location, timezone] of Object.entries(timezoneMap)) {
    if (addressLower.includes(location)) {
      return timezone;
    }
  }

  return 'UTC';
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  console.log("=== Enhanced SMS Conversation Service Request - Version 2.1 ===");
  console.log("Method:", req.method);

  try {
    const { action, phoneNumber, messageBody } = await req.json();
    console.log("Enhanced SMS Service V2.1 - Action:", action);

    const conversationManager = new ConversationManager(supabase);
    const propertyService = new PropertyService(supabase);
    const enhancedService = new EnhancedConversationService(supabase);
    const travelService = new TravelConversationService(supabase);

    if (action === 'processMessage') {
      console.log("=== PROCESSING ENHANCED MESSAGE V2.1 ===");
      console.log("Phone:", phoneNumber);
      console.log("Message:", messageBody);

      // PRIORITY 1: Check for reset commands FIRST - before any other processing
      if (isResetCommand(messageBody)) {
        console.log("🔄 Reset command detected - clearing all conversations");
        
        // Check what type of conversation exists to provide appropriate reset response
        const existingTravelConversation = await travelService.getExistingTravelConversation(phoneNumber);
        const existingPropertyConversation = await conversationManager.getExistingConversation(phoneNumber);
        
        // Clear travel conversation if it exists
        if (existingTravelConversation) {
          console.log("🌍 Clearing travel conversation");
          await travelService.clearCorruptedTravelData(phoneNumber);
        }
        
        // Clear property conversation if it exists
        if (existingPropertyConversation) {
          console.log("🏠 Clearing property conversation");
          const resetUpdates = ResetHandler.getCompleteResetUpdates(existingPropertyConversation.conversation_context);
          await conversationManager.updateConversationState(phoneNumber, resetUpdates);
        }
        
        // Return appropriate reset response
        let resetResponse;
        if (existingTravelConversation && !existingPropertyConversation) {
          // Was in travel mode only
          resetResponse = "Hi there! 🌎 I can help you explore places or with property stays. Send 'TRAVEL' for travel guide or your property code for property help.";
        } else if (existingPropertyConversation && !existingTravelConversation) {
          // Was in property mode only
          resetResponse = ResetHandler.generateResetResponse();
        } else if (existingTravelConversation && existingPropertyConversation) {
          // Had both types
          resetResponse = "Hi! I can help with travel recommendations or property stays. Send 'TRAVEL' for travel guide or your property code for property help.";
        } else {
          // No existing conversations
          resetResponse = "Hi! I'm your AI assistant. Send 'TRAVEL' for travel recommendations or your property code for property help.";
        }
        
        console.log("✅ Reset completed - returning fresh start response");
        
        return new Response(JSON.stringify({
          messages: [resetResponse],
          conversationalResponse: true,
          intent: 'conversation_reset'
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // PRIORITY 2: Check if this is a travel keyword to switch to travel mode
      if (isTravelKeyword(messageBody)) {
        console.log("🌍 Travel keyword detected - forcing fresh start");
        
        // Clear any corrupted data and force reset to initial state
        await travelService.clearCorruptedTravelData(phoneNumber);
        const conversation = await travelService.getOrCreateTravelConversation(phoneNumber, true);
        console.log("🌍 Travel conversation reset to initial state:", conversation.id);
        
        // Store the keyword message
        await travelService.addTravelMessage(conversation.id, 'user', messageBody);
        
        // Return initial greeting asking for location
        const initialGreeting = "Hi there! 🌎 Where will you be exploring?\nJust drop a city & state or ZIP code.";
        
        // Store AI response
        await travelService.addTravelMessage(conversation.id, 'ai', initialGreeting);
        
        console.log("✅ Travel guide initialized with fresh start");
        
        return new Response(JSON.stringify({
          messages: [initialGreeting],
          conversationalResponse: true,
          intent: 'travel_guide_start'
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // PRIORITY 3: Check if we have an existing travel conversation that's NOT in the initial state
      const existingTravelConversation = await travelService.getExistingTravelConversation(phoneNumber);
      if (existingTravelConversation && existingTravelConversation.step !== 'ASK_LOCATION') {
        console.log("🌍 Continuing existing travel conversation");
        
        const travelMessages = await travelService.processMessage(phoneNumber, messageBody);
        console.log("✅ Travel guide processing result:", travelMessages);
        
        return new Response(JSON.stringify({
          messages: travelMessages,
          conversationalResponse: true,
          intent: 'travel_guide_continue'
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // PRIORITY 4: Check if we have a travel conversation at ASK_LOCATION step (could be corrupted or fresh)
      if (existingTravelConversation && existingTravelConversation.step === 'ASK_LOCATION') {
        console.log("🌍 Found travel conversation at ASK_LOCATION, processing message");
        
        const travelMessages = await travelService.processMessage(phoneNumber, messageBody);
        console.log("✅ Travel guide processing result:", travelMessages);
        
        return new Response(JSON.stringify({
          messages: travelMessages,
          conversationalResponse: true,
          intent: 'travel_guide_location'
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // PRIORITY 5: Handle property-based conversation flow
      const conversation = await conversationManager.getOrCreateConversation(phoneNumber);
      console.log("Current state:", conversation.conversation_state);

      // NEW: Handle property code input when awaiting property ID
      if (conversation.conversation_state === 'awaiting_property_id') {
        console.log("🏠 Processing property code input");
        const result = await handlePropertyCodeInput(conversationManager, propertyService, phoneNumber, messageBody);
        return new Response(JSON.stringify(result), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // NEW: Handle property confirmation
      if (conversation.conversation_state === 'awaiting_confirmation') {
        console.log("✅ Processing property confirmation");
        const result = await handlePropertyConfirmation(conversationManager, propertyService, phoneNumber, messageBody);
        return new Response(JSON.stringify(result), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // For confirmed guests, always use enhanced service
      if (conversation.conversation_state === 'confirmed') {
        console.log("🔍 Processing confirmed guest with enhanced service V2.1");
        
        const result = await enhancedService.processMessage(phoneNumber, messageBody);
        console.log("✅ Enhanced processing result V2.1:", result);
        
        return new Response(JSON.stringify(result), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // For any other states, use enhanced processing
      const result = await enhancedService.processMessage(phoneNumber, messageBody);
      console.log("✅ Enhanced processing result V2.1:", result);
      
      return new Response(JSON.stringify(result), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });

    } else if (action === 'getOrCreateConversation') {
      const conversation = await conversationManager.getOrCreateConversation(phoneNumber);
      return new Response(JSON.stringify(conversation), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({ error: 'Invalid action' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error in enhanced SMS conversation service V2.1:', error);
    return new Response(JSON.stringify({ 
      error: 'Internal server error',
      details: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});

console.log("Enhanced SMS Conversation Service V2.1 is ready with Travel Guide integration, improved reset messages, property confirmation, and name collection");
