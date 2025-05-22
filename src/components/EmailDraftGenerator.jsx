
import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/use-toast";
import { Loader2, Copy, RefreshCw } from "lucide-react";

export default function EmailDraftGenerator({ property, message }) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [generatedReply, setGeneratedReply] = useState('');
  const [editedReply, setEditedReply] = useState('');

  const generateReply = async () => {
    if (!message || !property) return;
    
    setLoading(true);
    
    // In a real implementation, this would call a backend API to generate a response
    // using the property's knowledge base and the guest message
    
    // Simulate API call
    setTimeout(() => {
      const knowledgeBase = property.knowledge_base || '';
      const rules = knowledgeBase.includes('check-in') 
        ? 'Check-in is at ' + (property.check_in_time || '3 PM') + '.'
        : '';
      const recommendations = property.local_recommendations || '';
      
      // Generate a simple response based on the message content
      let response = '';
      
      if (message.content.toLowerCase().includes('check-in')) {
        response = `Hi ${message.sender},\n\nThank you for your message. Check-in time is ${property.check_in_time || '3 PM'}. Please let me know if you need any assistance with check-in instructions.\n\nBest regards,\nProperty Host`;
      } else if (message.content.toLowerCase().includes('checkout') || message.content.toLowerCase().includes('check-out')) {
        response = `Hi ${message.sender},\n\nThank you for your message. Check-out time is ${property.check_out_time || '11 AM'}. Please leave the keys on the kitchen counter.\n\nBest regards,\nProperty Host`;
      } else if (message.content.toLowerCase().includes('wifi') || message.content.toLowerCase().includes('password')) {
        response = `Hi ${message.sender},\n\nThank you for your message. The WiFi network name is "${property.property_name} WiFi" and the password is in the welcome binder on the coffee table.\n\nBest regards,\nProperty Host`;
      } else {
        response = `Hi ${message.sender},\n\nThank you for your message. I'm happy to help with your inquiry. ${rules} ${recommendations ? 'For local recommendations: ' + recommendations : ''}\n\nPlease let me know if you need any additional information.\n\nBest regards,\nProperty Host`;
      }
      
      setGeneratedReply(response);
      setEditedReply(response);
      setLoading(false);
    }, 1500);
  };
  
  const handleCopy = () => {
    navigator.clipboard.writeText(editedReply);
    toast({
      title: "Copied!",
      description: "Response copied to clipboard"
    });
  };
  
  const handleRegenerateReply = () => {
    // Could add some variation here in a real implementation
    generateReply();
  };

  if (!message) {
    return (
      <div className="text-center p-4">
        <p className="text-gray-500">Select a message to generate a response</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="border p-3 rounded bg-gray-50 space-y-1">
        <div className="flex justify-between">
          <p className="text-sm font-medium">{message.sender}</p>
          <p className="text-xs text-gray-500">
            {new Date(message.timestamp?.seconds * 1000 || Date.parse(message.timestamp) || Date.now()).toLocaleString()}
          </p>
        </div>
        <p className="text-sm">{message.content}</p>
      </div>
      
      {!generatedReply ? (
        <Button 
          onClick={generateReply} 
          disabled={loading}
          className="w-full"
        >
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Generating Response...
            </>
          ) : (
            "Generate AI Reply"
          )}
        </Button>
      ) : (
        <>
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <h3 className="font-medium">AI Generated Reply</h3>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={handleRegenerateReply} disabled={loading}>
                  <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
                  <span className="ml-1">Regenerate</span>
                </Button>
                <Button variant="outline" size="sm" onClick={handleCopy}>
                  <Copy size={14} />
                  <span className="ml-1">Copy</span>
                </Button>
              </div>
            </div>
            <Textarea
              value={editedReply}
              onChange={(e) => setEditedReply(e.target.value)}
              className="min-h-[200px]"
              placeholder="Edit the generated response here..."
            />
            <p className="text-xs text-gray-500">
              You can edit this response before copying and sending it.
            </p>
          </div>
        </>
      )}
    </div>
  );
}
