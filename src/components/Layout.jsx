
import React from "react";
import { Link, useLocation } from "react-router-dom";
import { layoutDashboard, users, mail, home, settings, layoutList, search } from "lucide-react";

const navItems = [
  { name: "Dashboard", path: "/dashboard", icon: "layout-dashboard" },
  { name: "Guests", path: "/dashboard/guests", icon: "users" },
  { name: "Messages", path: "/dashboard/messages", icon: "mail" },
  { name: "Analytics", path: "/dashboard/analytics", icon: "layout-list" },
  { name: "FAQ Editor", path: "/dashboard/faq-editor", icon: "settings" },
  { name: "Smart Insights", path: "/dashboard/insights", icon: "search" },
  { name: "Property Manager", path: "/dashboard/properties-manager", icon: "home" },
];

import { icons } from "lucide-react";

export default function Layout({ children }) {
  const location = useLocation();

  return (
    <div className="min-h-screen flex font-sans">
      {/* Sidebar */}
      <aside className="h-screen w-64 bg-sidebar text-white flex flex-col shadow-sidebar z-20">
        <div className="flex items-center gap-2 px-6 py-6 border-b border-gray-800">
          <span className="text-3xl font-display text-primary">◎</span>
          <h1 className="text-xl font-display font-semibold bg-gradient-to-r from-primary to-white bg-clip-text text-transparent tracking-tight">
            ConciergeAI
          </h1>
        </div>
        <nav className="flex-1 px-2 py-5 space-y-3">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            const Icon = icons[item.icon] || icons['home'];
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3 px-4 py-2 rounded-xl transition-colors font-medium ${
                  isActive
                    ? "bg-primary/95 text-white shadow"
                    : "hover:bg-white/10 hover:text-primary text-gray-200"
                }`}
                style={{ letterSpacing: ".01em" }}
              >
                <Icon size={20} className={`mr-1 ${isActive ? "text-white" : "text-primary/60"}`} />
                <span>{item.name}</span>
              </Link>
            );
          })}
        </nav>
        <footer className="py-4 px-6 border-t border-gray-800 text-xs text-gray-400 mt-auto">
          <span>© {new Date().getFullYear()} ConciergeAI &middot; v2.0</span>
        </footer>
      </aside>

      {/* Main Content */}
      <main className="flex-1 min-h-screen bg-background text-text-main">
        <header className="flex items-center justify-between px-10 pt-10 pb-8 bg-card-gradient">
          <h2 className="font-display text-3xl font-bold text-primary drop-shadow-md tracking-tight">
            {location.pathname.replace("/dashboard/", "").replace(/-/g, " ").replace(/^\w/, c => c.toUpperCase()) || "Dashboard"}
          </h2>
          <div className="flex gap-4 items-center">
            <span className="rounded-xl bg-primary/10 text-primary px-3 py-1 text-sm font-semibold">
              Enterprise Admin
            </span>
            {/* Profile/Avatar placeholder */}
          </div>
        </header>
        <div className="p-10 md:p-14 lg:p-16 space-y-10 animate-fade-in">{children}</div>
      </main>
    </div>
  );
}
