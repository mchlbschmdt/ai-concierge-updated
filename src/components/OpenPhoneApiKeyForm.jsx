import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/use-toast";
import { Key, ExternalLink, CheckCircle, AlertCircle, RefreshCw, Copy, Phone, MessageSquare, Database } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

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
      
      // Test by calling our send-sms edge function with a test message using Supabase client
      const { data, error } = await supabase.functions.invoke('send-sms', {
        body: {
          to: '+15551234567',
          message: 'API KEY TEST - Please ignore this message',
          phoneNumberId: '+18333301032'
        }
      });

      console.log('Current API key test response:', { data, error });

      if (!error && data) {
        setCurrentKeyResult({
          success: true,
          message: '✅ Current API key is working! SMS sending should be functional.',
          details: data
        });
        toast({
          title: "Current API Key Working",
          description: "Your current OpenPhone API key is valid and SMS sending should work",
        });
      } else {
        setCurrentKeyResult({
          success: false,
          message: `❌ Current API key failed: ${error?.message || 'Unknown error'}`,
          details: error || data
        });
        toast({
          title: "Current API Key Issues",
          description: `Error: ${error?.message || 'Check details below'}`,
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

  const testNewApiKey = async () => {
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
      console.log('🔍 Testing new API key via Supabase edge function...');
      
      const { data, error } = await supabase.functions.invoke('test-openphone-key', {
        body: {
          apiKey: apiKey.trim(),
          testType: 'validate'
        }
      });

      console.log('API key test response:', { data, error });

      if (error) {
        setTestResult({
          success: false,
          message: `❌ Test failed: ${error.message}`,
          details: error
        });
        toast({
          title: "API Key Test Failed",
          description: error.message,
          variant: "destructive"
        });
        return;
      }

      if (data.success) {
        setTestResult({
          success: true,
          message: data.message,
          phoneNumbers: data.phoneNumbers
        });
        toast({
          title: "API Key Valid",
          description: "Your OpenPhone API key is working correctly",
        });
      } else {
        setTestResult({
          success: false,
          message: data.error || 'API key validation failed',
          details: data.details
        });
        toast({
          title: "API Key Invalid",
          description: data.error || 'API key validation failed',
          variant: "destructive"
        });
      }

    } catch (error) {
      console.error('API key test error:', error);
      setTestResult({
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
      setTesting(false);
    }
  };

  const testNewApiKeySms = async () => {
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
      console.log('🚀 Testing SMS sending via Supabase edge function...');
      
      const { data, error } = await supabase.functions.invoke('test-openphone-key', {
        body: {
          apiKey: apiKey.trim(),
          testType: 'sms'
        }
      });

      console.log('SMS test response:', { data, error });

      if (error) {
        setSmsResult({
          success: false,
          message: `❌ SMS test failed: ${error.message}`,
          details: error
        });
        toast({
          title: "SMS Test Failed",
          description: error.message,
          variant: "destructive"
        });
        return;
      }

      if (data.success) {
        setSmsResult({
          success: true,
          message: data.message,
          messageId: data.messageId,
          details: data.details
        });
        toast({
          title: "SMS Sent Successfully",
          description: "Test SMS was sent. Check your phone for the message.",
        });
      } else {
        setSmsResult({
          success: false,
          message: data.error || 'SMS sending failed',
          details: data.details
        });
        toast({
          title: "SMS Sending Failed",
          description: data.error || 'SMS sending failed',
          variant: "destructive"
        });
      }

    } catch (error) {
      console.error('SMS test error:', error);
      setSmsResult({
        success: false,
        message: `❌ SMS test failed: ${error.message}`,
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
            If the current setup fails, get a fresh API key and test it here. All tests run server-side via Supabase.
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
            onClick={testNewApiKey}
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
              <>
                <Key className="mr-2 h-4 w-4" />
                Test API Key
              </>
            )}
          </Button>

          <Button 
            onClick={testNewApiKeySms}
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

            {testResult.details && (
              <pre className="text-xs bg-gray-100 p-2 rounded mt-2 overflow-x-auto">
                {typeof testResult.details === 'string' 
                  ? testResult.details 
                  : JSON.stringify(testResult.details, null, 2)}
              </pre>
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
            <li>All tests now run server-side to avoid CORS issues</li>
          </ul>
        </div>

        <div className="bg-green-50 p-3 rounded text-sm">
          <p className="font-medium mb-1">✅ Good News:</p>
          <ul className="list-disc list-inside space-y-1 text-xs">
            <li>Your webhook is receiving messages perfectly</li>
            <li>Message processing and response generation works</li>
            <li>Database storage is working</li>
            <li>All API tests now run server-side via Supabase edge functions</li>
            <li>Only SMS sending needs the API key fix</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
