
import React, { useEffect, useState } from "react";
import { supabase } from "./integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import Layout from "./components/Layout";

function getTopKeywords(messages) {
  const keywordCounts = {};
  messages.forEach((msg) => {
    const words = msg.message.toLowerCase().split(/\W+/);
    words.forEach((word) => {
      if (word.length > 3) keywordCounts[word] = (keywordCounts[word] || 0) + 1;
    });
  });
  return Object.entries(keywordCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);
}

export default function MessagesDashboard() {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMessages = async () => {
    try {  
      const querySnapshot = await getDocs(collection(db, "messages"));
      const data = querySnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      console.log("🔥 Messages fetched:", data);
      setMessages(data);
      setLoading(false);
    } catch (err) {
      console.error("❌ Error fetching messages:", err);
    }    
};
    fetchMessages();
  }, []);

  const topKeywords = getTopKeywords(messages);

  return (
    <Layout>
      <div className="p-6 space-y-6">
        <h1 className="text-2xl font-bold">Guest Message Logs</h1>

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

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {messages.map((msg) => (
                <Card key={msg.id}>
                  <CardContent>
                    <p><strong>📱 {msg.phone}</strong></p>
                    <p><strong>🏠 {msg.property_name}</strong></p>
                    <p><strong>💬 Guest:</strong> {msg.message}</p>
                    <p><strong>🤖 Reply:</strong> {msg.response}</p>
                    <p className="text-sm text-gray-500">🕒 {new Date(msg.timestamp?.seconds * 1000).toLocaleString()}</p>
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
