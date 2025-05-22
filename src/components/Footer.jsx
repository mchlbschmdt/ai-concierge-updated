
import React from "react";

export default function Footer() {
  return (
    <footer className="h-12 border-t border-gray-200 px-6 flex items-center justify-between text-sm text-gray-500 bg-white">
      <span>© {new Date().getFullYear()} Hostly Ai Concierge</span>
      <div className="flex items-center gap-4">
        <a href="#" className="hover:text-primary">Privacy Policy</a>
        <a href="#" className="hover:text-primary">Terms of Service</a>
        <a href="#" className="hover:text-primary">Support</a>
      </div>
    </footer>
  );
}
