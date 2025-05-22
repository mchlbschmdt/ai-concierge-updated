
import React from "react";
import { Card } from "@/components/ui/card";

export default function Dashboard() {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Dashboard</h1>
      <p className="text-gray-600">Welcome to the Hostly AI Concierge dashboard.</p>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="p-6">
          <h3 className="text-xl font-semibold">Guests</h3>
          <p className="text-gray-600">Manage your guests</p>
        </Card>
        <Card className="p-6">
          <h3 className="text-xl font-semibold">Properties</h3>
          <p className="text-gray-600">Manage your properties</p>
        </Card>
        <Card className="p-6">
          <h3 className="text-xl font-semibold">Messages</h3>
          <p className="text-gray-600">View your messages</p>
        </Card>
      </div>
    </div>
  );
}
