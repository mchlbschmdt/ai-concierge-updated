
import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/use-toast";
import { Key, CheckCircle, AlertCircle, RefreshCw, ExternalLink } from "lucide-react";

export default function ClientSideApiTest() {
  const [apiKey, setApiKey] = useState('');
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState(null);
  const { toast } = useToast();

  const testApiKeyDirectly = async () => {
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
      console.log('🔍 Testing API key directly from frontend...');
      
      // Test by fetching phone numbers
      const response = await fetch('https://api.openphone.com/v1/phone-numbers', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${apiKey.trim()}`,
          'Content-Type': 'application/json',
        }
      });

      console.log(`OpenPhone API response status: ${response.status}`);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('API key validation failed:', response.status, errorText);
        
        setTestResult({
          success: false,
          message: `❌ API key validation failed: ${response.status}`,
          details: errorText,
          suggestion: response.status === 401 
            ? 'Invalid API key - check your OpenPhone developer settings'
            : response.status === 403
            ? 'API key lacks required permissions'
            : 'Network or API error'
        });
        
        toast({
          title: "API Key Invalid",
          description: `Status ${response.status}: Check API key permissions`,
          variant: "destructive"
        });
        return;
      }

      const data = await response.json();
      console.log('✅ API key validation successful:', data);
      
      setTestResult({
        success: true,
        message: `✅ API key is valid! Found ${data.data?.length || 0} phone numbers.`,
        phoneNumbers: data.data
      });
      
      toast({
        title: "API Key Valid",
        description: "Your OpenPhone API key is working correctly",
      });

    } catch (error) {
      console.error('Direct API test error:', error);
      
      let errorMessage = error.message;
      let suggestion = '';
      
      if (error.name === 'TypeError' && error.message.includes('fetch')) {
        errorMessage = 'Network error - CORS or connectivity issue';
        suggestion = 'This is expected when testing from frontend due to CORS. The key might still be valid.';
      }
      
      setTestResult({
        success: false,
        message: `❌ Test failed: ${errorMessage}`,
        details: error.toString(),
        suggestion: suggestion || 'Try copying this key to Supabase if it looks correct'
      });
      
      toast({
        title: "Test Failed",
        description: suggestion || errorMessage,
        variant: "destructive"
      });
    } finally {
      setTesting(false);
    }
  };

  const copyToClipboard = async () => {
    if (!apiKey.trim()) {
      toast({
        title: "No API Key",
        description: "Enter an API key first",
        variant: "destructive"
      });
      return;
    }

    try {
      await navigator.clipboard.writeText(apiKey.trim());
      toast({
        title: "API Key Copied",
        description: "Now update it in Supabase Edge Functions secrets",
      });
    } catch (error) {
      toast({
        title: "Copy Failed",
        description: "Could not copy to clipboard",
        variant: "destructive"
      });
    }
  };

  return (
    <div className="bg-orange-50 p-4 rounded-lg border-l-4 border-orange-400">
      <div className="flex items-center gap-2 mb-3">
        <Key className="h-4 w-4 text-orange-600" />
        <span className="font-medium text-sm text-orange-800">🚧 Workaround: Client-Side API Key Test</span>
      </div>
      
      <p className="text-xs text-orange-700 mb-4">
        Since edge functions aren't deploying, test your API key directly here. 
        This may fail due to CORS, but will help verify if the key format is correct.
      </p>
      
      <div className="space-y-3">
        <div>
          <label className="block text-sm font-medium mb-1 text-orange-800">OpenPhone API Key</label>
          <Input
            type="password"
            placeholder="Enter your OpenPhone API key..."
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            className="font-mono"
          />
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          <Button 
            onClick={testApiKeyDirectly}
            disabled={testing || !apiKey.trim()}
            className="w-full bg-orange-600 hover:bg-orange-700"
          >
            {testing ? (
              <>
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                Testing...
              </>
            ) : (
              <>
                <Key className="mr-2 h-4 w-4" />
                Test API Key
              </>
            )}
          </Button>
          
          <Button 
            onClick={copyToClipboard}
            disabled={!apiKey.trim()}
            variant="outline"
            className="w-full"
          >
            Copy for Supabase
          </Button>
        </div>
        
        {testResult && (
          <div className={`p-3 rounded border ${
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
              <span className="font-medium text-xs">{testResult.message}</span>
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
            
            {testResult.suggestion && (
              <p className="text-xs text-gray-600 mt-2 italic">{testResult.suggestion}</p>
            )}
            
            {testResult.details && (
              <details className="mt-2">
                <summary className="text-xs font-medium text-gray-700 cursor-pointer">Technical Details</summary>
                <pre className="text-xs bg-gray-100 p-2 rounded mt-1 overflow-x-auto">
                  {typeof testResult.details === 'string' 
                    ? testResult.details 
                    : JSON.stringify(testResult.details, null, 2)}
                </pre>
              </details>
            )}
          </div>
        )}
        
        <div className="bg-blue-50 p-3 rounded text-xs">
          <p className="font-medium mb-1">📋 Next Steps:</p>
          <ol className="list-decimal list-inside space-y-1">
            <li>Get a fresh API key from <a href="https://app.openphone.com/developer" target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">OpenPhone Developer Settings</a></li>
            <li>Test it here (may fail due to CORS, but validates format)</li>
            <li>Copy the key and update it in <a href={`https://supabase.com/dashboard/project/zutwyyepahbbvrcbsbke/settings/functions`} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">Supabase Edge Functions Secrets</a></li>
            <li>Wait for edge functions to deploy properly</li>
            <li>Test by sending "1001" to +1 (833) 330-1032</li>
          </ol>
        </div>
      </div>
    </div>
  );
}
