import React, { useState, useEffect, useMemo } from 'react';
import Layout from '@/components/Layout';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { useProductAccess } from '@/hooks/useProductAccess';
import { Link, useNavigate } from 'react-router-dom';
import {
  Play, Clock, Lock, GraduationCap, ChevronRight, User
} from 'lucide-react';

const CATEGORIES = [
  { key: 'all', label: 'All' },
  { key: 'getting_started', label: 'Getting Started' },
  { key: 'guest_communication', label: 'Guest Communication' },
  { key: 'photography', label: 'Photography' },
  { key: 'pricing_strategy', label: 'Pricing Strategy' },
  { key: 'legal_taxes', label: 'Legal & Taxes' },
  { key: 'advanced_tips', label: 'Advanced Tips' },
];

function formatDuration(seconds) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function VideoCard({ video, progress, canWatch, onPlay }) {
  const isCompleted = progress?.completed;
  const isInProgress = progress && !progress.completed && progress.watched_seconds > 0;
  const pct = video.duration_seconds > 0 ? Math.round((progress?.watched_seconds || 0) / video.duration_seconds * 100) : 0;

  return (
    <div
      className="group bg-card border border-border rounded-xl overflow-hidden hover:shadow-md transition-all cursor-pointer"
      onClick={() => onPlay(video)}
    >
      {/* Thumbnail */}
      <div className="relative aspect-video bg-muted flex items-center justify-center">
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
        <GraduationCap className="h-12 w-12 text-muted-foreground/30" />

        {/* Play overlay */}
        <div className="absolute inset-0 flex items-center justify-center">
          {canWatch ? (
            <div className="w-14 h-14 rounded-full bg-primary/90 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-lg">
              <Play className="h-6 w-6 text-primary-foreground ml-0.5" />
            </div>
          ) : (
            <div className="w-14 h-14 rounded-full bg-black/60 flex items-center justify-center">
              <Lock className="h-6 w-6 text-white" />
            </div>
          )}
        </div>

        {/* Duration badge */}
        <span className="absolute bottom-2 right-2 text-xs font-medium text-white bg-black/70 px-2 py-0.5 rounded">
          {formatDuration(video.duration_seconds)}
        </span>

        {/* Free/Pro badge */}
        <span className={`absolute top-2 left-2 text-xs font-semibold px-2 py-0.5 rounded ${
          video.is_free ? 'bg-success text-white' : 'bg-primary text-white'
        }`}>
          {video.is_free ? 'Free' : 'Pro'}
        </span>

        {/* Progress bar */}
        {isInProgress && (
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/20">
            <div className="h-full bg-primary rounded-full" style={{ width: `${pct}%` }} />
          </div>
        )}

        {isCompleted && (
          <div className="absolute top-2 right-2 w-6 h-6 rounded-full bg-success flex items-center justify-center">
            <span className="text-white text-xs">✓</span>
          </div>
        )}
      </div>

      {/* Info */}
      <div className="p-4">
        <h3 className="text-sm font-semibold text-foreground line-clamp-2 group-hover:text-primary transition-colors">
          {video.title}
        </h3>
        <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{video.description}</p>
        <div className="flex items-center gap-2 mt-3">
          <User className="h-3 w-3 text-muted-foreground" />
          <span className="text-xs text-muted-foreground">{video.instructor_name}</span>
        </div>
      </div>
    </div>
  );
}

