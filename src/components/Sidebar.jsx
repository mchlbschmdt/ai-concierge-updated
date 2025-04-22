import React from "react";
import { Link, useLocation } from "react-router-dom";

export default function Sidebar() {
  const location = useLocation();

  const navLink = (path, label) => (
    <Link
      to={path}
      className={`block px-4 py-2 rounded ${
        location.pathname === path
          ? "bg-blue-500 text-white"
          : "hover:bg-gray-100 text-gray-800"
      }`}
    >
      {label}
    </Link>
  );

  return (
    <div className="w-64 h-screen bg-gray-50 border-r p-4 space-y-2">
      <h2 className="text-xl font-bold mb-4">📊 Dashboard</h2>
      {navLink("/dashboard", "🏠 Overview")}
      {navLink("/dashboard/guests", "👥 Guests")}
      {navLink("/dashboard/messages", "💬 Messages")}
      {navLink("/dashboard/analytics", "📈 Analytics")}
    </div>
  );
}
