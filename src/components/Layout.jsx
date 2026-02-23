
import React from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { User, ChevronDown, Shield, Menu, Search, Command, LogOut } from "lucide-react";
import { ProfileCompletionBadge } from './profile/ProfileCompletionBadge';
import { useSidebar } from '@/context/SidebarContext';
import { useCommandPalette } from '@/hooks/useCommandPalette';
import CommandPalette from './CommandPalette';
import Sidebar from "./Sidebar";
import Footer from "./Footer";
import AnnouncementBanner from "./AnnouncementBanner";
import { EntitlementProvider } from '@/context/EntitlementContext';

export default function Layout({ children }) {
  const navigate = useNavigate();
  const { currentUser, signOut, isSuperAdmin } = useAuth();
  const { showToast } = useToast();
  const [showDropdown, setShowDropdown] = React.useState(false);
  const { toggleSidebar, isMobile } = useSidebar();
  const { isOpen: isCommandPaletteOpen, setIsOpen: setIsCommandPaletteOpen } = useCommandPalette();

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
    <EntitlementProvider>
      <div className="min-h-screen bg-background">
        {/* Header */}
        <header className="fixed top-0 left-0 right-0 h-16 bg-primary border-b border-primary/80 px-4 md:px-8 flex items-center justify-between shadow-sm z-50">
          <div className="flex items-center gap-3">
            <button
              onClick={toggleSidebar}
              className="lg:hidden p-2 rounded-lg hover:bg-white/10 transition-colors"
              aria-label="Toggle navigation menu"
            >
              <Menu className="h-5 w-5 text-primary-foreground" />
            </button>

            <span className="text-lg font-semibold text-primary-foreground tracking-tight">
              Hostly.ai
            </span>
          </div>
            
          <div className="flex items-center gap-2 md:gap-3">
            <button
              onClick={() => setIsCommandPaletteOpen(true)}
              className="hidden md:flex items-center gap-2 px-3 py-1.5 text-sm text-primary-foreground/70 hover:text-primary-foreground hover:bg-white/10 rounded-lg transition-colors"
              aria-label="Quick search"
            >
              <Search className="h-4 w-4" />
              <span className="hidden lg:inline">Search</span>
              <kbd className="hidden lg:inline-flex items-center gap-1 px-1.5 py-0.5 text-xs bg-white/15 rounded">
                <Command className="h-3 w-3" />K
              </kbd>
            </button>

            {isSuperAdmin && (
              <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 bg-white/15 text-primary-foreground rounded-full text-xs font-medium">
                <Shield className="h-3.5 w-3.5" />
                <span className="hidden md:inline">Admin</span>
              </div>
            )}

            <ProfileCompletionBadge />
            
            <div className="relative">
              <button
                onClick={() => setShowDropdown(!showDropdown)}
                className="flex items-center gap-2 hover:bg-white/10 rounded-lg p-2 transition-colors"
              >
                <div className="w-8 h-8 rounded-full bg-white/20 text-primary-foreground flex items-center justify-center text-sm font-medium">
                  {currentUser?.email?.charAt(0)?.toUpperCase() || 'U'}
                </div>
                <ChevronDown className="w-4 h-4 text-primary-foreground/70 hidden md:block" />
              </button>

              {showDropdown && (
                <div className="absolute right-0 mt-2 w-48 bg-card rounded-lg shadow-lg border border-border py-1 z-50">
                  <div className="px-4 py-2 border-b border-border">
                    <p className="text-xs text-muted-foreground truncate">{currentUser?.email || 'User'}</p>
                  </div>
                  <Link
                    to="/profile-settings"
                    className="flex items-center gap-2 px-4 py-2 text-sm text-foreground hover:bg-muted transition-colors"
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
                    className="w-full text-left flex items-center gap-2 px-4 py-2 text-sm text-foreground hover:bg-muted transition-colors"
                  >
                    <LogOut className="h-4 w-4" />
                    Sign Out
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        <div className="flex pt-16">
          <Sidebar />
          <div className="flex flex-col flex-1 min-w-0">
            <main className="p-6 flex-1 overflow-y-auto">
              <AnnouncementBanner />
              {children}
            </main>
            <Footer />
          </div>
        </div>
        
        <CommandPalette 
          isOpen={isCommandPaletteOpen} 
          onClose={() => setIsCommandPaletteOpen(false)} 
        />
      </div>
    </EntitlementProvider>
  );
}
