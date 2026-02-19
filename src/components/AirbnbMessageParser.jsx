
import React, { useState } from 'react';
import { supabase } from '../integrations/supabase/client';
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/context/ToastContext";
import { Loader2, MessageSquare } from "lucide-react";

export default function AirbnbMessageParser({ propertyId, onMessagesAdded }) {
  const { showToast } = useToast();
  const [jsonInput, setJsonInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [messageCount, setMessageCount] = useState(0);

  const parseMessages = async () => {
    if (!jsonInput || !propertyId) return;
    
    try {
      setLoading(true);
      
      let messagesData;
      try {
        messagesData = JSON.parse(jsonInput);
      } catch {
        showToast("Invalid JSON — please paste valid JSON data.", "error");
        return;
      }
      
      let messages = Array.isArray(messagesData) ? messagesData : messagesData.messages;
      
      if (!Array.isArray(messages)) {
        showToast("Could not find message array in JSON data.", "error");
        return;
      }
      
      const processedMessages = messages.map(msg => ({
        sender: msg.sender_name || msg.sender || "Guest",
        receiver: msg.receiver_name || msg.receiver || "Host",
        content: msg.message || msg.content || msg.text || "",
        timestamp: msg.timestamp || msg.date || new Date().toISOString(),
        source: "airbnb_json",
        parsed_at: new Date().toISOString()
      }));
      
      const validMessages = processedMessages.filter(msg => msg.content?.trim());
      
      if (validMessages.length === 0) {
        showToast("No valid messages found in the JSON data.", "error");
        return;
      }

      // Upload as a JSON file to Supabase Storage
      const fileName = `airbnb-messages-${Date.now()}.json`;
      const storagePath = `${propertyId}/${fileName}`;
      const fileContent = JSON.stringify(validMessages, null, 2);
      const blob = new Blob([fileContent], { type: 'text/plain' });

      const { error: uploadError } = await supabase.storage
        .from('property-files')
        .upload(storagePath, blob, { contentType: 'text/plain', upsert: false });

      if (uploadError) throw uploadError;

      // Create file_uploads record linking to property
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error: recordError } = await supabase
        .from('file_uploads')
        .insert({
          user_id: user.id,
          storage_path: storagePath,
          original_name: fileName,
          file_type: 'application/json',
          file_size: blob.size,
          metadata: { property_id: propertyId, source: 'airbnb_parser' }
        });

      if (recordError) throw recordError;

      setMessageCount(validMessages.length);
      showToast(`${validMessages.length} messages uploaded to property knowledge base.`, "success");
      setJsonInput('');
      
      if (onMessagesAdded) {
        onMessagesAdded(validMessages);
      }
      
    } catch (error) {
      console.error("Error parsing messages:", error);
      showToast(error.message || "Error processing messages", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="border rounded-lg p-4 bg-muted/30">
      <h3 className="text-lg font-medium mb-4">Airbnb Message Parser</h3>
      
      <div className="mb-4">
        <p className="text-sm text-muted-foreground mb-2">
          Paste Airbnb JSON message data to add to the property knowledge base. The AI concierge will learn from these conversations.
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
            Parse & Upload Messages
          </>
        )}
      </Button>
      
      {messageCount > 0 && (
        <div className="mt-3 p-2 bg-green-50 text-green-700 text-sm rounded">
          Successfully uploaded {messageCount} messages to the knowledge base.
        </div>
      )}
    </div>
  );
}
