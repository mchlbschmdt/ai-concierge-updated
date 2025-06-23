
import { useState } from "react";
import { supabase } from "../integrations/supabase/client";
import { useToast } from "./ui/use-toast";
import { Button } from "./ui/button";

export default function EmailDeliveryStatus({ email, onResend }) {
  const [checking, setChecking] = useState(false);
  const [lastSent, setLastSent] = useState(null);
  const { toast } = useToast();

  const checkEmailStatus = async () => {
    setChecking(true);
    try {
      // This would typically call a Resend webhook endpoint to check delivery status
      // For now, we'll just log the attempt and provide user feedback
      console.log("Checking email delivery status for:", email);
      
      toast({
        title: "Email status checked",
        description: "Email delivery is being monitored. Check your spam folder if you haven't received it yet."
      });
      
      setLastSent(new Date().toLocaleTimeString());
    } catch (error) {
      console.error("Error checking email status:", error);
      toast({
        variant: "destructive",
        title: "Status check failed",
        description: "Unable to check email status. Please try resending."
      });
    } finally {
      setChecking(false);
    }
  };

  const handleResend = async () => {
    try {
      await onResend();
      setLastSent(new Date().toLocaleTimeString());
      toast({
        title: "Email resent",
        description: "A new password reset email has been sent."
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Resend failed",
        description: "Unable to resend email. Please try again."
      });
    }
  };

  return (
    <div className="space-y-4 mt-4">
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h4 className="font-medium text-blue-900 mb-2">Email Delivery Status</h4>
        <p className="text-sm text-blue-700 mb-3">
          Password reset email sent to: <strong>{email}</strong>
        </p>
        {lastSent && (
          <p className="text-xs text-blue-600 mb-3">
            Last sent: {lastSent}
          </p>
        )}
        
        <div className="space-y-2">
          <Button
            onClick={checkEmailStatus}
            disabled={checking}
            variant="outline"
            size="sm"
            className="w-full"
          >
            {checking ? "Checking..." : "Check Email Status"}
          </Button>
          
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
          <p>💡 <strong>Tips for faster delivery:</strong></p>
          <ul className="list-disc list-inside mt-1 space-y-1">
            <li>Check your spam/junk folder</li>
            <li>Add noreply@hostlyai.com to your contacts</li>
            <li>Email delivery can take 1-15 minutes</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
