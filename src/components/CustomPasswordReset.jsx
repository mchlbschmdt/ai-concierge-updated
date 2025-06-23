
import { useState } from "react";
import { supabase } from "../integrations/supabase/client";
import { useToast } from "./ui/use-toast";
import { Button } from "./ui/button";
import EmailDeliveryStatus from "./EmailDeliveryStatus";

export default function CustomPasswordReset({ resetEmail, onEmailSent, onBack }) {
  const [loading, setLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const { toast } = useToast();

  const handlePasswordReset = async () => {
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
      console.log("Sending Supabase password reset email to:", resetEmail);
      console.log("Password reset initiated at:", new Date().toISOString());
      
      // Use the current origin for the redirect URL to ensure it matches Supabase settings
      const redirectTo = `${window.location.origin}/reset-password`;
      console.log("Using redirect URL:", redirectTo);
      
      // Use only Supabase's built-in password reset (no custom email function)
      const { data, error } = await supabase.auth.resetPasswordForEmail(resetEmail, {
        redirectTo: redirectTo
      });
      
      if (error) {
        console.error("Supabase password reset error:", error);
        throw error;
      }

      console.log("Supabase password reset successful:", data);
      
      toast({
        title: "Password reset email sent",
        description: "Check your email for the password reset link. The email will contain the correct tokens to reset your password."
      });

      setEmailSent(true);
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

  const handleResend = async () => {
    await handlePasswordReset();
  };

  if (emailSent) {
    return (
      <div className="space-y-4">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h4 className="font-medium text-blue-900 mb-2">Password Reset Email Sent</h4>
          <p className="text-sm text-blue-700 mb-3">
            A password reset email has been sent to: <strong>{resetEmail}</strong>
          </p>
          <p className="text-sm text-blue-700 mb-3">
            Click the link in the email to reset your password. The link contains the necessary tokens to complete the reset process.
          </p>
          
          <div className="space-y-2">
            <Button
              onClick={handleResend}
              variant="outline"
              size="sm"
              className="w-full"
            >
              Resend Email
            </Button>
          </div>
          
          <div className="mt-3 text-xs text-blue-600">
            <p>💡 <strong>Tips:</strong></p>
            <ul className="list-disc list-inside mt-1 space-y-1">
              <li>Check your spam/junk folder</li>
              <li>Email delivery can take 1-5 minutes</li>
              <li>Make sure you click the link from the same device/browser</li>
              <li>The reset link expires after 1 hour for security</li>
            </ul>
          </div>
        </div>
        
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

  return (
    <div className="space-y-4">
      <Button 
        onClick={handlePasswordReset}
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
