import React, { useState, useEffect, useMemo } from 'react';
import Layout from '@/components/Layout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { Link } from 'react-router-dom';
import {
  GraduationCap, Trophy, Play, CheckCircle, ChevronRight, BarChart3, Clock
} from 'lucide-react';

const CATEGORY_LABELS = {
  getting_started: 'Getting Started',
  guest_communication: 'Guest Communication',
  photography: 'Photography',
  pricing_strategy: 'Pricing Strategy',
  legal_taxes: 'Legal & Taxes',
  advanced_tips: 'Advanced Tips',
};

const CATEGORY_ICONS = {
  getting_started: '🚀',
  guest_communication: '💬',
  photography: '📸',
  pricing_strategy: '💰',
  legal_taxes: '⚖️',
  advanced_tips: '🎯',
};

function formatDuration(seconds) {
  const m = Math.floor(seconds / 60);
  return `${m} min`;
}

export default function AcademyProgress() {
  const { currentUser } = useAuth();
  const [videos, setVideos] = useState([]);
  const [progress, setProgress] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (currentUser?.id) fetchAll();
  }, [currentUser?.id]);

  const fetchAll = async () => {
    const [vRes, pRes] = await Promise.all([
      supabase.from('academy_videos').select('*').order('sort_order'),
      supabase.from('academy_progress').select('*').eq('user_id', currentUser.id),
    ]);
    setVideos(vRes.data || []);
    const map = {};
    (pRes.data || []).forEach(p => { map[p.video_id] = p; });
    setProgress(map);
    setLoading(false);
  };

  const categoryProgress = useMemo(() => {
    const cats = {};
    videos.forEach(v => {
      if (!cats[v.category]) cats[v.category] = { total: 0, completed: 0, videos: [] };
      cats[v.category].total++;
      const p = progress[v.id];
      if (p?.completed) cats[v.category].completed++;
      cats[v.category].videos.push({ ...v, progress: p });
    });
    return cats;
  }, [videos, progress]);

  const totalVideos = videos.length;
  const completedCount = Object.values(progress).filter(p => p.completed).length;
  const overallPct = totalVideos > 0 ? Math.round((completedCount / totalVideos) * 100) : 0;

  // Find next unwatched video
  const nextVideo = useMemo(() => {
    // First, continue in-progress
    const inProgress = videos.find(v => {
      const p = progress[v.id];
      return p && !p.completed && p.watched_seconds > 0;
    });
    if (inProgress) return inProgress;
    // Then first unwatched
    return videos.find(v => !progress[v.id]?.completed);
  }, [videos, progress]);

  // Certificates (categories fully completed)
  const certificates = useMemo(() => {
    return Object.entries(categoryProgress)
      .filter(([_, cat]) => cat.total > 0 && cat.completed === cat.total)
      .map(([key]) => key);
  }, [categoryProgress]);

  if (loading) {
    return (
      <Layout>
        <div className="p-6 flex items-center justify-center min-h-[60vh]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="p-6 md:p-8 space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <BarChart3 className="h-6 w-6 text-primary" /> My Progress
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Track your learning journey</p>
        </div>

        {/* Overall Progress + CTA */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <Card className="lg:col-span-2">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-foreground">Overall Completion</h2>
                <span className="text-2xl font-bold text-primary">{overallPct}%</span>
              </div>
              <div className="w-full h-3 bg-muted rounded-full overflow-hidden mb-2">
                <div
                  className="h-full bg-primary rounded-full transition-all"
                  style={{ width: `${overallPct}%` }}
                />
              </div>
              <p className="text-xs text-muted-foreground">{completedCount} of {totalVideos} videos completed</p>
            </CardContent>
          </Card>

          {nextVideo && (
            <Card className="bg-primary/5 border-primary/20">
              <CardContent className="p-6 flex flex-col justify-between h-full">
                <div>
                  <p className="text-xs font-medium text-primary uppercase mb-1">Continue Where You Left Off</p>
                  <p className="text-sm font-semibold text-foreground">{nextVideo.title}</p>
                </div>
                <Link to={`/academy/video/${nextVideo.id}`}>
                  <Button size="sm" className="mt-3 w-full">
                    <Play className="h-4 w-4 mr-1.5" /> Continue
                  </Button>
                </Link>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Certificates */}
        {certificates.length > 0 && (
          <div>
            <h2 className="text-lg font-semibold text-foreground mb-3 flex items-center gap-2">
              <Trophy className="h-5 w-5 text-warning" /> Certificates Earned
            </h2>
            <div className="flex flex-wrap gap-3">
              {certificates.map(cat => (
                <div key={cat} className="flex items-center gap-2 bg-warning/10 border border-warning/20 px-4 py-2.5 rounded-xl">
                  <span className="text-xl">{CATEGORY_ICONS[cat]}</span>
                  <div>
                    <p className="text-sm font-semibold text-foreground">{CATEGORY_LABELS[cat]}</p>
                    <p className="text-xs text-muted-foreground">Completed ✓</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Category Breakdown */}
        <div>
          <h2 className="text-lg font-semibold text-foreground mb-3">Progress by Category</h2>
          <div className="space-y-4">
            {Object.entries(categoryProgress).map(([key, cat]) => {
              const pct = cat.total > 0 ? Math.round((cat.completed / cat.total) * 100) : 0;
              return (
                <Card key={key}>
                  <CardContent className="p-5">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <span className="text-xl">{CATEGORY_ICONS[key]}</span>
                        <h3 className="font-semibold text-foreground text-sm">{CATEGORY_LABELS[key] || key}</h3>
                      </div>
                      <span className="text-sm font-medium text-muted-foreground">
                        {cat.completed}/{cat.total}
                      </span>
                    </div>
                    <div className="w-full h-2 bg-muted rounded-full overflow-hidden mb-3">
                      <div
                        className={`h-full rounded-full transition-all ${pct === 100 ? 'bg-success' : 'bg-primary'}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <div className="space-y-1.5">
                      {cat.videos.map(v => (
                        <Link
                          key={v.id}
                          to={`/academy/video/${v.id}`}
                          className="flex items-center gap-2 py-1.5 group"
                        >
                          {v.progress?.completed ? (
                            <CheckCircle className="h-4 w-4 text-success shrink-0" />
                          ) : (
                            <div className="w-4 h-4 rounded-full border-2 border-muted-foreground/30 shrink-0" />
                          )}
                          <span className={`text-sm flex-1 ${v.progress?.completed ? 'text-muted-foreground line-through' : 'text-foreground group-hover:text-primary'} transition-colors`}>
                            {v.title}
                          </span>
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <Clock className="h-3 w-3" /> {formatDuration(v.duration_seconds)}
                          </span>
                        </Link>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </div>
    </Layout>
  );
}
