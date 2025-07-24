
import React, { useState } from 'react';
import { supabase } from '../integrations/supabase/client';
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/use-toast";
import { Loader2, MessageSquare } from "lucide-react";

export default function AirbnbMessageParser({ propertyId, onMessagesAdded }) {
  const { toast } = useToast();
  const [jsonInput, setJsonInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [messageCount, setMessageCount] = useState(0);

  const parseMessages = async () => {
    if (!jsonInput || !propertyId) return;
    
    try {
      setLoading(true);
      
      // Validate JSON
      let messagesData;
      try {
        messagesData = JSON.parse(jsonInput);
      } catch (error) {
        toast({
          title: "Invalid JSON",
          description: "Please ensure you've pasted valid JSON data.",
          variant: "destructive"
        });
        return;
      }
      
      // Check if messagesData is array or has a messages property
      let messages = Array.isArray(messagesData) ? messagesData : messagesData.messages;
      
      if (!Array.isArray(messages)) {
        toast({
          title: "Invalid Format",
          description: "Could not find message array in JSON data.",
          variant: "destructive"
        });
        return;
      }
      
      // Reference to property document
      const propertyDocRef = doc(db, "properties", propertyId);
      const propertyDoc = await getDoc(propertyDocRef);
      
      if (!propertyDoc.exists()) {
        toast({
          title: "Error",
          description: "Property not found.",
          variant: "destructive"
        });
        return;
      }
      
      // Process each message and add to Firestore
      const processedMessages = messages.map(msg => {
        // Normalize the message format from various Airbnb JSON formats
        return {
          sender: msg.sender_name || msg.sender || "Guest",
          receiver: msg.receiver_name || msg.receiver || "Host",
          content: msg.message || msg.content || msg.text || "",
          timestamp: msg.timestamp || msg.date || new Date().toISOString(),
          source: "airbnb_json",
          parsed_at: new Date()
        };
      });
      
      // Filter out empty messages
      const validMessages = processedMessages.filter(msg => msg.content && msg.content.trim() !== "");
      
      if (validMessages.length === 0) {
        toast({
          title: "No Valid Messages",
          description: "No valid messages found in the JSON data.",
          variant: "destructive"
        });
        return;
      }
      
      // Update the property document with new messages
      await updateDoc(propertyDocRef, {
        messages: arrayUnion(...validMessages)
      });
      
      setMessageCount(validMessages.length);
      
      toast({
        title: "Success",
        description: `${validMessages.length} messages added to the knowledge base.`
      });
      
      // Clear input and notify parent component
      setJsonInput('');
      
      if (onMessagesAdded) {
        onMessagesAdded(validMessages);
      }
      
    } catch (error) {
      console.error("Error parsing messages:", error);
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="border rounded-lg p-4 bg-gray-50">
      <h3 className="text-lg font-medium mb-4">Airbnb Message Parser</h3>
      
      <div className="mb-4">
        <p className="text-sm text-gray-500 mb-2">
          Paste Airbnb JSON message data to add to the property knowledge base
        </p>
        
        <Textarea
          value={jsonInput}
          onChange={(e) => setJsonInput(e.target.value)}
          placeholder={`Paste Airbnb JSON message data here, e.g.:\n{\n  "messages": [\n    {\n      "sender": "Guest Name",\n      "message": "What's the wifi password?",\n      "timestamp": "2023-05-15T14:30:00Z"\n    }\n  ]\n}`}
          className="font-mono text-sm min-h-[200px] mb-3"
          disabled={loading}
        />
      </div>
      
      <Button 
        onClick={parseMessages} 
        disabled={!jsonInput || loading}
        className="w-full"
      >
        {loading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Processing...
          </>
        ) : (
          <>
            <MessageSquare className="mr-2 h-4 w-4" />
            Parse Messages
          </>
        )}
      </Button>
      
      {messageCount > 0 && (
        <div className="mt-3 p-2 bg-green-50 text-green-700 text-sm rounded">
          Successfully added {messageCount} messages to the knowledge base.
        </div>
      )}
    </div>
  );
}
