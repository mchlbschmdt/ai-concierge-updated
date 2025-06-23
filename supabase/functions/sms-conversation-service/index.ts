
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { corsHeaders } from './corsHeaders.ts';
import { ConversationManager } from './conversationManager.ts';
import { PropertyService } from './propertyService.ts';
import { FuzzyMatchingService } from './fuzzyMatchingService.ts';
import { EnhancedConversationService } from './enhancedConversationService.ts';
import { TravelConversationService } from './travelConversationService.ts';
import { NameHandler } from './nameHandler.ts';

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

      // Check if this is a travel keyword to switch to travel mode
      if (isTravelKeyword(messageBody)) {
        console.log("🌍 Travel keyword detected - switching to travel guide mode");
        
        const travelMessages = await travelService.processMessage(phoneNumber, messageBody);
        console.log("✅ Travel guide processing result:", travelMessages);
        
        return new Response(JSON.stringify({
          messages: travelMessages,
          conversationalResponse: true,
          intent: 'travel_guide_start'
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // Check if we have an existing travel conversation
      const existingTravelConversation = await travelService.getOrCreateTravelConversation(phoneNumber);
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

      // Continue with property-based conversation flow
      const conversation = await conversationManager.getOrCreateConversation(phoneNumber);
      console.log("Current state:", conversation.conversation_state);

      // For confirmed guests, always use enhanced service
      if (conversation.conversation_state === 'confirmed') {
        console.log("🔍 Processing confirmed guest with enhanced service V2.1");
        
        const result = await enhancedService.processMessage(phoneNumber, messageBody);
        console.log("✅ Enhanced processing result V2.1:", result);
        
        return new Response(JSON.stringify(result), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // For non-confirmed states, use enhanced processing
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
