import React, { useState } from "react";
import Layout from "../components/Layout";
import TestSmsIntegration from "../components/TestSmsIntegration";
import SmsWorkflowTester from "../components/SmsWorkflowTester";
import WebhookTester from "../components/WebhookTester";
import ComprehensiveSmsDebugger from "../components/ComprehensiveSmsDebugger";
import OpenPhoneKeyTester from "../components/OpenPhoneKeyTester";
import ApiKeyResolutionGuide from "../components/ApiKeyResolutionGuide";
import DeploymentVerifier from "../components/DeploymentVerifier";
import EdgeFunctionDiagnostics from "../components/EdgeFunctionDiagnostics";
import ClientSideApiTest from "../components/ClientSideApiTest";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Shield, Activity, MessageSquare, Wrench } from "lucide-react";

export default function SystemDiagnostics() {
  return (
    <Layout>
      <div className="p-6">
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-2">
            <Shield className="h-8 w-8 text-error" />
            <h1 className="text-3xl font-bold text-heading">System Diagnostics</h1>
          </div>
          <p className="text-muted-foreground">
            Super Admin testing and debugging tools
          </p>
        </div>

        <Tabs defaultValue="api" className="w-full">
          <TabsList className="mb-6">
            <TabsTrigger value="api" className="flex items-center gap-2">
              <Wrench className="h-4 w-4" />
              API Testing
            </TabsTrigger>
            <TabsTrigger value="sms" className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              SMS Testing
            </TabsTrigger>
            <TabsTrigger value="health" className="flex items-center gap-2">
              <Activity className="h-4 w-4" />
              System Health
            </TabsTrigger>
          </TabsList>

          <TabsContent value="api" className="space-y-6">
            <div className="bg-card rounded-lg shadow-card p-6">
              <h2 className="text-xl font-semibold text-heading mb-4">API Key Testing</h2>
              <OpenPhoneKeyTester />
            </div>
            
            <div className="bg-card rounded-lg shadow-card p-6">
              <h2 className="text-xl font-semibold text-heading mb-4">API Key Resolution</h2>
              <ApiKeyResolutionGuide />
            </div>

            <div className="bg-card rounded-lg shadow-card p-6">
              <h2 className="text-xl font-semibold text-heading mb-4">Client-Side API Test</h2>
              <ClientSideApiTest />
            </div>
          </TabsContent>

          <TabsContent value="sms" className="space-y-6">
            <div className="bg-card rounded-lg shadow-card p-6">
              <h2 className="text-xl font-semibold text-heading mb-4">SMS Integration Status</h2>
              <TestSmsIntegration />
            </div>

            <div className="bg-card rounded-lg shadow-card p-6">
              <h2 className="text-xl font-semibold text-heading mb-4">SMS Workflow Testing</h2>
              <SmsWorkflowTester />
            </div>

            <div className="bg-card rounded-lg shadow-card p-6">
              <h2 className="text-xl font-semibold text-heading mb-4">Webhook Testing</h2>
              <WebhookTester />
            </div>
          </TabsContent>

          <TabsContent value="health" className="space-y-6">
            <div className="bg-card rounded-lg shadow-card p-6">
              <h2 className="text-xl font-semibold text-heading mb-4">SMS System Debugger</h2>
              <ComprehensiveSmsDebugger />
            </div>

            <div className="bg-card rounded-lg shadow-card p-6">
              <h2 className="text-xl font-semibold text-heading mb-4">Deployment Status</h2>
              <DeploymentVerifier />
            </div>

            <div className="bg-card rounded-lg shadow-card p-6">
              <h2 className="text-xl font-semibold text-heading mb-4">Edge Function Diagnostics</h2>
              <EdgeFunctionDiagnostics />
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}
