
import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/use-toast";
import { Key, ExternalLink, CheckCircle, AlertCircle, RefreshCw, Copy, Phone, MessageSquare, Database } from "lucide-react";

export default function OpenPhoneApiKeyForm() {
  const [apiKey, setApiKey] = useState('');
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState(null);
  const [copying, setCopying] = useState(false);
  const [testingCurrent, setTestingCurrent] = useState(false);
  const [currentKeyResult, setCurrentKeyResult] = useState(null);
  const [sendingSms, setSendingSms] = useState(false);
  const [smsResult, setSmsResult] = useState(null);
  const { toast } = useToast();

  const testCurrentApiKey = async () => {
    setTestingCurrent(true);
    setCurrentKeyResult(null);

    try {
      console.log('🔍 Testing current API key in Supabase...');
      
      // Test by calling our send-sms edge function with a test message
      const testResponse = await fetch('https://zutwyyepahbbvrcbsbke.supabase.co/functions/v1/send-sms', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp1dHd5eWVwYWhiYnZyY2JzYmtlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDU0MDg3MDMsImV4cCI6MjA2MDk4NDcwM30.kUje38W2D2vXjYos6laaZ_rOzADLGiftoHAztFqSP9g`
        },
        body: JSON.stringify({
          to: '+15551234567',
          message: 'API KEY TEST - Please ignore this message',
          phoneNumberId: '+18333301032'
        })
      });

      const responseData = await testResponse.text();
      console.log('Current API key test response:', responseData);

      if (testResponse.ok) {
        setCurrentKeyResult({
          success: true,
          message: '✅ Current API key is working! SMS sending should be functional.',
          details: responseData
        });
        toast({
          title: "Current API Key Working",
          description: "Your current OpenPhone API key is valid and SMS sending should work",
        });
      } else {
        setCurrentKeyResult({
          success: false,
          message: `❌ Current API key failed: ${testResponse.status}`,
          details: responseData
        });
        toast({
          title: "Current API Key Issues",
          description: `Status: ${testResponse.status} - Check details below`,
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Current API key test error:', error);
      setCurrentKeyResult({
        success: false,
        message: `❌ Test failed: ${error.message}`,
        details: error.toString()
      });
      toast({
        title: "Test Failed",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setTestingCurrent(false);
    }
  };

  const testDirectSms = async () => {
    if (!apiKey.trim()) {
      toast({
        title: "API Key Required",
        description: "Please enter an API key to test SMS sending",
        variant: "destructive"
      });
      return;
    }

    setSendingSms(true);
    setSmsResult(null);

    try {
      console.log('🚀 Testing direct SMS sending...');
      
      // Test direct SMS sending with the provided API key
      const response = await fetch('https://api.openphone.com/v1/messages', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey.trim()}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          to: ['+12627453798'], // Use your actual phone number for testing
          text: 'TEST: OpenPhone API direct test - please ignore',
          from: '+18333301032' // Your OpenPhone number
        })
      });

      const responseData = await response.json();
      console.log('Direct SMS test response:', responseData);

      if (response.ok) {
        setSmsResult({
          success: true,
          message: '✅ SMS sent successfully! Check your phone.',
          messageId: responseData.id,
          details: responseData
        });
        toast({
          title: "SMS Sent Successfully",
          description: "Test SMS was sent. Check your phone for the message.",
        });
      } else {
        setSmsResult({
          success: false,
          message: `❌ SMS sending failed: ${response.status}`,
          error: responseData,
          details: responseData
        });
        toast({
          title: "SMS Sending Failed",
          description: `Status: ${response.status} - Check details below`,
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Direct SMS test error:', error);
      setSmsResult({
        success: false,
        message: `❌ Network error: ${error.message}`,
        details: error.toString()
      });
      toast({
        title: "SMS Test Failed",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setSendingSms(false);
    }
  };

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
        🔧 OpenPhone API Diagnostics & Testing
      </h3>
      
      <div className="space-y-4">
        {/* Current Status Section */}
        <div className="bg-blue-50 p-3 rounded-lg border-l-4 border-blue-400">
          <div className="flex items-center gap-2 mb-3">
            <Database className="h-4 w-4 text-blue-600" />
            <span className="font-medium text-sm text-blue-800">Step 1: Test Current Setup</span>
          </div>
          <p className="text-xs text-blue-700 mb-3">
            Test if the current API key in Supabase is working after OpenPhone's changes.
          </p>
          <Button 
            onClick={testCurrentApiKey}
            disabled={testingCurrent}
            className="w-full bg-blue-600 hover:bg-blue-700"
          >
            {testingCurrent ? (
              <>
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                Testing Current Setup...
              </>
            ) : (
              <>
                <Database className="mr-2 h-4 w-4" />
                Test Current API Key in Supabase
              </>
            )}
          </Button>
          
          {currentKeyResult && (
            <div className={`mt-3 p-3 rounded border ${
              currentKeyResult.success 
                ? 'bg-green-50 border-green-200' 
                : 'bg-red-50 border-red-200'
            }`}>
              <div className="flex items-center gap-2 mb-2">
                {currentKeyResult.success ? (
                  <CheckCircle className="h-4 w-4 text-green-600" />
                ) : (
                  <AlertCircle className="h-4 w-4 text-red-600" />
                )}
                <span className="font-medium text-xs">{currentKeyResult.message}</span>
              </div>
              {currentKeyResult.details && (
                <pre className="text-xs bg-gray-100 p-2 rounded mt-2 overflow-x-auto">
                  {typeof currentKeyResult.details === 'string' 
                    ? currentKeyResult.details 
                    : JSON.stringify(currentKeyResult.details, null, 2)}
                </pre>
              )}
            </div>
          )}
        </div>

        {/* New API Key Testing Section */}
        <div className="bg-yellow-50 p-3 rounded-lg border-l-4 border-yellow-400">
          <div className="flex items-center gap-2 mb-2">
            <AlertCircle className="h-4 w-4 text-yellow-600" />
            <span className="font-medium text-sm text-yellow-800">Step 2: Test New API Key (if current fails)</span>
          </div>
          <p className="text-xs text-yellow-700 mb-3">
            If the current setup fails, get a fresh API key and test it here.
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">New OpenPhone API Key</label>
          <Input
            type="password"
            placeholder="Enter fresh API key if current one fails..."
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            className="font-mono"
          />
          <p className="text-xs text-gray-500 mt-1">
            Get a new API key from your OpenPhone Developer settings
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
          <Button 
            onClick={testApiKey}
            disabled={testing || !apiKey.trim()}
            variant="outline"
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
            onClick={testDirectSms}
            disabled={sendingSms || !apiKey.trim()}
            variant="outline"
            className="w-full"
          >
            {sendingSms ? (
              <>
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                Sending...
              </>
            ) : (
              <>
                <MessageSquare className="mr-2 h-4 w-4" />
                Test SMS Send
              </>
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

        {/* Test Results */}
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

        {/* SMS Test Results */}
        {smsResult && (
          <div className={`p-3 rounded-lg border ${
            smsResult.success 
              ? 'bg-green-50 border-green-200' 
              : 'bg-red-50 border-red-200'
          }`}>
            <div className="flex items-center gap-2 mb-2">
              {smsResult.success ? (
                <CheckCircle className="h-4 w-4 text-green-600" />
              ) : (
                <AlertCircle className="h-4 w-4 text-red-600" />
              )}
              <span className="font-medium text-sm">{smsResult.message}</span>
            </div>
            
            {smsResult.messageId && (
              <p className="text-xs text-gray-600">Message ID: {smsResult.messageId}</p>
            )}
            
            {smsResult.details && (
              <pre className="text-xs bg-gray-100 p-2 rounded mt-2 overflow-x-auto">
                {typeof smsResult.details === 'string' 
                  ? smsResult.details 
                  : JSON.stringify(smsResult.details, null, 2)}
              </pre>
            )}
          </div>
        )}

        <div className="bg-blue-50 p-3 rounded text-sm">
          <p className="font-medium mb-2">📋 Step-by-Step Fix:</p>
          <ol className="list-decimal list-inside space-y-1 text-xs">
            <li>First click "Test Current API Key in Supabase" above</li>
            <li>If that works, you're done! If not, get a fresh API key from <a href="https://app.openphone.com/developer" target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">OpenPhone Developer Settings</a></li>
            <li>Paste it above and click "Test API Key" then "Test SMS Send"</li>
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
