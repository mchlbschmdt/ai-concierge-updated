import { useState, useEffect } from "react";
import { useNavigate, useSearchParams, useLocation } from "react-router-dom";
import { supabase } from "../integrations/supabase/client";
import { useToast } from "../components/ui/use-toast";

export default function ResetPassword() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [validToken, setValidToken] = useState(false);
  const [checkingToken, setCheckingToken] = useState(true);
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    const checkTokenValidity = async () => {
      console.log("Full URL:", window.location.href);
      console.log("Search params:", searchParams.toString());
      console.log("Hash:", window.location.hash);
      
      // Parse tokens from both query params and hash fragments
      let accessToken = searchParams.get('access_token');
      let refreshToken = searchParams.get('refresh_token');
      let tokenHash = searchParams.get('token_hash');
      let type = searchParams.get('type');
      
      // Check hash fragments if query params are empty
      if (!accessToken && !tokenHash && window.location.hash) {
        const hashParams = new URLSearchParams(window.location.hash.substring(1));
        accessToken = hashParams.get('access_token');
        refreshToken = hashParams.get('refresh_token');
        tokenHash = hashParams.get('token_hash');
        type = hashParams.get('type');
        
        console.log("Hash params:", {
          accessToken: !!accessToken,
          refreshToken: !!refreshToken,
          tokenHash: !!tokenHash,
          type
        });
      }
      
      console.log("Parsed tokens:", { 
        accessToken: !!accessToken, 
        refreshToken: !!refreshToken, 
        tokenHash: !!tokenHash, 
        type 
      });
      
      // Handle different token formats
      if (tokenHash && type === 'recovery') {
        try {
          // For token_hash format, we need to verify the session differently
          console.log("Using token_hash verification");
          
          const { data, error } = await supabase.auth.verifyOtp({
            token_hash: tokenHash,
            type: 'recovery'
          });

          if (error) {
            console.error("Token hash verification error:", error);
            toast({
              variant: "destructive",
              title: "Invalid reset link",
              description: "This password reset link is invalid or has expired. Please request a new one."
            });
            setValidToken(false);
          } else {
            console.log("Token hash verification successful");
            setValidToken(true);
          }
        } catch (err) {
          console.error("Token hash validation error:", err);
          setValidToken(false);
        }
      } else if (accessToken && refreshToken && type === 'recovery') {
        try {
          // For access/refresh token format
          console.log("Using access/refresh token verification");
          
          const { data, error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken
          });

          if (error) {
            console.error("Session verification error:", error);
            toast({
              variant: "destructive",
              title: "Invalid reset link",
              description: "This password reset link is invalid or has expired. Please request a new one."
            });
            setValidToken(false);
          } else {
            console.log("Session verification successful");
            setValidToken(true);
          }
        } catch (err) {
          console.error("Session validation error:", err);
          setValidToken(false);
        }
      } else {
        console.log("Missing or invalid tokens for password reset");
        toast({
          variant: "destructive",
          title: "Invalid reset link",
          description: "This password reset link is missing required parameters. Please request a new one."
        });
        setValidToken(false);
      }
      
      setCheckingToken(false);
    };

    checkTokenValidity();
  }, [searchParams, location, toast]);

  const handleResetPassword = async (e) => {
    e.preventDefault();
    
    if (password !== confirmPassword) {
      toast({
        variant: "destructive",
        title: "Passwords don't match",
        description: "Please make sure both passwords are the same."
      });
      return;
    }

    if (password.length < 6) {
      toast({
        variant: "destructive",
        title: "Password too short",
        description: "Password must be at least 6 characters long."
      });
      return;
    }

    setLoading(true);
    
    try {
      const { error } = await supabase.auth.updateUser({
        password: password
      });
      
      if (error) {
        console.error("Password update error:", error);
        throw error;
      }

      toast({
        title: "Password updated successfully",
        description: "You can now sign in with your new password."
      });
      
      // Sign out to clear the recovery session
      await supabase.auth.signOut();
      navigate("/login");
    } catch (err) {
      console.error("Password reset error:", err);
      toast({
        variant: "destructive",
        title: "Password reset failed",
        description: err.message || "An error occurred while updating your password."
      });
    } finally {
      setLoading(false);
    }
  };

  if (checkingToken) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="bg-white p-8 rounded-lg shadow-xl">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="text-center mt-4 text-gray-600">Validating reset link...</p>
        </div>
      </div>
    );
  }

  if (!validToken) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
        <div className="bg-white p-8 rounded-lg shadow-xl w-full max-w-md text-center">
          <div className="mb-6">
            <div className="mx-auto w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Invalid Reset Link</h2>
            <p className="text-gray-600 mb-6">
              This password reset link is invalid or has expired. Please request a new password reset.
            </p>
            <button
              onClick={() => navigate("/login")}
              className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition-colors"
            >
              Back to Login
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex justify-center items-center min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <form onSubmit={handleResetPassword} className="bg-white p-8 rounded-lg shadow-xl w-full max-w-md">
        <div className="text-center mb-6">
          <h2 className="text-3xl font-bold text-gray-900">Set New Password</h2>
          <p className="text-gray-600 mt-2">Enter your new password below</p>
        </div>

        <div className="space-y-4">
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
              New Password
            </label>
            <input
              id="password"
              type="password"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Enter new password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
            />
          </div>

          <div>
            <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-1">
              Confirm New Password
            </label>
            <input
              id="confirmPassword"
              type="password"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Confirm new password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              minLength={6}
            />
          </div>

          <button 
            type="submit" 
            disabled={loading}
            className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? "Updating Password..." : "Update Password"}
          </button>
        </div>
      </form>
    </div>
  );
}
