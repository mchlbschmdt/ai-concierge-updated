
import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { AlertTriangle, RefreshCw, ExternalLink, Database, Zap } from "lucide-react";

export default function EdgeFunctionDiagnostics() {
  const [testing, setTesting] = useState(false);
  const [diagnosticsResult, setDiagnosticsResult] = useState(null);
  const { toast } = useToast();

  const runDiagnostics = async () => {
    setTesting(true);
    setDiagnosticsResult(null);

    const results = {
      projectAccess: null,
      minimalFunction: null,
      supabaseClient: null,
      suggestions: []
    };

    try {
      // Test 1: Basic project access
      console.log('🔍 Testing basic Supabase project access...');
      try {
        const basicResponse = await fetch('https://zutwyyepahbbvrcbsbke.supabase.co/rest/v1/', {
          method: 'GET',
          headers: {
            'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp1dHd5eWVwYWhiYnZyY2JzYmtlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDU0MDg3MDMsImV4cCI6MjA2MDk4NDcwM30.kUje38W2D2vXjYos6laaZ_rOzADLGiftoHAztFqSP9g'
          }
        });
        
        results.projectAccess = {
          status: basicResponse.ok ? 'working' : 'failed',
          statusCode: basicResponse.status,
          message: basicResponse.ok ? 'Project accessible' : 'Project access failed'
        };
      } catch (error) {
        results.projectAccess = {
          status: 'failed',
          message: 'Network error accessing project',
          error: error.message
        };
      }

      // Test 2: Minimal function test with proper headers
      console.log('🔍 Testing minimal edge function...');
      try {
        const minimalResponse = await fetch('https://zutwyyepahbbvrcbsbke.supabase.co/functions/v1/minimal-test', {
          method: 'GET',
          headers: {
            'Authorization': `Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp1dHd5eWVwYWhiYnZyY2JzYmtlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDU0MDg3MDMsImV4cCI6MjA2MDk4NDcwM30.kUje38W2D2vXjYos6laaZ_rOzADLGiftoHAztFqSP9g`,
            'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp1dHd5eWVwYWhiYnZyY2JzYmtlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDU0MDg3MDMsImV4cCI6MjA2MDk4NDcwM30.kUje38W2D2vXjYos6laaZ_rOzADLGiftoHAztFqSP9g'
          }
        });
        
        results.minimalFunction = {
          status: minimalResponse.ok ? 'working' : 'failed',
          statusCode: minimalResponse.status,
          message: minimalResponse.ok ? 'Minimal function working' : 'Function not accessible'
        };
        
        if (minimalResponse.ok) {
          const data = await minimalResponse.json();
          results.minimalFunction.response = data;
        }
      } catch (error) {
        results.minimalFunction = {
          status: 'failed',
          message: 'Failed to reach function',
          error: error.message
        };
      }

      // Generate suggestions based on results
      if (results.projectAccess?.status === 'failed') {
        results.suggestions.push('Project connectivity issues - check Supabase dashboard');
      }
      
      if (results.minimalFunction?.status === 'failed') {
        results.suggestions.push('Edge functions not deploying - check Supabase function logs');
        results.suggestions.push('Verify project has edge functions enabled');
        results.suggestions.push('Try redeploying functions from Supabase dashboard');
      }
      
      if (results.projectAccess?.status === 'working' && results.minimalFunction?.status === 'failed') {
        results.suggestions.push('Project works but functions fail - deployment issue');
        results.suggestions.push('Contact Supabase support for edge function deployment issues');
      }

      setDiagnosticsResult(results);
      
      if (results.minimalFunction?.status === 'working') {
        toast({
          title: "Functions Working!",
          description: "Edge functions are now accessible",
        });
      } else {
        toast({
          title: "Deployment Issues Confirmed",
          description: "Edge functions are not deploying properly",
          variant: "destructive"
        });
      }

    } catch (error) {
      console.error('Diagnostics error:', error);
      setDiagnosticsResult({
        error: error.message,
        suggestions: ['Network connectivity issues', 'Try again in a few minutes']
      });
      
      toast({
        title: "Diagnostics Failed",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="bg-red-50 p-4 rounded-lg border-l-4 border-red-400">
      <div className="flex items-center gap-2 mb-3">
        <AlertTriangle className="h-4 w-4 text-red-600" />
        <span className="font-medium text-sm text-red-800">🔧 Edge Function Deployment Diagnostics</span>
      </div>
      
      <p className="text-xs text-red-700 mb-4">
        Running comprehensive diagnostics to identify why edge functions aren't deploying or accessible.
      </p>
      
      <Button 
        onClick={runDiagnostics}
        disabled={testing}
        className="w-full bg-red-600 hover:bg-red-700 mb-4"
      >
        {testing ? (
          <>
            <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
            Running Diagnostics...
          </>
        ) : (
          <>
            <Zap className="mr-2 h-4 w-4" />
            Run Full Diagnostics
          </>
        )}
      </Button>
      
      {diagnosticsResult && (
        <div className="space-y-3">
          <div className="text-xs">
            <p className="font-medium text-gray-700 mb-2">Diagnostic Results:</p>
            
            {diagnosticsResult.projectAccess && (
              <div className={`p-2 rounded mb-2 ${
                diagnosticsResult.projectAccess.status === 'working' ? 'bg-green-100' : 'bg-red-100'
              }`}>
                <strong>Project Access:</strong> {diagnosticsResult.projectAccess.message}
                {diagnosticsResult.projectAccess.statusCode && (
                  <span className="ml-2">({diagnosticsResult.projectAccess.statusCode})</span>
                )}
              </div>
            )}
            
            {diagnosticsResult.minimalFunction && (
              <div className={`p-2 rounded mb-2 ${
                diagnosticsResult.minimalFunction.status === 'working' ? 'bg-green-100' : 'bg-red-100'
              }`}>
                <strong>Minimal Function:</strong> {diagnosticsResult.minimalFunction.message}
                {diagnosticsResult.minimalFunction.statusCode && (
                  <span className="ml-2">({diagnosticsResult.minimalFunction.statusCode})</span>
                )}
                {diagnosticsResult.minimalFunction.response && (
                  <pre className="mt-1 text-xs bg-white p-1 rounded overflow-x-auto">
                    {diagnosticsResult.minimalFunction.response}
                  </pre>
                )}
              </div>
            )}
            
            {diagnosticsResult.suggestions && diagnosticsResult.suggestions.length > 0 && (
              <div className="bg-yellow-100 p-2 rounded">
                <strong>Suggestions:</strong>
                <ul className="list-disc list-inside mt-1">
                  {diagnosticsResult.suggestions.map((suggestion, index) => (
                    <li key={index}>{suggestion}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
          
          <div className="bg-blue-50 p-3 rounded text-xs">
            <p className="font-medium mb-1">🔗 Useful Links:</p>
            <div className="space-y-1">
              <div>• <a href="https://supabase.com/dashboard/project/zutwyyepahbbvrcbsbke/functions" target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">Edge Functions Dashboard</a></div>
              <div>• <a href="https://supabase.com/dashboard/project/zutwyyepahbbvrcbsbke/logs/functions" target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">Function Deployment Logs</a></div>
              <div>• <a href="https://supabase.com/dashboard/project/zutwyyepahbbvrcbsbke" target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">Project Dashboard</a></div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
