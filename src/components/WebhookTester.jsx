
import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { CheckCircle, XCircle, Loader2, RefreshCw } from "lucide-react";
import WebhookSignatureTester from './WebhookSignatureTester';

export default function WebhookTester() {
  const [testing, setTesting] = useState(false);
  const [result, setResult] = useState(null);

  const testWebhook = async () => {
    setTesting(true);
    setResult(null);

    try {
      console.log('Testing webhook endpoint...');
      
      const response = await fetch(
        'https://zutwyyepahbbvrcbsbke.supabase.co/functions/v1/openphone-webhook',
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

  const testValidPhoneNumber = async () => {
    setTesting(true);
    setResult(null);

    try {
      const testPayload = {
        type: 'message.received',
        data: {
          object: {
            id: 'test-valid-' + Date.now(),
            conversationId: 'conv-test-valid-' + Date.now(),
            direction: 'incoming',
            from: '+1234567890',
            to: '+18333301032', // Valid business number
            body: 'Test valid number',
            createdAt: new Date().toISOString()
          }
        }
      };

      const response = await fetch(
        'https://zutwyyepahbbvrcbsbke.supabase.co/functions/v1/openphone-webhook',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(testPayload)
        }
      );

      const data = await response.json();
      console.log('Valid number test response:', data);

      if (response.ok) {
        setResult({
          success: true,
          message: `Valid number test: ${data.processed ? 'PROCESSED' : 'REJECTED'}`,
          data: data
        });
      } else {
        setResult({
          success: false,
          message: `Valid number test failed: ${response.status}`,
          data: data
        });
      }

    } catch (error) {
      console.error('Valid number test failed:', error);
      setResult({
        success: false,
        message: 'Failed to test valid number',
        data: { error: error.message }
      });
    } finally {
      setTesting(false);
    }
  };

  const testInvalidPhoneNumber = async () => {
    setTesting(true);
    setResult(null);

    try {
      const testPayload = {
        type: 'message.received',
        data: {
          object: {
            id: 'test-invalid-' + Date.now(),
            conversationId: 'conv-test-invalid-' + Date.now(),
            direction: 'incoming',
            from: '+1234567890',
            to: '+13213406333', // Invalid number that should be rejected
            body: 'Test invalid number',
            createdAt: new Date().toISOString()
          }
        }
      };

      const response = await fetch(
        'https://zutwyyepahbbvrcbsbke.supabase.co/functions/v1/openphone-webhook',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(testPayload)
        }
      );

      const data = await response.json();
      console.log('Invalid number test response:', data);

      if (response.ok) {
        const wasRejected = data.processed === false && data.reason === 'MESSAGE_REJECTED_INVALID_DESTINATION';
        setResult({
          success: wasRejected,
          message: `Invalid number test: ${wasRejected ? 'CORRECTLY REJECTED' : 'INCORRECTLY PROCESSED'}`,
          data: data
        });
      } else {
        setResult({
          success: false,
          message: `Invalid number test failed: ${response.status}`,
          data: data
        });
      }

    } catch (error) {
      console.error('Invalid number test failed:', error);
      setResult({
        success: false,
        message: 'Failed to test invalid number',
        data: { error: error.message }
      });
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow-sm p-4">
        <h3 className="text-lg font-semibold mb-4">Enhanced Webhook Testing</h3>
        
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
                Test Webhook Health & Version
              </>
            )}
          </Button>

          <Button 
            onClick={testValidPhoneNumber}
            disabled={testing}
            variant="outline"
            className="w-full bg-green-50 hover:bg-green-100"
          >
            {testing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Testing...
              </>
            ) : (
              "Test Valid Number (+18333301032)"
            )}
          </Button>

          <Button 
            onClick={testInvalidPhoneNumber}
            disabled={testing}
            variant="outline"
            className="w-full bg-red-50 hover:bg-red-100"
          >
            {testing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Testing...
              </>
            ) : (
              "Test Invalid Number (+13213406333)"
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
          <p className="font-medium mb-1">Current Webhook URL:</p>
          <code className="text-xs break-all">
            https://zutwyyepahbbvrcbsbke.supabase.co/functions/v1/openphone-webhook
          </code>
          <p className="text-xs text-gray-600 mt-2">
            Use the buttons above to test phone number validation. The invalid number test should show "CORRECTLY REJECTED" for proper validation.
          </p>
        </div>
      </div>

      <WebhookSignatureTester />
    </div>
  );
}
