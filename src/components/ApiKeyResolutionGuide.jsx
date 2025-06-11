
import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/use-toast";
import { ExternalLink, CheckCircle, AlertCircle, Copy, RefreshCw } from "lucide-react";

export default function ApiKeyResolutionGuide() {
  const [newApiKey, setNewApiKey] = useState('');
  const [currentStep, setCurrentStep] = useState(1);
  const [testResult, setTestResult] = useState(null);
  const [testing, setTesting] = useState(false);
  const { toast } = useToast();

  const steps = [
    {
      id: 1,
      title: "Get New OpenPhone API Key",
      description: "Generate a fresh API key from OpenPhone developer settings",
      action: "external"
    },
    {
      id: 2,
      title: "Test New API Key",
      description: "Verify the new key works before updating Supabase",
      action: "test"
    },
    {
      id: 3,
      title: "Update Supabase Secret",
      description: "Replace the old key in Supabase Edge Functions secrets",
      action: "external"
    },
    {
      id: 4,
      title: "Verify Fix",
      description: "Test the updated configuration",
      action: "verify"
    }
  ];

  const testNewApiKey = async () => {
    if (!newApiKey.trim()) {
      toast({
        title: "API Key Required",
        description: "Please enter an API key to test",
        variant: "destructive"
      });
      return;
    }

    setTesting(true);
    setTestResult(null);

    try {
      // Test via the send-sms-with-test function
      const response = await fetch('https://zutwyyepahbbvrcbsbke.supabase.co/functions/v1/send-sms-with-test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp1dHd5eWVwYWhiYnZyY2JzYmtlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDU0MDg3MDMsImV4cCI6MjA2MDk4NDcwM30.kUje38W2D2vXjYos6laaZ_rOzADLGiftoHAztFqSP9g`,
          'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp1dHd5eWVwYWhiYnZyY2JzYmtlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDU0MDg3MDMsImV4cCI6MjA2MDk4NDcwM30.kUje38W2D2vXjYos6laaZ_rOzADLGiftoHAztFqSP9g'
        },
        body: JSON.stringify({
          action: 'test-api-key',
          testType: 'validate',
          apiKey: newApiKey.trim()
        })
      });

      const data = await response.json();
      
      if (data.success) {
        setTestResult({
          success: true,
          message: "✅ API Key is valid!",
          details: `Found ${data.phoneNumbers?.length || 0} phone numbers`
        });
        
        toast({
          title: "API Key Valid",
          description: "Your new OpenPhone API key is working correctly",
        });

        setCurrentStep(3); // Move to next step
      } else {
        setTestResult({
          success: false,
          message: "❌ API Key validation failed",
          details: data.error || data.details || "Unknown error"
        });
        
        toast({
          title: "API Key Invalid",
          description: "Please check your API key and try again",
          variant: "destructive"
        });
      }
    } catch (error) {
      setTestResult({
        success: false,
        message: "❌ Test failed",
        details: error.message
      });
      
      toast({
        title: "Test Failed",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setTesting(false);
    }
  };

  const copyToClipboard = async () => {
    if (!newApiKey.trim()) {
      toast({
        title: "No API Key",
        description: "Enter an API key first",
        variant: "destructive"
      });
      return;
    }

    try {
      await navigator.clipboard.writeText(newApiKey.trim());
      toast({
        title: "API Key Copied",
        description: "Now paste it in Supabase Edge Functions secrets",
      });
    } catch (error) {
      toast({
        title: "Copy Failed",
        description: "Could not copy to clipboard",
        variant: "destructive"
      });
    }
  };

  const verifySupabaseKey = async () => {
    setTesting(true);
    
    try {
      const response = await fetch('https://zutwyyepahbbvrcbsbke.supabase.co/functions/v1/send-sms-with-test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp1dHd5eWVwYWhiYnZyY2JzYmtlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDU0MDg3MDMsImV4cCI6MjA2MDk4NDcwM30.kUje38W2D2vXjYos6laaZ_rOzADLGiftoHAztFqSP9g`,
          'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp1dHd5eWVwYWhiYnZyY2JzYmtlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDU0MDg3MDMsImV4cCI6MjA2MDk4NDcwM30.kUje38W2D2vXjYos6laaZ_rOzADLGiftoHAztFqSP9g'
        },
        body: JSON.stringify({
          action: 'test-api-key',
          testType: 'validate'
        })
      });

      const data = await response.json();
      
      if (data.success) {
        toast({
          title: "🎉 Success!",
          description: "API key is now working in Supabase. SMS sending should work!",
        });
        setCurrentStep(5); // Completed
      } else {
        toast({
          title: "Still Not Working",
          description: "Key may need more time to propagate. Wait 1-2 minutes and try again.",
          variant: "destructive"
        });
      }
    } catch (error) {
      toast({
        title: "Verification Failed",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="bg-gradient-to-r from-blue-50 to-green-50 p-6 rounded-lg border">
      <h3 className="text-xl font-bold text-gray-800 mb-4">🔧 API Key Resolution Plan</h3>
      
      <div className="space-y-6">
        {steps.map((step, index) => (
          <div key={step.id} className={`border rounded-lg p-4 ${
            currentStep === step.id ? 'border-blue-500 bg-blue-50' :
            currentStep > step.id ? 'border-green-500 bg-green-50' :
            'border-gray-200 bg-white'
          }`}>
            <div className="flex items-center gap-3 mb-3">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${
                currentStep > step.id ? 'bg-green-500 text-white' :
                currentStep === step.id ? 'bg-blue-500 text-white' :
                'bg-gray-200 text-gray-600'
              }`}>
                {currentStep > step.id ? <CheckCircle className="h-4 w-4" /> : step.id}
              </div>
              <h4 className="font-semibold text-gray-800">{step.title}</h4>
            </div>
            
            <p className="text-sm text-gray-600 mb-3">{step.description}</p>
            
            {/* Step 1: Get New API Key */}
            {step.id === 1 && currentStep === 1 && (
              <div className="space-y-3">
                <Button 
                  onClick={() => window.open('https://app.openphone.com/developer', '_blank')}
                  className="w-full"
                >
                  <ExternalLink className="mr-2 h-4 w-4" />
                  Open OpenPhone Developer Settings
                </Button>
                <div className="text-xs text-gray-600 bg-yellow-50 p-2 rounded">
                  <strong>Instructions:</strong>
                  <ol className="list-decimal list-inside mt-1 space-y-1">
                    <li>Go to your OpenPhone developer dashboard</li>
                    <li>Navigate to API settings or Developer settings</li>
                    <li>Generate a new API key (or check existing key permissions)</li>
                    <li>Copy the API key and paste it in Step 2 below</li>
                  </ol>
                </div>
                <Button 
                  onClick={() => setCurrentStep(2)} 
                  variant="outline" 
                  className="w-full"
                >
                  I have my new API key → Continue to Step 2
                </Button>
              </div>
            )}
            
            {/* Step 2: Test New API Key */}
            {step.id === 2 && currentStep >= 2 && (
              <div className="space-y-3">
                <Input
                  type="password"
                  placeholder="Paste your new OpenPhone API key here..."
                  value={newApiKey}
                  onChange={(e) => setNewApiKey(e.target.value)}
                  className="font-mono"
                />
                <Button 
                  onClick={testNewApiKey}
                  disabled={testing || !newApiKey.trim()}
                  className="w-full"
                >
                  {testing ? (
                    <>
                      <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                      Testing API Key...
                    </>
                  ) : (
                    "Test New API Key"
                  )}
                </Button>
                
                {testResult && (
                  <div className={`p-3 rounded border text-sm ${
                    testResult.success 
                      ? 'bg-green-50 border-green-200 text-green-800' 
                      : 'bg-red-50 border-red-200 text-red-800'
                  }`}>
                    <div className="font-medium">{testResult.message}</div>
                    {testResult.details && (
                      <div className="mt-1 text-xs">{testResult.details}</div>
                    )}
                  </div>
                )}
              </div>
            )}
            
            {/* Step 3: Update Supabase */}
            {step.id === 3 && currentStep >= 3 && (
              <div className="space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <Button 
                    onClick={copyToClipboard}
                    disabled={!newApiKey.trim()}
                    variant="outline"
                  >
                    <Copy className="mr-2 h-4 w-4" />
                    Copy API Key
                  </Button>
                  <Button 
                    onClick={() => window.open('https://supabase.com/dashboard/project/zutwyyepahbbvrcbsbke/settings/functions', '_blank')}
                  >
                    <ExternalLink className="mr-2 h-4 w-4" />
                    Open Supabase Secrets
                  </Button>
                </div>
                <div className="text-xs text-gray-600 bg-yellow-50 p-2 rounded">
                  <strong>Instructions:</strong>
                  <ol className="list-decimal list-inside mt-1 space-y-1">
                    <li>Click "Copy API Key" above to copy your new key</li>
                    <li>Click "Open Supabase Secrets" to go to the secrets page</li>
                    <li>Find "OPENPHONE_API_KEY" in the list</li>
                    <li>Edit it and paste your new API key</li>
                    <li>Save the changes</li>
                    <li>Wait 30-60 seconds for changes to propagate</li>
                  </ol>
                </div>
                <Button 
                  onClick={() => setCurrentStep(4)} 
                  variant="outline" 
                  className="w-full"
                >
                  I've updated the Supabase secret → Continue to Step 4
                </Button>
              </div>
            )}
            
            {/* Step 4: Verify Fix */}
            {step.id === 4 && currentStep >= 4 && (
              <div className="space-y-3">
                <Button 
                  onClick={verifySupabaseKey}
                  disabled={testing}
                  className="w-full"
                >
                  {testing ? (
                    <>
                      <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                      Verifying Fix...
                    </>
                  ) : (
                    "Verify Supabase API Key Is Fixed"
                  )}
                </Button>
                <div className="text-xs text-gray-600 bg-blue-50 p-2 rounded">
                  This will test the API key that's currently configured in Supabase. 
                  If it passes, your SMS sending should now work!
                </div>
              </div>
            )}
          </div>
        ))}
        
        {currentStep >= 5 && (
          <div className="bg-green-100 border border-green-300 rounded-lg p-4">
            <div className="flex items-center gap-2 text-green-800">
              <CheckCircle className="h-5 w-5" />
              <span className="font-semibold">🎉 API Key Issue Resolved!</span>
            </div>
            <p className="text-sm text-green-700 mt-1">
              Your OpenPhone API key is now working. You can test SMS sending using the other components on this page.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
