
import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { CheckCircle, XCircle, Loader2, Code } from "lucide-react";

export default function WebhookSignatureTester() {
  const [testing, setTesting] = useState(false);
  const [result, setResult] = useState(null);
  const [formData, setFormData] = useState({
    secret: 'VjBJeDdkVkNwSTVXeWt2WXhQWDJpV0l6bG1obHZ3Tlk=',
    signature: '',
    timestamp: '',
    body: '{"type":"message.received","data":{"object":{"body":"1001"}}}'
  });

  const testSignatureVerification = async () => {
    setTesting(true);
    setResult(null);

    try {
      // Test with the webhook endpoint directly
      const testPayload = {
        type: 'webhook.signature.test',
        signature: formData.signature,
        timestamp: formData.timestamp,
        body: formData.body,
        secret: formData.secret
      };

      const response = await fetch(
        'https://zutwyyepahbbvrcbsbke.supabase.co/functions/v1/openphone-webhook',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'openphone-signature': formData.signature
          },
          body: formData.body
        }
      );

      const data = await response.json();
      
      setResult({
        success: response.ok,
        status: response.status,
        message: response.ok ? 'Signature verification test completed' : 'Signature verification failed',
        data: data
      });

    } catch (error) {
      console.error('Signature test failed:', error);
      setResult({
        success: false,
        message: 'Failed to test signature verification',
        data: { error: error.message }
      });
    } finally {
      setTesting(false);
    }
  };

  const generateTestSignature = async () => {
    try {
      const encoder = new TextEncoder();
      const timestamp = Date.now().toString();
      const payload = timestamp + '.' + formData.body;
      
      // Decode secret from base64
      const secretBytes = Uint8Array.from(atob(formData.secret), c => c.charCodeAt(0));
      
      const key = await crypto.subtle.importKey(
        'raw',
        secretBytes,
        { name: 'HMAC', hash: 'SHA-256' },
        false,
        ['sign']
      );
      
      const signatureBuffer = await crypto.subtle.sign(
        'HMAC',
        key,
        encoder.encode(payload)
      );
      
      const signature = btoa(String.fromCharCode(...new Uint8Array(signatureBuffer)));
      const fullSignature = `hmac;1;${timestamp};${signature}`;
      
      setFormData(prev => ({
        ...prev,
        timestamp,
        signature: fullSignature
      }));
      
    } catch (error) {
      console.error('Failed to generate test signature:', error);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm p-4">
      <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
        <Code className="h-5 w-5" />
        Webhook Signature Testing
      </h3>
      
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">Secret Key</label>
          <Input
            value={formData.secret}
            onChange={(e) => setFormData(prev => ({ ...prev, secret: e.target.value }))}
            placeholder="Base64 encoded secret"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Test Body (JSON)</label>
          <Textarea
            value={formData.body}
            onChange={(e) => setFormData(prev => ({ ...prev, body: e.target.value }))}
            placeholder="Webhook body JSON"
            rows={3}
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Timestamp</label>
          <Input
            value={formData.timestamp}
            onChange={(e) => setFormData(prev => ({ ...prev, timestamp: e.target.value }))}
            placeholder="Unix timestamp"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Signature</label>
          <Input
            value={formData.signature}
            onChange={(e) => setFormData(prev => ({ ...prev, signature: e.target.value }))}
            placeholder="hmac;1;timestamp;signature"
          />
        </div>

        <div className="flex gap-2">
          <Button 
            onClick={generateTestSignature}
            variant="outline"
            size="sm"
          >
            Generate Test Signature
          </Button>

          <Button 
            onClick={testSignatureVerification}
            disabled={testing}
            className="flex-1"
          >
            {testing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Testing...
              </>
            ) : (
              "Test Signature Verification"
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
              <span className="text-xs text-gray-500">Status: {result.status}</span>
            </div>
            
            <pre className="text-xs bg-white p-2 rounded border overflow-auto max-h-40">
              {JSON.stringify(result.data, null, 2)}
            </pre>
          </div>
        )}

        <div className="mt-4 p-3 bg-blue-50 rounded text-sm">
          <p className="font-medium mb-1">Testing Instructions:</p>
          <ol className="list-decimal list-inside space-y-1 text-xs">
            <li>Click "Generate Test Signature" to create a valid signature</li>
            <li>Click "Test Signature Verification" to test with the webhook</li>
            <li>Check the webhook logs for detailed debugging information</li>
            <li>Try different signature formats if the test fails</li>
          </ol>
        </div>

        <div className="mt-4 p-3 bg-yellow-50 rounded text-sm">
          <p className="font-medium mb-1">Bypass Mode:</p>
          <p className="text-xs">
            To temporarily bypass signature verification while debugging, 
            set <code>BYPASS_SIGNATURE_VERIFICATION=true</code> in your Supabase secrets.
          </p>
        </div>
      </div>
    </div>
  );
}
