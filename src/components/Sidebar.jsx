
import React from "react";
import { Link, useLocation } from "react-router-dom";
import { Home, Users, Mail, LayoutList, Settings, Search } from "lucide-react";

const navItems = [
  { label: "Dashboard", path: "/dashboard", icon: Home },
  { label: "Guests", path: "/dashboard/guests-manager", icon: Users },
  { label: "Messages", path: "/dashboard/messages", icon: Mail },
  { label: "Analytics", path: "/dashboard/analytics", icon: LayoutList },
  { label: "FAQ Editor", path: "/dashboard/faq-editor", icon: Settings },
  { label: "Smart Insights", path: "/dashboard/insights", icon: Search },
  { label: "Property Manager", path: "/dashboard/properties-manager", icon: Home },
];

export default function Sidebar() {
  const location = useLocation();

  return (
    <div className="h-screen w-64 bg-nav text-white flex flex-col shadow-sidebar z-20">
      <div className="flex items-center gap-2 px-6 py-7 border-b border-white/20">
        <span className="text-2xl font-bold font-display text-white">🏨</span>
        <h1 className="text-lg font-bold font-display text-white tracking-tight">Hostly Ai Concierge</h1>
      </div>
      <nav className="flex-1 px-2 py-5 space-y-2">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          const Icon = item.icon;
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center gap-3 px-4 py-2 rounded-xl transition-colors font-medium ${
                isActive
                  ? "bg-white/20 text-white shadow"
                  : "hover:bg-white/10 hover:text-secondary text-white/90"
              }`}
              style={{ letterSpacing: ".01em" }}
            >
              <Icon size={20} className={`mr-1 ${isActive ? "text-secondary" : "text-white"}`} />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>
      <footer className="py-3 px-6 border-t border-white/10 text-xs text-white/50 mt-auto">
        <span>© {new Date().getFullYear()} Hostly Ai Concierge</span>
      </footer>
    </div>
  );
}
