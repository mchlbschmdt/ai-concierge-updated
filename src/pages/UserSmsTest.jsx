import React, { useState, useEffect } from "react";
import Layout from "../components/Layout";
import { supabase } from "../integrations/supabase/client";
import { MessageSquare, Loader2, RotateCcw, ThumbsUp, ThumbsDown, Check, Zap } from "lucide-react";
import { useToast } from "@/context/ToastContext";
import { useProductAccess } from "@/hooks/useProductAccess";

const TEST_PHONE = "+15555555555";

export default function UserSmsTest() {
  const [properties, setProperties] = useState([]);
  const [selectedProperty, setSelectedProperty] = useState("");
  const [testMessage, setTestMessage] = useState("");
  const [testing, setTesting] = useState(false);
  const [setupStep, setSetupStep] = useState("");
  const [response, setResponse] = useState(null);
  const [conversationReady, setConversationReady] = useState(false);
  const [conversationHistory, setConversationHistory] = useState([]);
  const [ratedMessages, setRatedMessages] = useState(new Set());
  const [ratingStats, setRatingStats] = useState({ total: 0, positive: 0 });
  const { showToast } = useToast();
  const { status, usageCount, trialUsesRemaining, incrementUsage } = useProductAccess("ai_concierge");

  const testScenarios = [
    { label: "WiFi Password", message: "What's the wifi password?" },
    { label: "Check-in Time", message: "What time can I check in?" },
    { label: "Pool Hours", message: "What are the pool hours?" },
    { label: "Coffee Shops", message: "Where are good coffee shops nearby?" },
    { label: "Parking Info", message: "Where should I park?" },
    { label: "A/C Help", message: "How do I turn the A/C down?" },
    { label: "TV Setup", message: "How do I use the TV?" },
  ];

  useEffect(() => {
    loadUserProperties();
    loadRatingStats();
  }, []);

  useEffect(() => {
    setConversationReady(false);
    setConversationHistory([]);
    setResponse(null);
    setRatedMessages(new Set());
  }, [selectedProperty]);

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

  const loadRatingStats = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("response_quality_ratings")
        .select("rating")
        .eq("user_id", user.id);

      if (error || !data) return;
      setRatingStats({
        total: data.length,
        positive: data.filter(r => r.rating === "thumbs_up").length,
      });
    } catch {
      // ignore
    }
  };

  const rateResponse = async (index, rating) => {
    try {
      const entry = conversationHistory[index];
      if (!entry || entry.role !== "ai") return;

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase.from("response_quality_ratings").insert({
        property_id: selectedProperty,
        user_id: user.id,
        test_message: conversationHistory[index - 1]?.text || "",
        ai_response: entry.text,
        rating,
      });

      if (error) throw error;

      setRatedMessages(prev => new Set([...prev, index]));
      setRatingStats(prev => ({
        total: prev.total + 1,
        positive: prev.positive + (rating === "thumbs_up" ? 1 : 0),
      }));
      showToast("Rating saved", "success");
    } catch (error) {
      console.error("Rating error:", error);
      showToast("Failed to save rating", "error");
    }
  };

  const invokeConversation = async (action, extra = {}) => {
    const { data, error } = await supabase.functions.invoke("sms-conversation-service", {
      body: { action, phoneNumber: TEST_PHONE, ...extra },
    });
    if (error) throw error;
    return data;
  };

  const parseResponse = (result) => {
    const responseText = Array.isArray(result?.messages)
      ? result.messages.join("\n\n")
      : result?.response || result?.message || "No response returned";
    return {
      message: responseText,
      intent: result?.intent || result?.last_intent || "detected",
    };
  };

  const resetConversation = () => {
    setConversationReady(false);
    setConversationHistory([]);
    setResponse(null);
    setRatedMessages(new Set());
  };

  const testResponse = async (message) => {
    if (!selectedProperty) {
      showToast("Please select a property", "error");
      return;
    }

    // Check trial usage before sending
    if (status === "trial") {
      const result = await incrementUsage();
      if (!result.allowed) return; // Upgrade modal shown automatically
    }

    setTesting(true);
    setResponse(null);

    try {
      const property = properties.find(p => p.id === selectedProperty);

      if (!conversationReady) {
        setSetupStep("Resetting conversation...");
        await invokeConversation("forceResetMemory");

        setSetupStep(`Sending property code (${property.code})...`);
        await invokeConversation("processMessage", { message: property.code });

        setSetupStep("Confirming property...");
        await invokeConversation("processMessage", { message: "Y" });

        setConversationReady(true);
      }

      setSetupStep("Sending your question...");
      const result = await invokeConversation("processMessage", { message });
      const parsed = parseResponse(result);

      setResponse(parsed);
      setConversationHistory(prev => [...prev, { role: "user", text: message }, { role: "ai", text: parsed.message, intent: parsed.intent }]);
      showToast("Test completed successfully", "success");
    } catch (error) {
      console.error("Test error:", error);
      showToast(error.message || "Test failed", "error");
    } finally {
      setTesting(false);
      setSetupStep("");
    }
  };

  const approvalPct = ratingStats.total > 0 ? Math.round((ratingStats.positive / ratingStats.total) * 100) : null;

  return (
    <Layout>
      <div className="p-6 max-w-4xl mx-auto">
        {/* Trial usage counter */}
        {status === "trial" && trialUsesRemaining !== null && (
          <div className="mb-6 bg-warning/10 border border-warning/30 rounded-lg p-3 flex items-center gap-3">
            <Zap className="h-5 w-5 text-warning flex-shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-medium text-foreground">
                Test response {usageCount} of {usageCount + trialUsesRemaining} free
              </p>
              <div className="mt-1 h-1.5 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-warning rounded-full transition-all"
                  style={{ width: `${Math.min(100, (usageCount / (usageCount + trialUsesRemaining)) * 100)}%` }}
                />
              </div>
            </div>
          </div>
        )}

        <div className="mb-6">
          <h1 className="text-3xl font-bold text-heading mb-2">Test AI Responses</h1>

        {/* Rating Stats Bar */}
        {ratingStats.total > 0 && (
          <div className="bg-card rounded-lg shadow-card p-4 mb-6 flex items-center justify-between">
            <span className="text-sm text-muted-foreground">
              <strong>{ratingStats.total}</strong> responses rated
            </span>
            <span className={`text-sm font-medium ${approvalPct >= 70 ? 'text-green-600' : approvalPct >= 40 ? 'text-yellow-600' : 'text-red-600'}`}>
              {approvalPct}% positive
            </span>
          </div>
        )}

        <div className="bg-card rounded-lg shadow-card p-6 mb-6">
          <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-foreground">
                Select Property
              </label>
              <div className="flex items-center gap-2">
                {conversationReady && (
                  <span className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded-full font-medium">
                    Conversation active
                  </span>
                )}
                <button
                  onClick={resetConversation}
                  disabled={testing}
                  className="text-xs px-3 py-1 border border-border rounded-md hover:bg-muted transition-colors disabled:opacity-50 flex items-center gap-1"
                >
                  <RotateCcw className="h-3 w-3" />
                  Reset
                </button>
              </div>
            </div>
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
                onKeyDown={(e) => e.key === "Enter" && testMessage && !testing && testResponse(testMessage)}
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
                    Send
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Conversation History */}
        {conversationHistory.length > 0 && (
          <div className="bg-card rounded-lg shadow-card p-6 mb-6">
            <h3 className="text-lg font-semibold text-heading mb-4">Conversation History</h3>
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {conversationHistory.map((entry, i) => (
                <div key={i} className={`flex ${entry.role === "user" ? "justify-end" : "justify-start"}`}>
                  <div className="max-w-[80%]">
                    <div className={`rounded-lg p-3 ${
                      entry.role === "user"
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted/50 text-foreground"
                    }`}>
                      <p className="text-sm whitespace-pre-wrap">{entry.text}</p>
                      {entry.intent && (
                        <p className="text-xs mt-1 opacity-70">Intent: {entry.intent}</p>
                      )}
                    </div>
                    {/* Rating buttons for AI responses */}
                    {entry.role === "ai" && (
                      <div className="flex items-center gap-1 mt-1 ml-1">
                        {ratedMessages.has(i) ? (
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <Check className="h-3 w-3" /> Rated
                          </span>
                        ) : (
                          <>
                            <button
                              onClick={() => rateResponse(i, "thumbs_up")}
                              className="p-1 rounded hover:bg-green-100 text-muted-foreground hover:text-green-600 transition-colors"
                              title="Good response"
                            >
                              <ThumbsUp className="h-3.5 w-3.5" />
                            </button>
                            <button
                              onClick={() => rateResponse(i, "thumbs_down")}
                              className="p-1 rounded hover:bg-red-100 text-muted-foreground hover:text-red-600 transition-colors"
                              title="Bad response"
                            >
                              <ThumbsDown className="h-3.5 w-3.5" />
                            </button>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {response && (
          <div className="bg-card rounded-lg shadow-card p-6">
            <h3 className="text-lg font-semibold text-heading mb-4">Latest Response</h3>
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
