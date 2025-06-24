import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { corsHeaders } from './corsHeaders.ts';
import { EnhancedConversationService } from './enhancedConversationService.ts';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

console.log('Enhanced SMS Conversation Service starting up - Version 2.2 with Travel Guide...');

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('=== Enhanced SMS Conversation Service Request - Version 2.2 ===');
    console.log('Method:', req.method);

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const conversationService = new EnhancedConversationService(supabase);

    if (req.method === 'POST') {
      const body = await req.json();
      console.log('Enhanced SMS Service V2.2 - Action:', body.action);

      // Handle force memory clear for testing
      if (body.action === 'forceResetMemory' && body.phoneNumber) {
        console.log('🧹 FORCE RESET MEMORY REQUEST for:', body.phoneNumber);
        
        const { data, error } = await supabase
          .from('sms_conversations')
          .update({
            conversation_context: {},
            last_recommendations: null,
            last_message_type: null,
            preferences: {},
            updated_at: new Date().toISOString(),
            last_interaction_timestamp: new Date().toISOString()
          })
          .eq('phone_number', body.phoneNumber)
          .select()
          .single();

        if (error) {
          console.error('❌ Error force clearing memory:', error);
          return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }

        console.log('✅ Memory force cleared successfully for:', body.phoneNumber);
        return new Response(JSON.stringify({ success: true, data }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // Handle getOrCreateConversation action
      if (body.action === 'getOrCreateConversation' && body.phoneNumber) {
        const conversation = await conversationService.processMessage(body.phoneNumber, 'get_conversation');
        return new Response(JSON.stringify(conversation), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // Handle processMessage action
      if (body.action === 'processMessage' && body.phoneNumber && body.message) {
        const result = await conversationService.processMessage(body.phoneNumber, body.message);
        console.log('✅ Enhanced processing result V2.2:', result);
        
        return new Response(JSON.stringify(result), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      return new Response(JSON.stringify({ error: 'Invalid action or missing required parameters' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Enhanced SMS Service V2.2 Error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});

console.log('Enhanced SMS Conversation Service V2.2 is ready with Travel Guide integration, improved reset messages, property confirmation, and name collection');
