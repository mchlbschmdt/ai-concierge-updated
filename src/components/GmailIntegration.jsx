
import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/use-toast";
import { Gmail, Loader2 } from "lucide-react";

export default function GmailIntegration({ propertyId, onMessagesImported }) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [authenticated, setAuthenticated] = useState(false);
  const [filters, setFilters] = useState({
    from: 'express@airbnb.com',
    subject: '',
    after: '',
    maxResults: 10
  });

  // This would be connected to a real Gmail API integration
  // For now we'll simulate the authentication and data fetching
  const handleAuthenticate = () => {
    setLoading(true);
    
    // Simulate OAuth authentication
    setTimeout(() => {
      setAuthenticated(true);
      setLoading(false);
      toast({
        title: "Gmail Connected",
        description: "Your Gmail account has been successfully connected."
      });
    }, 1500);
  };
  
  const handleFilterChange = (e) => {
    setFilters({
      ...filters,
      [e.target.name]: e.target.value
    });
  };
  
  const handleFetchEmails = () => {
    setLoading(true);
    
    // Simulate API request
    setTimeout(() => {
      // Mock email data
      const mockEmails = [
        {
          id: 'email1',
          sender: 'Airbnb',
          sender_email: 'express@airbnb.com',
          receiver: 'Host',
          subject: 'New message from Alex',
          content: 'Hi there! I was wondering if early check-in would be possible around 1pm?',
          timestamp: new Date().toISOString(),
          source: 'gmail_import'
        },
        {
          id: 'email2',
          sender: 'Airbnb',
          sender_email: 'express@airbnb.com',
          receiver: 'Host',
          subject: 'New message from Sarah',
          content: 'Is the pool heated in October? And do you provide beach towels?',
          timestamp: new Date(Date.now() - 86400000).toISOString(), // Yesterday
          source: 'gmail_import'
        }
      ];
      
      setLoading(false);
      
      toast({
        title: "Emails Imported",
        description: `${mockEmails.length} messages have been imported.`
      });
      
      // Notify parent component
      if (onMessagesImported) {
        onMessagesImported(mockEmails);
      }
    }, 2000);
  };
  
  return (
    <div className="border rounded-lg p-4 bg-gray-50">
      <h3 className="text-lg font-medium mb-4">
        <Gmail className="inline-block mr-2 text-primary" size={20} />
        Gmail Integration
      </h3>
      
      {!authenticated ? (
        <div className="text-center py-4">
          <p className="text-sm text-gray-600 mb-4">
            Connect your Gmail account to import Airbnb guest messages
          </p>
          <Button 
            onClick={handleAuthenticate} 
            disabled={loading}
            className="w-full"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Connecting...
              </>
            ) : (
              <>
                <Gmail className="mr-2 h-4 w-4" />
                Connect Gmail
              </>
            )}
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          <p className="text-sm text-green-600 flex items-center">
            <span className="inline-block w-2 h-2 bg-green-500 rounded-full mr-2"></span>
            Gmail account connected
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium block mb-1">From Email</label>
              <Input 
                name="from"
                value={filters.from}
                onChange={handleFilterChange}
                placeholder="express@airbnb.com"
              />
            </div>
            <div>
              <label className="text-sm font-medium block mb-1">Subject Contains</label>
              <Input 
                name="subject"
                value={filters.subject}
                onChange={handleFilterChange}
                placeholder="e.g. New message"
              />
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium block mb-1">After Date</label>
              <Input 
                name="after"
                value={filters.after}
                onChange={handleFilterChange}
                type="date"
              />
            </div>
            <div>
              <label className="text-sm font-medium block mb-1">Max Results</label>
              <Input 
                name="maxResults"
                value={filters.maxResults}
                onChange={handleFilterChange}
                type="number"
                min="1"
                max="50"
              />
            </div>
          </div>
          
          <Button 
            onClick={handleFetchEmails} 
            disabled={loading}
            className="w-full"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Fetching Emails...
              </>
            ) : (
              "Fetch Airbnb Emails"
            )}
          </Button>
          
          <p className="text-xs text-gray-500 mt-2">
            Note: This will fetch emails matching your filters and associate them with this property.
          </p>
        </div>
      )}
    </div>
  );
}
