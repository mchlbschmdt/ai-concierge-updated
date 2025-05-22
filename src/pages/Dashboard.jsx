
import React from "react";
import { Card } from "@/components/ui/card";
import { Link, useNavigate } from "react-router-dom";
import { Plus, Users, Home as HomeIcon, MessageSquare, BarChart3, FileText, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import KnowledgeBaseUploader from "../components/KnowledgeBaseUploader";
import GmailIntegration from "../components/GmailIntegration";

export default function Dashboard() {
  const navigate = useNavigate();
  
  const handleFileAdded = (fileData) => {
    console.log("File added:", fileData);
    // This would update state in a real implementation
  };

  const handleMessagesImported = (messages) => {
    console.log("Messages imported:", messages);
    // This would update state in a real implementation
  };
  
  const handleAddProperty = () => {
    navigate("/dashboard/add-property");
  };

  const stats = [
    { label: "Properties", value: 8, icon: HomeIcon, color: "bg-blue-500" },
    { label: "Guests", value: 24, icon: Users, color: "bg-green-500" },
    { label: "Messages", value: 156, icon: MessageSquare, color: "bg-purple-500" },
    { label: "Analytics", value: "12%+", icon: BarChart3, color: "bg-amber-500" },
  ];

  const navCards = [
    { title: "Guests", description: "Manage your guests", icon: Users, path: "/dashboard/guests-manager" },
    { title: "Properties", description: "Manage your properties", icon: HomeIcon, path: "/dashboard/properties-manager" },
    { title: "Messages", description: "View your messages", icon: MessageSquare, path: "/dashboard/messages" },
    { title: "FAQ Editor", description: "Manage property FAQs", icon: FileText, path: "/dashboard/faq-editor" },
    { title: "Smart Insights", description: "AI-powered analytics", icon: Search, path: "/dashboard/insights" },
    { title: "Analytics", description: "View your analytics", icon: BarChart3, path: "/dashboard/analytics" },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Dashboard</h1>
          <p className="text-gray-600">Welcome to the Hostly AI Concierge dashboard.</p>
        </div>
        <Button 
          onClick={handleAddProperty}
          className="flex items-center gap-2"
        >
          <Plus size={18} /> Add Property
        </Button>
      </div>
      
      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, index) => (
          <Card key={index} className="p-6 border-none shadow-md hover:shadow-lg transition-shadow">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-gray-500 text-sm font-medium">{stat.label}</p>
                <p className="text-3xl font-bold mt-1">{stat.value}</p>
              </div>
              <div className={`${stat.color} p-3 rounded-lg text-white`}>
                <stat.icon size={24} />
              </div>
            </div>
          </Card>
        ))}
      </div>
      
      {/* Navigation Cards */}
      <h2 className="text-xl font-semibold text-gray-800 mt-8">Quick Access</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
        {navCards.map((card, index) => (
          <Link to={card.path} key={index} className="block group">
            <Card className="p-6 h-full shadow-md hover:shadow-lg transition-shadow border-t-4 border-primary">
              <div className="flex items-center gap-4">
                <div className="bg-primary/10 p-3 rounded-lg text-primary">
                  <card.icon size={24} />
                </div>
                <div>
                  <h3 className="text-lg font-semibold group-hover:text-primary transition-colors">{card.title}</h3>
                  <p className="text-gray-600">{card.description}</p>
                </div>
              </div>
            </Card>
          </Link>
        ))}
      </div>

      <h2 className="text-xl font-semibold text-gray-800 mt-8">Tools</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-2">
        <div>
          <Card className="p-6 shadow-md h-full">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <FileText size={20} className="text-primary" /> Knowledge Base
            </h3>
            <KnowledgeBaseUploader 
              propertyId="demo-property-id"
              onFileAdded={handleFileAdded}
            />
          </Card>
        </div>
        
        <div>
          <Card className="p-6 shadow-md h-full">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <MessageSquare size={20} className="text-primary" /> Gmail Integration
            </h3>
            <GmailIntegration 
              propertyId="demo-property-id"
              onMessagesImported={handleMessagesImported}
            />
          </Card>
        </div>
      </div>
    </div>
  );
}
