
import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/use-toast";
import { Key, ExternalLink, CheckCircle, AlertCircle, RefreshCw, Copy } from "lucide-react";

export default function OpenPhoneApiKeyForm() {
  const [apiKey, setApiKey] = useState('');
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState(null);
  const [copying, setCopying] = useState(false);
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
      console.log('Testing OpenPhone API key...');
      // Test the API key by trying to fetch phone numbers
      const response = await fetch('https://api.openphone.com/v1/phone-numbers', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${apiKey.trim()}`,
          'Content-Type': 'application/json',
        }
      });

      console.log('API key test response status:', response.status);

      if (response.ok) {
        const data = await response.json();
        console.log('API key test successful:', data);
        setTestResult({
          success: true,
          message: `✅ API key is valid! Found ${data.data?.length || 0} phone numbers.`,
          phoneNumbers: data.data
        });
        toast({
          title: "API Key Valid",
          description: "Your OpenPhone API key is working correctly",
        });
      } else {
        const errorText = await response.text();
        console.log('API key test failed:', errorText);
        setTestResult({
          success: false,
          message: `❌ API key test failed: ${response.status} - ${errorText}`,
        });
        toast({
          title: "API Key Invalid",
          description: `Status: ${response.status}`,
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('API key test error:', error);
      setTestResult({
        success: false,
        message: `❌ Network error: ${error.message}`,
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

  const copyApiKey = async () => {
    if (!apiKey.trim()) {
      toast({
        title: "No API Key",
        description: "Enter an API key first",
        variant: "destructive"
      });
      return;
    }

    setCopying(true);
    try {
      await navigator.clipboard.writeText(apiKey.trim());
      toast({
        title: "API Key Copied",
        description: "API key copied to clipboard. Now update it in Supabase Edge Functions secrets.",
      });
    } catch (error) {
      toast({
        title: "Copy Failed",
        description: "Could not copy to clipboard",
        variant: "destructive"
      });
    } finally {
      setCopying(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm p-4">
      <h3 className="text-lg font-semibold mb-4 flex items-center">
        <Key className="mr-2 h-5 w-5" />
        🔑 Fix OpenPhone API Key Issue
      </h3>
      
      <div className="space-y-4">
        <div className="bg-red-50 p-3 rounded-lg border-l-4 border-red-400">
          <div className="flex items-center gap-2 mb-2">
            <AlertCircle className="h-4 w-4 text-red-600" />
            <span className="font-medium text-sm text-red-800">Current Issue: API Key Invalid/Expired</span>
          </div>
          <p className="text-xs text-red-700">
            Your webhook is working perfectly, but SMS sending fails due to an invalid OpenPhone API key (401 Unauthorized).
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">New OpenPhone API Key</label>
          <Input
            type="password"
            placeholder="Enter your fresh OpenPhone API key..."
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            className="font-mono"
          />
          <p className="text-xs text-gray-500 mt-1">
            Get a new API key from your OpenPhone Developer settings
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          <Button 
            onClick={testApiKey}
            disabled={testing || !apiKey.trim()}
            className="w-full"
          >
            {testing ? (
              <>
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                Testing...
              </>
            ) : (
              "Test API Key"
            )}
          </Button>

          <Button 
            onClick={copyApiKey}
            disabled={copying || !apiKey.trim() || !testResult?.success}
            variant="outline"
            className="w-full"
          >
            {copying ? (
              <>
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                Copying...
              </>
            ) : (
              <>
                <Copy className="mr-2 h-4 w-4" />
                Copy for Supabase
              </>
            )}
          </Button>
        </div>

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
          <p className="font-medium mb-2">📋 Step-by-Step Fix:</p>
          <ol className="list-decimal list-inside space-y-1 text-xs">
            <li>Get a fresh API key from <a href="https://app.openphone.com/developer" target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">OpenPhone Developer Settings</a></li>
            <li>Paste it above and click "Test API Key"</li>
            <li>If valid, click "Copy for Supabase"</li>
            <li>Go to <a href={`https://supabase.com/dashboard/project/zutwyyepahbbvrcbsbke/settings/functions`} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">Supabase Edge Functions Secrets</a></li>
            <li>Update the <code className="bg-gray-200 px-1 rounded">OPENPHONE_API_KEY</code> secret</li>
            <li>Test SMS by sending "1001" to +1 (833) 330-1032</li>
          </ol>
        </div>

        <div className="bg-yellow-50 p-3 rounded text-sm">
          <p className="font-medium mb-1">⚠️ Common Issues:</p>
          <ul className="list-disc list-inside space-y-1 text-xs">
            <li>API key expired or revoked</li>
            <li>Insufficient SMS permissions on OpenPhone account</li>
            <li>Account billing issues</li>
            <li>Wrong API key (webhook secret vs API key)</li>
          </ul>
        </div>

        <div className="bg-green-50 p-3 rounded text-sm">
          <p className="font-medium mb-1">✅ Good News:</p>
          <ul className="list-disc list-inside space-y-1 text-xs">
            <li>Your webhook is receiving messages perfectly</li>
            <li>Message processing and response generation works</li>
            <li>Database storage is working</li>
            <li>Only SMS sending needs the API key fix</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
