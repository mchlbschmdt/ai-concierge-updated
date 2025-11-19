
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/context/ToastContext";
import { useGmailAuth } from "@/context/GmailAuthContext";

export default function GoogleAuthCallback() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { updateAuthState } = useGmailAuth();
  const [error, setError] = useState(null);

  useEffect(() => {
    const handleCallback = async () => {
      try {
        // Extract the authorization code from URL
        const urlParams = new URLSearchParams(window.location.search);
        const code = urlParams.get('code');
        const error = urlParams.get('error');
        
        if (error) {
          throw new Error(error);
        }

        if (!code) {
          throw new Error("No authorization code received");
        }
        
        // If we're in a popup window, send the code back to the opener
        if (window.opener) {
          window.opener.postMessage({
            type: 'google-auth',
            code,
          }, window.location.origin);
          
          window.close();
          return;
        }
        
        // If not in a popup, handle the code exchange directly
        const { data: sessionData } = await supabase.auth.getSession();
        const userId = sessionData?.session?.user?.id;
        
        if (!userId) {
          navigate('/login');
          return;
        }
        
        // Call our edge function to exchange code for tokens
        const response = await supabase.functions.invoke("google-auth", {
          body: { code }
        });
        
        if (response.error) {
          throw new Error(response.error.message || 'Failed to authenticate with Google');
        }
        
        const result = response.data;
        
        showToast(`Connected to Gmail as ${result.email}`, "success");
        
        // Update auth state
        updateAuthState(result.email);
        
        // Redirect to dashboard
        navigate('/');
      } catch (err) {
        console.error("Authentication error:", err);
        setError(err.message);
        
        showToast(err.message || "An error occurred during authentication", "error");
        
        // Redirect to dashboard after error
        setTimeout(() => navigate('/'), 3000);
      }
    };
    
    handleCallback();
  }, [navigate, toast, updateAuthState]);

  return (
    <div className="flex items-center justify-center h-screen">
      <div className="text-center">
        <h2 className="text-2xl font-semibold mb-4">
          {error ? "Authentication Failed" : "Authenticating with Google..."}
        </h2>
        
        {error ? (
          <div className="text-red-500 mb-4">{error}</div>
        ) : (
          <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-primary mx-auto"></div>
        )}
        
        {error && (
          <p className="text-gray-600">Redirecting to dashboard in a few seconds...</p>
        )}
      </div>
    </div>
  );
}
