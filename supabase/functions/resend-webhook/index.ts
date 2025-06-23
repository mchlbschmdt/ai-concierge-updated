
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ResendWebhookEvent {
  type: 'email.sent' | 'email.delivered' | 'email.delivery_delayed' | 'email.complained' | 'email.bounced';
  created_at: string;
  data: {
    id: string;
    to: string[];
    from: string;
    subject: string;
    created_at: string;
  };
}

const handler = async (req: Request): Promise<Response> => {
  console.log("Resend webhook called");
  
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }

  try {
    const webhookEvent: ResendWebhookEvent = await req.json();
    
    console.log("Resend webhook event:", {
      type: webhookEvent.type,
      emailId: webhookEvent.data.id,
      to: webhookEvent.data.to,
      timestamp: webhookEvent.created_at
    });

    // Handle different event types
    switch (webhookEvent.type) {
      case 'email.sent':
        console.log(`Email ${webhookEvent.data.id} was sent to ${webhookEvent.data.to.join(', ')}`);
        break;
        
      case 'email.delivered':
        console.log(`Email ${webhookEvent.data.id} was delivered to ${webhookEvent.data.to.join(', ')}`);
        break;
        
      case 'email.delivery_delayed':
        console.log(`Email ${webhookEvent.data.id} delivery was delayed for ${webhookEvent.data.to.join(', ')}`);
        break;
        
      case 'email.bounced':
        console.log(`Email ${webhookEvent.data.id} bounced for ${webhookEvent.data.to.join(', ')}`);
        break;
        
      case 'email.complained':
        console.log(`Email ${webhookEvent.data.id} was marked as spam by ${webhookEvent.data.to.join(', ')}`);
        break;
        
      default:
        console.log(`Unknown webhook event type: ${webhookEvent.type}`);
    }

    // Here you could store the delivery status in your database
    // or trigger notifications to users about delivery issues

    return new Response(JSON.stringify({ 
      success: true,
      processed: webhookEvent.type 
    }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
    
  } catch (error: any) {
    console.error("Error processing Resend webhook:", error);
    
    return new Response(JSON.stringify({ 
      error: error.message,
      success: false 
    }), {
      status: 500,
      headers: { 
        "Content-Type": "application/json", 
        ...corsHeaders 
      },
    });
  }
};

serve(handler);
