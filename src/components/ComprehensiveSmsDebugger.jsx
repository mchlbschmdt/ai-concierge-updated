
import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { 
  AlertTriangle, 
  CheckCircle, 
  RefreshCw, 
  Phone, 
  MessageSquare, 
  Key, 
  Zap,
  ExternalLink,
  Copy,
  Settings
} from "lucide-react";

export default function ComprehensiveSmsDebugger() {
  const [apiKey, setApiKey] = useState('');
  const [testing, setTesting] = useState(false);
  const [diagnosticsRunning, setDiagnosticsRunning] = useState(false);
  const [results, setResults] = useState(null);
  const { toast } = useToast();

  // Phase 1: Client-side API key validation
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
    try {
      console.log('🔍 Testing OpenPhone API key directly from browser...');
      
      const response = await fetch('https://api.openphone.com/v1/phone-numbers', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${apiKey.trim()}`,
          'Content-Type': 'application/json',
        }
      });

      const result = { clientSideTest: {} };
      
      if (!response.ok) {
        const errorText = await response.text();
        result.clientSideTest = {
          status: 'failed',
          message: `❌ API key validation failed: ${response.status}`,
          details: errorText,
          suggestion: response.status === 401 
            ? 'Invalid API key - check your OpenPhone developer settings'
            : 'API key lacks required permissions or network issue'
        };
      } else {
        const data = await response.json();
        result.clientSideTest = {
          status: 'success',
          message: `✅ API key is valid! Found ${data.data?.length || 0} phone numbers.`,
          phoneNumbers: data.data
        };
      }
      
      setResults(result);
      
      if (result.clientSideTest.status === 'success') {
        toast({
          title: "API Key Valid",
          description: "Your OpenPhone API key works! Now add it to Supabase secrets.",
        });
      } else {
        toast({
          title: "API Key Issue",
          description: result.clientSideTest.suggestion,
          variant: "destructive"
        });
      }

    } catch (error) {
      console.error('Direct API test error:', error);
      
      const result = { clientSideTest: {} };
      if (error.name === 'TypeError' && error.message.includes('fetch')) {
        result.clientSideTest = {
          status: 'cors_blocked',
          message: '🚧 CORS blocked (expected from browser)',
          suggestion: 'This is normal - CORS blocks browser requests. If the API key format looks correct, copy it to Supabase.'
        };
      } else {
        result.clientSideTest = {
          status: 'failed',
          message: `❌ Test failed: ${error.message}`,
          suggestion: 'Check your internet connection and API key format'
        };
      }
      
      setResults(result);
      
      toast({
        title: "Test Completed",
        description: result.clientSideTest.suggestion,
        variant: result.clientSideTest.status === 'cors_blocked' ? "default" : "destructive"
      });
    } finally {
      setTesting(false);
    }
  };

  // Phase 2: Comprehensive edge function diagnostics
  const runComprehensiveDiagnostics = async () => {
    setDiagnosticsRunning(true);
    setResults(null);

    const diagnosticResults = {
      projectAccess: null,
      edgeFunctions: {},
      deployment: null,
      suggestions: []
    };

    try {
      // Test 1: Basic project connectivity
      console.log('🔍 Testing Supabase project connectivity...');
      try {
        const basicResponse = await fetch('https://zutwyyepahbbvrcbsbke.supabase.co/rest/v1/', {
          method: 'GET',
          headers: {
            'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp1dHd5eWVwYWhiYnZyY2JzYmtlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDU0MDg3MDMsImV4cCI6MjA2MDk4NDcwM30.kUje38W2D2vXjYos6laaZ_rOzADLGiftoHAztFqSP9g'
          }
        });
        
        diagnosticResults.projectAccess = {
          status: basicResponse.ok ? 'working' : 'failed',
          statusCode: basicResponse.status,
          message: basicResponse.ok ? '✅ Project accessible' : '❌ Project access failed'
        };
      } catch (error) {
        diagnosticResults.projectAccess = {
          status: 'failed',
          message: '❌ Network error accessing project',
          error: error.message
        };
      }

      // Test 2: Edge Function Accessibility
      const functionsToTest = [
        'minimal-test',
        'health-check', 
        'test-openphone-key',
        'send-sms',
        'send-sms-with-test',
        'openphone-webhook'
      ];

      console.log('🔍 Testing edge function accessibility...');
      for (const funcName of functionsToTest) {
        try {
          const response = await fetch(`https://zutwyyepahbbvrcbsbke.supabase.co/functions/v1/${funcName}`, {
            method: 'GET'
          });
          
          diagnosticResults.edgeFunctions[funcName] = {
            status: response.ok ? 'accessible' : 'failed',
            statusCode: response.status,
            message: response.ok ? '✅ Function accessible' : `❌ Status ${response.status}`
          };
          
          if (response.ok && funcName === 'minimal-test') {
            const data = await response.text();
            diagnosticResults.edgeFunctions[funcName].response = data;
          }
        } catch (error) {
          diagnosticResults.edgeFunctions[funcName] = {
            status: 'failed',
            message: '❌ Function not reachable',
            error: error.message
          };
        }
      }

      // Test 3: Supabase Client Edge Function Calls
      console.log('🔍 Testing Supabase client function calls...');
      try {
        const { data, error } = await supabase.functions.invoke('health-check');
        diagnosticResults.supabaseClient = {
          status: error ? 'failed' : 'working',
          message: error ? `❌ Client call failed: ${error.message}` : '✅ Supabase client working',
          data: data,
          error: error
        };
      } catch (error) {
        diagnosticResults.supabaseClient = {
          status: 'failed',
          message: `❌ Client error: ${error.message}`,
          error: error.message
        };
      }

      // Analyze results and generate suggestions
      const accessibleFunctions = Object.values(diagnosticResults.edgeFunctions).filter(f => f.status === 'accessible').length;
      const totalFunctions = Object.keys(diagnosticResults.edgeFunctions).length;
      
      if (diagnosticResults.projectAccess?.status === 'failed') {
        diagnosticResults.suggestions.push('🔧 Project connectivity issues - check Supabase dashboard status');
      }
      
      if (accessibleFunctions === 0) {
        diagnosticResults.suggestions.push('🚨 CRITICAL: No edge functions are deployed or accessible');
        diagnosticResults.suggestions.push('💡 Try manual deployment via Supabase CLI: supabase functions deploy');
        diagnosticResults.suggestions.push('🔍 Check Supabase dashboard for deployment status');
        diagnosticResults.deployment = 'failed';
      } else if (accessibleFunctions < totalFunctions) {
        diagnosticResults.suggestions.push(`⚠️ Partial deployment: ${accessibleFunctions}/${totalFunctions} functions accessible`);
        diagnosticResults.suggestions.push('🔄 Try redeploying specific functions');
        diagnosticResults.deployment = 'partial';
      } else {
        diagnosticResults.suggestions.push('✅ All edge functions are accessible!');
        diagnosticResults.deployment = 'working';
      }

      setResults(diagnosticResults);
      
      if (diagnosticResults.deployment === 'working') {
        toast({
          title: "Diagnostics Complete",
          description: "All systems working! You can now test SMS functionality.",
        });
      } else {
        toast({
          title: "Issues Found", 
          description: "Edge function deployment issues detected. Check suggestions below.",
          variant: "destructive"
        });
      }

    } catch (error) {
      console.error('Comprehensive diagnostics error:', error);
      setResults({
        error: error.message,
        suggestions: ['🔥 Diagnostics failed - check network connectivity']
      });
      
      toast({
        title: "Diagnostics Failed",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setDiagnosticsRunning(false);
    }
  };

  // Phase 3: Test complete SMS workflow
  const testSmsWorkflow = async () => {
    if (!apiKey.trim()) {
      toast({
        title: "API Key Required",
        description: "Enter your OpenPhone API key first",
        variant: "destructive"
      });
      return;
    }

    try {
      console.log('🧪 Testing complete SMS workflow...');
      
      const { data, error } = await supabase.functions.invoke('send-sms-with-test', {
        body: {
          action: 'test-api-key',
          apiKey: apiKey.trim(),
          testType: 'sms'
        }
      });

      if (error) {
        toast({
          title: "SMS Workflow Test Failed",
          description: error.message,
          variant: "destructive"
        });
      } else {
        toast({
          title: "SMS Workflow Test",
          description: data.success ? "✅ SMS sent successfully!" : "❌ SMS sending failed",
          variant: data.success ? "default" : "destructive"
        });
      }
    } catch (error) {
      toast({
        title: "Workflow Test Failed",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const copyApiKey = async () => {
    if (!apiKey.trim()) return;
    try {
      await navigator.clipboard.writeText(apiKey.trim());
      toast({
        title: "API Key Copied",
        description: "Now add it to Supabase Edge Functions secrets",
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
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-blue-50 p-4 rounded-lg border-l-4 border-blue-400">
        <div className="flex items-center gap-2 mb-2">
          <Settings className="h-5 w-5 text-blue-600" />
          <span className="font-semibold text-blue-800">🚀 Comprehensive SMS Integration Debugger</span>
        </div>
        <p className="text-sm text-blue-700">
          Complete diagnostic and testing suite to get your SMS integration fully working.
        </p>
      </div>

      {/* Phase 1: API Key Testing */}
      <div className="bg-orange-50 p-4 rounded-lg border-l-4 border-orange-400">
        <div className="flex items-center gap-2 mb-3">
          <Key className="h-4 w-4 text-orange-600" />
          <span className="font-medium text-orange-800">Phase 1: API Key Validation</span>
        </div>
        
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
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
            <Button 
              onClick={testApiKeyDirectly}
              disabled={testing || !apiKey.trim()}
              className="bg-orange-600 hover:bg-orange-700"
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
              onClick={copyApiKey}
              disabled={!apiKey.trim()}
              variant="outline"
            >
              <Copy className="mr-2 h-4 w-4" />
              Copy Key
            </Button>

            <Button 
              onClick={() => window.open('https://app.openphone.com/developer', '_blank')}
              variant="outline"
            >
              <ExternalLink className="mr-2 h-4 w-4" />
              Get API Key
            </Button>
          </div>
        </div>
      </div>

      {/* Phase 2: System Diagnostics */}
      <div className="bg-red-50 p-4 rounded-lg border-l-4 border-red-400">
        <div className="flex items-center gap-2 mb-3">
          <AlertTriangle className="h-4 w-4 text-red-600" />
          <span className="font-medium text-red-800">Phase 2: System Diagnostics</span>
        </div>
        
        <Button 
          onClick={runComprehensiveDiagnostics}
          disabled={diagnosticsRunning}
          className="w-full bg-red-600 hover:bg-red-700 mb-4"
        >
          {diagnosticsRunning ? (
            <>
              <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
              Running Comprehensive Diagnostics...
            </>
          ) : (
            <>
              <Zap className="mr-2 h-4 w-4" />
              Run Full System Diagnostics
            </>
          )}
        </Button>
      </div>

      {/* Phase 3: SMS Workflow Testing */}
      <div className="bg-green-50 p-4 rounded-lg border-l-4 border-green-400">
        <div className="flex items-center gap-2 mb-3">
          <MessageSquare className="h-4 w-4 text-green-600" />
          <span className="font-medium text-green-800">Phase 3: SMS Workflow Testing</span>
        </div>
        
        <Button 
          onClick={testSmsWorkflow}
          disabled={!apiKey.trim()}
          className="w-full bg-green-600 hover:bg-green-700 mb-2"
        >
          <Phone className="mr-2 h-4 w-4" />
          Test Complete SMS Workflow
        </Button>
        
        <p className="text-xs text-green-700">
          This will test SMS sending using your API key through the edge functions.
        </p>
      </div>

      {/* Results Display */}
      {results && (
        <div className="bg-white p-4 rounded-lg border shadow-sm">
          <h3 className="font-semibold mb-3">Diagnostic Results</h3>
          
          {/* Client-side test results */}
          {results.clientSideTest && (
            <div className={`p-3 rounded mb-3 ${
              results.clientSideTest.status === 'success' ? 'bg-green-100' : 
              results.clientSideTest.status === 'cors_blocked' ? 'bg-yellow-100' : 'bg-red-100'
            }`}>
              <strong>API Key Test:</strong> {results.clientSideTest.message}
              {results.clientSideTest.phoneNumbers && (
                <div className="mt-2">
                  <p className="text-sm font-medium">Available Numbers:</p>
                  {results.clientSideTest.phoneNumbers.map((phone, index) => (
                    <div key={index} className="text-sm bg-white p-1 rounded mt-1">
                      {phone.phoneNumber} {phone.name && `(${phone.name})`}
                    </div>
                  ))}
                </div>
              )}
              {results.clientSideTest.suggestion && (
                <p className="text-sm text-gray-600 mt-1">{results.clientSideTest.suggestion}</p>
              )}
            </div>
          )}

          {/* System diagnostics results */}
          {results.projectAccess && (
            <div className={`p-3 rounded mb-3 ${
              results.projectAccess.status === 'working' ? 'bg-green-100' : 'bg-red-100'
            }`}>
              <strong>Project Access:</strong> {results.projectAccess.message}
            </div>
          )}

          {results.edgeFunctions && Object.keys(results.edgeFunctions).length > 0 && (
            <div className="mb-3">
              <strong>Edge Functions Status:</strong>
              <div className="grid grid-cols-2 gap-2 mt-2">
                {Object.entries(results.edgeFunctions).map(([name, result]) => (
                  <div key={name} className={`p-2 rounded text-sm ${
                    result.status === 'accessible' ? 'bg-green-100' : 'bg-red-100'
                  }`}>
                    <strong>{name}:</strong> {result.message}
                  </div>
                ))}
              </div>
            </div>
          )}

          {results.suggestions && results.suggestions.length > 0 && (
            <div className="bg-yellow-100 p-3 rounded">
              <strong>Suggestions:</strong>
              <ul className="list-disc list-inside mt-1 text-sm">
                {results.suggestions.map((suggestion, index) => (
                  <li key={index}>{suggestion}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Action Links */}
      <div className="bg-gray-50 p-4 rounded text-sm">
        <p className="font-medium mb-2">🔗 Useful Links:</p>
        <div className="space-y-1">
          <div>• <a href="https://supabase.com/dashboard/project/zutwyyepahbbvrcbsbke/functions" target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">Edge Functions Dashboard</a></div>
          <div>• <a href="https://supabase.com/dashboard/project/zutwyyepahbbvrcbsbke/settings/functions" target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">Function Secrets</a></div>
          <div>• <a href="https://app.openphone.com/developer" target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">OpenPhone API Keys</a></div>
          <div>• <a href="https://supabase.com/dashboard/project/zutwyyepahbbvrcbsbke" target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">Project Dashboard</a></div>
        </div>
      </div>

      {/* Manual Test Instructions */}
      <div className="bg-blue-50 p-4 rounded-lg">
        <h4 className="font-medium text-blue-800 mb-2">📱 Manual SMS Test</h4>
        <p className="text-sm text-blue-700 mb-2">
          Once everything is working, test by texting <strong>"1001"</strong> to <strong>+1 (833) 330-1032</strong>
        </p>
        <p className="text-xs text-blue-600">
          You should receive an automated reply within 30 seconds if everything is configured correctly.
        </p>
      </div>
    </div>
  );
}
