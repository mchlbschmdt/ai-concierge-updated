import React from "react";
import { Link, useLocation } from "react-router-dom";
import {
  Home,
  Users,
  MessageSquare,
  BarChart2,
  BookOpen,
  Zap,
  UserPlus,
} from "lucide-react";

const navItems = [
  { name: "Dashboard", path: "/dashboard", icon: <Home size={18} /> },
  { name: "Guests", path: "/dashboard/guests", icon: <Users size={18} /> },
  { name: "Messages", path: "/dashboard/messages", icon: <MessageSquare size={18} /> },
  { name: "Analytics", path: "/dashboard/analytics", icon: <BarChart2 size={18} /> },
  { name: "FAQ Editor", path: "/dashboard/faq-editor", icon: <BookOpen size={18} /> },
  { name: "Smart Insights", path: "/dashboard/insights", icon: <Zap size={18} /> },
  { name: "Guest Manager", path: "/dashboard/guests-manager", icon: <UserPlus size={18} /> },
  { name: 'Property Manager', path: '/dashboard/properties-manager' }
];

export default function Layout({ children }) {
  const location = useLocation();

  return (
    <div className="flex h-screen bg-gray-50 text-gray-800 font-sans">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r shadow-sm flex flex-col">
        <div className="px-6 py-5 border-b">
          <h1 className="text-2xl font-bold text-blue-600">AI Concierge</h1>
        </div>
        <nav className="flex-1 px-4 py-4 space-y-1">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3 px-4 py-2 rounded-md transition font-medium ${
                  isActive
                    ? "bg-blue-600 text-white"
                    : "text-gray-700 hover:bg-blue-100 hover:text-blue-700"
                }`}
              >
                {item.icon}
                {item.name}
              </Link>
            );
          })}
        </nav>
        <footer className="p-4 text-sm text-gray-400 border-t">
          © {new Date().getFullYear()} ConciergeAI
        </footer>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto p-6">
        <header className="mb-6">
          <h2 className="text-2xl font-semibold capitalize text-gray-800">
            {location.pathname.replace("/dashboard/", "").replace(/-/g, " ") || "Dashboard"}
          </h2>
        </header>
        {children}
      </main>
    </div>
  );
}
