
import React from "react";
import Sidebar from "./Sidebar";
import Footer from "./Footer";

export default function Layout({ children }) {
  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar />
      <div className="flex flex-col flex-1">
        {/* App Bar/Header */}
        <header className="h-16 bg-white border-b border-gray-200 px-8 flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-3">
            {/* Modern Logo mark / gradient text */}
            <span className="text-3xl font-bold font-display text-transparent bg-gradient-to-r from-primary to-secondary bg-clip-text drop-shadow-sm">
              <span className="sr-only">Hostly Ai Concierge</span>🏨
            </span>
            <h1 className="text-xl font-semibold font-display text-transparent bg-gradient-to-r from-primary to-secondary bg-clip-text tracking-tight">
              Hostly Ai Concierge
            </h1>
          </div>
        </header>
        <main className="p-6 flex-1 overflow-y-auto">{children}</main>
        <Footer />
      </div>
    </div>
  );
}
