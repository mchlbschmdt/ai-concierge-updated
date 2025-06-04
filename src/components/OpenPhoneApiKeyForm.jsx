
import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/use-toast";
import { Key, ExternalLink, CheckCircle, AlertCircle } from "lucide-react";

export default function OpenPhoneApiKeyForm() {
  const [apiKey, setApiKey] = useState('');
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState(null);
  const { toast } = useToast();

  const testApiKey = async () => {
    if (!apiKey.trim()) {
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
      // Test the API key by trying to fetch phone numbers
      const response = await fetch('https://api.openphone.com/v1/phone-numbers', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${apiKey.trim()}`,
          'Content-Type': 'application/json',
        }
      });

      if (response.ok) {
        const data = await response.json();
        setTestResult({
          success: true,
          message: `API key is valid! Found ${data.data?.length || 0} phone numbers.`,
          phoneNumbers: data.data
        });
        toast({
          title: "API Key Valid",
          description: "Your OpenPhone API key is working correctly",
        });
      } else {
        const errorText = await response.text();
        setTestResult({
          success: false,
          message: `API key test failed: ${response.status} - ${errorText}`,
        });
        toast({
          title: "API Key Invalid",
          description: `Status: ${response.status}`,
          variant: "destructive"
        });
      }
    } catch (error) {
      setTestResult({
        success: false,
        message: `Network error: ${error.message}`,
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

  return (
    <div className="bg-white rounded-lg shadow-sm p-4">
      <h3 className="text-lg font-semibold mb-4 flex items-center">
        <Key className="mr-2 h-5 w-5" />
        OpenPhone API Key Configuration
      </h3>
      
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-2">OpenPhone API Key</label>
          <Input
            type="password"
            placeholder="Enter your OpenPhone API key..."
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            className="font-mono"
          />
          <p className="text-xs text-gray-500 mt-1">
            Get your API key from your OpenPhone account settings
          </p>
        </div>

        <Button 
          onClick={testApiKey}
          disabled={testing || !apiKey.trim()}
          className="w-full"
        >
          {testing ? "Testing..." : "Test API Key"}
        </Button>

        {testResult && (
          <div className={`p-3 rounded-lg border ${
            testResult.success 
              ? 'bg-green-50 border-green-200' 
              : 'bg-red-50 border-red-200'
          }`}>
            <div className="flex items-center gap-2 mb-2">
              {testResult.success ? (
                <CheckCircle className="h-4 w-4 text-green-600" />
              ) : (
                <AlertCircle className="h-4 w-4 text-red-600" />
              )}
              <span className="font-medium text-sm">{testResult.message}</span>
            </div>
            
            {testResult.success && testResult.phoneNumbers && (
              <div className="mt-2">
                <p className="text-xs font-medium text-gray-700">Available Phone Numbers:</p>
                <div className="mt-1 space-y-1">
                  {testResult.phoneNumbers.map((phone, index) => (
                    <div key={index} className="text-xs bg-white p-2 rounded border">
                      <strong>{phone.phoneNumber}</strong>
                      {phone.name && <span className="ml-2 text-gray-600">({phone.name})</span>}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        <div className="bg-blue-50 p-3 rounded text-sm">
          <p className="font-medium mb-2">Next Steps:</p>
          <ol className="list-decimal list-inside space-y-1 text-xs">
            <li>Test your API key above to verify it works</li>
            <li>If valid, go to Supabase Edge Functions Secrets</li>
            <li>Update the OPENPHONE_API_KEY secret with your new key</li>
            <li>Test SMS functionality by sending a message to your OpenPhone number</li>
          </ol>
        </div>

        <div className="bg-yellow-50 p-3 rounded text-sm">
          <p className="font-medium mb-1">Important Notes:</p>
          <ul className="list-disc list-inside space-y-1 text-xs">
            <li>API key must have SMS sending permissions enabled</li>
            <li>Make sure your OpenPhone account is active and in good standing</li>
            <li>Check that you're using the correct API key (not a webhook secret)</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
