
import React from "react";

export default function Footer() {
  return (
    <footer className="h-12 border-t border-gray-200 px-6 flex items-center justify-center text-sm text-gray-500 bg-white">
      © {new Date().getFullYear()} Hostly AI Concierge
    </footer>
  );
}
