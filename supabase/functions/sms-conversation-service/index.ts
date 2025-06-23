import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { corsHeaders } from './corsHeaders.ts';
import { ConversationManager } from './conversationManager.ts';
import { PropertyService } from './propertyService.ts';
import { FuzzyMatchingService } from './fuzzyMatchingService.ts';
import { EnhancedConversationService } from './enhancedConversationService.ts';
import { NameHandler } from './nameHandler.ts';

console.log("Enhanced SMS Conversation Service starting up...");

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  console.log("=== Enhanced SMS Conversation Service Request ===");
  console.log("Method:", req.method);

  try {
    const { action, phoneNumber, messageBody } = await req.json();
    console.log("Enhanced SMS Service - Action:", action);

    const conversationManager = new ConversationManager(supabase);
    const propertyService = new PropertyService(supabase);
    const enhancedService = new EnhancedConversationService(supabase);

    if (action === 'processMessage') {
      console.log("=== PROCESSING ENHANCED MESSAGE ===");
      console.log("Phone:", phoneNumber);
      console.log("Message:", messageBody);

      const conversation = await conversationManager.getOrCreateConversation(phoneNumber);
      console.log("Current state:", conversation.conversation_state);

      // For confirmed guests, always use enhanced service
      if (conversation.conversation_state === 'confirmed') {
        console.log("🔍 Processing confirmed guest with enhanced service");
        
        const result = await enhancedService.processMessage(phoneNumber, messageBody);
        console.log("✅ Enhanced processing result:", result);
        
        return new Response(JSON.stringify(result), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // For non-confirmed states, use basic processing
      const result = await enhancedService.processMessage(phoneNumber, messageBody);
      console.log("✅ Basic processing result:", result);
      
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
    console.error('Error in enhanced SMS conversation service:', error);
    return new Response(JSON.stringify({ 
      error: 'Internal server error',
      details: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});

console.log("Enhanced SMS Conversation Service is ready with intent recognition, multi-part handling, and property data prioritization");
