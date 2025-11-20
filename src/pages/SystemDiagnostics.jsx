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
import { SwipeableTabs, TabsContent } from "@/components/ui/swipeable-tabs";
import SwipeIndicator from "@/components/ui/SwipeIndicator";
import { Shield, Activity, MessageSquare, Wrench } from "lucide-react";

export default function SystemDiagnostics() {
  const [showSwipeHint, setShowSwipeHint] = useState(true);

  return (
    <Layout>
      <div className="p-4 sm:p-6">
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-2">
            <Shield className="h-6 sm:h-8 w-6 sm:w-8 text-error" />
            <h1 className="text-2xl sm:text-3xl font-bold text-heading">System Diagnostics</h1>
          </div>
          <p className="text-sm sm:text-base text-muted-foreground">
            Super Admin testing and debugging tools
          </p>
        </div>

        <SwipeableTabs 
          defaultValue="api" 
          tabs={[
            { value: 'api', label: 'API Testing', icon: <Wrench className="h-4 w-4" /> },
            { value: 'sms', label: 'SMS Testing', icon: <MessageSquare className="h-4 w-4" /> },
            { value: 'health', label: 'System Health', icon: <Activity className="h-4 w-4" /> }
          ]}
          className="w-full"
        >

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
        </SwipeableTabs>

        <SwipeIndicator show={showSwipeHint} onDismiss={() => setShowSwipeHint(false)} />
      </div>
    </Layout>
  );
}
