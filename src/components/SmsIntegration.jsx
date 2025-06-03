
import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/use-toast";
import { MessageSquare, Send, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export default function SmsIntegration({ propertyId }) {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const { toast } = useToast();

  const quickTemplates = [
    "Hi! Your check-in information has been sent to your email. Let us know if you need anything!",
    "Thanks for your message! We'll get back to you shortly.",
    "Check-in is at 3 PM and check-out is at 11 AM. Parking is available on-site.",
    "WiFi password: Welcome2024. Need anything else? Just text us!"
  ];

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
      const { data, error } = await supabase.functions.invoke('send-sms', {
        body: {
          to: phoneNumber,
          message: message,
          phoneNumberId: 'default'
        }
      });

      if (error) throw error;

      toast({
        title: "SMS Sent",
        description: `Message sent successfully to ${phoneNumber}`
      });

      // Clear form
      setPhoneNumber('');
      setMessage('');

    } catch (error) {
      console.error("SMS send error:", error);
      toast({
        title: "Failed to Send SMS",
        description: error.message || "Please try again",
        variant: "destructive"
      });
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm p-4">
      <h2 className="text-lg font-semibold mb-4 flex items-center">
        <MessageSquare className="mr-2" /> SMS Integration
      </h2>
      
      <div className="space-y-4">
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
      </div>
    </div>
  );
}
