
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
      console.log("Is paused:", conversation.conversation_context?.is_paused || false);
      console.log("Guest name:", conversation.conversation_context?.guest_name);
      console.log("Name request made:", conversation.conversation_context?.name_request_made);

      // Always use enhanced service for confirmed guests
      if (conversation.conversation_state === 'confirmed') {
        console.log("🔍 Processing confirmed guest inquiry:");
        console.log("- Guest name:", conversation.conversation_context?.guest_name);
        console.log("- Message:", messageBody.toLowerCase());
        console.log("- Name request made:", conversation.conversation_context?.name_request_made);

        // Check if we have a name, if not, try to get one
        const nameCheckResult = NameHandler.checkIfNameProvided(messageBody, conversation.conversation_context?.guest_name);
        console.log("🏷️ Name check result:", nameCheckResult);

        const nameRefusal = NameHandler.detectNameRefusal(messageBody);
        console.log("🚫 Name refusal detected:", nameRefusal);
        console.log("🚫 Name refusal:", nameRefusal);

        // If we have a name or user refuses to give name, process the request
        if (nameCheckResult.hasName || nameRefusal || conversation.conversation_context?.name_request_made) {
          // First, try to get answer from property data
          const property = await propertyService.getPropertyInfo(conversation.property_id);
          const propertyResponse = propertyService.checkPropertyDataForQuery(property, messageBody);
          
          if (propertyResponse) {
            console.log("✅ Found answer in property data");
            
            // Add personalized greeting if we have a name
            const guestName = nameCheckResult.extractedName || conversation.conversation_context?.guest_name;
            let response = propertyResponse;
            
            if (guestName && !propertyResponse.toLowerCase().includes(guestName.toLowerCase())) {
              response = `Here you go, ${guestName}!\n\n${propertyResponse}\n\nAnything else?`;
            }

            // Update conversation context if new name was extracted
            if (nameCheckResult.extractedName && !conversation.conversation_context?.guest_name) {
              await conversationManager.updateConversationState(phoneNumber, {
                conversation_context: {
                  ...conversation.conversation_context,
                  guest_name: nameCheckResult.extractedName,
                  name_request_made: true
                }
              });
            }

            return new Response(JSON.stringify({
              messages: [response],
              shouldUpdateState: false
            }), {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
          }

          // If no property data answer found, use enhanced service for OpenAI
          const result = await enhancedService.processMessage(phoneNumber, messageBody);
          console.log("✅ Enhanced processing result:", result);
          
          return new Response(JSON.stringify(result), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }

        // If no name and no refusal, ask for name but remember the original request
        if (!nameCheckResult.hasName && !nameRefusal && !conversation.conversation_context?.name_request_made) {
          console.log("🏷️ Requesting name and storing original request");
          
          await conversationManager.updateConversationState(phoneNumber, {
            conversation_context: {
              ...conversation.conversation_context,
              name_request_made: true,
              pending_request: messageBody, // Store the original request
              conversation_depth: (conversation.conversation_context?.conversation_depth || 0) + 1
            }
          });

          return new Response(JSON.stringify({
            messages: ["Hi! I'm happy to help 🙂 Before we dive in, what's your name so I can assist you more personally?"],
            shouldUpdateState: true
          }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }
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

console.log("Enhanced SMS Conversation Service is ready with improved name capture, better recommendations from local sources, and fixed typo correction");