export default function AcademyLibrary() {
  const { currentUser } = useAuth();
  const { status, usageCount, trialUsesRemaining, incrementUsage, triggerUpgrade } = useProductAccess('academy');
  const navigate = useNavigate();
  const [videos, setVideos] = useState([]);
  const [progress, setProgress] = useState({});
  const [activeCategory, setActiveCategory] = useState('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchVideos();
    if (currentUser?.id) fetchProgress();
  }, [currentUser?.id]);

  const fetchVideos = async () => {
    const { data } = await supabase
      .from('academy_videos')
      .select('*')
      .order('sort_order', { ascending: true });
    setVideos(data || []);
    setLoading(false);
  };

  const fetchProgress = async () => {
    const { data } = await supabase
      .from('academy_progress')
      .select('*')
      .eq('user_id', currentUser.id);
    const map = {};
    (data || []).forEach(p => { map[p.video_id] = p; });
    setProgress(map);
  };

  const filtered = useMemo(() => {
    if (activeCategory === 'all') return videos;
    return videos.filter(v => v.category === activeCategory);
  }, [videos, activeCategory]);

  const continueWatching = useMemo(() => {
    return videos.filter(v => {
      const p = progress[v.id];
      return p && !p.completed && p.watched_seconds > 0;
    }).sort((a, b) => {
      const pa = progress[a.id];
      const pb = progress[b.id];
      return new Date(pb.last_watched_at) - new Date(pa.last_watched_at);
    });
  }, [videos, progress]);

  const canWatchVideo = (video) => {
    if (status === 'active' || status === 'admin_granted') return true;
    if (video.is_free) return true;
    if (status === 'trial') {
      // Trial users can watch 3 videos total (usage count tracks this)
      const watched = Object.values(progress).filter(p => p.watched_seconds > 0).length;
      // Already started watching this video
      if (progress[video.id]) return true;
      return watched < 3;
    }
    return false;
  };

  const handlePlay = async (video) => {
    if (!canWatchVideo(video)) {
      triggerUpgrade();
      return;
    }

    // For trial users watching a new (non-free) video, increment usage
    if (status === 'trial' && !video.is_free && !progress[video.id]) {
      const result = await incrementUsage();
      if (!result.allowed) return;
    }

    navigate(`/academy/video/${video.id}`);
  };

  const totalVideos = videos.length;
  const completedVideos = Object.values(progress).filter(p => p.completed).length;

  return (
    <Layout>
      <div className="p-6 md:p-8 space-y-6">
        {/* Hero Banner */}
        <div className="bg-gradient-to-r from-primary to-accent rounded-2xl p-8 md:p-10 text-white relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/4" />
          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-2">
              <GraduationCap className="h-6 w-6" />
              <span className="text-sm font-medium text-white/80">Host Academy</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-bold mb-2">Level Up Your STR Business</h1>
            <p className="text-sm text-white/70 max-w-lg">Expert video training to help you automate, optimize, and scale your short-term rental portfolio.</p>
            <div className="flex items-center gap-4 mt-4">
              <span className="text-xs bg-white/20 px-3 py-1 rounded-full">{totalVideos} videos</span>
              {completedVideos > 0 && (
                <Link to="/academy/progress" className="text-xs bg-white/20 px-3 py-1 rounded-full hover:bg-white/30 transition-colors flex items-center gap-1">
                  {completedVideos} completed <ChevronRight className="h-3 w-3" />
                </Link>
              )}
            </div>
          </div>
        </div>

        {/* Continue Watching */}
        {continueWatching.length > 0 && (
          <div>
            <h2 className="text-lg font-semibold text-foreground mb-3">Continue Watching</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {continueWatching.slice(0, 3).map(video => (
                <VideoCard key={video.id} video={video} progress={progress[video.id]} canWatch={true} onPlay={handlePlay} />
              ))}
            </div>
          </div>
        )}

        {/* Category Tabs */}
        <div className="flex gap-2 overflow-x-auto pb-1 -mx-2 px-2">
          {CATEGORIES.map(cat => (
            <button
              key={cat.key}
              onClick={() => setActiveCategory(cat.key)}
              className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                activeCategory === cat.key
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground hover:bg-muted/80'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Video Grid */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <div key={i} className="aspect-video bg-muted animate-pulse rounded-xl" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <GraduationCap className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground">No videos in this category yet.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map(video => (
              <VideoCard
                key={video.id}
                video={video}
                progress={progress[video.id]}
                canWatch={canWatchVideo(video)}
                onPlay={handlePlay}
              />
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}
