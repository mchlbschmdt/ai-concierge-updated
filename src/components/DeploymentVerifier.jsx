
import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { Activity, CheckCircle, AlertCircle, RefreshCw } from "lucide-react";

export default function DeploymentVerifier() {
  const [verifying, setVerifying] = useState(false);
  const [deploymentStatus, setDeploymentStatus] = useState(null);
  const { toast } = useToast();

  const verifyDeployment = async () => {
    setVerifying(true);
    setDeploymentStatus(null);

    try {
      console.log('🔍 Verifying edge function deployment...');
      
      const response = await fetch('https://zutwyyepahbbvrcbsbke.supabase.co/functions/v1/send-sms', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp1dHd5eWVwYWhiYnZyY2JzYmtlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDU0MDg3MDMsImV4cCI6MjA2MDk4NDcwM30.kUje38W2D2vXjYos6laaZ_rOzADLGiftoHAztFqSP9g`,
          'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp1dHd5eWVwYWhiYnZyY2JzYmtlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDU0MDg3MDMsImV4cCI6MjA2MDk4NDcwM30.kUje38W2D2vXjYos6laaZ_rOzADLGiftoHAztFqSP9g'
        }
      });

      console.log('🔍 Deployment verification response status:', response.status);

      if (response.ok) {
        const data = await response.json();
        console.log('🔍 Deployment verification response:', data);

        setDeploymentStatus({
          success: true,
          message: '✅ Function successfully deployed and accessible!',
          details: data
        });

        toast({
          title: "Deployment Verified",
          description: `Function is deployed. API key configured: ${data.apiKeyConfigured}`,
        });
      } else {
        const errorText = await response.text();
        console.error('❌ Deployment verification failed:', response.status, errorText);

        setDeploymentStatus({
          success: false,
          message: `❌ Deployment issue detected: Status ${response.status}`,
          details: { status: response.status, error: errorText }
        });

        toast({
          title: "Deployment Issue",
          description: `Function not accessible - Status: ${response.status}`,
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('❌ Deployment verification error:', error);
      
      setDeploymentStatus({
        success: false,
        message: `❌ Deployment verification failed: ${error.message}`,
        details: { error: error.message, type: 'NetworkError' }
      });

      toast({
        title: "Verification Failed",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setVerifying(false);
    }
  };

  return (
    <div className="bg-blue-50 p-4 rounded-lg border-l-4 border-blue-400">
      <div className="flex items-center gap-2 mb-3">
        <Activity className="h-5 w-5 text-blue-600" />
        <span className="font-medium text-blue-800">🚀 Edge Function Deployment Verification</span>
      </div>
      
      <p className="text-sm text-blue-700 mb-4">
        This will verify that the send-sms edge function is properly deployed and accessible in your Supabase project.
      </p>
      
      <Button 
        onClick={verifyDeployment}
        disabled={verifying}
        className="w-full bg-blue-600 hover:bg-blue-700"
      >
        {verifying ? (
          <>
            <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
            Verifying Deployment...
          </>
        ) : (
          <>
            <Activity className="mr-2 h-4 w-4" />
            Verify Function Deployment
          </>
        )}
      </Button>

      {deploymentStatus && (
        <div className={`mt-4 p-3 rounded border ${
          deploymentStatus.success 
            ? 'bg-green-50 border-green-200' 
            : 'bg-red-50 border-red-200'
        }`}>
          <div className="flex items-center gap-2 mb-2">
            {deploymentStatus.success ? (
              <CheckCircle className="h-4 w-4 text-green-600" />
            ) : (
              <AlertCircle className="h-4 w-4 text-red-600" />
            )}
            <span className="font-medium text-sm">{deploymentStatus.message}</span>
          </div>
          
          {deploymentStatus.details && (
            <div className="mt-2">
              <p className="text-xs font-medium text-gray-700 mb-1">Details:</p>
              <pre className="text-xs bg-gray-100 p-2 rounded overflow-x-auto">
                {typeof deploymentStatus.details === 'string' 
                  ? deploymentStatus.details 
                  : JSON.stringify(deploymentStatus.details, null, 2)}
              </pre>
            </div>
          )}
        </div>
      )}

      <div className="mt-4 text-xs text-blue-600">
        <p className="font-medium">What this checks:</p>
        <ul className="list-disc list-inside mt-1 space-y-1">
          <li>Function accessibility via HTTPS endpoint</li>
          <li>Proper CORS configuration</li>
          <li>API key configuration status</li>
          <li>Function deployment timestamp</li>
        </ul>
      </div>
    </div>
  );
}
