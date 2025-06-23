
import { useState } from "react";
import { supabase } from "../integrations/supabase/client";
import { useToast } from "./ui/use-toast";
import { Button } from "./ui/button";

export default function CustomPasswordReset({ resetEmail, onEmailSent, onBack }) {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleCustomPasswordReset = async () => {
    if (!resetEmail) {
      toast({
        variant: "destructive",
        title: "Email required",
        description: "Please enter your email address."
      });
      return;
    }

    setLoading(true);
    
    try {
      console.log("Sending custom password reset email to:", resetEmail);
      
      // First, initiate the password reset with Supabase
      const { data, error } = await supabase.auth.resetPasswordForEmail(resetEmail, {
        redirectTo: `${window.location.origin}/reset-password`
      });
      
      if (error) {
        console.error("Supabase password reset error:", error);
        throw error;
      }

      // Then send our custom email via the edge function
      const resetUrl = `${window.location.origin}/reset-password`;
      
      const { data: emailData, error: emailError } = await supabase.functions.invoke('send-auth-email', {
        body: {
          to: resetEmail,
          subject: "Reset Your Password - Hostly AI Concierge",
          type: 'reset_password',
          resetUrl: resetUrl
        }
      });

      if (emailError) {
        console.error("Custom email error:", emailError);
        // Don't throw here - the Supabase reset still worked
        console.log("Falling back to default Supabase email");
      } else {
        console.log("Custom email sent successfully:", emailData);
      }

      toast({
        title: "Password reset email sent",
        description: "Check your email for the password reset link. If you don't see it, check your spam folder."
      });
      
      onEmailSent();
      
    } catch (err) {
      console.error("Password reset error:", err);
      
      let errorMessage = "Failed to send password reset email.";
      
      if (err.message?.includes("Email not confirmed")) {
        errorMessage = "Please verify your email address first before resetting your password.";
      } else if (err.message?.includes("User not found")) {
        errorMessage = "No account found with this email address.";
      } else if (err.message?.includes("Email rate limit")) {
        errorMessage = "Too many reset attempts. Please wait before trying again.";
      } else if (err.message) {
        errorMessage = err.message;
      }
      
      toast({
        variant: "destructive",
        title: "Password reset failed",
        description: errorMessage
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <Button 
        onClick={handleCustomPasswordReset}
        disabled={loading}
        className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {loading ? "Sending..." : "Send Reset Link"}
      </Button>

      <button 
        type="button"
        onClick={onBack}
        className="w-full text-gray-600 hover:text-gray-700 py-2"
      >
        Back to Login
      </button>
    </div>
  );
}
