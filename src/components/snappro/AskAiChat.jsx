import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Send, Loader2 } from 'lucide-react';

const QUICK_CHIPS = ['Make it warmer', 'Brighter please', 'More dramatic', 'Less saturated', 'Try B&W', 'Different sky', 'Sharper details', 'Undo last'];

export default function AskAiChat({ settings, onReprocess, isReprocessing }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  const sendMessage = async (text) => {
    if (!text.trim() || loading) return;
    const userMsg = text.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMsg }]);

    // Handle special commands
    if (userMsg.toLowerCase().includes('undo') || userMsg.toLowerCase().includes('go back')) {
      setMessages(prev => [...prev, { role: 'assistant', content: '↩️ Reverted to previous version.' }]);
      onReprocess(settings, 'Undo');
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('snappro-inspire', {
        body: { mode: 'ask_ai', currentSettings: settings, userMessage: userMsg },
      });
      if (error) throw error;

      const result = data?.result;
      if (result?.updatedSettings) {
        const label = result.versionLabel || userMsg.slice(0, 20);
        setMessages(prev => [...prev, { role: 'assistant', content: `✅ ${result.confirmationMessage || 'Applied changes'} → Version created` }]);
        onReprocess(result.updatedSettings, label, userMsg);
      } else {
        setMessages(prev => [...prev, { role: 'assistant', content: result?.confirmationMessage || 'I couldn\'t interpret that. Try being more specific.' }]);
      }
    } catch (err) {
      console.error(err);
      setMessages(prev => [...prev, { role: 'assistant', content: '❌ Failed to process request.' }]);
      toast.error(err.message || 'AI request failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Chat thread */}
      <div className="space-y-2 max-h-48 overflow-y-auto">
        {messages.length === 0 && (
          <p className="text-xs text-muted-foreground text-center py-4">Ask the AI to adjust your photo. Try "Make it warmer" or "More dramatic".</p>
        )}
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[80%] px-3 py-2 rounded-xl text-xs ${
              msg.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-muted text-foreground'
            }`}>
              {msg.content}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="px-3 py-2 rounded-xl bg-muted">
              <Loader2 className="w-3.5 h-3.5 animate-spin text-muted-foreground" />
            </div>
          </div>
        )}
      </div>

      {/* Quick chips */}
      <div className="flex flex-wrap gap-1.5">
        {QUICK_CHIPS.map((chip) => (
          <button
            key={chip}
            type="button"
            onClick={() => sendMessage(chip)}
            disabled={loading || isReprocessing}
            className="px-2.5 py-1 text-[11px] rounded-full border border-border bg-muted/30 text-foreground hover:border-primary/40 transition-colors disabled:opacity-50"
          >
            {chip}
          </button>
        ))}
      </div>

      {/* Input */}
      <div className="flex gap-2">
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="What would you like to change?"
          onKeyDown={(e) => e.key === 'Enter' && sendMessage(input)}
          className="text-xs flex-1"
          disabled={loading || isReprocessing}
        />
        <Button size="sm" onClick={() => sendMessage(input)} disabled={loading || isReprocessing || !input.trim()}>
          <Send className="w-3.5 h-3.5" />
        </Button>
      </div>
    </div>
  );
}
