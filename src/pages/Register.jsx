import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "../integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";
import { useAuth } from "@/context/AuthContext";

export default function Register() {
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    confirmPassword: "",
    fullName: ""
  });
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();
  const { currentUser } = useAuth();

  // Redirect if already authenticated
  if (currentUser) {
    navigate("/dashboard");
    return null;
  }

  // Password complexity validation
  const validatePassword = (password) => {
    const minLength = 8;
    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumbers = /\d/.test(password);
    const hasNonalphas = /\W/.test(password);

    if (password.length < minLength) {
      return "Password must be at least 8 characters long";
    }
    if (!hasUpperCase) {
      return "Password must contain at least one uppercase letter";
    }
    if (!hasLowerCase) {
      return "Password must contain at least one lowercase letter";
    }
    if (!hasNumbers) {
      return "Password must contain at least one number";
    }
    if (!hasNonalphas) {
      return "Password must contain at least one special character";
    }
    return null;
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    setError(""); // Clear error when user types
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      // Validate form data
      if (!formData.email || !formData.password || !formData.confirmPassword || !formData.fullName) {
        throw new Error("All fields are required");
      }

      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(formData.email)) {
        throw new Error("Please enter a valid email address");
      }

      // Validate password complexity
      const passwordError = validatePassword(formData.password);
      if (passwordError) {
        throw new Error(passwordError);
      }

      // Check password confirmation
      if (formData.password !== formData.confirmPassword) {
        throw new Error("Passwords do not match");
      }

      // Sanitize inputs
      const sanitizedData = {
        email: formData.email.trim().toLowerCase(),
        password: formData.password,
        fullName: formData.fullName.trim()
      };

      // Sign up with Supabase
      const { data, error } = await supabase.auth.signUp({
        email: sanitizedData.email,
        password: sanitizedData.password,
        options: {
          emailRedirectTo: `${window.location.origin}/`,
          data: {
            full_name: sanitizedData.fullName
          }
        }
      });

      if (error) {
        // Handle specific error cases
        if (error.message.includes("already registered")) {
          throw new Error("An account with this email already exists. Please try logging in instead.");
        }
        if (error.message.includes("rate limit")) {
          throw new Error("Too many signup attempts. Please wait a few minutes before trying again.");
        }
        throw error;
      }

      if (data.user && !data.user.email_confirmed_at) {
        toast({
          title: "Registration successful!",
          description: "Please check your email to confirm your account before signing in."
        });
        // Navigate to login if email confirmation is required
        setTimeout(() => {
          navigate("/login");
        }, 2000);
      } else {
        toast({
          title: "Registration successful!",
          description: "Let's set up your account."
        });
        // Navigate to onboarding for immediate setup
        setTimeout(() => {
          navigate("/onboarding");
        }, 1000);
      }
    } catch (err) {
      console.error("Registration error:", err);
      setError(err.message || "Failed to create account");
      toast({
        variant: "destructive",
        title: "Registration Failed",
        description: err.message || "Failed to create account"
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex justify-center items-center min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <form onSubmit={handleRegister} className="bg-white p-8 rounded-lg shadow-xl w-full max-w-md">
        <div className="text-center mb-6">
          <h2 className="text-3xl font-bold text-gray-900">Create Account</h2>
          <p className="text-gray-600 mt-2">Join us to get started</p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        <div className="space-y-4">
          <div>
            <label htmlFor="fullName" className="block text-sm font-medium text-gray-700 mb-1">
              Full Name
            </label>
            <input
              id="fullName"
              name="fullName"
              type="text"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Enter your full name"
              value={formData.fullName}
              onChange={handleInputChange}
              required
              maxLength={100}
            />
          </div>

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
              Email Address
            </label>
            <input
              id="email"
              name="email"
              type="email"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Enter your email"
              value={formData.email}
              onChange={handleInputChange}
              required
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Create a password"
              value={formData.password}
              onChange={handleInputChange}
              required
            />
            <div className="text-xs text-gray-500 mt-1">
              Must be 8+ characters with uppercase, lowercase, number, and special character
            </div>
          </div>

          <div>
            <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-1">
              Confirm Password
            </label>
            <input
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Confirm your password"
              value={formData.confirmPassword}
              onChange={handleInputChange}
              required
            />
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
                Creating Account...
              </>
            ) : "Create Account"}
          </button>
        </div>

        <div className="mt-6 text-center">
          <p className="text-sm text-gray-600">
            Already have an account?{" "}
            <Link to="/login" className="text-blue-600 hover:text-blue-700 font-medium">
              Sign in here
            </Link>
          </p>
        </div>
      </form>
    </div>
  );
}