
import React, { useEffect, useState } from "react";
import { supabase } from "./integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Layout from "./components/Layout";
import { Bot, User, Loader2 } from "lucide-react";

export default function MessagesDashboard() {
  const [messages, setMessages] = useState([]);
  const [properties, setProperties] = useState([]);
  const [propertyFilter, setPropertyFilter] = useState("all");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const { data: props } = await supabase
        .from("properties")
        .select("id, code, property_name")
        .order("property_name");
      setProperties(props || []);

      const { data: convos } = await supabase
        .from("sms_conversations")
        .select("id, phone_number, property_id, created_at");

      if (!convos || convos.length === 0) {
        setMessages([]);
        setLoading(false);
        return;
      }

      const convoIds = convos.map(c => c.id);
      const { data: msgs } = await supabase
        .from("sms_conversation_messages")
        .select("id, sms_conversation_id, role, content, timestamp")
        .in("sms_conversation_id", convoIds)
        .order("timestamp", { ascending: false })
        .limit(200);

      const convoMap = {};
      convos.forEach(c => { convoMap[c.id] = c; });

      const enriched = (msgs || []).map(msg => {
        const convo = convoMap[msg.sms_conversation_id] || {};
        const prop = (props || []).find(p => p.code === convo.property_id);
        return {
          ...msg,
          phone_number: convo.phone_number,
          property_code: convo.property_id,
          property_name: prop?.property_name || convo.property_id || "Unknown",
        };
      });

      setMessages(enriched);
    } catch (err) {
      console.error("Error fetching messages:", err);
    } finally {
      setLoading(false);
    }
  };

  const filtered = messages.filter(msg => {
    if (propertyFilter === "all") return true;
    return msg.property_code === propertyFilter;
  });

  const topKeywords = getTopKeywords(filtered.filter(m => m.role === "user"));

  return (
    <Layout>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-heading">Guest Messages</h1>
            <p className="text-sm text-muted-foreground">{filtered.length} messages</p>
          </div>

          <select
            value={propertyFilter}
            onChange={e => setPropertyFilter(e.target.value)}
            className="px-3 py-2 border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary bg-card"
          >
            <option value="all">All Properties</option>
            {properties.map(p => (
              <option key={p.id} value={p.code}>{p.property_name}</option>
            ))}
          </select>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            No messages yet. Messages will appear here when guests interact with your AI concierge.
          </div>
        ) : (
          <>
            {topKeywords.length > 0 && (
              <div className="bg-card border border-border rounded-lg p-4">
                <h2 className="text-sm font-semibold text-foreground mb-2">Top Keywords</h2>
                <div className="flex flex-wrap gap-2">
                  {topKeywords.map(([word, count]) => (
                    <Badge key={word} variant="secondary">{word} ({count})</Badge>
                  ))}
                </div>
              </div>
            )}

            <div className="space-y-2">
              {filtered.map(msg => (
                <div key={msg.id} className="bg-card border border-border rounded-lg p-4 flex items-start gap-3">
                  <div className={`mt-0.5 p-1.5 rounded-full ${msg.role === "assistant" ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}`}>
                    {msg.role === "assistant" ? <Bot className="h-4 w-4" /> : <User className="h-4 w-4" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <Badge variant={msg.role === "assistant" ? "default" : "outline"} className="text-[10px]">
                        {msg.role === "assistant" ? "AI" : "Guest"}
                      </Badge>
                      <span className="text-xs text-muted-foreground">{msg.property_name}</span>
                      {msg.phone_number && (
                        <span className="text-xs text-muted-foreground">{msg.phone_number}</span>
                      )}
                      <span className="text-xs text-muted-foreground ml-auto">
                        {new Date(msg.timestamp).toLocaleString()}
                      </span>
                    </div>
                    <p className="text-sm text-foreground">{msg.content}</p>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </Layout>
  );
}

function getTopKeywords(messages) {
  const counts = {};
  messages.forEach(msg => {
    const words = (msg.content || "").toLowerCase().split(/\W+/);
    words.forEach(w => {
      if (w.length > 3) counts[w] = (counts[w] || 0) + 1;
    });
  });
  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);
}
