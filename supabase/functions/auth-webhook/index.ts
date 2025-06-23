
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, webhook-signature",
};

interface AuthEvent {
  type: string;
  table: string;
  record: any;
  schema: string;
  old_record?: any;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const payload = await req.json();
    console.log("Auth webhook received:", payload);

    // Handle password recovery events
    if (payload.type === 'INSERT' && payload.table === 'auth.audit_log_entries') {
      const event = payload.record;
      
      if (event.event_name === 'user_recovery_requested') {
        const email = event.traits?.email;
        const token = event.traits?.token;
        const tokenHash = event.traits?.token_hash;
        
        if (email && (token || tokenHash)) {
          console.log("Sending custom password reset email to:", email);
          
          // Construct the reset URL with the actual tokens from Supabase
          const baseUrl = Deno.env.get("SITE_URL") || "http://localhost:3000";
          let resetUrl;
          
          if (tokenHash) {
            resetUrl = `${baseUrl}/reset-password?token_hash=${tokenHash}&type=recovery`;
          } else if (token) {
            resetUrl = `${baseUrl}/reset-password?token=${token}&type=recovery`;
          }
          
          const emailResponse = await resend.emails.send({
            from: "Hostly AI Concierge <noreply@resend.dev>",
            to: [email],
            subject: "Reset Your Password - Hostly AI Concierge",
            html: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 20px; text-align: center;">
                  <h1 style="color: white; margin: 0;">Reset Your Password</h1>
                </div>
                
                <div style="padding: 30px; background-color: #f9f9f9;">
                  <p style="font-size: 16px; line-height: 1.6; color: #333;">
                    Hello,
                  </p>
                  
                  <p style="font-size: 16px; line-height: 1.6; color: #333;">
                    We received a request to reset your password for your Hostly AI Concierge account. 
                    Click the button below to create a new password:
                  </p>
                  
                  <div style="text-align: center; margin: 30px 0;">
                    <a href="${resetUrl}" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">
                      Reset My Password
                    </a>
                  </div>
                  
                  <p style="font-size: 14px; line-height: 1.6; color: #666;">
                    If the button doesn't work, you can copy and paste this link into your browser:
                  </p>
                  <p style="font-size: 14px; word-break: break-all; color: #667eea;">
                    ${resetUrl}
                  </p>
                  
                  <div style="background-color: #e8f4f8; padding: 15px; border-radius: 8px; margin: 20px 0;">
                    <p style="font-size: 14px; margin: 0; color: #333;">
                      <strong>Security Note:</strong> This link will expire in 1 hour for your security. 
                      If you didn't request this password reset, you can safely ignore this email.
                    </p>
                  </div>
                  
                  <p style="font-size: 14px; line-height: 1.6; color: #666;">
                    Best regards,<br>
                    The Hostly AI Concierge Team
                  </p>
                </div>
                
                <div style="background-color: #f0f0f0; padding: 20px; text-align: center; font-size: 12px; color: #666;">
                  <p style="margin: 0;">
                    This email was sent to ${email}. If you have questions, please contact our support team.
                  </p>
                </div>
              </div>
            `,
          });

          console.log("Custom password reset email sent:", emailResponse);
        }
      }
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("Error in auth webhook:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
