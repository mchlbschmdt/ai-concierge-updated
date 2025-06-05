
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

serve((req) => {
  return new Response(JSON.stringify({ 
    status: 'ok',
    message: 'Minimal function working',
    timestamp: new Date().toISOString()
  }), {
    headers: { 'Content-Type': 'application/json' },
    status: 200
  })
})
