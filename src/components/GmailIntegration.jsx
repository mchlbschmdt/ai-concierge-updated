
import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/use-toast";
import { Mail, Loader2 } from "lucide-react";
import { useGmailAuth } from "../context/GmailAuthContext";
import GoogleOAuthButton from './GoogleOAuthButton';

export default function GmailIntegration({ onEmailsReceived = () => {} }) {
  const { isAuthenticated, userEmail, signOut } = useGmailAuth();
  const [syncing, setSyncing] = useState(false);
  const { toast } = useToast();
  
  const syncEmails = async () => {
    setSyncing(true);
    
    try {
      // Mock email syncing - in a real implementation this would call the Gmail API
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const mockEmails = [
        {
          id: 'email1',
          from: 'guest@example.com',
          subject: 'Question about check-in',
          body: 'Hi, what time can I check in tomorrow?',
          date: new Date().toISOString(),
          property_code: 'SBV001'
        },
        {
          id: 'email2',
          from: 'another-guest@example.com',
          subject: 'Pool access',
          body: 'Is the pool open 24/7 or are there specific hours?',
          date: new Date(Date.now() - 86400000).toISOString(),
          property_code: 'MRC002'
        }
      ];
      
      onEmailsReceived(mockEmails);
      
      toast({
        title: "Emails Synced",
        description: `Successfully synced ${mockEmails.length} emails`
      });
    } catch (error) {
      console.error("Email sync error:", error);
      toast({
        title: "Sync Failed",
        description: error.message || "Failed to sync emails",
        variant: "destructive"
      });
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div className="p-4 border rounded-lg bg-white shadow-sm">
      <h2 className="text-lg font-semibold mb-4 flex items-center">
        <Mail className="mr-2" /> Gmail Integration
      </h2>
      
      {!isAuthenticated ? (
        <div className="space-y-4">
          <p className="text-sm text-gray-500 mb-4">
            Connect your Gmail account to sync guest messages and Airbnb communications
          </p>
          <GoogleOAuthButton />
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">{userEmail}</p>
              <p className="text-sm text-green-600">Connected</p>
            </div>
            <div className="space-x-2">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={signOut}
              >
                Sign Out
              </Button>
              <Button 
                size="sm" 
                onClick={syncEmails}
                disabled={syncing}
              >
                {syncing ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Syncing...
                  </>
                ) : (
                  "Sync Emails"
                )}
              </Button>
            </div>
          </div>
          
          <div className="text-sm text-gray-500">
            <p>Last synced: {new Date().toLocaleString()}</p>
          </div>
        </div>
      )}
    </div>
  );
}
