
import React from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { User, ChevronDown, Shield } from "lucide-react";
import { ProfileCompletionBadge } from './profile/ProfileCompletionBadge';
import Sidebar from "./Sidebar";
import Footer from "./Footer";

export default function Layout({ children }) {
  const navigate = useNavigate();
  const { currentUser, signOut, isSuperAdmin } = useAuth();
  const { showToast } = useToast();
  const [showDropdown, setShowDropdown] = React.useState(false);

  const handleLogout = async () => {
    try {
      const { error } = await signOut();
      if (error) {
        showToast(error.message, "error");
      } else {
        showToast("Logged out successfully. See you next time!", "success");
        navigate("/login");
      }
    } catch (error) {
      console.error("Error signing out:", error);
      showToast("An unexpected error occurred during logout", "error");
    }
  };

  return (
    <div className="flex min-h-screen bg-slate-100">
      <Sidebar />
      <div className="flex flex-col flex-1">
        {/* App Bar/Header */}
        <header className="h-16 bg-gradient-to-r from-primary to-secondary border-b border-gray-200 px-8 flex items-center justify-between shadow-md">
          <div className="flex items-center gap-3">
            <span className="text-3xl font-bold font-display text-white drop-shadow-sm">
              <span className="sr-only">Hostly AI Concierge</span>🏨
            </span>
            <h1 className="text-xl font-semibold font-display text-white tracking-tight">
              Hostly AI Concierge
            </h1>
          </div>
          
          <div className="flex items-center gap-4">
            {isSuperAdmin && (
              <div className="flex items-center gap-2 px-3 py-1 bg-red-100 text-red-700 rounded-full text-sm font-medium">
                <Shield className="h-4 w-4" />
                Super Admin
              </div>
            )}
            
            <button className="p-2 rounded-full hover:bg-white/10">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-white" viewBox="0 0 20 20" fill="currentColor">
                <path d="M10 2a6 6 0 00-6 6v3.586l-.707.707A1 1 0 004 14h12a1 1 0 00.707-1.707L16 11.586V8a6 6 0 00-6-6zM10 18a3 3 0 01-3-3h6a3 3 0 01-3 3z" />
              </svg>
            </button>

            {/* Profile Completion Badge */}
            <ProfileCompletionBadge />
            
            <div className="relative">
              <button
                onClick={() => setShowDropdown(!showDropdown)}
                className="flex items-center gap-2 hover:bg-white/10 rounded-lg p-2 transition-colors"
              >
                <div className="w-8 h-8 rounded-full bg-white/20 text-white flex items-center justify-center">
                  <span>{currentUser?.email?.charAt(0)?.toUpperCase() || 'U'}</span>
                </div>
                <div className="hidden md:flex flex-col items-start">
                  <span className="text-white text-sm">{currentUser?.email || 'User'}</span>
                </div>
                <ChevronDown className="w-4 h-4 text-white hidden md:block" />
              </button>

              {showDropdown && (
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50">
                  <Link
                    to="/profile-settings"
                    className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    onClick={() => setShowDropdown(false)}
                  >
                    <User className="w-4 h-4" />
                    Profile Settings
                  </Link>
                  <button
                    onClick={() => {
                      setShowDropdown(false);
                      handleLogout();
                    }}
                    className="w-full text-left flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M3 3a1 1 0 00-1 1v12a1 1 0 102 0V4a1 1 0 00-1-1zm10.293 9.293a1 1 0 001.414 1.414l3-3a1 1 0 000-1.414l-3-3a1 1 0 10-1.414 1.414L14.586 9H7a1 1 0 100 2h7.586l-1.293 1.293z" clipRule="evenodd" />
                    </svg>
                    Sign Out
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>
        <main className="p-6 flex-1 overflow-y-auto">{children}</main>
        <Footer />
      </div>
    </div>
  );
}
