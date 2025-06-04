import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { addTestPropertyCodes, checkPropertyCodes } from "@/utils/addTestPropertyCodes";
import OpenPhoneApiKeyForm from './OpenPhoneApiKeyForm';
import { AlertCircle, CheckCircle, RefreshCw, Phone, MessageSquare } from 'lucide-react';

export default function TestSmsIntegration() {
  const [loading, setLoading] = useState(false);
  const [checkingCodes, setCheckingCodes] = useState(false);
  const [propertyCodes, setPropertyCodes] = useState([]);
  const [testingResponse, setTestingResponse] = useState(false);
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

  const testSmsResponseWorkflow = async () => {
    setTestingResponse(true);
    try {
      console.log('🧪 TESTING SMS RESPONSE WORKFLOW');
      console.log('This simulates receiving "1001" from a real phone number');
      
      const response = await fetch('https://tulhwmzrvbzzacphunes.supabase.co/functions/v1/openphone-webhook', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: 'message.received',
          data: {
            object: {
              id: 'workflow-test-' + Date.now(),
              conversationId: 'workflow-conversation-' + Date.now(),
              direction: 'incoming',
              from: '+15551234567', // Realistic test number
              to: '+18333301032', // Your OpenPhone number
              body: '1001',
              text: '1001',
              createdAt: new Date().toISOString()
            }
          }
        })
      });

      const responseText = await response.text();
      console.log('🔍 Webhook Response Status:', response.status);
      console.log('🔍 Webhook Response Body:', responseText);

      if (response.ok) {
        toast({
          title: "SMS Response Workflow Test Completed",
          description: "Check the console and Supabase logs to see if SMS was sent successfully. If this works but you don't receive SMS, the issue is with OpenPhone API key or account permissions.",
        });
      } else {
        toast({
          title: "Webhook Test Failed",
          description: `Status: ${response.status} - Check console for details`,
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('🔥 SMS workflow test error:', error);
      toast({
        title: "SMS Workflow Test Failed",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setTestingResponse(false);
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
          {/* Priority Testing Section */}
          <div className="p-4 bg-blue-50 rounded-lg border-l-4 border-blue-400">
            <div className="flex items-start">
              <MessageSquare className="h-5 w-5 text-blue-600 mt-0.5 mr-3 flex-shrink-0" />
              <div className="flex-1">
                <h4 className="font-medium text-blue-800 mb-2">🎯 PRIMARY TEST: SMS Response Workflow</h4>
                <p className="text-sm text-blue-700 mb-3">
                  This test simulates receiving "1001" from a real phone and checks if an automated response is sent back.
                  Based on the logs, we know the webhook is working and responses are generated - this will test if SMS actually gets sent.
                </p>
                <Button 
                  onClick={testSmsResponseWorkflow} 
                  disabled={testingResponse}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  {testingResponse ? (
                    <>
                      <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                      Testing SMS Response...
                    </>
                  ) : (
                    <>
                      <MessageSquare className="mr-2 h-4 w-4" />
                      Test SMS Response Workflow
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>

          {/* Manual Testing Instructions */}
          <div className="p-4 bg-green-50 rounded-lg border-l-4 border-green-400">
            <div className="flex items-start">
              <Phone className="h-5 w-5 text-green-600 mt-0.5 mr-3 flex-shrink-0" />
              <div>
                <h4 className="font-medium text-green-800 mb-2">📱 MANUAL TEST: Send Real SMS</h4>
                <p className="text-sm text-green-700 mb-2">
                  <strong>Text "1001" to +1 (833) 330-1032 from your phone right now</strong>
                </p>
                <p className="text-xs text-green-600">
                  You should receive an automated reply within 10-30 seconds asking you to confirm the property.
                  If you don't get a reply, the issue is with SMS sending (likely API key or account permissions).
                </p>
              </div>
            </div>
          </div>

          <div className="text-sm text-gray-600">
            <p>Property codes that will be added for testing:</p>
            <ul className="list-disc list-inside mt-1 text-xs">
              <li>1001 - Downtown Loft</li>
              <li>1002 - Beachfront Villa</li> 
              <li>1003 - Mountain Cabin</li>
              <li>0404 - User Property</li>
            </ul>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
            <Button onClick={handleAddTestData} disabled={loading} variant="outline">
              {loading ? "Adding..." : "Add Test Property Codes"}
            </Button>

            <Button onClick={handleCheckCodes} disabled={checkingCodes} variant="outline">
              {checkingCodes ? "Checking..." : "Check Current Codes"}
            </Button>

            <Button onClick={testWebhook} variant="outline">
              Test Webhook Health
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

          <div className="mt-4 p-3 bg-amber-50 rounded text-sm border-l-4 border-amber-400">
            <div className="flex items-start">
              <AlertCircle className="h-4 w-4 text-amber-600 mt-0.5 mr-2 flex-shrink-0" />
              <div>
                <p className="font-medium text-amber-800">🔍 Current Status Analysis:</p>
                <ul className="list-disc list-inside mt-1 space-y-1 text-xs text-amber-700">
                  <li><strong>✅ Webhook Processing:</strong> Working - messages are being received and processed</li>
                  <li><strong>✅ Database Storage:</strong> Working - conversations and responses are stored</li>
                  <li><strong>✅ Response Generation:</strong> Working - automated responses are generated</li>
                  <li><strong>❓ SMS Sending:</strong> Unknown - this is what we're testing now</li>
                  <li><strong>🔑 Most Likely Issue:</strong> OpenPhone API key authentication or account permissions</li>
                </ul>
              </div>
            </div>
          </div>

          <div className="mt-4 p-3 bg-gray-50 rounded text-sm">
            <p className="font-medium">Quick Links:</p>
            <div className="mt-1 space-y-1 text-xs">
              <div>• Supabase Edge Function Logs: <code className="bg-gray-200 px-1 rounded">https://supabase.com/dashboard/project/zutwyyepahbbvrcbsbke/functions/openphone-webhook/logs</code></div>
              <div>• OpenPhone Dashboard: <code className="bg-gray-200 px-1 rounded">https://openphone.com/dashboard</code></div>
              <div>• Your OpenPhone Number: <code className="bg-gray-200 px-1 rounded">+1 (833) 330-1032</code></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
