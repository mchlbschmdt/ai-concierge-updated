import React, { useEffect, useState } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../firebase";
import { Card, CardContent } from "@/components/ui/card";

function getTopKeywords(messages) {
  const keywordCounts = {};
  messages.forEach((msg) => {
    const words = msg.message?.toLowerCase().split(/\W+/);
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
      const querySnapshot = await getDocs(collection(db, "messages"));
      const data = querySnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      setMessages(data);
      setLoading(false);
    };
    fetchMessages();
  }, []);

  const topKeywords = getTopKeywords(messages);

  return (
    <div className="p-6 space-y-10 bg-gray-100 min-h-screen">
      <h1 className="text-3xl font-bold text-gray-800">📬 Guest Message Logs</h1>

      {loading ? (
        <p>Loading...</p>
      ) : (
        <>
          <div className="bg-white p-4 shadow rounded-lg">
            <h2 className="text-xl font-semibold mb-3">🔑 Top Keywords</h2>
            <ul className="list-disc list-inside">
              {topKeywords.map(([word, count]) => (
                <li key={word}>
                  {word} <span className="text-gray-500">({count})</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {messages.map((msg) => (
              <Card key={msg.id} className="bg-white shadow-md rounded-lg">
                <CardContent className="space-y-2">
                  <p className="text-sm text-gray-500">
                    🕒 {new Date(msg.timestamp?.seconds * 1000).toLocaleString()}
                  </p>
                  <p><strong>📱 Guest:</strong> {msg.phone}</p>
                  <p><strong>🏠 Property:</strong> {msg.property_name}</p>
                  <p><strong>💬 Message:</strong> {msg.message}</p>
                  <p><strong>🤖 Response:</strong> {msg.response}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
