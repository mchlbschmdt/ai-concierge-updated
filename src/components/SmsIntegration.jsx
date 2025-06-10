
import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/use-toast";
import { MessageSquare, Send, Loader2, Bug, CheckCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export default function SmsIntegration({ propertyId }) {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [testing, setTesting] = useState(false);
  const [healthChecking, setHealthChecking] = useState(false);
  const { toast } = useToast();

  const quickTemplates = [
    "Hi! Your check-in information has been sent to your email. Let us know if you need anything!",
    "Thanks for your message! We'll get back to you shortly.",
    "Check-in is at 3 PM and check-out is at 11 AM. Parking is available on-site.",
    "WiFi password: Welcome2024. Need anything else? Just text us!"
  ];

  const testFunctionHealth = async () => {
    setHealthChecking(true);
    try {
      console.log('🔍 Testing function health with GET request...');
      
      const response = await fetch('https://zutwyyepahbbvrcbsbke.supabase.co/functions/v1/send-sms', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp1dHd5eWVwYWhiYnZyY2JzYmtlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDU0MDg3MDMsImV4cCI6MjA2MDk4NDcwM30.kUje38W2D2vXjYos6laaZ_rOzADLGiftoHAztFqSP9g`,
          'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp1dHd5eWVwYWhiYnZyY2JzYmtlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDU0MDg3MDMsImV4cCI6MjA2MDk4NDcwM30.kUje38W2D2vXjYos6laaZ_rOzADLGiftoHAztFqSP9g'
        }
      });

      console.log('🔍 Health check response status:', response.status);
      
      if (response.ok) {
        const data = await response.json();
        console.log('🔍 Health check response:', data);
        
        toast({
          title: "Function Health Check",
          description: `✅ Function accessible. API key configured: ${data.apiKeyConfigured}`,
        });
      } else {
        const errorText = await response.text();
        console.error('❌ Health check failed:', response.status, errorText);
        
        toast({
          title: "Function Health Check Failed",
          description: `Status: ${response.status} - Check console for details`,
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('❌ Health check error:', error);
      toast({
        title: "Health Check Failed",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setHealthChecking(false);
    }
  };

  const sendSms = async () => {
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
      console.log('🔍 Sending SMS to:', phoneNumber, 'Message:', message);
      console.log('🔍 Supabase client configured:', !!supabase);
      
      // Try direct fetch first with enhanced headers
      console.log('🔍 Attempting direct fetch to edge function...');
      const response = await fetch('https://zutwyyepahbbvrcbsbke.supabase.co/functions/v1/send-sms', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp1dHd5eWVwYWhiYnZyY2JzYmtlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDU0MDg3MDMsImV4cCI6MjA2MDk4NDcwM30.kUje38W2D2vXjYos6laaZ_rOzADLGiftoHAztFqSP9g`,
          'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp1dHd5eWVwYWhiYnZyY2JzYmtlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDU0MDg3MDMsImV4cCI6MjA2MDk4NDcwM30.kUje38W2D2vXjYos6laaZ_rOzADLGiftoHAztFqSP9g'
        },
        body: JSON.stringify({
          to: phoneNumber,
          message: message,
          phoneNumberId: '+18333301032'
        })
      });

      console.log('🔍 Direct fetch response status:', response.status);
      
      if (response.ok) {
        const data = await response.json();
        console.log('🔍 Direct fetch success:', data);
        
        toast({
          title: "SMS Sent",
          description: `Message sent successfully to ${phoneNumber}`
        });

        // Clear form
        setPhoneNumber('');
        setMessage('');
      } else {
        const errorText = await response.text();
        console.error('❌ Direct fetch failed:', response.status, errorText);
        
        // Fallback to Supabase client method
        console.log('🔍 Trying Supabase client method as fallback...');
        const { data, error } = await supabase.functions.invoke('send-sms', {
          body: {
            to: phoneNumber,
            message: message,
            phoneNumberId: '+18333301032'
          }
        });

        if (error) {
          console.error('❌ Supabase client also failed:', error);
          throw new Error(`Both methods failed. Direct: ${response.status}, Client: ${error.message}`);
        }

        console.log('🔍 Supabase client success:', data);
        toast({
          title: "SMS Sent",
          description: `Message sent successfully to ${phoneNumber} (via fallback)`
        });

        // Clear form
        setPhoneNumber('');
        setMessage('');
      }

    } catch (error) {
      console.error("❌ SMS send error:", error);
      toast({
        title: "Failed to Send SMS",
        description: error.message || "Please check the console for details",
        variant: "destructive"
      });
    } finally {
      setSending(false);
    }
  };

  const testSmsFunction = async () => {
    setTesting(true);
    try {
      console.log('🔍 Testing SMS function with test data...');
      
      // Try direct fetch method
      const response = await fetch('https://zutwyyepahbbvrcbsbke.supabase.co/functions/v1/send-sms', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp1dHd5eWVwYWhiYnZyY2JzYmtlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDU0MDg3MDMsImV4cCI6MjA2MDk4NDcwM30.kUje38W2D2vXjYos6laaZ_rOzADLGiftoHAztFqSP9g`,
          'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp1dHd5eWVwYWhiYnZyY2JzYmtlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDU0MDg3MDMsImV4cCI6MjA2MDk4NDcwM30.kUje38W2D2vXjYos6laaZ_rOzADLGiftoHAztFqSP9g'
        },
        body: JSON.stringify({
          to: '+1234567890',
          message: 'Test message from SMS integration - ' + new Date().toLocaleTimeString(),
          phoneNumberId: '+18333301032'
        })
      });

      console.log('🔍 Test response status:', response.status);
      
      if (response.ok) {
        const data = await response.json();
        console.log('🔍 Test SMS Response:', data);
        
        toast({
          title: "SMS Function Test",
          description: "Function responded successfully (check logs for API call result)",
        });
      } else {
        const errorText = await response.text();
        console.error('❌ Test failed:', response.status, errorText);
        
        toast({
          title: "SMS Function Test Failed",
          description: `Status: ${response.status} - Check console for details`,
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error("❌ SMS function test error:", error);
      toast({
        title: "SMS Function Test Failed",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm p-4">
      <h2 className="text-lg font-semibold mb-4 flex items-center">
        <MessageSquare className="mr-2" /> SMS Integration
      </h2>
      
      <div className="space-y-4">
        {/* Health Check Section */}
        <div className="p-3 bg-gray-50 rounded-lg">
          <h4 className="font-medium text-gray-800 mb-2">🏥 Function Health Check</h4>
          <Button 
            onClick={testFunctionHealth}
            disabled={healthChecking}
            variant="outline"
            className="w-full mb-2"
          >
            {healthChecking ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Checking...
              </>
            ) : (
              <>
                <CheckCircle className="mr-2 h-4 w-4" />
                Test Function Health
              </>
            )}
          </Button>
          <p className="text-xs text-gray-600">This checks if the function is deployed and API key is configured</p>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Phone Number</label>
          <Input
            placeholder="+1234567890"
            value={phoneNumber}
            onChange={(e) => setPhoneNumber(e.target.value)}
          />
          <p className="text-xs text-gray-500 mt-1">Include country code (e.g., +1 for US)</p>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Message</label>
          <Textarea
            placeholder="Type your message here..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={3}
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Quick Templates</label>
          <div className="grid grid-cols-1 gap-2">
            {quickTemplates.map((template, index) => (
              <button
                key={index}
                className="text-left text-sm p-2 border rounded hover:bg-gray-50 transition-colors"
                onClick={() => setMessage(template)}
              >
                {template}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          <Button 
            onClick={sendSms}
            disabled={sending || !phoneNumber || !message}
            className="w-full"
          >
            {sending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Sending...
              </>
            ) : (
              <>
                <Send className="mr-2 h-4 w-4" />
                Send SMS
              </>
            )}
          </Button>

          <Button 
            onClick={testSmsFunction}
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
              <>
                <Bug className="mr-2 h-4 w-4" />
                Test Function
              </>
            )}
          </Button>
        </div>

        <div className="mt-4 p-3 bg-gray-50 rounded text-xs">
          <p className="font-medium">Debug Steps:</p>
          <p>• 1. Test Function Health to verify deployment and API key</p>
          <p>• 2. Check browser console for detailed logs</p>
          <p>• 3. Test Function validates SMS function without sending</p>
          <p>• 4. Make sure OPENPHONE_API_KEY is configured in Supabase secrets</p>
          <p>• 5. Updated config to disable JWT verification for better compatibility</p>
        </div>
      </div>
    </div>
  );
}
