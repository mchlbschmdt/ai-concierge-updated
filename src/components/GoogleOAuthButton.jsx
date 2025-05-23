
import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { useGmailAuth } from "../context/GmailAuthContext";

export default function GoogleOAuthButton() {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const { updateAuthState } = useGmailAuth();

  // Function to handle Google OAuth
  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    try {
      // Get client ID from the environment or use a default for development
      const clientId = "622389255458-bfl9jc9fl8mnd6v83pkoef6a6s6tvl5r.apps.googleusercontent.com";
      const redirectUri = encodeURIComponent(window.location.origin + "/auth/google/callback");
      const scope = encodeURIComponent("openid email profile https://www.googleapis.com/auth/gmail.readonly");
      const responseType = "code";
      const accessType = "offline";
      const prompt = "consent";
      
      // Construct the OAuth URL
      const oauthUrl = `https://accounts.google.com/o/oauth2/auth?client_id=${clientId}&redirect_uri=${redirectUri}&response_type=${responseType}&scope=${scope}&access_type=${accessType}&prompt=${prompt}`;
      
      // Open the OAuth popup
      const width = 600;
      const height = 600;
      const left = window.screenX + (window.outerWidth - width) / 2;
      const top = window.screenY + (window.outerHeight - height) / 2;
      
      const authWindow = window.open(
        oauthUrl,
        'Google Authentication', 
        `width=${width},height=${height},left=${left},top=${top}`
      );
      
      if (!authWindow) {
        toast({
          title: "Popup Blocked",
          description: "Please allow popups for this site to authenticate with Google",
          variant: "destructive"
        });
        setIsLoading(false);
        return;
      }
      
      // Set up message listener for the OAuth callback
      const handleAuthMessage = (event) => {
        if (event.origin !== window.location.origin) return;
        
        if (event.data && event.data.type === 'google-auth') {
          const { code, error } = event.data;
          
          if (code) {
            toast({
              title: "Authentication Successful",
              description: "Successfully authenticated with Google"
            });
            
            // Process token in a real implementation
            console.log("Auth code received:", code);
            
            // For now, we'll mock a successful authentication
            updateAuthState('user@gmail.com');
            
            // In a production app, you would send this code to your server or Supabase Edge Function
            // to exchange for tokens and store them securely
          } else if (error) {
            toast({
              title: "Authentication Failed",
              description: error || "Failed to authenticate with Google",
              variant: "destructive"
            });
          }
          
          window.removeEventListener('message', handleAuthMessage);
          setIsLoading(false);
        }
      };
      
      window.addEventListener('message', handleAuthMessage);
      
      // Fallback if window is closed without completing auth
      const checkWindowClosed = setInterval(() => {
        if (authWindow.closed) {
          clearInterval(checkWindowClosed);
          window.removeEventListener('message', handleAuthMessage);
          setIsLoading(false);
        }
      }, 500);
      
    } catch (error) {
      console.error("Google authentication error:", error);
      toast({
        title: "Authentication Failed",
        description: error.message || "Failed to connect to Google",
        variant: "destructive"
      });
      setIsLoading(false);
    }
  };

  return (
    <Button 
      onClick={handleGoogleSignIn}
      disabled={isLoading}
      className="w-full bg-white text-gray-800 border border-gray-300 hover:bg-gray-100"
    >
      {isLoading ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Connecting...
        </>
      ) : (
        <>
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" className="w-5 h-5 mr-2">
            <path fill="#FFC107" d="M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12c0-6.627,5.373-12,12-12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C12.955,4,4,12.955,4,24c0,11.045,8.955,20,20,20c11.045,0,20-8.955,20-20C44,22.659,43.862,21.35,43.611,20.083z"/>
            <path fill="#FF3D00" d="M6.306,14.691l6.571,4.819C14.655,15.108,18.961,12,24,12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C16.318,4,9.656,8.337,6.306,14.691z"/>
            <path fill="#4CAF50" d="M24,44c5.166,0,9.86-1.977,13.409-5.192l-6.19-5.238C29.211,35.091,26.715,36,24,36c-5.202,0-9.619-3.317-11.283-7.946l-6.522,5.025C9.505,39.556,16.227,44,24,44z"/>
            <path fill="#1976D2" d="M43.611,20.083H42V20H24v8h11.303c-0.792,2.237-2.231,4.166-4.087,5.571c0.001-0.001,0.002-0.001,0.003-0.002l6.19,5.238C36.971,39.205,44,34,44,24C44,22.659,43.862,21.35,43.611,20.083z"/>
          </svg>
          Sign in with Google
        </>
      )}
    </Button>
  );
}
