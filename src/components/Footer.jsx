
import React from "react";

export default function Footer() {
  return (
    <footer className="h-12 border-t border-border px-6 flex items-center justify-center text-xs text-muted-foreground bg-card">
      <span>© {new Date().getFullYear()} Hostly.ai Concierge</span>
    </footer>
  );
}
