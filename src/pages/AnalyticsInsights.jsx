import React, { useState, useEffect } from 'react';
import Layout from '@/components/Layout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { Lightbulb, TrendingDown, TrendingUp, CheckCircle, X, ArrowRight, Sparkles } from 'lucide-react';
import { subDays, format, getDay } from 'date-fns';

function InsightCard({ insight, onDismiss, onAct }) {
  const iconMap = {
    warning: <TrendingDown className="h-5 w-5 text-warning" />,
    success: <TrendingUp className="h-5 w-5 text-success" />,
    info: <Lightbulb className="h-5 w-5 text-info" />,
  };

  const borderMap = {
    warning: 'border-l-warning',
    success: 'border-l-success',
    info: 'border-l-info',
  };

  return (
    <Card className={`border-l-4 ${borderMap[insight.type] || 'border-l-primary'}`}>
      <CardContent className="p-5">
        <div className="flex items-start gap-3">
          <div className="mt-0.5">{iconMap[insight.type] || iconMap.info}</div>
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-semibold text-foreground">{insight.title}</h3>
            <p className="text-sm text-muted-foreground mt-1">{insight.description}</p>
            {insight.action && (
              <p className="text-xs text-primary font-medium mt-2 flex items-center gap-1">
                💡 {insight.action}
              </p>
            )}
            <div className="flex items-center gap-2 mt-3">
              {insight.actionLink && (
                <Button size="sm" variant="outline" className="text-xs h-7" onClick={() => onAct(insight)}>
                  Act on this <ArrowRight className="h-3 w-3 ml-1" />
                </Button>
              )}
              <Button size="sm" variant="ghost" className="text-xs h-7 text-muted-foreground" onClick={() => onDismiss(insight.id)}>
                <X className="h-3 w-3 mr-1" /> Dismiss
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function AnalyticsInsights() {
  const [insights, setInsights] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dismissed, setDismissed] = useState(() => {
    try { return JSON.parse(localStorage.getItem('dismissed_insights') || '[]'); } catch { return []; }
  });

  useEffect(() => {
    generateInsights();
  }, []);

  const generateInsights = async () => {
    setLoading(true);
    const generated = [];

    try {
      // Analyze message patterns over last 14 days
      const cutoff14 = subDays(new Date(), 14).toISOString();
      const { data: recentMsgs } = await supabase
        .from('sms_conversation_messages')
        .select('role, timestamp')
        .gte('timestamp', cutoff14);

      const msgs = recentMsgs || [];

      if (msgs.length > 0) {
        // Day-of-week analysis
        const dayMap = { 0: 'Sunday', 1: 'Monday', 2: 'Tuesday', 3: 'Wednesday', 4: 'Thursday', 5: 'Friday', 6: 'Saturday' };
        const dayCounts = {};
        msgs.forEach(m => {
          const day = getDay(new Date(m.timestamp));
          dayCounts[day] = (dayCounts[day] || 0) + 1;
        });
        const avgPerDay = msgs.length / 7;
        Object.entries(dayCounts).forEach(([day, count]) => {
          const pctDiff = ((count - avgPerDay) / avgPerDay * 100).toFixed(0);
          if (pctDiff < -30) {
            generated.push({
              id: `low-day-${day}`,
              type: 'warning',
              title: `Low activity on ${dayMap[day]}s`,
              description: `Message volume drops ${Math.abs(pctDiff)}% on ${dayMap[day]}s compared to your weekly average.`,
              action: 'Consider scheduling automated check-in messages on this day.',
              actionLink: '/concierge/messages',
            });
          }
          if (pctDiff > 50) {
            generated.push({
              id: `high-day-${day}`,
              type: 'success',
              title: `Peak activity on ${dayMap[day]}s`,
              description: `${dayMap[day]}s see ${pctDiff}% more messages than average — your busiest day!`,
              action: 'Ensure your AI responses are well-tuned for this high-traffic period.',
              actionLink: '/concierge/test',
            });
          }
        });

        // Response coverage
        const guestCount = msgs.filter(m => m.role === 'user').length;
        const aiCount = msgs.filter(m => m.role === 'assistant').length;
        const coverage = guestCount > 0 ? Math.round((aiCount / guestCount) * 100) : 100;
        if (coverage < 80) {
          generated.push({
            id: 'low-coverage',
            type: 'warning',
            title: 'AI response coverage below 80%',
            description: `Only ${coverage}% of guest messages received an AI response in the last 2 weeks.`,
            action: 'Review your knowledge base and FAQ entries to improve coverage.',
            actionLink: '/concierge/knowledge-base',
          });
        } else if (coverage >= 95) {
          generated.push({
            id: 'high-coverage',
            type: 'success',
            title: 'Excellent response coverage!',
            description: `${coverage}% of guest messages received an AI response — your AI concierge is performing great.`,
            action: null,
          });
        }
      }

      // Check quality ratings
      const { data: ratings } = await supabase
        .from('response_quality_ratings')
        .select('rating')
        .gte('created_at', subDays(new Date(), 30).toISOString());

      if (ratings && ratings.length > 0) {
        const badCount = ratings.filter(r => r.rating === 'bad').length;
        const badPct = Math.round((badCount / ratings.length) * 100);
        if (badPct > 20) {
          generated.push({
            id: 'bad-ratings',
            type: 'warning',
            title: `${badPct}% negative quality ratings`,
            description: `${badCount} of ${ratings.length} recent ratings were negative. Review your AI responses.`,
            action: 'Check the Quality Analytics page for detailed breakdowns.',
            actionLink: '/analytics/quality',
          });
        }
      }

      // Rejection analysis
      const { count: rejCount } = await supabase
        .from('recommendation_rejections')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', subDays(new Date(), 7).toISOString());

      if (rejCount && rejCount > 5) {
        generated.push({
          id: 'high-rejections',
          type: 'warning',
          title: `${rejCount} recommendation rejections this week`,
          description: 'AI recommendations are being flagged for category mismatches more than usual.',
          action: 'Review property knowledge bases to ensure accurate local recommendations.',
          actionLink: '/analytics/quality',
        });
      }

      // Default insight if none generated
      if (generated.length === 0) {
        generated.push({
          id: 'no-data',
          type: 'info',
          title: 'Building your insights',
          description: 'As more guest conversations come in, AI-powered insights will appear here automatically.',
          action: 'Start by testing your AI concierge with a few sample messages.',
          actionLink: '/concierge/test',
        });
      }
    } catch (err) {
      console.error('Error generating insights:', err);
      generated.push({
        id: 'error',
        type: 'info',
        title: 'Insights loading',
        description: 'We\'re analyzing your data. Check back shortly for AI-generated performance insights.',
        action: null,
      });
    }

    setInsights(generated);
    setLoading(false);
  };

  const handleDismiss = (id) => {
    const updated = [...dismissed, id];
    setDismissed(updated);
    localStorage.setItem('dismissed_insights', JSON.stringify(updated));
  };

  const handleAct = (insight) => {
    if (insight.actionLink) {
      window.location.href = insight.actionLink;
    }
  };

  const visible = insights.filter(i => !dismissed.includes(i.id));

  return (
    <Layout>
      <div className="p-6 md:p-8 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <Sparkles className="h-6 w-6 text-primary" /> Smart Insights
            </h1>
            <p className="text-sm text-muted-foreground mt-1">AI-generated performance patterns and recommendations</p>
          </div>
          <Button variant="outline" size="sm" onClick={() => { setDismissed([]); localStorage.removeItem('dismissed_insights'); generateInsights(); }}>
            Refresh
          </Button>
        </div>

        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-28 bg-muted animate-pulse rounded-xl" />
            ))}
          </div>
        ) : visible.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <CheckCircle className="h-12 w-12 text-success mx-auto mb-3" />
              <h3 className="text-lg font-semibold text-foreground">All caught up!</h3>
              <p className="text-sm text-muted-foreground mt-1">You've reviewed all insights. New ones will appear as patterns emerge.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {visible.map(insight => (
              <InsightCard key={insight.id} insight={insight} onDismiss={handleDismiss} onAct={handleAct} />
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}
