
import React from "react";
import Layout from "../components/Layout";
import HostAiChat from "../components/HostAiChat";
import CommonQuestionsAnalytics from "../components/CommonQuestionsAnalytics";
import { Link } from "react-router-dom";
import { Building, Users, MessageSquare, Mail, Phone, Plus, BarChart3, Bot, TrendingUp, TestTube } from "lucide-react";

export default function Dashboard() {
  const quickActions = [
    {
      title: "Add Property",
      description: "Register a new property in your portfolio",
      icon: Plus,
      path: "/add-property",
      color: "bg-blue-500 hover:bg-blue-600"
    },
    {
      title: "Manage Properties",
      description: "View and edit your property details",
      icon: Building,
      path: "/properties",
      color: "bg-green-500 hover:bg-green-600"
    },
    {
      title: "Test AI Responses",
      description: "Test how your AI concierge responds to guests",
      icon: TestTube,
      path: "/test-responses",
      color: "bg-purple-500 hover:bg-purple-600"
    },
    {
      title: "Email Management",
      description: "Handle guest communications",
      icon: Mail,
      path: "/email-management",
      color: "bg-orange-500 hover:bg-orange-600"
    }
  ];

  const systemStatus = [
    {
      title: "Properties",
      count: "12",
      subtitle: "Active listings",
      icon: Building,
      color: "text-blue-600"
    },
    {
      title: "Messages",
      count: "48",
      subtitle: "This week",
      icon: MessageSquare,
      color: "text-green-600"
    },
    {
      title: "Guests",
      count: "156",
      subtitle: "Total managed",
      icon: Users,
      color: "text-purple-600"
    },
    {
      title: "SMS Active",
      count: "✓",
      subtitle: "System operational",
      icon: Phone,
      color: "text-emerald-600"
    }
  ];

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-600">Welcome back! Here's an overview of your property management system.</p>
        </div>

        {/* System Status Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {systemStatus.map((status, index) => {
            const Icon = status.icon;
            return (
              <div key={index} className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">{status.title}</p>
                    <p className="text-2xl font-bold text-gray-900">{status.count}</p>
                    <p className="text-xs text-gray-500">{status.subtitle}</p>
                  </div>
                  <Icon className={`h-8 w-8 ${status.color}`} />
                </div>
              </div>
            );
          })}
        </div>

        {/* Quick Actions */}
        <div>
          <h2 className="text-xl font-semibold mb-4">Quick Actions</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {quickActions.map((action, index) => {
              const Icon = action.icon;
              return (
                <Link
                  key={index}
                  to={action.path}
                  className={`${action.color} text-white p-6 rounded-lg shadow-sm hover:shadow-md transition-all duration-200 transform hover:scale-105`}
                >
                  <Icon className="h-8 w-8 mb-3" />
                  <h3 className="font-semibold text-lg mb-2">{action.title}</h3>
                  <p className="text-sm opacity-90">{action.description}</p>
                </Link>
              );
            })}
          </div>
        </div>

        {/* Personal AI Host Support */}
        <div>
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <Bot className="h-6 w-6" />
            Personal AI Host Support
          </h2>
          <HostAiChat />
        </div>

        {/* Common Questions & Recommendations Analytics */}
        <div>
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <TrendingUp className="h-6 w-6" />
            Guest Insights & Analytics
          </h2>
          <CommonQuestionsAnalytics />
        </div>

        {/* SMS Integration Section */}
        <div>
        {/* Recent Activity */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">Recent Activity</h2>
            <Link 
              to="/dashboard/messages" 
              className="text-blue-600 hover:text-blue-700 text-sm font-medium"
            >
              View all messages →
            </Link>
          </div>
          <div className="space-y-3">
            <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
              <MessageSquare className="h-5 w-5 text-blue-600" />
              <div>
                <p className="text-sm font-medium">New guest message received</p>
                <p className="text-xs text-gray-500">2 minutes ago</p>
              </div>
            </div>
            <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
              <Users className="h-5 w-5 text-green-600" />
              <div>
                <p className="text-sm font-medium">Guest check-in confirmed</p>
                <p className="text-xs text-gray-500">1 hour ago</p>
              </div>
            </div>
            <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
              <Phone className="h-5 w-5 text-purple-600" />
              <div>
                <p className="text-sm font-medium">SMS automation triggered</p>
                <p className="text-xs text-gray-500">3 hours ago</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
