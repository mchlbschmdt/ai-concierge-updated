
import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "./integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";
import GoogleOAuthButton from "./components/GoogleOAuthButton";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [resetLoading, setResetLoading] = useState(false);
  const [resetEmailSent, setResetEmailSent] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleLogin = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");
    
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });
      
      if (error) throw error;

      toast({
        title: "Login successful",
        description: "Welcome back!"
      });
      navigate("/dashboard");
    } catch (err) {
      console.error("Login error:", err);
      setError(err.message || "Failed to sign in");
      toast({
        variant: "destructive",
        title: "Login Failed",
        description: err.message || "Failed to sign in"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = async (e) => {
    e.preventDefault();
    
    if (!resetEmail) {
      toast({
        variant: "destructive",
        title: "Email required",
        description: "Please enter your email address."
      });
      return;
    }

    setResetLoading(true);
    
    try {
      console.log("Sending password reset email to:", resetEmail);
      
      const { data, error } = await supabase.auth.resetPasswordForEmail(resetEmail, {
        redirectTo: `${window.location.origin}/reset-password`
      });
      
      console.log("Password reset response:", { data, error });
      
      if (error) {
        console.error("Password reset error:", error);
        throw error;
      }

      toast({
        title: "Password reset email sent",
        description: "Check your email for the password reset link. If you don't see it, check your spam folder."
      });
      
      setResetEmailSent(true);
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
      setResetLoading(false);
    }
  };

  if (showForgotPassword) {
    if (resetEmailSent) {
      return (
        <div className="flex justify-center items-center min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
          <div className="bg-white p-8 rounded-lg shadow-xl w-full max-w-md text-center">
            <div className="mb-6">
              <div className="mx-auto w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Check Your Email</h2>
              <p className="text-gray-600 mb-6">
                We've sent a password reset link to <strong>{resetEmail}</strong>. 
                Check your email and click the link to reset your password.
              </p>
              <p className="text-sm text-gray-500 mb-6">
                Didn't receive the email? Check your spam folder or try again.
              </p>
            </div>

            <div className="space-y-3">
              <button 
                onClick={() => {
                  setResetEmailSent(false);
                  setResetEmail("");
                }}
                className="w-full text-blue-600 hover:text-blue-700 py-2 border border-blue-600 rounded-md hover:bg-blue-50 transition-colors"
              >
                Try Different Email
              </button>
              <button 
                onClick={() => {
                  setShowForgotPassword(false);
                  setResetEmailSent(false);
                  setResetEmail("");
                }}
                className="w-full text-gray-600 hover:text-gray-700 py-2"
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
        <form onSubmit={handleForgotPassword} className="bg-white p-8 rounded-lg shadow-xl w-full max-w-md">
          <div className="text-center mb-6">
            <h2 className="text-3xl font-bold text-gray-900">Reset Password</h2>
            <p className="text-gray-600 mt-2">Enter your email to receive a reset link</p>
          </div>

          <div className="space-y-4">
            <div>
              <label htmlFor="resetEmail" className="block text-sm font-medium text-gray-700 mb-1">
                Email Address
              </label>
              <input
                id="resetEmail"
                type="email"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter your email"
                value={resetEmail}
                onChange={(e) => setResetEmail(e.target.value)}
                required
              />
            </div>

            <button 
              type="submit" 
              disabled={resetLoading}
              className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {resetLoading ? "Sending..." : "Send Reset Link"}
            </button>

            <button 
              type="button"
              onClick={() => setShowForgotPassword(false)}
              className="w-full text-gray-600 hover:text-gray-700 py-2"
            >
              Back to Login
            </button>
          </div>
        </form>
      </div>
    );
  }

  return (
    <div className="flex justify-center items-center min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <form onSubmit={handleLogin} className="bg-white p-8 rounded-lg shadow-xl w-full max-w-md">
        <div className="text-center mb-6">
          <h2 className="text-3xl font-bold text-gray-900">Welcome Back</h2>
          <p className="text-gray-600 mt-2">Sign in to your account</p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        <div className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
              Email Address
            </label>
            <input
              id="email"
              type="email"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Enter your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
              Password
            </label>
            <input
              id="password"
              type="password"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => setShowForgotPassword(true)}
              className="text-sm text-blue-600 hover:text-blue-700"
            >
              Forgot your password?
            </button>
          </div>

          <button 
            type="submit" 
            disabled={isLoading}
            className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isLoading ? (
              <>
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white inline" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Signing In...
              </>
            ) : "Sign In"}
          </button>
        </div>
        
        <div className="flex items-center my-4">
          <div className="flex-1 border-t border-gray-300"></div>
          <div className="px-3 text-gray-500 text-sm">OR</div>
          <div className="flex-1 border-t border-gray-300"></div>
        </div>
        
        <GoogleOAuthButton />

        <div className="mt-6 text-center">
          <p className="text-sm text-gray-600">
            Don't have an account?{" "}
            <Link to="/register" className="text-blue-600 hover:text-blue-700 font-medium">
              Create one here
            </Link>
          </p>
        </div>
      </form>
    </div>
  );
}
