
import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/use-toast";
import { Mail, Loader2 } from "lucide-react";

export default function GmailIntegration({ propertyId, onMessagesImported }) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [loadingEmails, setLoadingEmails] = useState(false);
  const [authenticated, setAuthenticated] = useState(false);
  const [authStep, setAuthStep] = useState(0);
  const [filters, setFilters] = useState({
    from: 'express@airbnb.com',
    subject: '',
    after: '',
    maxResults: 10
  });
  const [advancedOptions, setAdvancedOptions] = useState(false);
  const [userEmail, setUserEmail] = useState('');
  const [customEmailInput, setCustomEmailInput] = useState('');
  const [showCustomEmailInput, setShowCustomEmailInput] = useState(false);
  
  // Check for existing Gmail auth in localStorage
  useEffect(() => {
    const savedAuth = localStorage.getItem('gmail_auth');
    const savedEmail = localStorage.getItem('gmail_email');
    if (savedAuth === 'true' && savedEmail) {
      setAuthenticated(true);
      setUserEmail(savedEmail);
    }
  }, []);

  const handleAuthenticate = () => {
    setLoading(true);
    setAuthStep(1);
    
    // Simulate OAuth flow
    setTimeout(() => {
      setAuthStep(2);
      setLoading(false);
    }, 1000);
  };
  
  const completeAuthentication = (email) => {
    if (email) {
      setUserEmail(email);
      setAuthStep(3);
      
      // Save authentication state
      localStorage.setItem('gmail_auth', 'true');
      localStorage.setItem('gmail_email', email);
      
      setTimeout(() => {
        setAuthenticated(true);
        setLoading(false);
        setAuthStep(0);
        
        toast({
          title: "Gmail Connected",
          description: `Your Gmail account (${email}) has been successfully connected.`
        });
      }, 1000);
    } else {
      cancelAuthentication();
    }
  };
  
  const handleSubmitCustomEmail = () => {
    if (customEmailInput && customEmailInput.includes('@')) {
      completeAuthentication(customEmailInput);
      setShowCustomEmailInput(false);
      setCustomEmailInput('');
    } else {
      toast({
        title: "Invalid Email",
        description: "Please enter a valid email address",
        variant: "destructive"
      });
    }
  };
  
  const disconnectGmail = () => {
    localStorage.removeItem('gmail_auth');
    localStorage.removeItem('gmail_email');
    setAuthenticated(false);
    setUserEmail('');
    
    toast({
      title: "Gmail Disconnected",
      description: "Your Gmail account has been disconnected."
    });
  };
  
  const cancelAuthentication = () => {
    setAuthStep(0);
    setLoading(false);
    setShowCustomEmailInput(false);
    setCustomEmailInput('');
    
    toast({
      title: "Authentication Cancelled",
      description: "Gmail connection was cancelled.",
      variant: "destructive"
    });
  };
  
  const handleFilterChange = (e) => {
    setFilters({
      ...filters,
      [e.target.name]: e.target.value
    });
  };
  
  const handleFetchEmails = () => {
    if (!authenticated) {
      toast({
        title: "Not Authenticated",
        description: "Please connect your Gmail account first.",
        variant: "destructive"
      });
      return;
    }
    
    setLoadingEmails(true);
    
    // Simulate fetching emails
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
          property_id: propertyId,
          source: 'gmail_import'
        },
        {
          id: 'email2',
          sender: 'Airbnb',
          sender_email: 'express@airbnb.com',
          receiver: 'Host',
          subject: 'New message from Sarah',
          content: 'Is the pool heated in October? And do you provide beach towels?',
          timestamp: new Date(Date.now() - 86400000).toISOString(),
          property_id: propertyId,
          source: 'gmail_import'
        }
      ];
      
      setLoadingEmails(false);
      
      toast({
        title: "Emails Imported",
        description: `${mockEmails.length} messages have been imported.`
      });
      
      // Notify parent component
      if (onMessagesImported) {
        onMessagesImported(propertyId, mockEmails);
      }
    }, 2000);
  };
  
  return (
    <div className="border rounded-lg p-4 bg-gray-50">
      <h3 className="text-lg font-medium mb-4">
        <Mail className="inline-block mr-2 text-primary" size={20} />
        Gmail Integration
      </h3>
      
      {!authenticated ? (
        <div className="text-center py-4">
          <p className="text-sm text-gray-600 mb-4">
            Connect your Gmail account to import Airbnb guest messages
          </p>
          
          {authStep > 0 && (
            <div className="mb-4 p-3 bg-white border rounded shadow-sm">
              {authStep === 1 && (
                <div className="flex flex-col items-center">
                  <Loader2 className="animate-spin mb-2 text-primary" size={24} />
                  <p>Redirecting to Google authentication...</p>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="mt-2"
                    onClick={cancelAuthentication}
                  >
                    Cancel
                  </Button>
                </div>
              )}
              {authStep === 2 && !showCustomEmailInput && (
                <div className="flex flex-col items-center">
                  <p className="mb-2">Select your Google account:</p>
                  <div 
                    onClick={() => completeAuthentication("user@gmail.com")}
                    className="border p-2 rounded w-full max-w-xs mb-2 hover:bg-gray-100 cursor-pointer"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <div className="w-8 h-8 rounded-full bg-blue-500 mr-2 flex items-center justify-center text-white">
                          U
                        </div>
                        <span>user@gmail.com</span>
                      </div>
                    </div>
                  </div>
                  <div 
                    onClick={() => completeAuthentication("work@gmail.com")}
                    className="border p-2 rounded w-full max-w-xs mb-2 hover:bg-gray-100 cursor-pointer"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <div className="w-8 h-8 rounded-full bg-red-500 mr-2 flex items-center justify-center text-white">
                          W
                        </div>
                        <span>work@gmail.com</span>
                      </div>
                    </div>
                  </div>
                  <div 
                    onClick={() => setShowCustomEmailInput(true)}
                    className="border p-2 rounded w-full max-w-xs mb-3 hover:bg-gray-100 cursor-pointer"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <div className="w-8 h-8 rounded-full bg-green-500 mr-2 flex items-center justify-center text-white">
                          +
                        </div>
                        <span>Use another account</span>
                      </div>
                    </div>
                  </div>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={cancelAuthentication}
                  >
                    Cancel
                  </Button>
                </div>
              )}
              {showCustomEmailInput && (
                <div className="flex flex-col items-center p-3">
                  <p className="mb-2">Enter your email address:</p>
                  <Input 
                    type="email"
                    value={customEmailInput}
                    onChange={(e) => setCustomEmailInput(e.target.value)}
                    placeholder="your.name@gmail.com"
                    className="mb-3"
                  />
                  <div className="flex gap-2">
                    <Button 
                      size="sm" 
                      onClick={handleSubmitCustomEmail}
                      disabled={!customEmailInput || !customEmailInput.includes('@')}
                    >
                      Connect
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => {
                        setShowCustomEmailInput(false);
                        setCustomEmailInput('');
                      }}
                    >
                      Back
                    </Button>
                  </div>
                </div>
              )}
              {authStep === 3 && (
                <div className="flex flex-col items-center">
                  <p className="text-green-600 mb-2">✓ Authorization successful</p>
                  <p className="text-sm">Completing connection...</p>
                </div>
              )}
            </div>
          )}
          
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
                <Mail className="mr-2 h-4 w-4" />
                Connect Gmail
              </>
            )}
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          <p className="text-sm text-green-600 flex items-center">
            <span className="inline-block w-2 h-2 bg-green-500 rounded-full mr-2"></span>
            Gmail account connected ({userEmail})
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
          
          <div className="flex items-center justify-between">
            <button 
              onClick={() => setAdvancedOptions(!advancedOptions)} 
              className="text-sm text-primary flex items-center"
            >
              {advancedOptions ? "Hide" : "Show"} advanced options
            </button>
            
            <Button 
              variant="outline" 
              size="sm" 
              className="flex items-center gap-1"
              onClick={disconnectGmail}
            >
              Switch account
            </Button>
          </div>
          
          {advancedOptions && (
            <div className="border-t pt-3 space-y-3">
              <div>
                <label className="text-sm font-medium block mb-1">Filter by Label</label>
                <Input 
                  name="label"
                  placeholder="e.g. Airbnb"
                />
              </div>
              
              <div className="flex items-center">
                <input 
                  type="checkbox" 
                  id="includeAttachments" 
                  className="mr-2"
                />
                <label htmlFor="includeAttachments" className="text-sm">
                  Download attachments
                </label>
              </div>
            </div>
          )}
          
          <div className="flex gap-2">
            <Button 
              onClick={handleFetchEmails} 
              disabled={loadingEmails}
              className="w-full"
            >
              {loadingEmails ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Fetching Emails...
                </>
              ) : (
                "Fetch Airbnb Emails"
              )}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
