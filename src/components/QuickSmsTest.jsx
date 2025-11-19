import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/context/ToastContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { 
  Send, 
  Loader2, 
  CheckCircle, 
  XCircle, 
  ChevronDown, 
  ChevronUp,
  MessageSquare,
  ExternalLink
} from "lucide-react";
import { TEST_ASSERTIONS } from "@/config/testAssertions";
import { TestAssertionService } from "@/services/testAssertionService";

export default function QuickSmsTest() {
  const { showToast } = useToast();
  const [isExpanded, setIsExpanded] = useState(false);
  const [selectedPhone, setSelectedPhone] = useState("+12627453798");
  const [selectedProperty, setSelectedProperty] = useState("");
  const [properties, setProperties] = useState([]);
  const [customMessage, setCustomMessage] = useState("");
  const [testResults, setTestResults] = useState({});
  const [loading, setLoading] = useState({});
  const [testRunId] = useState(crypto.randomUUID());

  const testMessages = [
    { id: "waterpark", label: "Waterpark", message: "How do we access the waterpark?", icon: "🏊" },
    { id: "disney", label: "Disney Timing", message: "What time is best to beat the crowds at Disney?", icon: "🎢" },
    { id: "gym", label: "Resort Gym", message: "Does the resort have a gym?", icon: "💪" },
    { id: "ac", label: "AC Test", message: "Does the property have AC?", icon: "❄️" },
    { id: "magic", label: "Magic Kingdom", message: "When should we go to Magic Kingdom?", icon: "🏰" },
    { id: "parking", label: "Parking", message: "Is there parking at Universal?", icon: "🚗" },
  ];

  useEffect(() => {
    loadProperties();
  }, []);

  const loadProperties = async () => {
    try {
      const { data, error } = await supabase
        .from("properties")
        .select("id, property_name, code")
        .order("property_name");

      if (error) throw error;
      setProperties(data || []);
      if (data && data.length > 0) {
        setSelectedProperty(data[0].id);
      }
    } catch (error) {
      console.error("Error loading properties:", error);
    }
  };

  const sendTestMessage = async (message, testId = "custom") => {
    if (!selectedPhone || !selectedProperty) {
      showToast("Please select phone and property", "error");
      return;
    }

    setLoading((prev) => ({ ...prev, [testId]: true }));
    setTestResults((prev) => ({ ...prev, [testId]: null }));

    try {
      const startTime = Date.now();
      
      // Call the openphone-webhook edge function to simulate incoming SMS
      const { data, error } = await supabase.functions.invoke("openphone-webhook", {
        body: {
          data: {
            object: "message",
            id: `test_${Date.now()}`,
            from: selectedPhone,
            to: "+18332663336",
            body: message,
            direction: "incoming",
            createdAt: new Date().toISOString(),
          },
          type: "message.created"
        }
      });

      if (error) throw error;

      // Wait a moment for the conversation to be processed
      await new Promise(resolve => setTimeout(resolve, 1500));

      // Fetch the latest conversation to get the response
      const { data: conversation, error: convError } = await supabase
        .from("sms_conversations")
        .select("last_response, last_intent, id")
        .eq("phone_number", selectedPhone)
        .eq("property_id", selectedProperty)
        .order("updated_at", { ascending: false })
        .limit(1)
        .single();

      if (convError) throw convError;

      const responseTime = Date.now() - startTime;
      
      // Validate response with assertions
      const validation = testId !== "custom" 
        ? TestAssertionService.validateResponse(testId, conversation.last_response)
        : { passed: true, score: 100, reason: "Custom message - no validation" };

      // Save test result to database if not custom
      if (testId !== "custom") {
        const testConfig = TEST_ASSERTIONS[testId];
        await TestAssertionService.saveTestResult({
          testName: testConfig?.name || testId,
          message,
          phoneNumber: selectedPhone,
          propertyId: selectedProperty,
          response: conversation.last_response,
          intent: conversation.last_intent,
          responseTime,
          expectedKeywords: testConfig?.expectedKeywords || [],
          forbiddenKeywords: testConfig?.forbiddenKeywords || [],
          keywordsFound: validation.keywordsFound || [],
          keywordsMissing: validation.keywordsMissing || [],
          unexpectedKeywordsFound: validation.unexpectedKeywordsFound || [],
          passed: validation.passed,
          score: validation.score,
          reason: validation.reason,
          testRunId,
          conversationId: conversation.id
        });
      }

      setTestResults((prev) => ({
        ...prev,
        [testId]: {
          success: true,
          response: conversation?.last_response || "No response yet",
          intent: conversation?.last_intent,
          conversationId: conversation?.id,
          validation,
        },
      }));

      showToast(`Test ${validation.passed ? 'passed' : 'failed'}: ${validation.reason}`, validation.passed ? "success" : "error");
    } catch (error) {
      console.error("Error sending test message:", error);
      setTestResults((prev) => ({
        ...prev,
        [testId]: {
          success: false,
          error: error.message || "Failed to send test message",
        },
      }));
      showToast("Failed to send test message", "error");
    } finally {
      setLoading((prev) => ({ ...prev, [testId]: false }));
    }
  };

  const getButtonVariant = (testId) => {
    if (loading[testId]) return "secondary";
    if (testResults[testId]?.success) return "outline";
    if (testResults[testId]?.success === false) return "outline";
    return "default";
  };

  const getButtonIcon = (testId) => {
    if (loading[testId]) return <Loader2 className="h-4 w-4 animate-spin" />;
    if (testResults[testId]?.success) return <CheckCircle className="h-4 w-4 text-success" />;
    if (testResults[testId]?.success === false) return <XCircle className="h-4 w-4 text-error" />;
    return <Send className="h-4 w-4" />;
  };

  return (
    <Card className="border-primary/20">
      <CardHeader className="cursor-pointer" onClick={() => setIsExpanded(!isExpanded)}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg">Quick SMS Test</CardTitle>
            <span className="text-sm text-gray-dark">
              (Test recent fixes: Resort amenities, Disney timing, AC detection)
            </span>
          </div>
          <Button variant="ghost" size="sm">
            {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </Button>
        </div>
      </CardHeader>

      {isExpanded && (
        <CardContent className="space-y-4">
          {/* Configuration */}
          <div className="grid grid-cols-2 gap-4 p-4 bg-muted rounded-lg">
            <div>
              <label className="block text-sm font-medium text-heading mb-1">
                Test Phone Number
              </label>
              <Input
                value={selectedPhone}
                onChange={(e) => setSelectedPhone(e.target.value)}
                placeholder="+1234567890"
                className="font-mono"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-heading mb-1">
                Property
              </label>
              <select
                value={selectedProperty}
                onChange={(e) => setSelectedProperty(e.target.value)}
                className="w-full px-3 py-2 border border-gray-soft rounded-md bg-card"
              >
                <option value="">Select property...</option>
                {properties.map((prop) => (
                  <option key={prop.id} value={prop.id}>
                    {prop.property_name} ({prop.code})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Quick Test Buttons */}
          <div>
            <h3 className="text-sm font-semibold text-heading mb-3">Pre-configured Tests</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {testMessages.map((test) => (
                <div key={test.id} className="space-y-2">
                  <Button
                    variant={getButtonVariant(test.id)}
                    className="w-full justify-between"
                    onClick={() => sendTestMessage(test.message, test.id)}
                    disabled={loading[test.id] || !selectedProperty}
                  >
                    <span className="flex items-center gap-2">
                      <span>{test.icon}</span>
                      <span>{test.label}</span>
                    </span>
                    {getButtonIcon(test.id)}
                  </Button>

                  {/* Response Preview */}
                  {testResults[test.id] && (
                    <div className={`text-xs p-2 rounded border space-y-1 ${
                      testResults[test.id].validation?.passed 
                        ? "bg-success/10 border-success/30" 
                        : "bg-destructive/10 border-destructive/30"
                    }`}>
                      {testResults[test.id].success ? (
                        <>
                          <div className="flex items-center justify-between">
                            <span className="font-semibold">
                              {testResults[test.id].validation?.passed ? '✅ PASSED' : '⚠️ FAILED'}
                            </span>
                            <span className="text-xs">
                              Score: {testResults[test.id].validation?.score}%
                            </span>
                          </div>
                          {testResults[test.id].intent && (
                            <div className="text-xs">
                              Intent: <span className="font-mono">{testResults[test.id].intent}</span>
                            </div>
                          )}
                          <div className="text-xs text-muted-foreground">
                            {testResults[test.id].validation?.reason}
                          </div>
                          {testResults[test.id].validation?.keywordsFound?.length > 0 && (
                            <div className="text-xs">
                              ✓ Found: {testResults[test.id].validation.keywordsFound.join(', ')}
                            </div>
                          )}
                          {testResults[test.id].validation?.keywordsMissing?.length > 0 && (
                            <div className="text-xs text-destructive">
                              ✗ Missing: {testResults[test.id].validation.keywordsMissing.join(', ')}
                            </div>
                          )}
                          <div className="text-xs text-muted-foreground line-clamp-2 mt-1 pt-1 border-t">
                            {testResults[test.id].response}
                          </div>
                        </>
                      ) : (
                        <div className="text-destructive">
                          ✗ {testResults[test.id].error}
                        </div>
                      )}
                    </div>
                  )}
                    <div className={`text-xs p-2 rounded border ${
                      testResults[test.id].success 
                        ? "bg-success/10 border-success/30 text-success" 
                        : "bg-error/10 border-error/30 text-error"
                    }`}>
                      {testResults[test.id].success ? (
                        <>
                          <div className="font-semibold mb-1">
                            Intent: {testResults[test.id].intent || "Unknown"}
                          </div>
                          <div className="line-clamp-2">
                            {testResults[test.id].response.substring(0, 100)}...
                          </div>
                          {testResults[test.id].conversationId && (
                            <a
                              href={`#conv-${testResults[test.id].conversationId}`}
                              className="flex items-center gap-1 mt-1 text-primary hover:underline"
                              onClick={(e) => {
                                e.preventDefault();
                                document.getElementById(`conv-${testResults[test.id].conversationId}`)?.scrollIntoView({ behavior: 'smooth' });
                              }}
                            >
                              View full <ExternalLink className="h-3 w-3" />
                            </a>
                          )}
                        </>
                      ) : (
                        <div>❌ {testResults[test.id].error}</div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Custom Message */}
          <div className="pt-4 border-t border-gray-soft">
            <h3 className="text-sm font-semibold text-heading mb-3">Custom Test Message</h3>
            <div className="flex gap-2">
              <Textarea
                value={customMessage}
                onChange={(e) => setCustomMessage(e.target.value)}
                placeholder="Enter a custom test message..."
                className="flex-1"
                rows={2}
              />
              <Button
                onClick={() => customMessage && sendTestMessage(customMessage, "custom")}
                disabled={!customMessage || loading.custom || !selectedProperty}
                className="self-end"
              >
                {getButtonIcon("custom")}
                <span className="ml-2">Send</span>
              </Button>
            </div>
            {testResults.custom && (
              <div className={`mt-2 text-sm p-3 rounded border ${
                testResults.custom.success 
                  ? "bg-success/10 border-success/30" 
                  : "bg-error/10 border-error/30"
              }`}>
                {testResults.custom.success ? (
                  <>
                    <div className="font-semibold text-heading">
                      ✓ Intent: {testResults.custom.intent || "Unknown"}
                    </div>
                    <div className="text-heading mt-1">
                      {testResults.custom.response.substring(0, 200)}
                      {testResults.custom.response.length > 200 ? "..." : ""}
                    </div>
                  </>
                ) : (
                  <div className="text-error">❌ {testResults.custom.error}</div>
                )}
              </div>
            )}
          </div>
        </CardContent>
      )}
    </Card>
  );
}
