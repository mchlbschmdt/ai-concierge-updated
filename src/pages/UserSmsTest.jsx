import React, { useState, useEffect } from "react";
import Layout from "../components/Layout";
import { supabase } from "../integrations/supabase/client";
import { MessageSquare, Loader2 } from "lucide-react";
import { useToast } from "@/context/ToastContext";

const TEST_PHONE = "+15555555555";

export default function UserSmsTest() {
  const [properties, setProperties] = useState([]);
  const [selectedProperty, setSelectedProperty] = useState("");
  const [testMessage, setTestMessage] = useState("");
  const [testing, setTesting] = useState(false);
  const [setupStep, setSetupStep] = useState("");
  const [response, setResponse] = useState(null);
  const { showToast } = useToast();

  const testScenarios = [
    { label: "WiFi Password", message: "What's the wifi password?" },
    { label: "Check-in Time", message: "What time can I check in?" },
    { label: "Pool Hours", message: "What are the pool hours?" },
    { label: "Coffee Shops", message: "Where are good coffee shops nearby?" },
    { label: "Parking Info", message: "Where should I park?" },
  ];

  useEffect(() => {
    loadUserProperties();
  }, []);

  const loadUserProperties = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("properties")
        .select("id, code, property_name, address")
        .order("property_name");

      if (error) throw error;
      setProperties(data || []);
      if (data && data.length > 0) {
        setSelectedProperty(data[0].id);
      }
    } catch (error) {
      console.error("Error loading properties:", error);
      showToast("Failed to load properties", "error");
    }
  };

  const invokeConversation = async (action, extra = {}) => {
    const { data, error } = await supabase.functions.invoke("sms-conversation-service", {
      body: { action, phoneNumber: TEST_PHONE, ...extra },
    });
    if (error) throw error;
    return data;
  };

  const testResponse = async (message) => {
    if (!selectedProperty) {
      showToast("Please select a property", "error");
      return;
    }

    setTesting(true);
    setResponse(null);

    try {
      const property = properties.find(p => p.id === selectedProperty);

      // Step 1: Reset conversation
      setSetupStep("Resetting conversation...");
      await invokeConversation("forceResetMemory");

      // Step 2: Send property code
      setSetupStep(`Sending property code (${property.code})...`);
      await invokeConversation("processMessage", { message: property.code });

      // Step 3: Confirm property
      setSetupStep("Confirming property...");
      await invokeConversation("processMessage", { message: "Y" });

      // Step 4: Send actual question
      setSetupStep("Sending your question...");
      const result = await invokeConversation("processMessage", { message });

      setResponse({
        message: result?.response || "No response returned",
        intent: result?.intent || result?.last_intent || "detected",
      });
      showToast("Test completed successfully", "success");
    } catch (error) {
      console.error("Test error:", error);
      showToast(error.message || "Test failed", "error");
    } finally {
      setTesting(false);
      setSetupStep("");
    }
  };

  return (
    <Layout>
      <div className="p-6 max-w-4xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-heading mb-2">Test AI Responses</h1>
          <p className="text-muted-foreground">
            Test how your AI concierge responds to common guest questions
          </p>
        </div>

        <div className="bg-card rounded-lg shadow-card p-6 mb-6">
          <div className="mb-4">
            <label className="block text-sm font-medium text-foreground mb-2">
              Select Property
            </label>
            <select
              value={selectedProperty}
              onChange={(e) => setSelectedProperty(e.target.value)}
              className="w-full px-4 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="">Select a property...</option>
              {properties.map((property) => (
                <option key={property.id} value={property.id}>
                  {property.property_name} ({property.code})
                </option>
              ))}
            </select>
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-foreground mb-2">
              Quick Test Scenarios
            </label>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {testScenarios.map((scenario, index) => (
                <button
                  key={index}
                  onClick={() => testResponse(scenario.message)}
                  disabled={testing}
                  className="px-4 py-2 bg-secondary text-white rounded-md hover:bg-secondary/90 transition-colors disabled:opacity-50"
                >
                  {scenario.label}
                </button>
              ))}
            </div>
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-foreground mb-2">
              Custom Message
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={testMessage}
                onChange={(e) => setTestMessage(e.target.value)}
                placeholder="Type a custom test message..."
                className="flex-1 px-4 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
              />
              <button
                onClick={() => testResponse(testMessage)}
                disabled={testing || !testMessage}
                className="px-6 py-2 bg-primary text-white rounded-md hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                {testing ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    {setupStep || "Testing..."}
                  </>
                ) : (
                  <>
                    <MessageSquare className="h-4 w-4" />
                    Test
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {response && (
          <div className="bg-card rounded-lg shadow-card p-6">
            <h3 className="text-lg font-semibold text-heading mb-4">AI Response</h3>
            
            <div className="mb-4">
              <p className="text-sm text-muted-foreground mb-1">Detected Intent:</p>
              <span className="inline-block px-3 py-1 bg-primary/10 text-primary rounded-full text-sm font-medium">
                {response.intent || "Unknown"}
              </span>
            </div>

            <div>
              <p className="text-sm text-muted-foreground mb-2">Response:</p>
              <div className="bg-muted/30 rounded-lg p-4">
                <p className="text-foreground whitespace-pre-wrap">{response.message}</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
