
import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/use-toast";
import { Mail, Loader2 } from "lucide-react";

export default function GmailIntegration({ onEmailsReceived = () => {} }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [emailAddress, setEmailAddress] = useState('');
  const { toast } = useToast();
  
  // Check localStorage on mount to see if previously authenticated
  useEffect(() => {
    const savedAuth = localStorage.getItem('gmail_authenticated');
    const savedEmail = localStorage.getItem('gmail_email');
    
    if (savedAuth === 'true' && savedEmail) {
      setIsAuthenticated(true);
      setEmailAddress(savedEmail);
    }
  }, []);

  const handleSignIn = async () => {
    if (!emailAddress.trim()) {
      toast({
        title: "Email Required",
        description: "Please enter your email address first",
        variant: "destructive"
      });
      return;
    }
    
    setLoading(true);
    
    try {
      // Mock the authentication process
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Store authentication state in localStorage
      localStorage.setItem('gmail_authenticated', 'true');
      localStorage.setItem('gmail_email', emailAddress);
      
      setIsAuthenticated(true);
      
      toast({
        title: "Success",
        description: `Connected to Gmail account: ${emailAddress}`
      });
    } catch (error) {
      console.error("Gmail authentication error:", error);
      toast({
        title: "Authentication Failed",
        description: error.message || "Failed to connect to Gmail",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = () => {
    setIsAuthenticated(false);
    localStorage.removeItem('gmail_authenticated');
    localStorage.removeItem('gmail_email');
    
    toast({
      title: "Signed Out",
      description: "You've been signed out of Gmail"
    });
  };

  const syncEmails = async () => {
    setSyncing(true);
    
    try {
      // Mock email syncing
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
          <div className="flex gap-2">
            <Input
              type="email"
              placeholder="Enter your Gmail address"
              value={emailAddress}
              onChange={(e) => setEmailAddress(e.target.value)}
              disabled={loading}
            />
            <Button 
              onClick={handleSignIn}
              disabled={loading}
              className="whitespace-nowrap"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Connecting...
                </>
              ) : (
                "Connect Gmail"
              )}
            </Button>
          </div>
          <p className="text-sm text-gray-500 mt-2">
            Connect your Gmail account to sync guest messages and Airbnb communications
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">{emailAddress}</p>
              <p className="text-sm text-green-600">Connected</p>
            </div>
            <div className="space-x-2">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleSignOut}
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
