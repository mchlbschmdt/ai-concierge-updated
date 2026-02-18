
import React from "react";
import Layout from "../components/Layout";
import { Link } from "react-router-dom";
import { Building, Users, MessageSquare, Phone, Plus, BarChart3, Bot, TrendingUp, ArrowRight } from "lucide-react";

export default function Dashboard() {
  const statusCards = [
    { title: "Properties", count: "—", subtitle: "Active listings", icon: Building },
    { title: "Messages", count: "—", subtitle: "This week", icon: MessageSquare },
    { title: "Guests", count: "—", subtitle: "Total managed", icon: Users },
    { title: "SMS Status", count: "✓", subtitle: "Operational", icon: Phone },
  ];

  const quickActions = [
    {
      title: "Add Property",
      description: "Register a new property in your portfolio",
      icon: Plus,
      path: "/add-property",
    },
    {
      title: "Manage Properties",
      description: "View and edit your property details",
      icon: Building,
      path: "/properties",
    },
    {
      title: "Test AI Responses",
      description: "Test how your AI concierge responds",
      icon: Bot,
      path: "/test-responses",
    },
    {
      title: "View Analytics",
      description: "Monitor performance and insights",
      icon: BarChart3,
      path: "/analytics",
    },
  ];

  return (
    <Layout>
      <div className="space-y-8">
        {/* Page Header */}
        <div>
          <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-1">Welcome back. Here's an overview of your property management system.</p>
        </div>

        {/* Status Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {statusCards.map((card, i) => {
            const Icon = card.icon;
            return (
              <div key={i} className="bg-card border border-border rounded-lg p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{card.title}</p>
                    <p className="text-2xl font-bold text-foreground mt-1">{card.count}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{card.subtitle}</p>
                  </div>
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Icon className="h-5 w-5 text-primary" />
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Quick Actions */}
        <div>
          <h2 className="text-lg font-semibold text-foreground mb-3">Quick Actions</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {quickActions.map((action, i) => {
              const Icon = action.icon;
              return (
                <Link
                  key={i}
                  to={action.path}
                  className="group bg-card border border-border rounded-lg p-5 hover:border-primary/30 hover:shadow-md transition-all duration-200"
                >
                  <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center mb-3 group-hover:bg-primary/15 transition-colors">
                    <Icon className="h-4.5 w-4.5 text-primary" />
                  </div>
                  <h3 className="font-semibold text-foreground text-sm">{action.title}</h3>
                  <p className="text-xs text-muted-foreground mt-1">{action.description}</p>
                  <div className="flex items-center gap-1 mt-3 text-xs font-medium text-primary opacity-0 group-hover:opacity-100 transition-opacity">
                    Go <ArrowRight className="h-3 w-3" />
                  </div>
                </Link>
              );
            })}
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-card border border-border rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-foreground">Recent Activity</h2>
            <Link 
              to="/messages" 
              className="text-primary hover:text-primary/80 text-sm font-medium transition-colors"
            >
              View all →
            </Link>
          </div>
          <div className="space-y-3">
            {[
              { icon: MessageSquare, text: "New guest message received", time: "2 minutes ago" },
              { icon: Users, text: "Guest check-in confirmed", time: "1 hour ago" },
              { icon: Phone, text: "SMS automation triggered", time: "3 hours ago" },
            ].map((item, i) => {
              const Icon = item.icon;
              return (
                <div key={i} className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                  <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Icon className="h-4 w-4 text-primary" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground">{item.text}</p>
                    <p className="text-xs text-muted-foreground">{item.time}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </Layout>
  );
}
