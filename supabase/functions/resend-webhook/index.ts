
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

// Verify Resend webhook signature using SVix
async function verifyResendSignature(body: string, svixId: string, svixTimestamp: string, svixSignature: string, secret: string): Promise<boolean> {
  try {
    // Resend uses SVix for webhook signatures
    // The signing secret from Resend starts with "whsec_", we need to decode the base64 part
    const secretBytes = Uint8Array.from(atob(secret.replace('whsec_', '')), c => c.charCodeAt(0));
    
    const encoder = new TextEncoder();
    const signedContent = `${svixId}.${svixTimestamp}.${body}`;
    
    const key = await crypto.subtle.importKey(
      'raw',
      secretBytes,
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );
    
    const signatureBytes = await crypto.subtle.sign('HMAC', key, encoder.encode(signedContent));
    const computedSignature = btoa(String.fromCharCode(...new Uint8Array(signatureBytes)));
    
    // SVix sends multiple signatures separated by spaces, each prefixed with "v1,"
    const signatures = svixSignature.split(' ');
    for (const sig of signatures) {
      const sigValue = sig.replace('v1,', '');
      if (sigValue === computedSignature) {
        return true;
      }
    }
    
    console.error('Signature mismatch');
    return false;
  } catch (error) {
    console.error('Signature verification error:', error);
    return false;
  }
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
    const body = await req.text();
    
    // Verify webhook signature
    const webhookSecret = Deno.env.get('RESEND_WEBHOOK_SECRET');
    if (webhookSecret) {
      const svixId = req.headers.get('svix-id');
      const svixTimestamp = req.headers.get('svix-timestamp');
      const svixSignature = req.headers.get('svix-signature');
      
      if (!svixId || !svixTimestamp || !svixSignature) {
        console.error('Missing SVix signature headers');
        return new Response(JSON.stringify({ error: "Missing signature headers" }), {
          status: 401,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        });
      }
      
      // Check timestamp to prevent replay attacks (5 min tolerance)
      const timestampSeconds = parseInt(svixTimestamp);
      const now = Math.floor(Date.now() / 1000);
      if (Math.abs(now - timestampSeconds) > 300) {
        console.error('Webhook timestamp too old or in the future');
        return new Response(JSON.stringify({ error: "Invalid timestamp" }), {
          status: 401,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        });
      }
      
      const isValid = await verifyResendSignature(body, svixId, svixTimestamp, svixSignature, webhookSecret);
      if (!isValid) {
        console.error('Invalid webhook signature');
        return new Response(JSON.stringify({ error: "Invalid signature" }), {
          status: 401,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        });
      }
      
      console.log('✅ Webhook signature verified successfully');
    } else {
      console.warn('⚠️ RESEND_WEBHOOK_SECRET not configured - skipping signature verification');
    }

    const webhookEvent: ResendWebhookEvent = JSON.parse(body);
    
    console.log("Resend webhook event:", {
      type: webhookEvent.type,
      emailId: webhookEvent.data?.id,
      timestamp: webhookEvent.created_at
    });

    // Handle different event types
    switch (webhookEvent.type) {
      case 'email.sent':
        console.log(`Email ${webhookEvent.data.id} was sent`);
        break;
      case 'email.delivered':
        console.log(`Email ${webhookEvent.data.id} was delivered`);
        break;
      case 'email.delivery_delayed':
        console.log(`Email ${webhookEvent.data.id} delivery was delayed`);
        break;
      case 'email.bounced':
        console.log(`Email ${webhookEvent.data.id} bounced`);
        break;
      case 'email.complained':
        console.log(`Email ${webhookEvent.data.id} was marked as spam`);
        break;
      default:
        console.log(`Unknown webhook event type: ${(webhookEvent as any).type}`);
    }

    return new Response(JSON.stringify({ 
      success: true,
      processed: webhookEvent.type 
    }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
    
  } catch (error: any) {
    console.error("Error processing Resend webhook:", error);
    
    return new Response(JSON.stringify({ 
      error: "Internal server error",
      success: false 
    }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
};

serve(handler);
