
import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MessageSquare, Send, User, Bot, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/components/ui/use-toast';

export default function HostAiChat() {
  const [messages, setMessages] = useState([]);
  const [currentMessage, setCurrentMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [conversationHistory, setConversationHistory] = useState([]);
  const messagesEndRef = useRef(null);
  const { toast } = useToast();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    loadConversationHistory();
  }, []);

  const loadConversationHistory = async () => {
    try {
      const { data, error } = await supabase
        .from('host_ai_conversations')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;
      setConversationHistory(data || []);
    } catch (error) {
      console.error('Error loading conversation history:', error);
    }
  };

  const sendMessage = async () => {
    if (!currentMessage.trim()) return;

    const userMessage = { role: 'user', content: currentMessage };
    setMessages(prev => [...prev, userMessage]);
    setCurrentMessage('');
    setIsLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke('host-ai-assistant', {
        body: { message: currentMessage }
      });

      if (error) throw error;

      const aiMessage = { role: 'assistant', content: data.response };
      setMessages(prev => [...prev, aiMessage]);
      
      // Reload conversation history to show the new conversation
      loadConversationHistory();
    } catch (error) {
      console.error('Error sending message:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to send message. Please try again."
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const quickQuestions = [
    "What are the most common guest questions?",
    "Which properties get the most inquiries?",
    "What recommendations do guests ask for most?",
    "Any recent guest feedback trends?",
    "Help me improve my property descriptions"
  ];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Main Chat Interface */}
      <div className="lg:col-span-2">
        <Card className="h-96">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              AI Host Support
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Messages */}
            <div className="h-64 overflow-y-auto space-y-3 p-3 bg-gray-50 rounded-lg">
              {messages.length === 0 && (
                <div className="text-center text-gray-500 py-8">
                  <Bot className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>Ask me anything about your properties or guests!</p>
                </div>
              )}
              
              {messages.map((message, index) => (
                <div key={index} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`flex items-start gap-2 max-w-[80%] ${message.role === 'user' ? 'flex-row-reverse' : ''}`}>
                    <div className={`p-2 rounded-full ${message.role === 'user' ? 'bg-blue-500' : 'bg-gray-300'}`}>
                      {message.role === 'user' ? (
                        <User className="h-3 w-3 text-white" />
                      ) : (
                        <Bot className="h-3 w-3" />
                      )}
                    </div>
                    <div className={`p-3 rounded-lg ${message.role === 'user' ? 'bg-blue-500 text-white' : 'bg-white border'}`}>
                      <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                    </div>
                  </div>
                </div>
              ))}
              
              {isLoading && (
                <div className="flex justify-start">
                  <div className="flex items-center gap-2">
                    <div className="p-2 rounded-full bg-gray-300">
                      <Bot className="h-3 w-3" />
                    </div>
                    <div className="bg-white border p-3 rounded-lg">
                      <Loader2 className="h-4 w-4 animate-spin" />
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="flex gap-2">
              <Input
                value={currentMessage}
                onChange={(e) => setCurrentMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Ask about your properties, guests, or get management tips..."
                disabled={isLoading}
              />
              <Button onClick={sendMessage} disabled={isLoading || !currentMessage.trim()}>
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Questions & History */}
      <div className="space-y-6">
        {/* Quick Questions */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Quick Questions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {quickQuestions.map((question, index) => (
              <Button
                key={index}
                variant="outline"
                size="sm"
                className="w-full text-xs text-left justify-start h-auto py-2 px-3"
                onClick={() => setCurrentMessage(question)}
              >
                {question}
              </Button>
            ))}
          </CardContent>
        </Card>

        {/* Recent Conversations */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Recent Conversations</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {conversationHistory.slice(0, 5).map((conv) => (
              <div key={conv.id} className="p-2 bg-gray-50 rounded text-xs">
                <p className="font-medium truncate">{conv.message}</p>
                <p className="text-gray-500 text-xs mt-1">
                  {new Date(conv.created_at).toLocaleDateString()}
                </p>
              </div>
            ))}
            {conversationHistory.length === 0 && (
              <p className="text-gray-500 text-xs">No conversations yet</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
