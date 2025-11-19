import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { TEST_ASSERTIONS } from "@/config/testAssertions";
import { TestAssertionService } from "@/services/testAssertionService";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { GitCompare, Loader2, CheckCircle, XCircle } from "lucide-react";

export default function PropertyComparisonTest() {
  const [properties, setProperties] = useState([]);
  const [selectedProperties, setSelectedProperties] = useState([]);
  const [selectedTest, setSelectedTest] = useState("waterpark");
  const [comparisonResults, setComparisonResults] = useState([]);
  const [isRunning, setIsRunning] = useState(false);
  const [testRunId] = useState(crypto.randomUUID());

  useEffect(() => {
    loadProperties();
  }, []);

  const loadProperties = async () => {
    const { data } = await supabase
      .from("properties")
      .select("id, property_name, code, address")
      .order("property_name");
    setProperties(data || []);
  };

  const toggleProperty = (propertyId) => {
    setSelectedProperties(prev =>
      prev.includes(propertyId)
        ? prev.filter(id => id !== propertyId)
        : [...prev, propertyId]
    );
  };

  const runComparison = async () => {
    if (selectedProperties.length === 0) {
      alert("Select at least one property");
      return;
    }

    setIsRunning(true);
    setComparisonResults([]);
    const testPhone = "+12627453798";
    const testConfig = TEST_ASSERTIONS[selectedTest];
    const results = [];

    for (const propertyId of selectedProperties) {
      try {
        const startTime = Date.now();
        const property = properties.find(p => p.id === propertyId);
        
        // Send test message
        await supabase.functions.invoke("openphone-webhook", {
          body: {
            data: {
              object: "message",
              id: `comparison_${Date.now()}_${propertyId}`,
              from: testPhone,
              to: "+18332663336",
              body: testConfig.message,
              direction: "incoming",
              createdAt: new Date().toISOString(),
            },
            type: "message.created"
          }
        });

        await new Promise(resolve => setTimeout(resolve, 2000));

        // Fetch response
        const { data: conversation } = await supabase
          .from("sms_conversations")
          .select("last_response, last_intent, id")
          .eq("phone_number", testPhone)
          .eq("property_id", property.code)
          .order("updated_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (!conversation) {
          throw new Error("No conversation found");
        }

        const responseTime = Date.now() - startTime;
        const validation = TestAssertionService.validateResponse(
          selectedTest,
          conversation.last_response
        );

        // Save to database
        await TestAssertionService.saveTestResult({
          testName: testConfig.name,
          message: testConfig.message,
          phoneNumber: testPhone,
          propertyId,
          response: conversation.last_response,
          intent: conversation.last_intent,
          responseTime,
          expectedKeywords: testConfig.expectedKeywords,
          forbiddenKeywords: testConfig.forbiddenKeywords,
          keywordsFound: validation.keywordsFound,
          keywordsMissing: validation.keywordsMissing,
          unexpectedKeywordsFound: validation.unexpectedKeywordsFound,
          passed: validation.passed,
          score: validation.score,
          reason: validation.reason,
          testRunId,
          conversationId: conversation.id
        });

        results.push({
          propertyId,
          propertyName: property.property_name,
          propertyCode: property.code,
          response: conversation.last_response,
          intent: conversation.last_intent,
          validation,
          responseTime
        });

      } catch (error) {
        console.error(`Error testing property ${propertyId}:`, error);
        const property = properties.find(p => p.id === propertyId);
        results.push({
          propertyId,
          propertyName: property?.property_name,
          error: error.message,
          validation: { passed: false, score: 0, reason: "Test failed" }
        });
      }
    }

    setComparisonResults(results);
    setIsRunning(false);
  };

  return (
    <Card className="border-primary/20">
      <CardHeader>
        <div className="flex items-center gap-2">
          <GitCompare className="h-5 w-5 text-primary" />
          <CardTitle>Property Comparison Testing</CardTitle>
        </div>
        <p className="text-sm text-muted-foreground">
          Test the same message across multiple properties to verify consistent behavior
        </p>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Test Selection */}
        <div>
          <label className="block text-sm font-medium mb-2">Test Scenario</label>
          <select
            value={selectedTest}
            onChange={(e) => setSelectedTest(e.target.value)}
            className="w-full px-3 py-2 border border-border rounded-md bg-background"
          >
            {Object.entries(TEST_ASSERTIONS).map(([key, config]) => (
              <option key={key} value={key}>
                {config.icon} {config.name}: "{config.message}"
              </option>
            ))}
          </select>
        </div>

        {/* Property Selection */}
        <div>
          <label className="block text-sm font-medium mb-2">
            Select Properties ({selectedProperties.length} selected)
          </label>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2 max-h-64 overflow-y-auto border border-border rounded-md p-3 bg-muted/20">
            {properties.map((property) => (
              <div key={property.id} className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={selectedProperties.includes(property.id)}
                  onChange={() => toggleProperty(property.id)}
                  className="rounded border-border"
                />
                <label className="text-sm cursor-pointer">
                  {property.property_name} ({property.code})
                </label>
              </div>
            ))}
          </div>
        </div>

        {/* Run Button */}
        <Button
          onClick={runComparison}
          disabled={isRunning || selectedProperties.length === 0}
          className="w-full"
        >
          {isRunning ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Running comparison...
            </>
          ) : (
            <>
              <GitCompare className="mr-2 h-4 w-4" />
              Run Comparison Test
            </>
          )}
        </Button>

        {/* Results Grid */}
        {comparisonResults.length > 0 && (
          <div className="space-y-3 mt-6">
            <h3 className="font-semibold text-lg">Comparison Results</h3>
            
            {/* Summary */}
            <div className="grid grid-cols-3 gap-3 p-3 bg-muted rounded-lg">
              <div>
                <div className="text-sm text-muted-foreground">Properties Tested</div>
                <div className="text-2xl font-bold">{comparisonResults.length}</div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Passed</div>
                <div className="text-2xl font-bold text-success">
                  {comparisonResults.filter(r => r.validation?.passed).length}
                </div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Failed</div>
                <div className="text-2xl font-bold text-destructive">
                  {comparisonResults.filter(r => !r.validation?.passed).length}
                </div>
              </div>
            </div>

            {/* Individual Results */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {comparisonResults.map((result) => (
                <Card key={result.propertyId} className={
                  result.validation?.passed 
                    ? "border-success" 
                    : "border-destructive"
                }>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-semibold">{result.propertyName}</div>
                        <div className="text-xs text-muted-foreground">{result.propertyCode}</div>
                      </div>
                      {result.validation?.passed ? (
                        <CheckCircle className="h-6 w-6 text-success" />
                      ) : (
                        <XCircle className="h-6 w-6 text-destructive" />
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span>Score:</span>
                      <Badge variant={result.validation?.passed ? "default" : "destructive"}>
                        {result.validation?.score}%
                      </Badge>
                    </div>
                    <div className="text-xs">
                      <span className="font-medium">Intent:</span> {result.intent}
                    </div>
                    <div className="text-xs">
                      <span className="font-medium">Response Time:</span> {result.responseTime}ms
                    </div>
                    <div className="text-xs text-muted-foreground line-clamp-3">
                      {result.response?.substring(0, 150)}...
                    </div>
                    {result.validation?.keywordsMissing?.length > 0 && (
                      <div className="text-xs text-destructive">
                        Missing: {result.validation.keywordsMissing.join(', ')}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
