
import React from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { auth } from "../firebase";
import { signOut } from "firebase/auth";
import Sidebar from "./Sidebar";
import Footer from "./Footer";

export default function Layout({ children }) {
  const navigate = useNavigate();
  const { currentUser } = useAuth();

  const handleLogout = async () => {
    try {
      await signOut(auth);
      navigate("/login");
    } catch (error) {
      console.error("Error signing out:", error);
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
            <button className="p-2 rounded-full hover:bg-white/10">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-white" viewBox="0 0 20 20" fill="currentColor">
                <path d="M10 2a6 6 0 00-6 6v3.586l-.707.707A1 1 0 004 14h12a1 1 0 00.707-1.707L16 11.586V8a6 6 0 00-6-6zM10 18a3 3 0 01-3-3h6a3 3 0 01-3 3z" />
              </svg>
            </button>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-white/20 text-white flex items-center justify-center">
                <span>{currentUser?.email?.charAt(0)?.toUpperCase() || 'U'}</span>
              </div>
              <div className="hidden md:flex flex-col">
                <span className="text-white text-sm">{currentUser?.email || 'User'}</span>
                <button 
                  onClick={handleLogout}
                  className="text-white/80 hover:text-white text-xs text-left"
                >
                  Sign out
                </button>
              </div>
            </div>
          </div>
        </header>
        <main className="p-6 flex-1 overflow-y-auto">{children}</main>
        <Footer />
      </div>
    </div>
  );
}
