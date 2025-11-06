import React, { useState } from 'react';
import Layout from '../components/Layout';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { useToast } from '../components/ui/use-toast';
import { Send, Loader2, MessageSquare, CheckCircle2 } from 'lucide-react';

const SmsConciergeTest = () => {
  const [customMessage, setCustomMessage] = useState('');
  const [responses, setResponses] = useState([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const testCases = [
    {
      id: 1,
      name: 'Property ID Setup',
      message: '1434',
      description: 'Connect to property 1434'
    },
    {
      id: 2,
      name: 'Hot Tub Question',
      message: 'How do I use the hot tub?',
      description: 'Test amenity details from knowledge base'
    },
    {
      id: 3,
      name: 'Checkout Time',
      message: 'What time is checkout?',
      description: 'Test structured property data + instructions'
    },
    {
      id: 4,
      name: 'Trash Pickup',
      message: 'When is trash pickup?',
      description: 'Test FAQ section search'
    },
    {
      id: 5,
      name: 'Resort Amenities',
      message: 'What amenities are available at the resort?',
      description: 'Test Solara Resort details'
    },
    {
      id: 6,
      name: 'Multi-Intent Query',
      message: "What's the checkout time and when is trash day?",
      description: 'Test handling multiple questions'
    },
    {
      id: 7,
      name: 'WiFi Question',
      message: "What's the WiFi password?",
      description: 'Test WiFi credentials retrieval'
    },
    {
      id: 8,
      name: 'Emergency Scenario',
      message: "The hot tub isn't working",
      description: 'Test emergency contact provision'
    }
  ];

  const sendTestMessage = async (message, testName) => {
    setLoading(true);
    
    try {
      const timestamp = new Date().toISOString();
      const payload = {
        type: 'message.received',
        data: {
          object: {
            id: `test-${Date.now()}`,
            conversationId: `test-conv-${Date.now()}`,
            direction: 'incoming',
            from: '+15551234567',
            to: '+18333301032',
            body: message,
            text: message,
            createdAt: timestamp
          }
        }
      };

      const response = await fetch(
        'https://zutwyyepahbbvrcbsbke.supabase.co/functions/v1/openphone-webhook',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload)
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      
      setResponses(prev => [{
        id: Date.now(),
        testName: testName || 'Custom Message',
        message,
        response: data.message || data.response || JSON.stringify(data),
        timestamp: new Date().toLocaleTimeString(),
        success: true
      }, ...prev]);

      toast({
        title: 'Message sent successfully',
        description: `Test: ${testName || 'Custom'}`,
        variant: 'default'
      });

    } catch (error) {
      console.error('Error sending test message:', error);
      
      setResponses(prev => [{
        id: Date.now(),
        testName: testName || 'Custom Message',
        message,
        response: `Error: ${error.message}`,
        timestamp: new Date().toLocaleTimeString(),
        success: false
      }, ...prev]);

      toast({
        title: 'Error sending message',
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCustomSubmit = (e) => {
    e.preventDefault();
    if (customMessage.trim()) {
      sendTestMessage(customMessage.trim(), null);
      setCustomMessage('');
    }
  };

  const clearResponses = () => {
    setResponses([]);
    toast({
      title: 'Responses cleared',
      description: 'Test history has been cleared',
      variant: 'default'
    });
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">SMS Concierge Testing</h1>
            <p className="text-gray-600">Test property 1434 knowledge base with quick action buttons</p>
          </div>
          {responses.length > 0 && (
            <Button variant="outline" onClick={clearResponses}>
              Clear History
            </Button>
          )}
        </div>

        {/* Custom Message Form */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Send className="h-5 w-5" />
              Send Custom Test Message
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCustomSubmit} className="flex gap-2">
              <Input
                value={customMessage}
                onChange={(e) => setCustomMessage(e.target.value)}
                placeholder="Type your test message..."
                disabled={loading}
                className="flex-1"
              />
              <Button type="submit" disabled={loading || !customMessage.trim()}>
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Sending
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4 mr-2" />
                    Send
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Quick Test Cases */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              Quick Test Cases
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
              {testCases.map((testCase) => (
                <Button
                  key={testCase.id}
                  variant="outline"
                  onClick={() => sendTestMessage(testCase.message, testCase.name)}
                  disabled={loading}
                  className="h-auto py-3 px-4 flex flex-col items-start gap-1 text-left"
                >
                  <div className="font-semibold text-sm">{testCase.name}</div>
                  <div className="text-xs text-muted-foreground line-clamp-2">
                    {testCase.description}
                  </div>
                  <div className="text-xs text-primary mt-1 font-mono">
                    "{testCase.message}"
                  </div>
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Response History */}
        {responses.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5" />
                Response History ({responses.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {responses.map((item) => (
                  <div 
                    key={item.id}
                    className={`border rounded-lg p-4 ${
                      item.success 
                        ? 'border-green-200 bg-green-50' 
                        : 'border-red-200 bg-red-50'
                    }`}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex-1">
                        <div className="font-semibold text-gray-900">{item.testName}</div>
                        <div className="text-xs text-gray-500">{item.timestamp}</div>
                      </div>
                      <div className={`text-xs font-medium ${
                        item.success ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {item.success ? '✓ Success' : '✗ Error'}
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <div>
                        <div className="text-xs font-medium text-gray-500 mb-1">Sent:</div>
                        <div className="bg-white border rounded p-2 text-sm">
                          {item.message}
                        </div>
                      </div>
                      
                      <div>
                        <div className="text-xs font-medium text-gray-500 mb-1">Response:</div>
                        <div className={`border rounded p-2 text-sm whitespace-pre-wrap ${
                          item.success 
                            ? 'bg-white' 
                            : 'bg-red-100 border-red-300 text-red-900'
                        }`}>
                          {item.response}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Empty State */}
        {responses.length === 0 && (
          <Card>
            <CardContent className="py-12 text-center">
              <MessageSquare className="h-12 w-12 mx-auto mb-4 text-gray-400" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                No test messages sent yet
              </h3>
              <p className="text-gray-600 mb-4">
                Click a quick test case button or send a custom message to start testing
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </Layout>
  );
};

export default SmsConciergeTest;
