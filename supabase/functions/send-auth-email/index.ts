
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface AuthEmailRequest {
  to: string;
  subject: string;
  type: 'reset_password' | 'confirm_signup' | 'magic_link';
  token?: string;
  confirmationUrl?: string;
  resetUrl?: string;
  magicLinkUrl?: string;
}

const handler = async (req: Request): Promise<Response> => {
  console.log("Auth email function called");
  
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
    const { to, subject, type, token, confirmationUrl, resetUrl, magicLinkUrl }: AuthEmailRequest = await req.json();
    
    console.log(`Sending ${type} email to:`, to);
    console.log("Email send initiated at:", new Date().toISOString());

    let html = "";
    
    switch (type) {
      case 'reset_password':
        html = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h1 style="color: #333; text-align: center;">Reset Your Password</h1>
            <p style="color: #666; font-size: 16px;">Hi there!</p>
            <p style="color: #666; font-size: 16px;">
              You recently requested to reset your password for your Hostly AI Concierge account. 
              Click the button below to reset it.
            </p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${resetUrl}" 
                 style="background-color: #2563eb; color: white; padding: 12px 24px; 
                        text-decoration: none; border-radius: 5px; font-weight: bold; 
                        display: inline-block;">
                Reset Password
              </a>
            </div>
            <p style="color: #666; font-size: 14px;">
              If you didn't request this password reset, you can safely ignore this email.
              This link will expire in 1 hour for security reasons.
            </p>
            <p style="color: #666; font-size: 14px;">
              If the button doesn't work, copy and paste this link into your browser:<br>
              <a href="${resetUrl}" style="color: #2563eb; word-break: break-all;">${resetUrl}</a>
            </p>
            <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
            <p style="color: #999; font-size: 12px; text-align: center;">
              This email was sent by Hostly AI Concierge
            </p>
          </div>
        `;
        break;
        
      case 'confirm_signup':
        html = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h1 style="color: #333; text-align: center;">Welcome to Hostly AI Concierge!</h1>
            <p style="color: #666; font-size: 16px;">Hi there!</p>
            <p style="color: #666; font-size: 16px;">
              Thank you for signing up for Hostly AI Concierge! 
              Please confirm your email address by clicking the button below.
            </p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${confirmationUrl}" 
                 style="background-color: #16a34a; color: white; padding: 12px 24px; 
                        text-decoration: none; border-radius: 5px; font-weight: bold; 
                        display: inline-block;">
                Confirm Email
              </a>
            </div>
            <p style="color: #666; font-size: 14px;">
              Once confirmed, you'll be able to access all features of Hostly AI Concierge.
            </p>
            <p style="color: #666; font-size: 14px;">
              If the button doesn't work, copy and paste this link into your browser:<br>
              <a href="${confirmationUrl}" style="color: #16a34a; word-break: break-all;">${confirmationUrl}</a>
            </p>
            <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
            <p style="color: #999; font-size: 12px; text-align: center;">
              This email was sent by Hostly AI Concierge
            </p>
          </div>
        `;
        break;
        
      case 'magic_link':
        html = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h1 style="color: #333; text-align: center;">Your Magic Login Link</h1>
            <p style="color: #666; font-size: 16px;">Hi there!</p>
            <p style="color: #666; font-size: 16px;">
              Click the button below to sign in to your Hostly AI Concierge account.
            </p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${magicLinkUrl}" 
                 style="background-color: #7c3aed; color: white; padding: 12px 24px; 
                        text-decoration: none; border-radius: 5px; font-weight: bold; 
                        display: inline-block;">
                Sign In
              </a>
            </div>
            <p style="color: #666; font-size: 14px;">
              If you didn't request this login link, you can safely ignore this email.
              This link will expire in 1 hour for security reasons.
            </p>
            <p style="color: #666; font-size: 14px;">
              If the button doesn't work, copy and paste this link into your browser:<br>
              <a href="${magicLinkUrl}" style="color: #7c3aed; word-break: break-all;">${magicLinkUrl}</a>
            </p>
            <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
            <p style="color: #999; font-size: 12px; text-align: center;">
              This email was sent by Hostly AI Concierge
            </p>
          </div>
        `;
        break;
        
      default:
        throw new Error(`Unknown email type: ${type}`);
    }

    // Use Resend's default domain that's already verified
    const emailConfig = {
      from: "Hostly AI Concierge <noreply@resend.dev>",
      to: [to],
      subject: subject,
      html: html,
      headers: {
        'X-Priority': '1',
        'X-MSMail-Priority': 'High',
        'Importance': 'high',
        'X-Mailer': 'Hostly AI Concierge',
        'Reply-To': 'noreply@resend.dev'
      },
      tags: [
        { name: 'category', value: 'auth' },
        { name: 'type', value: type }
      ]
    };

    console.log("Sending email with config:", {
      from: emailConfig.from,
      to: emailConfig.to,
      subject: emailConfig.subject,
      type: type,
      timestamp: new Date().toISOString()
    });

    const emailResponse = await resend.emails.send(emailConfig);

    if (emailResponse.error) {
      console.error("Resend API error:", emailResponse.error);
      throw new Error(`Email sending failed: ${emailResponse.error.message}`);
    }

    console.log("Email sent successfully:", {
      messageId: emailResponse.data?.id,
      timestamp: new Date().toISOString(),
      status: 'sent'
    });

    return new Response(JSON.stringify({ 
      success: true, 
      messageId: emailResponse.data?.id,
      sentAt: new Date().toISOString(),
      type: type,
      status: 'sent'
    }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
    
  } catch (error: any) {
    console.error("Error sending auth email:", {
      error: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString()
    });
    
    return new Response(JSON.stringify({ 
      error: error.message,
      success: false,
      timestamp: new Date().toISOString()
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
