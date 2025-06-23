
import React, { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Search as SearchIcon } from "lucide-react";
import Layout from '../components/Layout';

function getTopKeywords(messages) {
  const keywordCounts = {};
  messages.forEach((msg) => {
    const words = msg.message?.toLowerCase().split(/\W+/) || [];
    words.forEach((word) => {
      if (word && word.length > 3) keywordCounts[word] = (keywordCounts[word] || 0) + 1;
    });
  });
  return Object.entries(keywordCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);
}

export default function MessagesDashboard() {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [suggestions, setSuggestions] = useState([]);

  useEffect(() => {
    const fetchMessages = async () => {
      try {  
        // Using Supabase to fetch messages from sms_conversation_messages table
        const { data, error } = await supabase
          .from('sms_conversation_messages')
          .select(`
            *,
            sms_conversations (
              phone_number,
              property_id
            )
          `)
          .order('created_at', { ascending: false });
        
        if (error) throw error;
        
        // Transform data to match the expected format
        const transformedData = (data || []).map(msg => ({
          id: msg.id,
          phone: msg.sms_conversations?.phone_number || "Unknown",
          property_name: msg.sms_conversations?.property_id || "Unknown Property",
          message: msg.content || "",
          response: "", // This would come from AI responses
          timestamp: { seconds: new Date(msg.timestamp).getTime() / 1000 }
        }));
        
        console.log("🔥 Messages fetched:", transformedData);
        setMessages(transformedData);
        setLoading(false);
      } catch (err) {
        console.error("❌ Error fetching messages:", err);
        setLoading(false);
      }    
    };
    fetchMessages();
  }, []);

  useEffect(() => {
    if (search.trim() === '') {
      setSuggestions([]);
      return;
    }
    
    // Generate suggestions based on search input
    const matches = messages.filter(msg =>
      (msg.phone || "").toLowerCase().includes(search.toLowerCase()) ||
      (msg.property_name || "").toLowerCase().includes(search.toLowerCase()) ||
      (msg.message || "").toLowerCase().includes(search.toLowerCase())
    );
    
    // Get unique suggestion values across different fields
    const uniqueSuggestions = new Set();
    matches.forEach(msg => {
      if ((msg.phone || "").toLowerCase().includes(search.toLowerCase())) {
        uniqueSuggestions.add(msg.phone);
      }
      if ((msg.property_name || "").toLowerCase().includes(search.toLowerCase())) {
        uniqueSuggestions.add(msg.property_name);
      }
    });
    
    setSuggestions(Array.from(uniqueSuggestions).slice(0, 5)); // Limit to 5 suggestions
  }, [search, messages]);

  const filtered = messages.filter(msg =>
    !search ||
    (msg.phone || "").toLowerCase().includes(search.toLowerCase()) ||
    (msg.property_name || "").toLowerCase().includes(search.toLowerCase()) ||
    (msg.message || "").toLowerCase().includes(search.toLowerCase())
  );

  const handleSuggestionSelect = (suggestion) => {
    setSearch(suggestion);
    setSuggestions([]);
  };

  // Group messages by phone number/guest
  const groupedMessages = filtered.reduce((groups, message) => {
    const phone = message.phone || "Unknown";
    if (!groups[phone]) {
      groups[phone] = [];
    }
    groups[phone].push(message);
    return groups;
  }, {});

  const topKeywords = getTopKeywords(messages);

  return (
    <Layout>
      <div className="p-6 space-y-6">
        <h1 className="text-2xl font-bold">Guest Message Logs</h1>

        <div className="relative max-w-md mb-4">
          <input
            type="text"
            placeholder="Search messages..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-8 pr-3 py-2 border rounded focus:outline-primary bg-white w-full"
          />
          <SearchIcon className="absolute left-2 top-2.5 text-gray-400" size={18} />
          
          {/* Suggestions dropdown */}
          {suggestions.length > 0 && (
            <div className="absolute left-0 right-0 mt-1 bg-white border rounded shadow-lg z-10">
              {suggestions.map((suggestion, index) => (
                <div 
                  key={index} 
                  className="px-4 py-2 hover:bg-gray-100 cursor-pointer"
                  onClick={() => handleSuggestionSelect(suggestion)}
                >
                  {suggestion}
                </div>
              ))}
            </div>
          )}
        </div>

        {loading ? (
          <p>Loading...</p>
        ) : (
          <>
            <div>
              <h2 className="text-xl font-semibold mb-2">Top Keywords</h2>
              <ul className="list-disc list-inside">
                {topKeywords.map(([word, count]) => (
                  <li key={word}>{word} ({count})</li>
                ))}
              </ul>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {Object.entries(groupedMessages).map(([phone, phoneMessages]) => (
                <Card key={phone} className="mb-4">
                  <CardContent className="p-4">
                    <h3 className="text-lg font-bold mb-2">📱 {phone}</h3>
                    <p className="mb-2"><strong>🏠 {phoneMessages[0]?.property_name || "Unknown Property"}</strong></p>
                    
                    <div className="space-y-3 mt-4">
                      {phoneMessages.map((msg) => (
                        <div key={msg.id} className="bg-gray-50 p-3 rounded-lg">
                          <p><strong>💬 Guest:</strong> {msg.message}</p>
                          <p><strong>🤖 Reply:</strong> {msg.response}</p>
                          <p className="text-sm text-gray-500 mt-1">
                            🕒 {msg.timestamp ? new Date(msg.timestamp?.seconds * 1000).toLocaleString() : "Unknown time"}
                          </p>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </>
        )}
      </div>
    </Layout>
  );
}
