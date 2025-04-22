// File: src/pages/PropertyAnalytics.jsx
import React, { useEffect, useState } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import { Card, CardContent } from '@/components/ui/card';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';

export default function PropertyAnalytics() {
  const [messages, setMessages] = useState([]);
  const [selectedProperty, setSelectedProperty] = useState('');

  useEffect(() => {
    const fetchMessages = async () => {
      const snapshot = await getDocs(collection(db, 'messages'));
      const data = snapshot.docs.map((doc) => doc.data());
      setMessages(data);
    };
    fetchMessages();
  }, []);

  const filterMessages = () => {
    return selectedProperty
      ? messages.filter((m) => m.property_id === selectedProperty)
      : messages;
  };

  const getKeywordData = () => {
    const keywords = {};
    filterMessages().forEach((msg) => {
      msg.message?.toLowerCase().split(/\W+/).forEach((word) => {
        if (word.length > 3) keywords[word] = (keywords[word] || 0) + 1;
      });
    });
    return Object.entries(keywords)
      .map(([keyword, count]) => ({ keyword, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  };

  const getSentimentData = () => {
    const positive = ['great', 'love', 'awesome', 'easy', 'clean'];
    const negative = ['bad', 'dirty', 'broken', 'late', 'noisy'];
    let pos = 0,
      neg = 0;
    filterMessages().forEach((msg) => {
      const text = msg.message?.toLowerCase() || '';
      positive.forEach((w) => text.includes(w) && pos++);
      negative.forEach((w) => text.includes(w) && neg++);
    });
    return [
      { name: 'Positive', value: pos },
      { name: 'Negative', value: neg },
    ];
  };

  const getMessageTrends = () => {
    const trends = {};
    filterMessages().forEach((msg) => {
      if (msg.timestamp?.seconds) {
        const date = new Date(msg.timestamp.seconds * 1000)
          .toISOString()
          .slice(0, 10);
        trends[date] = (trends[date] || 0) + 1;
      }
    });
    return Object.entries(trends).map(([date, count]) => ({ date, count }));
  };

  const COLORS = ['#34d399', '#f87171'];

  return (
    <div className="p-6 space-y-8">
      <h1 className="text-2xl font-bold">📊 Property Analytics</h1>

      <select
        className="border p-2 rounded"
        value={selectedProperty}
        onChange={(e) => setSelectedProperty(e.target.value)}
      >
        <option value="">All Properties</option>
        {[...new Set(messages.map((m) => m.property_id))].map((id) => (
          <option key={id} value={id}>
            {id}
          </option>
        ))}
      </select>

      <Card>
        <CardContent>
          <h2 className="text-lg font-semibold mb-2">🔤 Top Keywords</h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={getKeywordData()}>
              <XAxis dataKey="keyword" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="count" fill="#3b82f6" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card>
        <CardContent>
          <h2 className="text-lg font-semibold mb-2">📈 Message Trends</h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={getMessageTrends()}>
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="count" fill="#10b981" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card>
        <CardContent>
          <h2 className="text-lg font-semibold mb-2">😊 Guest Sentiment</h2>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={getSentimentData()}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={100}
                label
              >
                {getSentimentData().map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}
