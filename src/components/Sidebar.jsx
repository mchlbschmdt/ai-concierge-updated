
import React from "react";
import { Link, useLocation } from "react-router-dom";
import { Home, Users, Mail, LayoutList, Settings, Search, FileText, BarChart3 } from "lucide-react";

const navItems = [
  { label: "Dashboard", path: "/dashboard", icon: Home },
  { label: "Guests", path: "/dashboard/guests-manager", icon: Users },
  { label: "Properties", path: "/dashboard/properties-manager", icon: Home },
  { label: "Messages", path: "/dashboard/messages", icon: Mail },
  { label: "Analytics", path: "/dashboard/analytics", icon: BarChart3 },
  { label: "FAQ Editor", path: "/dashboard/faq-editor", icon: FileText },
  { label: "Smart Insights", path: "/dashboard/insights", icon: Search },
  { label: "Email Management", path: "/dashboard/email-management", icon: Mail },
];

export default function Sidebar() {
  const location = useLocation();

  return (
    <div className="h-screen w-64 bg-slate-800 text-white flex flex-col shadow-lg z-20">
      <div className="flex items-center justify-center gap-2 px-6 py-7 border-b border-white/10 bg-gradient-to-r from-primary to-secondary">
        <span className="text-2xl font-bold font-display text-white">🏨</span>
        <h1 className="text-lg font-bold font-display text-white tracking-tight">Hostly Ai</h1>
      </div>
      <nav className="flex-1 px-3 py-5 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          const Icon = item.icon;
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center gap-3 pl-4 pr-2 py-3 rounded-md transition-colors font-medium ${
                isActive
                  ? "bg-primary text-white"
                  : "hover:bg-white/10 hover:text-white text-white/70"
              }`}
            >
              <Icon size={18} className={isActive ? "text-white" : "text-white/70"} />
              <span>{item.label}</span>
              {isActive && <div className="w-1.5 h-1.5 rounded-full bg-white ml-auto"></div>}
            </Link>
          );
        })}
      </nav>
      <footer className="py-4 px-6 border-t border-white/10 text-xs text-white/50 mt-auto">
        <span>© {new Date().getFullYear()} Hostly Ai Concierge</span>
      </footer>
    </div>
  );
}
