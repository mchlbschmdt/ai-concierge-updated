
import React from "react";
import { Link, useLocation } from "react-router-dom";

const navItems = [
  { label: "Dashboard", path: "/dashboard" },
  { label: "Guests", path: "/dashboard/guests" },
  { label: "Guest Manager", path: "/dashboard/guests-manager" },
  { label: "Properties", path: "/dashboard/properties" },
  { label: "Messages", path: "/dashboard/messages" },
  { label: "Analytics", path: "/dashboard/analytics" },
  { label: "FAQ Editor", path: "/dashboard/faq-editor" },
  { label: "Smart Insights", path: "/dashboard/insights" },
];

export default function Sidebar() {
  const location = useLocation();

  return (
    <div className="h-screen w-64 bg-slate-800 text-white flex flex-col shadow-md">
      <div className="text-2xl font-bold p-4 border-b border-slate-700">
        Concierge Admin
      </div>
      <nav className="flex-1 overflow-y-auto">
        {navItems.map((item) => (
          <Link
            key={item.path}
            to={item.path}
            className={`block px-6 py-3 hover:bg-slate-700 ${
              location.pathname === item.path ? "bg-slate-700 font-semibold" : ""
            }`}
          >
            {item.label}
          </Link>
        ))}
      </nav>
    </div>
  );
}
