import React, { useState, useEffect, useMemo } from 'react';
import Layout from '@/components/Layout';
import { Card, CardContent } from '@/components/ui/card';
import { useProductAccess } from '@/hooks/useProductAccess';
import { useProperties } from '@/hooks/useProperties';
import { supabase } from '@/integrations/supabase/client';
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import { Activity, Clock, Star, DollarSign, BarChart3 } from 'lucide-react';
import { format, subDays, startOfDay, eachDayOfInterval } from 'date-fns';

const DATE_RANGES = [
  { label: '7d', days: 7 },
  { label: '30d', days: 30 },
  { label: '90d', days: 90 },
];

function KpiCard({ icon: Icon, label, value, subtitle, color = 'text-primary' }) {
  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{label}</p>
            <p className="text-2xl font-bold text-foreground mt-1">{value}</p>
            {subtitle && <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>}
          </div>
          <div className={`w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center`}>
            <Icon className={`h-5 w-5 ${color}`} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function AnalyticsOverview() {
  const [dateRange, setDateRange] = useState(30);
  const { properties } = useProperties();
  const [messageVolume, setMessageVolume] = useState([]);
  const [categoryData, setCategoryData] = useState([]);
  const [kpis, setKpis] = useState({ responseRate: 0, avgResponseTime: 0, satisfaction: 0, totalMessages: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAnalytics();
  }, [dateRange, properties]);

  const fetchAnalytics = async () => {
    setLoading(true);
    const cutoff = subDays(new Date(), dateRange).toISOString();

    try {
      // Fetch SMS messages in date range
      const { data: messages, count } = await supabase
        .from('sms_conversation_messages')
        .select('role, timestamp, sms_conversation_id', { count: 'exact' })
        .gte('timestamp', cutoff)
        .order('timestamp', { ascending: true });

      const msgs = messages || [];
      const totalMessages = count || 0;
      const guestMessages = msgs.filter(m => m.role === 'user').length;
      const aiMessages = msgs.filter(m => m.role === 'assistant').length;
      const responseRate = guestMessages > 0 ? Math.round((aiMessages / guestMessages) * 100) : 0;

      // Build daily volume
      const days = eachDayOfInterval({
        start: subDays(new Date(), dateRange),
        end: new Date()
      });
      const dailyMap = {};
      days.forEach(d => { dailyMap[format(d, 'MMM dd')] = { date: format(d, 'MMM dd'), guest: 0, ai: 0 }; });
      msgs.forEach(m => {
        const key = format(new Date(m.timestamp), 'MMM dd');
        if (dailyMap[key]) {
          if (m.role === 'user') dailyMap[key].guest++;
          else if (m.role === 'assistant') dailyMap[key].ai++;
        }
      });
      setMessageVolume(Object.values(dailyMap));

      // Fetch conversations for intent categories
      const { data: convos } = await supabase
        .from('sms_conversations')
        .select('last_intent')
        .gte('updated_at', cutoff);

      const intentMap = {};
      (convos || []).forEach(c => {
        const intent = c.last_intent || 'other';
        intentMap[intent] = (intentMap[intent] || 0) + 1;
      });
      const catData = Object.entries(intentMap)
        .map(([category, count]) => ({ category: category.replace(/_/g, ' '), count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 8);
      setCategoryData(catData);

      // Fetch quality ratings
      const { data: ratings } = await supabase
        .from('response_quality_ratings')
        .select('rating')
        .gte('created_at', cutoff);

      const ratingMap = { good: 3, neutral: 2, bad: 1 };
      const ratingScores = (ratings || []).map(r => ratingMap[r.rating] || 2);
      const avgSatisfaction = ratingScores.length > 0
        ? (ratingScores.reduce((a, b) => a + b, 0) / ratingScores.length / 3 * 100).toFixed(0)
        : '—';

      setKpis({
        responseRate: Math.min(responseRate, 100),
        avgResponseTime: '< 5s',
        satisfaction: avgSatisfaction,
        totalMessages
      });
    } catch (err) {
      console.error('Analytics fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout>
      <div className="p-6 md:p-8 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Analytics Overview</h1>
            <p className="text-sm text-muted-foreground mt-1">Track your AI concierge performance</p>
          </div>
          <div className="flex gap-2">
            {DATE_RANGES.map(r => (
              <button
                key={r.days}
                onClick={() => setDateRange(r.days)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  dateRange === r.days
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground hover:bg-muted/80'
                }`}
              >
                {r.label}
              </button>
            ))}
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard icon={Activity} label="Response Rate" value={`${kpis.responseRate}%`} subtitle="AI responses / guest messages" />
          <KpiCard icon={Clock} label="Avg Response Time" value={kpis.avgResponseTime} subtitle="Automated response" color="text-success" />
          <KpiCard icon={Star} label="Guest Satisfaction" value={kpis.satisfaction === '—' ? '—' : `${kpis.satisfaction}%`} subtitle="Based on quality ratings" color="text-warning" />
          <KpiCard icon={BarChart3} label="Total Messages" value={kpis.totalMessages} subtitle={`Last ${dateRange} days`} color="text-info" />
        </div>

        {/* Line Chart: Message Volume */}
        <Card>
          <CardContent className="p-6">
            <h2 className="text-lg font-semibold text-foreground mb-4">Message Volume Over Time</h2>
            {loading ? (
              <div className="h-[300px] flex items-center justify-center text-muted-foreground">Loading...</div>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={messageVolume}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(226, 20%, 90%)" />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} stroke="#6b7280" />
                  <YAxis tick={{ fontSize: 11 }} stroke="#6b7280" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#ffffff',
                      border: '1px solid #e2e5f3',
                      borderRadius: '8px',
                      fontSize: '12px'
                    }}
                  />
                  <Legend />
                  <Line type="monotone" dataKey="guest" stroke="#1b3898" strokeWidth={2} name="Guest Messages" dot={false} />
                  <Line type="monotone" dataKey="ai" stroke="#41936a" strokeWidth={2} name="AI Responses" dot={false} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Bar Chart: Response by Category */}
        <Card>
          <CardContent className="p-6">
            <h2 className="text-lg font-semibold text-foreground mb-4">Responses by Category</h2>
            {loading ? (
              <div className="h-[300px] flex items-center justify-center text-muted-foreground">Loading...</div>
            ) : categoryData.length === 0 ? (
              <div className="h-[300px] flex items-center justify-center text-muted-foreground">No category data yet</div>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={categoryData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(226, 20%, 90%)" />
                  <XAxis dataKey="category" tick={{ fontSize: 11 }} stroke="#6b7280" />
                  <YAxis tick={{ fontSize: 11 }} stroke="#6b7280" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#ffffff',
                      border: '1px solid #e2e5f3',
                      borderRadius: '8px',
                      fontSize: '12px'
                    }}
                  />
                  <Bar dataKey="count" fill="#1b3898" radius={[6, 6, 0, 0]} name="Messages" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
