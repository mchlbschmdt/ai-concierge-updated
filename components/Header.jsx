
import React from "react";
export default function Header() {
  return (
    <header className="h-20 bg-primary border-b border-secondary px-6 flex items-center justify-between shadow-nav">
      <div className="flex items-center gap-4">
        <img 
          src="/public/lovable-uploads/hostlyai-logo.png" 
          alt="Hostly Ai Concierge logo" 
          className="h-12" 
          style={{ minWidth: 120 }} 
        />
        <h1 className="text-2xl font-display font-bold text-white tracking-tight">Hostly Ai Concierge</h1>
      </div>
      <div className="text-sm text-white/80">Built with ❤️ by Concierge</div>
    </header>
  );
}
