// File: /frontend/dashboard-fixed/src/pages/SmartInsights.jsx

import React, { useEffect, useState } from 'react';
import { supabase } from '../integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer
} from 'recharts';

const URGENT_KEYWORDS = [
  'no hot water', 'locked out', 'leak', 'wifi not working', 'power out',
  'flood', 'ac broken', 'heat broken', 'can’t get in', 'code not working'
];

export default function SmartInsights() {
  const [messages, setMessages] = useState([]);
  const [faqSuggestions, setFaqSuggestions] = useState([]);
  const [hostFilter, setHostFilter] = useState('');
  const [selectedProperty, setSelectedProperty] = useState('');
  const [properties, setProperties] = useState([]);

  useEffect(() => {
    const fetchData = async () => {
      const propsSnapshot = await getDocs(collection(db, 'properties'));
      const props = propsSnapshot.docs.map(doc => doc.data());
      setProperties(props);

      let messageQuery = collection(db, 'messages');
      if (hostFilter) {
        messageQuery = query(messageQuery, where('host_id', '==', hostFilter));
      }
      if (selectedProperty) {
        messageQuery = query(messageQuery, where('property_id', '==', selectedProperty));
      }

      const snapshot = await getDocs(messageQuery);
      const msgs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setMessages(msgs);

      const existingFAQs = await getDocs(collection(db, 'faqs'));
      const existingKeywords = new Set();
      existingFAQs.docs.forEach(faq => {
        const kws = faq.data().question_keywords || [];
        kws.forEach(k => existingKeywords.add(k.toLowerCase()));
      });

      const keywordMap = {};
      msgs.forEach(msg => {
        const words = msg.message?.toLowerCase().split(/\W+/) || [];
        words.forEach(word => {
          if (word.length > 3 && !existingKeywords.has(word)) {
            keywordMap[word] = keywordMap[word] || [];
            keywordMap[word].push(msg);
          }
        });
      });

      const topSuggestions = Object.entries(keywordMap)
        .sort((a, b) => b[1].length - a[1].length)
        .slice(0, 10)
        .map(([word, msgs]) => ({
          word,
          message: msgs[0].message,
          property: msgs[0].property_name,
          property_id: msgs[0].property_id,
        }));

      setFaqSuggestions(topSuggestions);
    };

    fetchData();
  }, [hostFilter, selectedProperty]);

  const addFaq = async (keyword, answer, propertyId) => {
    await addDoc(collection(db, 'faqs'), {
      question_keywords: [keyword],
      answer,
      property_id: propertyId,
      created_at: Timestamp.now()
    });
    alert(`Added FAQ for "${keyword}"`);
  };

  const sendAlert = async (msg) => {
    await addDoc(collection(db, 'alerts'), {
      phone: msg.phone,
      property_id: msg.property_id,
      message: msg.message,
      timestamp: Timestamp.now(),
      alert_type: 'urgent'
    });

    try {
      await fetch('http://localhost:8000/trigger-alert', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: msg.phone,
          message: msg.message,
          property_id: msg.property_id
        })
      });
    } catch (err) {
      console.error('Error triggering alert webhook:', err);
    }

    alert('🚨 Alert triggered and stored');
  };

  const keywordFrequencyData = Object.entries(
    messages.reduce((acc, msg) => {
      const words = msg.message?.toLowerCase().split(/\W+/) || [];
      words.forEach(w => {
        if (w.length > 3) acc[w] = (acc[w] || 0) + 1;
      });
      return acc;
    }, {})
  ).sort((a, b) => b[1] - a[1]).slice(0, 10).map(([word, count]) => ({ word, count }));

  const messageTimes = messages.map(msg => {
    const date = new Date(msg.timestamp?.seconds * 1000 || Date.now());
    return date.getHours();
  });

  const timeBuckets = Array.from({ length: 24 }, (_, i) => ({
    hour: `${i}:00`,
    count: messageTimes.filter(h => h === i).length
  }));

  return (
    <div className="p-6 space-y-10 bg-gray-100 min-h-screen">
      <h1 className="text-3xl font-bold text-gray-800">Smart Insights & Alerts</h1>

      {/* Filters */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white p-4 rounded-lg shadow">
          <label className="block text-sm font-semibold mb-1">Filter by Host ID</label>
          <input
            className="border p-2 rounded w-full"
            type="text"
            value={hostFilter}
            onChange={(e) => setHostFilter(e.target.value)}
            placeholder="Enter Host ID"
          />
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <label className="block text-sm font-semibold mb-1">Filter by Property</label>
          <select
            className="border p-2 rounded w-full"
            value={selectedProperty}
            onChange={(e) => setSelectedProperty(e.target.value)}
          >
            <option value="">All Properties</option>
            {properties.map((prop, idx) => (
              <option key={idx} value={prop.code}>
                {prop.property_name || prop.code}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Urgent Alerts */}
      <div>
        <h2 className="text-2xl font-semibold text-red-600 mb-3">🚨 Urgent Alerts</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {messages
            .filter(msg => URGENT_KEYWORDS.some(k => msg.message?.toLowerCase().includes(k)))
            .map(alert => (
              <Card key={alert.id} className="border-red-500 border-2 bg-white shadow rounded-lg">
                <CardContent className="space-y-2">
                  <p><strong>🏠 Property:</strong> {alert.property_name}</p>
                  <p><strong>📱 Guest:</strong> {alert.phone}</p>
                  <p><strong>💬 Message:</strong> {alert.message}</p>
                  <Button onClick={() => sendAlert(alert)}>Send Email/SMS Alert</Button>
                </CardContent>
              </Card>
            ))}
        </div>
      </div>

      {/* Charts */}
      <div className="bg-white p-6 rounded-lg shadow space-y-6">
        <h2 className="text-xl font-semibold">📊 Keyword Frequency</h2>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={keywordFrequencyData}>
            <XAxis dataKey="word" />
            <YAxis />
            <Tooltip />
            <Bar dataKey="count" fill="#6366f1" />
          </BarChart>
        </ResponsiveContainer>

        <h2 className="text-xl font-semibold mt-6">🕒 Peak Message Times</h2>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={timeBuckets}>
            <XAxis dataKey="hour" />
            <YAxis />
            <Tooltip />
            <Bar dataKey="count" fill="#10b981" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* FAQ Suggestions */}
      <div className="space-y-4">
        <h2 className="text-2xl font-semibold">💡 AI-Suggested FAQ Entries</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {faqSuggestions.map((s, idx) => (
            <Card key={idx} className="bg-white rounded-lg shadow">
              <CardContent className="space-y-2">
                <p><strong>🔑 Keyword:</strong> {s.word}</p>
                <p><strong>💬 Example:</strong> {s.message}</p>
                <p><strong>🏠 Property:</strong> {s.property}</p>
                <p><strong>🤖 Suggested Answer:</strong> {s.aiAnswer || 'Pending'}</p>
                <Button onClick={() => addFaq(s.word, s.aiAnswer || "", s.property_id)}>➕ Add to FAQ</Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
