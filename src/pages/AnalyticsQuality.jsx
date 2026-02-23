import React, { useState, useEffect } from 'react';
import Layout from '@/components/Layout';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import {
  BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import { Star, ThumbsUp, ThumbsDown, Minus, TrendingUp, MessageSquare } from 'lucide-react';
import { subDays, format } from 'date-fns';

const DATE_RANGES = [
  { label: '7d', days: 7 },
  { label: '30d', days: 30 },
  { label: '90d', days: 90 },
];

const COLORS = { good: '#41936a', neutral: '#c99420', bad: '#D5485D' };
const PIE_COLORS = ['#41936a', '#c99420', '#D5485D'];

export default function AnalyticsQuality() {
  const [dateRange, setDateRange] = useState(30);
  const [ratings, setRatings] = useState([]);
  const [rejections, setRejections] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, [dateRange]);

  const fetchData = async () => {
    setLoading(true);
    const cutoff = subDays(new Date(), dateRange).toISOString();

    try {
      const [ratingsRes, rejectionsRes] = await Promise.all([
        supabase.from('response_quality_ratings').select('*').gte('created_at', cutoff).order('created_at', { ascending: false }),
        supabase.from('recommendation_rejections').select('requested_category, rejection_reason, retry_successful, created_at').gte('created_at', cutoff),
      ]);

      setRatings(ratingsRes.data || []);
      setRejections(rejectionsRes.data || []);
    } catch (err) {
      console.error('Error fetching quality data:', err);
    } finally {
      setLoading(false);
    }
  };

  // Satisfaction distribution
  const satisfactionDist = ['good', 'neutral', 'bad'].map(r => ({
    name: r === 'good' ? 'Positive' : r === 'neutral' ? 'Neutral' : 'Negative',
    value: ratings.filter(rt => rt.rating === r).length,
    key: r,
  }));

  const totalRatings = ratings.length;
  const goodPct = totalRatings > 0 ? Math.round((satisfactionDist[0].value / totalRatings) * 100) : 0;

  // Rejection categories
  const catMap = {};
  rejections.forEach(r => {
    const cat = r.requested_category || 'other';
    catMap[cat] = (catMap[cat] || 0) + 1;
  });
  const rejectionCategories = Object.entries(catMap)
    .map(([category, count]) => ({ category: category.replace(/_/g, ' '), count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);

  // Recent ratings
  const recentRatings = ratings.slice(0, 10);

  return (
    <Layout>
      <div className="p-6 md:p-8 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Quality Analytics</h1>
            <p className="text-sm text-muted-foreground mt-1">Guest satisfaction scores and response quality</p>
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

        {/* KPI Row */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase">Satisfaction Score</p>
                  <p className="text-2xl font-bold text-foreground mt-1">{goodPct}%</p>
                  <p className="text-xs text-muted-foreground">positive ratings</p>
                </div>
                <Star className="h-8 w-8 text-warning" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase">Total Ratings</p>
                  <p className="text-2xl font-bold text-foreground mt-1">{totalRatings}</p>
                  <p className="text-xs text-muted-foreground">last {dateRange} days</p>
                </div>
                <MessageSquare className="h-8 w-8 text-primary" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase">Recommendation Issues</p>
                  <p className="text-2xl font-bold text-foreground mt-1">{rejections.length}</p>
                  <p className="text-xs text-muted-foreground">category mismatches</p>
                </div>
                <TrendingUp className="h-8 w-8 text-error" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardContent className="p-6">
              <h2 className="text-lg font-semibold text-foreground mb-4">Satisfaction Distribution</h2>
              {loading ? (
                <div className="h-[280px] flex items-center justify-center text-muted-foreground">Loading...</div>
              ) : totalRatings === 0 ? (
                <div className="h-[280px] flex items-center justify-center text-muted-foreground">No ratings yet</div>
              ) : (
                <ResponsiveContainer width="100%" height={280}>
                  <PieChart>
                    <Pie
                      data={satisfactionDist}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      outerRadius={100}
                      dataKey="value"
                    >
                      {satisfactionDist.map((entry, i) => (
                        <Cell key={i} fill={PIE_COLORS[i]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <h2 className="text-lg font-semibold text-foreground mb-4">Rejection Categories</h2>
              {loading ? (
                <div className="h-[280px] flex items-center justify-center text-muted-foreground">Loading...</div>
              ) : rejectionCategories.length === 0 ? (
                <div className="h-[280px] flex items-center justify-center text-muted-foreground">No rejections yet</div>
              ) : (
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={rejectionCategories}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(226, 20%, 90%)" />
                    <XAxis dataKey="category" tick={{ fontSize: 11 }} stroke="#6b7280" />
                    <YAxis tick={{ fontSize: 11 }} stroke="#6b7280" />
                    <Tooltip />
                    <Bar dataKey="count" fill="#D5485D" radius={[6, 6, 0, 0]} name="Rejections" />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Recent Ratings */}
        <Card>
          <CardContent className="p-6">
            <h2 className="text-lg font-semibold text-foreground mb-4">Recent Quality Ratings</h2>
            {recentRatings.length === 0 ? (
              <p className="text-sm text-muted-foreground">No ratings yet. Ratings appear after testing AI responses.</p>
            ) : (
              <div className="space-y-3">
                {recentRatings.map(r => (
                  <div key={r.id} className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
                    <div className="mt-0.5">
                      {r.rating === 'good' && <ThumbsUp className="h-4 w-4 text-success" />}
                      {r.rating === 'neutral' && <Minus className="h-4 w-4 text-warning" />}
                      {r.rating === 'bad' && <ThumbsDown className="h-4 w-4 text-error" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-foreground font-medium truncate">"{r.test_message}"</p>
                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{r.ai_response}</p>
                      {r.feedback && <p className="text-xs text-primary mt-1">Feedback: {r.feedback}</p>}
                    </div>
                    <Badge variant={r.rating === 'good' ? 'default' : r.rating === 'bad' ? 'destructive' : 'secondary'} className="text-xs shrink-0">
                      {r.rating}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
