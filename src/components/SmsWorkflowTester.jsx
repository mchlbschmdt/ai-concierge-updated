
import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { MessageSquare, Send, Phone, RefreshCw } from "lucide-react";

export default function SmsWorkflowTester() {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [testingWebhook, setTestingWebhook] = useState(false);
  const { toast } = useToast();

  const sendDirectSms = async () => {
    if (!phoneNumber || !message) {
      toast({
        title: "Missing Information",
        description: "Please enter both phone number and message",
        variant: "destructive"
      });
      return;
    }

    setSending(true);
    try {
      console.log('🔍 Testing direct SMS sending...');
      
      const { data, error } = await supabase.functions.invoke('send-sms', {
        body: {
          to: phoneNumber,
          message: message,
          phoneNumberId: '+18333301032'
        }
      });

      if (error) {
        throw error;
      }

      toast({
        title: "SMS Sent Successfully",
        description: `Message sent to ${phoneNumber}`,
      });

      setPhoneNumber('');
      setMessage('');

    } catch (error) {
      console.error("SMS send error:", error);
      toast({
        title: "SMS Send Failed",
        description: error.message || "Check console for details",
        variant: "destructive"
      });
    } finally {
      setSending(false);
    }
  };

  const testIncomingSmsWorkflow = async () => {
    setTestingWebhook(true);
    try {
      console.log('🧪 Testing incoming SMS workflow (simulates receiving "1001")...');
      
      const response = await fetch('https://zutwyyepahbbvrcbsbke.supabase.co/functions/v1/openphone-webhook', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp1dHd5eWVwYWhiYnZyY2JzYmtlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDU0MDg3MDMsImV4cCI6MjA2MDk4NDcwM30.kUje38W2D2vXjYos6laaZ_rOzADLGiftoHAztFqSP9g`,
        },
        body: JSON.stringify({
          type: 'message.received',
          data: {
            object: {
              id: 'test-workflow-' + Date.now(),
              conversationId: 'test-conversation-' + Date.now(),
              direction: 'incoming',
              from: '+12627453798', // Test number
              to: '+18333301032', // Your OpenPhone number
              body: '1001',
              text: '1001',
              createdAt: new Date().toISOString()
            }
          }
        })
      });

      const responseText = await response.text();
      console.log('🔍 Webhook test response:', response.status, responseText);

      if (response.ok) {
        toast({
          title: "Workflow Test Complete",
          description: "Check console logs. If this worked, you should receive an SMS reply.",
        });
      } else {
        toast({
          title: "Workflow Test Failed",
          description: `Status: ${response.status} - Check console for details`,
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('🔥 Workflow test error:', error);
      toast({
        title: "Workflow Test Failed",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setTestingWebhook(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm p-4">
      <h3 className="text-lg font-semibold mb-4 flex items-center">
        <MessageSquare className="mr-2" /> SMS Workflow Tester
      </h3>
      
      <div className="space-y-4">
        {/* Direct SMS Test */}
        <div className="p-3 bg-blue-50 rounded-lg">
          <h4 className="font-medium text-blue-800 mb-3">📤 Direct SMS Test</h4>
          
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium mb-1">Phone Number</label>
              <Input
                placeholder="+1234567890"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Message</label>
              <Input
                placeholder="Test message"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
              />
            </div>

            <Button 
              onClick={sendDirectSms}
              disabled={sending || !phoneNumber || !message}
              className="w-full"
            >
              {sending ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  Sending SMS...
                </>
              ) : (
                <>
                  <Send className="mr-2 h-4 w-4" />
                  Send Direct SMS
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Workflow Test */}
        <div className="p-3 bg-green-50 rounded-lg">
          <h4 className="font-medium text-green-800 mb-3">🔄 Incoming SMS Workflow Test</h4>
          <p className="text-sm text-green-700 mb-3">
            This simulates receiving "1001" and tests if an automated response is sent back.
          </p>
          
          <Button 
            onClick={testIncomingSmsWorkflow}
            disabled={testingWebhook}
            className="w-full bg-green-600 hover:bg-green-700"
          >
            {testingWebhook ? (
              <>
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                Testing Workflow...
              </>
            ) : (
              <>
                <Phone className="mr-2 h-4 w-4" />
                Test Incoming SMS Workflow
              </>
            )}
          </Button>
        </div>

        {/* Manual Test Instructions */}
        <div className="p-3 bg-yellow-50 rounded-lg">
          <h4 className="font-medium text-yellow-800 mb-2">📱 Manual Test</h4>
          <p className="text-sm text-yellow-700">
            <strong>Text "1001" to +1 (833) 330-1032</strong> from your phone to test the complete workflow.
            You should receive an automated response within 30 seconds.
          </p>
        </div>
      </div>
    </div>
  );
}
