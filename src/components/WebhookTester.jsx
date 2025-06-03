
import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { CheckCircle, XCircle, Loader2, RefreshCw } from "lucide-react";

export default function WebhookTester() {
  const [testing, setTesting] = useState(false);
  const [result, setResult] = useState(null);

  const testWebhook = async () => {
    setTesting(true);
    setResult(null);

    try {
      console.log('Testing webhook endpoint...');
      
      const response = await fetch(
        'https://tulhwmzrvbzzacphunes.supabase.co/functions/v1/openphone-webhook',
        { 
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          }
        }
      );

      const data = await response.json();
      console.log('Webhook test response:', data);

      if (response.ok) {
        setResult({
          success: true,
          message: 'Webhook is running successfully!',
          data: data
        });
      } else {
        setResult({
          success: false,
          message: `Webhook returned error: ${response.status}`,
          data: data
        });
      }

    } catch (error) {
      console.error('Webhook test failed:', error);
      setResult({
        success: false,
        message: 'Failed to connect to webhook',
        data: { error: error.message }
      });
    } finally {
      setTesting(false);
    }
  };

  const testWebhookMessage = async () => {
    setTesting(true);
    setResult(null);

    try {
      const testPayload = {
        type: 'message.received',
        data: {
          object: {
            id: 'test-' + Date.now(),
            conversationId: 'conv-test-' + Date.now(),
            direction: 'incoming',
            from: '+1234567890',
            to: '+1987654321',
            body: '1001',
            createdAt: new Date().toISOString()
          }
        }
      };

      const response = await fetch(
        'https://tulhwmzrvbzzacphunes.supabase.co/functions/v1/openphone-webhook',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(testPayload)
        }
      );

      const data = await response.json();
      console.log('Message test response:', data);

      if (response.ok) {
        setResult({
          success: true,
          message: 'Test message processed successfully!',
          data: data
        });
      } else {
        setResult({
          success: false,
          message: `Message test failed: ${response.status}`,
          data: data
        });
      }

    } catch (error) {
      console.error('Message test failed:', error);
      setResult({
        success: false,
        message: 'Failed to send test message',
        data: { error: error.message }
      });
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm p-4">
      <h3 className="text-lg font-semibold mb-4">Webhook Testing</h3>
      
      <div className="space-y-3 mb-4">
        <Button 
          onClick={testWebhook}
          disabled={testing}
          className="w-full"
        >
          {testing ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Testing...
            </>
          ) : (
            <>
              <RefreshCw className="mr-2 h-4 w-4" />
              Test Webhook Health
            </>
          )}
        </Button>

        <Button 
          onClick={testWebhookMessage}
          disabled={testing}
          variant="outline"
          className="w-full"
        >
          {testing ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Testing...
            </>
          ) : (
            "Test Message Processing"
          )}
        </Button>
      </div>

      {result && (
        <div className={`p-3 rounded-lg border ${
          result.success 
            ? 'bg-green-50 border-green-200' 
            : 'bg-red-50 border-red-200'
        }`}>
          <div className="flex items-center gap-2 mb-2">
            {result.success ? (
              <CheckCircle className="h-4 w-4 text-green-600" />
            ) : (
              <XCircle className="h-4 w-4 text-red-600" />
            )}
            <span className="font-medium text-sm">{result.message}</span>
          </div>
          
          <pre className="text-xs bg-white p-2 rounded border overflow-auto max-h-32">
            {JSON.stringify(result.data, null, 2)}
          </pre>
        </div>
      )}

      <div className="mt-4 p-3 bg-gray-50 rounded text-sm">
        <p className="font-medium mb-1">Webhook URL:</p>
        <code className="text-xs break-all">
          https://tulhwmzrvbzzacphunes.supabase.co/functions/v1/openphone-webhook
        </code>
      </div>
    </div>
  );
}
