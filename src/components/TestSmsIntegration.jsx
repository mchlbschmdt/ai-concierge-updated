
import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { addTestPropertyCodes, checkPropertyCodes } from "@/utils/addTestPropertyCodes";
import OpenPhoneApiKeyForm from './OpenPhoneApiKeyForm';
import { AlertCircle, CheckCircle, RefreshCw } from 'lucide-react';

export default function TestSmsIntegration() {
  const [loading, setLoading] = useState(false);
  const [checkingCodes, setCheckingCodes] = useState(false);
  const [propertyCodes, setPropertyCodes] = useState([]);
  const [fetchingLogs, setFetchingLogs] = useState(false);
  const [logs, setLogs] = useState([]);
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

  const testSmsToYourNumber = async () => {
    try {
      console.log('Testing SMS to a real OpenPhone number...');
      
      // This will trigger the actual webhook workflow
      const response = await fetch('https://tulhwmzrvbzzacphunes.supabase.co/functions/v1/openphone-webhook', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: 'message.received',
          data: {
            object: {
              id: 'live-test-' + Date.now(),
              conversationId: 'live-test-conversation-' + Date.now(),
              direction: 'incoming',
              from: '+12627453798', // Use a realistic test number
              to: '+18333301032', // Your OpenPhone number
              body: '1001',
              text: '1001',
              createdAt: new Date().toISOString()
            }
          }
        })
      });

      const responseText = await response.text();
      console.log('Live test response:', responseText);

      if (response.ok) {
        toast({
          title: "Live SMS Test Triggered",
          description: "Check webhook logs for SMS sending results",
        });
      } else {
        toast({
          title: "Live SMS Test Failed",
          description: `Status: ${response.status} - ${responseText}`,
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Live SMS test error:', error);
      toast({
        title: "Live SMS Test Failed",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* API Key Configuration Section */}
      <OpenPhoneApiKeyForm />
      
      {/* Enhanced Test Integration Section */}
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

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-2">
            <Button onClick={handleAddTestData} disabled={loading}>
              {loading ? "Adding..." : "Add Test Property Codes"}
            </Button>

            <Button onClick={handleCheckCodes} disabled={checkingCodes} variant="outline">
              {checkingCodes ? "Checking..." : "Check Current Codes"}
            </Button>

            <Button onClick={testWebhook} variant="outline">
              Test Webhook
            </Button>

            <Button onClick={testSmsToYourNumber} variant="default" className="bg-green-600 hover:bg-green-700">
              Test Live SMS Flow
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
            <p className="font-medium">Step-by-Step Testing Instructions:</p>
            <ol className="list-decimal list-inside mt-1 space-y-1 text-xs">
              <li><strong>First:</strong> Test your OpenPhone API key in the form above ↑</li>
              <li><strong>Then:</strong> Click "Add Test Property Codes" to ensure codes exist</li>
              <li><strong>Next:</strong> Click "Test Live SMS Flow" to simulate a real message</li>
              <li><strong>Check:</strong> Webhook logs in Supabase for SMS sending results</li>
              <li><strong>Finally:</strong> Send a real SMS to your OpenPhone number with "1001"</li>
            </ol>
          </div>

          <div className="mt-4 p-3 bg-amber-50 rounded text-sm border-l-4 border-amber-400">
            <div className="flex items-start">
              <AlertCircle className="h-4 w-4 text-amber-600 mt-0.5 mr-2 flex-shrink-0" />
              <div>
                <p className="font-medium text-amber-800">Debugging Checklist:</p>
                <ul className="list-disc list-inside mt-1 space-y-1 text-xs text-amber-700">
                  <li>Ensure your OpenPhone API key is valid and has SMS permissions</li>
                  <li>Check your OpenPhone account has sufficient credits</li>
                  <li>Verify webhook URL is correctly set in OpenPhone dashboard</li>
                  <li>Check Supabase Edge Function logs for detailed error messages</li>
                  <li>Confirm the OPENPHONE_API_KEY secret is updated in Supabase</li>
                </ul>
              </div>
            </div>
          </div>

          <div className="mt-4 p-3 bg-gray-50 rounded text-sm">
            <p className="font-medium">Quick Links:</p>
            <div className="mt-1 space-y-1 text-xs">
              <div>• Supabase Edge Functions: <code className="bg-gray-200 px-1 rounded">https://supabase.com/dashboard/project/zutwyyepahbbvrcbsbke/functions</code></div>
              <div>• OpenPhone Webhook URL: <code className="bg-gray-200 px-1 rounded">https://tulhwmzrvbzzacphunes.supabase.co/functions/v1/openphone-webhook</code></div>
              <div>• OpenPhone Dashboard: <code className="bg-gray-200 px-1 rounded">https://openphone.com/dashboard</code></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
