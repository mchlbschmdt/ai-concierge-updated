
import React from "react";
import Layout from "../components/Layout";
import SmsIntegration from "../components/SmsIntegration";
import TestSmsIntegration from "../components/TestSmsIntegration";

export default function Dashboard() {
  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-600">Manage your properties and guest communications</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <SmsIntegration />
          <TestSmsIntegration />
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-xl font-semibold mb-4">Recent Activity</h2>
          <p className="text-gray-500">No recent activity to display.</p>
        </div>
      </div>
    </Layout>
  );
}
