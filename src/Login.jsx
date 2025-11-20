
import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "./integrations/supabase/client";
import { useToast } from "@/context/ToastContext";
import { loginRateLimiter } from "./utils/inputValidation";
import GoogleOAuthButton from "./components/GoogleOAuthButton";
import CustomPasswordReset from "./components/CustomPasswordReset";
import SecurityQuestionsReset from "./components/SecurityQuestionsReset";
import DirectPasswordReset from "./components/DirectPasswordReset";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [resetEmailSent, setResetEmailSent] = useState(false);
  const [resetMethod, setResetMethod] = useState(null); // 'email' or 'security'
  const [showSecurityQuestions, setShowSecurityQuestions] = useState(false);
  const [showDirectPasswordReset, setShowDirectPasswordReset] = useState(false);
  const [verifiedUserId, setVerifiedUserId] = useState(null);
  const [rememberMe, setRememberMe] = useState(true);
  const navigate = useNavigate();
  const { showToast } = useToast();

  const handleLogin = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");
    
    try {
      // Check rate limiting
      if (!loginRateLimiter.isAllowed(email)) {
        const remainingTime = Math.ceil(loginRateLimiter.getRemainingTime(email) / (1000 * 60));
        throw new Error(`Too many login attempts. Please try again in ${remainingTime} minutes.`);
      }

      // Validate inputs
      if (!email || !password) {
        throw new Error("Email and password are required");
      }

      // Sanitize email
      const sanitizedEmail = email.trim().toLowerCase();

      // Set remember me preference before login
      localStorage.setItem('rememberMe', String(rememberMe));

      const { data, error } = await supabase.auth.signInWithPassword({
        email: sanitizedEmail,
        password
      });
      
      if (error) {
        if (error.message.includes("Invalid login credentials")) {
          throw new Error("Invalid email or password. Please check your credentials and try again.");
        }
        throw error;
      }

      // Check onboarding status
      const { data: profile } = await supabase
        .from('profiles')
        .select('onboarding_completed')
        .eq('id', data.user.id)
        .single();

      showToast("Welcome back!", "success");
      
      // Redirect based on onboarding status
      if (profile && !profile.onboarding_completed) {
        navigate("/onboarding");
      } else {
        navigate("/");
      }
    } catch (err) {
      console.error("Login error:", err);
      setError(err.message || "Failed to sign in");
      showToast(err.message || "Failed to sign in", "error");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSecurityQuestionsSuccess = (userId) => {
    setVerifiedUserId(userId);
    setShowSecurityQuestions(false);
    setShowDirectPasswordReset(true);
  };

  const handlePasswordResetComplete = () => {
    setShowDirectPasswordReset(false);
    setShowForgotPassword(false);
    setResetMethod(null);
    setVerifiedUserId(null);
    showToast("Password reset complete. You can now sign in with your new password.", "success");
  };

  const resetPasswordFlow = () => {
    setShowForgotPassword(false);
    setShowSecurityQuestions(false);
    setShowDirectPasswordReset(false);
    setResetEmailSent(false);
    setResetEmail("");
    setResetMethod(null);
    setVerifiedUserId(null);
  };

  // Direct password reset flow
  if (showDirectPasswordReset) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
        <div className="bg-white p-8 rounded-lg shadow-xl w-full max-w-md">
          <DirectPasswordReset 
            userId={verifiedUserId}
            onComplete={handlePasswordResetComplete}
            onBack={() => setShowDirectPasswordReset(false)}
          />
        </div>
      </div>
    );
  }

  // Security questions verification
  if (showSecurityQuestions) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
        <div className="bg-white p-8 rounded-lg shadow-xl w-full max-w-md">
          <SecurityQuestionsReset 
            email={resetEmail}
            onSuccess={handleSecurityQuestionsSuccess}
            onBack={() => {
              setShowSecurityQuestions(false);
              setResetMethod(null);
            }}
          />
        </div>
      </div>
    );
  }

  // Email reset confirmation
  if (showForgotPassword && resetEmailSent) {
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
              onClick={resetPasswordFlow}
              className="w-full text-gray-600 hover:text-gray-700 py-2"
            >
              Back to Login
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Password reset method selection or email reset
  if (showForgotPassword) {
    if (resetMethod === 'email') {
      return (
        <div className="flex justify-center items-center min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
          <div className="bg-white p-8 rounded-lg shadow-xl w-full max-w-md">
            <div className="text-center mb-6">
              <h2 className="text-3xl font-bold text-gray-900">Reset via Email</h2>
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

              <CustomPasswordReset 
                resetEmail={resetEmail}
                onEmailSent={() => setResetEmailSent(true)}
                onBack={() => setResetMethod(null)}
              />
            </div>
          </div>
        </div>
      );
    }

    if (resetMethod === 'security') {
      setShowSecurityQuestions(true);
      return null;
    }

    // Method selection
    return (
      <div className="flex justify-center items-center min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
        <div className="bg-white p-8 rounded-lg shadow-xl w-full max-w-md">
          <div className="text-center mb-6">
            <h2 className="text-3xl font-bold text-gray-900">Reset Password</h2>
            <p className="text-gray-600 mt-2">Choose how you'd like to reset your password</p>
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

            <div className="space-y-3">
              <button
                onClick={() => {
                  if (!resetEmail) {
                    toast({
                      variant: "destructive",
                      title: "Email required",
                      description: "Please enter your email address first."
                    });
                    return;
                  }
                  setResetMethod('security');
                }}
                className="w-full bg-blue-600 text-white py-3 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors font-medium"
              >
                Reset with Security Questions
                <p className="text-xs text-blue-100 mt-1">Instant reset - no email required</p>
              </button>

              <button
                onClick={() => {
                  if (!resetEmail) {
                    toast({
                      variant: "destructive",
                      title: "Email required",
                      description: "Please enter your email address first."
                    });
                    return;
                  }
                  setResetMethod('email');
                }}
                className="w-full bg-gray-100 text-gray-700 py-3 px-4 rounded-md hover:bg-gray-200 transition-colors font-medium"
              >
                Reset via Email
                <p className="text-xs text-gray-500 mt-1">Traditional email reset link</p>
              </button>
            </div>

            <button 
              onClick={resetPasswordFlow}
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

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="rememberMe"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded cursor-pointer"
              />
              <label 
                htmlFor="rememberMe" 
                className="text-sm text-gray-700 cursor-pointer select-none"
              >
                Keep me signed in
              </label>
              <span className="text-xs text-gray-500">
                ({rememberMe ? 'Persistent' : 'Session only'})
              </span>
            </div>
            <button
              type="button"
              onClick={() => setShowForgotPassword(true)}
              className="text-sm text-blue-600 hover:text-blue-700 transition-colors"
            >
              Forgot password?
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
