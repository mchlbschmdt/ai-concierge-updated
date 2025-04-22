
import React from "react";
import { Link, useLocation } from "react-router-dom";
import {
  Home,
  Users,
  MessageSquare,
  BarChart2,
  Book,
  Zap,
  UserPlus,
  LayoutDashboard
} from "lucide-react";

const navItems = [
  { name: "Dashboard", path: "/dashboard", icon: <LayoutDashboard size={18} /> },
  { name: "Guests", path: "/dashboard/guests", icon: <Users size={18} /> },
  { name: "Messages", path: "/dashboard/messages", icon: <MessageSquare size={18} /> },
  { name: "Analytics", path: "/dashboard/analytics", icon: <BarChart2 size={18} /> },
  { name: "FAQ Editor", path: "/dashboard/faq-editor", icon: <Book size={18} /> },
  { name: "Smart Insights", path: "/dashboard/insights", icon: <Zap size={18} /> },
  { name: "Guest Manager", path: "/dashboard/guests-manager", icon: <UserPlus size={18} /> },
  { name: 'Property Manager', path: '/dashboard/properties-manager', icon: <Home size={18} /> }
];

export default function Layout({ children }) {
  const location = useLocation();

  return (
    <div className="flex min-h-screen bg-gray-light font-sans">
      {/* Sidebar */}
      <aside className="w-64 bg-sidebar border-r shadow-lg flex flex-col transition-all duration-300">
        <div className="flex items-center gap-2 px-6 py-6 border-b border-gray-100">
          <span className="text-3xl font-display text-accent">◎</span>
          <h1 className="text-xl font-display font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent tracking-tight">ConciergeAI</h1>
        </div>
        <nav className="flex-1 px-4 py-6 space-y-2">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3 px-4 py-2 rounded-lg font-semibold tracking-tight text-base transition-colors duration-150 group ${
                  isActive
                    ? "bg-primary text-white shadow"
                    : "text-gray-700 hover:bg-accent/10 hover:text-accent"
                }`}
              >
                <span className={`transition-transform mr-1 ${isActive ? "scale-110" : "group-hover:scale-110"} delay-75`}>
                  {item.icon}
                </span>
                <span>{item.name}</span>
              </Link>
            );
          })}
        </nav>
        <footer className="py-4 px-6 border-t text-xs text-gray-400">
          <span>© {new Date().getFullYear()} ConciergeAI &middot; v2.0</span>
        </footer>
      </aside>

      {/* Main Content */}
      <main className="flex-1 min-h-screen p-10 bg-gray-soft">
        <header className="flex items-center justify-between mb-8">
          <h2 className="font-display text-2xl sm:text-3xl font-bold text-dark">
            {location.pathname.replace("/dashboard/", "").replace(/-/g, " ") || "Dashboard"}
          </h2>
          <div className="flex gap-3 items-center">
            <span className="text-sm font-semibold text-accent">Enterprise Admin</span>
            {/* Add future avatar/profile actions */}
          </div>
        </header>
        <div className="space-y-10">{children}</div>
      </main>
    </div>
  );
}
