
import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { addTestPropertyCodes, checkPropertyCodes } from "@/utils/addTestPropertyCodes";

export default function TestSmsIntegration() {
  const [loading, setLoading] = useState(false);
  const [checkingCodes, setCheckingCodes] = useState(false);
  const [propertyCodes, setPropertyCodes] = useState([]);
  const { toast } = useToast();

  const handleAddTestData = async () => {
    setLoading(true);
    try {
      const result = await addTestPropertyCodes();
      
      if (result.success) {
        toast({
          title: "Test Data Added",
          description: result.message || "Sample property codes have been added successfully",
        });
        // Refresh the property codes list
        handleCheckCodes();
      } else {
        toast({
          title: "Error",
          description: "Failed to add test data: " + result.error?.message,
          variant: "destructive"
        });
      }
    } catch (error) {
      toast({
        title: "Error", 
        description: "An error occurred while adding test data",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCheckCodes = async () => {
    setCheckingCodes(true);
    try {
      const result = await checkPropertyCodes();
      
      if (result.success) {
        setPropertyCodes(result.data || []);
        toast({
          title: "Property Codes Retrieved",
          description: `Found ${result.data?.length || 0} property codes in database`,
        });
      } else {
        toast({
          title: "Error",
          description: "Failed to retrieve property codes: " + result.error?.message,
          variant: "destructive"
        });
      }
    } catch (error) {
      toast({
        title: "Error", 
        description: "An error occurred while checking property codes",
        variant: "destructive"
      });
    } finally {
      setCheckingCodes(false);
    }
  };

  const testWebhook = async () => {
    try {
      const response = await fetch('https://tulhwmzrvbzzacphunes.supabase.co/functions/v1/openphone-webhook', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: 'message.received',
          data: {
            object: {
              id: 'test-message-' + Date.now(),
              conversationId: 'test-conversation-' + Date.now(),
              direction: 'incoming',
              from: '+1234567890',
              to: '+1987654321',
              body: '1001',
              text: '1001',
              createdAt: new Date().toISOString()
            }
          }
        })
      });

      if (response.ok) {
        toast({
          title: "Webhook Test Successful",
          description: "Test message sent to webhook function",
        });
      } else {
        const errorText = await response.text();
        toast({
          title: "Webhook Test Failed",
          description: `Status: ${response.status} - ${errorText}`,
          variant: "destructive"
        });
      }
    } catch (error) {
      toast({
        title: "Webhook Test Failed",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm p-4">
      <h3 className="text-lg font-semibold mb-4">SMS Integration Test & Debug</h3>
      
      <div className="space-y-4">
        <div className="text-sm text-gray-600">
          <p>To test the SMS integration, you'll need property codes in the database.</p>
          <p className="mt-2">Property codes that will be added:</p>
          <ul className="list-disc list-inside mt-1 text-xs">
            <li>1001 - Downtown Loft</li>
            <li>1002 - Beachfront Villa</li> 
            <li>1003 - Mountain Cabin</li>
            <li>0404 - User Property</li>
          </ul>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
          <Button onClick={handleAddTestData} disabled={loading}>
            {loading ? "Adding..." : "Add Test Property Codes"}
          </Button>

          <Button onClick={handleCheckCodes} disabled={checkingCodes} variant="outline">
            {checkingCodes ? "Checking..." : "Check Current Codes"}
          </Button>

          <Button onClick={testWebhook} variant="outline">
            Test Webhook
          </Button>
        </div>

        {propertyCodes.length > 0 && (
          <div className="mt-4 p-3 bg-green-50 rounded">
            <p className="font-medium text-sm">Current Property Codes in Database:</p>
            <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
              {propertyCodes.map((prop) => (
                <div key={prop.id} className="bg-white p-2 rounded border">
                  <strong>Code: {prop.code}</strong><br/>
                  {prop.property_name}<br/>
                  <span className="text-gray-500">{prop.address}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="mt-4 p-3 bg-blue-50 rounded text-sm">
          <p className="font-medium">Testing Instructions:</p>
          <ol className="list-decimal list-inside mt-1 space-y-1 text-xs">
            <li>First click "Add Test Property Codes" to ensure codes exist</li>
            <li>Click "Check Current Codes" to verify they're in the database</li>
            <li>Make sure your OpenPhone webhook URL is set to: <br/>
                <code className="bg-gray-100 px-1 rounded text-xs break-all">https://tulhwmzrvbzzacphunes.supabase.co/functions/v1/openphone-webhook</code>
            </li>
            <li>Click "Test Webhook" to verify the function is accessible</li>
            <li>Send an SMS to your OpenPhone number with "1001", "1002", "1003", or "0404"</li>
            <li>Check the webhook logs for any errors</li>
          </ol>
        </div>

        <div className="mt-4 p-3 bg-yellow-50 rounded text-sm">
          <p className="font-medium">Troubleshooting:</p>
          <ul className="list-disc list-inside mt-1 space-y-1 text-xs">
            <li>If webhook test fails, check your OPENPHONE_WEBHOOK_SECRET is set</li>
            <li>If SMS sending fails, verify your OPENPHONE_API_KEY is correct</li>
            <li>Check the Supabase function logs for detailed error messages</li>
            <li>Make sure your OpenPhone webhook is configured and active</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
