
import React from "react";
import { Card } from "@/components/ui/card";
import { Link } from "react-router-dom";
import KnowledgeBaseUploader from "../components/KnowledgeBaseUploader";
import GmailIntegration from "../components/GmailIntegration";

export default function Dashboard() {
  const handleFileAdded = (fileData) => {
    console.log("File added:", fileData);
    // This would update state in a real implementation
  };

  const handleMessagesImported = (messages) => {
    console.log("Messages imported:", messages);
    // This would update state in a real implementation
  };

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Dashboard</h1>
      <p className="text-gray-600">Welcome to the Hostly AI Concierge dashboard.</p>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Link to="/dashboard/guests-manager" className="block">
          <Card className="p-6 h-full hover:shadow-md transition-shadow">
            <h3 className="text-xl font-semibold">Guests</h3>
            <p className="text-gray-600">Manage your guests</p>
          </Card>
        </Link>
        <Link to="/dashboard/properties-manager" className="block">
          <Card className="p-6 h-full hover:shadow-md transition-shadow">
            <h3 className="text-xl font-semibold">Properties</h3>
            <p className="text-gray-600">Manage your properties</p>
          </Card>
        </Link>
        <Link to="/dashboard/messages" className="block">
          <Card className="p-6 h-full hover:shadow-md transition-shadow">
            <h3 className="text-xl font-semibold">Messages</h3>
            <p className="text-gray-600">View your messages</p>
          </Card>
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
        <div>
          <h2 className="text-2xl font-semibold mb-4">Knowledge Base</h2>
          <Card className="p-6">
            <KnowledgeBaseUploader 
              propertyId="demo-property-id"
              onFileAdded={handleFileAdded}
            />
          </Card>
        </div>
        
        <div>
          <h2 className="text-2xl font-semibold mb-4">Gmail Integration</h2>
          <Card className="p-6">
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
