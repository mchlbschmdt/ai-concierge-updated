
// ✅ Step 1: Firestore Setup
// You should already have a `messages` collection from previous logging.
// Now create a new collection for manual FAQs.

// 🔹 Firestore: Create collection `faqs`
// Each document should have:
// - property_id (string)
// - question_keywords (array of strings)
// - answer (string)

// Example document:
// {
//   property_id: "PROP-12345",
//   question_keywords: ["checkout", "late checkout"],
//   answer: "Standard checkout is at 10 AM. Late checkout is available upon request."
// }

// ✅ Step 2: Frontend - Display Messages + Insights
// File: src/pages/MessagesDashboard.jsx

import React, { useEffect, useState } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../firebase";
import { Card, CardContent } from "@/components/ui/card";
import { Search as SearchIcon } from "lucide-react";

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
  const [search, setSearch] = useState("");
  const [suggestions, setSuggestions] = useState([]);

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
    (msg.phone || "").toLowerCase().includes(search.toLowerCase()) ||
    (msg.property_name || "").toLowerCase().includes(search.toLowerCase()) ||
    (msg.message || "").toLowerCase().includes(search.toLowerCase())
  );

  const handleSuggestionSelect = (suggestion) => {
    setSearch(suggestion);
    setSuggestions([]);
  };

  const topKeywords = getTopKeywords(messages);

  return (
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

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((msg) => (
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
  );
}
