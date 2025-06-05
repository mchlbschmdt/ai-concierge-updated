
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve((req) => {
  console.log(`🔍 minimal-test function called - Method: ${req.method}`)
  
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  return new Response(JSON.stringify({ 
    status: 'ok',
    message: 'Minimal function working',
    timestamp: new Date().toISOString(),
    method: req.method
  }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    status: 200
  })
})
