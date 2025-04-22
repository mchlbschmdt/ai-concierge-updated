import React from "react";

export default function Header() {
  return (
    <header className="h-16 bg-white border-b border-gray-200 px-6 flex items-center justify-between shadow-sm">
      <h1 className="text-xl font-semibold text-gray-800">Admin Dashboard</h1>
      <div className="text-sm text-gray-500">Built with ❤️ by Concierge</div>
    </header>
  );
}
