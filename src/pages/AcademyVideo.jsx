import React, { useState, useEffect, useCallback } from 'react';
import Layout from '@/components/Layout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { useProductAccess } from '@/hooks/useProductAccess';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, CheckCircle, Clock, Play, BookOpen, FileText,
  ChevronRight, GraduationCap, User
} from 'lucide-react';

function formatDuration(seconds) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export default function AcademyVideo() {
  const { id } = useParams();
  const { currentUser } = useAuth();
  const { status, triggerUpgrade } = useProductAccess('academy');
  const navigate = useNavigate();
  const [video, setVideo] = useState(null);
  const [progress, setProgress] = useState(null);
  const [relatedVideos, setRelatedVideos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('resources');

  useEffect(() => {
    fetchVideo();
  }, [id]);

  const fetchVideo = async () => {
    setLoading(true);
    const { data: vid } = await supabase
      .from('academy_videos')
      .select('*')
      .eq('id', id)
      .single();

    if (!vid) {
      navigate('/academy');
      return;
    }
    setVideo(vid);

    // Fetch progress
    if (currentUser?.id) {
      const { data: prog } = await supabase
        .from('academy_progress')
        .select('*')
        .eq('user_id', currentUser.id)
        .eq('video_id', id)
        .maybeSingle();
      setProgress(prog);

      // Upsert progress to track view
      if (!prog) {
        await supabase.from('academy_progress').insert({
          user_id: currentUser.id,
          video_id: id,
          watched_seconds: 0,
          last_watched_at: new Date().toISOString(),
        });
      } else {
        await supabase.from('academy_progress')
          .update({ last_watched_at: new Date().toISOString() })
          .eq('id', prog.id);
      }
    }

    // Related videos (same category)
    const { data: related } = await supabase
      .from('academy_videos')
      .select('id, title, duration_seconds, instructor_name, is_free')
      .eq('category', vid.category)
      .neq('id', id)
      .order('sort_order')
      .limit(4);
    setRelatedVideos(related || []);
    setLoading(false);
  };

  const markComplete = async () => {
    if (!currentUser?.id || !video) return;
    const { data: existing } = await supabase
      .from('academy_progress')
      .select('id')
      .eq('user_id', currentUser.id)
      .eq('video_id', video.id)
      .maybeSingle();

    if (existing) {
      await supabase.from('academy_progress')
        .update({ completed: true, completed_at: new Date().toISOString(), watched_seconds: video.duration_seconds })
        .eq('id', existing.id);
    } else {
      await supabase.from('academy_progress').insert({
        user_id: currentUser.id,
        video_id: video.id,
        watched_seconds: video.duration_seconds,
        completed: true,
        completed_at: new Date().toISOString(),
      });
    }
    setProgress(prev => ({ ...prev, completed: true, completed_at: new Date().toISOString() }));
  };

  if (loading || !video) {
    return (
      <Layout>
        <div className="p-6 flex items-center justify-center min-h-[60vh]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      </Layout>
    );
  }

  const categoryLabel = video.category.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

  return (
    <Layout>
      <div className="p-6 md:p-8 max-w-5xl mx-auto space-y-6">
        {/* Back link */}
        <Link to="/academy" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="h-4 w-4" /> Back to Library
        </Link>

        {/* Video Player */}
        <div className="relative aspect-video bg-black rounded-xl overflow-hidden shadow-lg">
          {video.video_type === 'youtube' ? (
            <iframe
              src={video.video_url}
              className="w-full h-full"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              title={video.title}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-white">
              <Play className="h-16 w-16" />
            </div>
          )}
        </div>

        {/* Title + Actions */}
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Badge variant="secondary" className="text-xs">{categoryLabel}</Badge>
              <Badge variant={video.is_free ? 'default' : 'outline'} className="text-xs">
                {video.is_free ? 'Free' : 'Pro'}
              </Badge>
            </div>
            <h1 className="text-xl font-bold text-foreground">{video.title}</h1>
            <p className="text-sm text-muted-foreground mt-1">{video.description}</p>
            <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
              <span className="flex items-center gap-1"><User className="h-3 w-3" /> {video.instructor_name}</span>
              <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {formatDuration(video.duration_seconds)}</span>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {progress?.completed ? (
              <span className="inline-flex items-center gap-1.5 text-sm font-medium text-success bg-success/10 px-4 py-2 rounded-lg">
                <CheckCircle className="h-4 w-4" /> Completed
              </span>
            ) : (
              <Button onClick={markComplete} variant="default" size="sm">
                <CheckCircle className="h-4 w-4 mr-1.5" /> Mark as Complete
              </Button>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 border-b border-border">
          {[
            { key: 'resources', label: 'Resources', icon: FileText },
            { key: 'related', label: 'Related Videos', icon: BookOpen },
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.key
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              <tab.icon className="h-4 w-4" /> {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        {activeTab === 'resources' && (
          <Card>
            <CardContent className="p-6">
              <h3 className="font-semibold text-foreground mb-3">Resources & Notes</h3>
              <p className="text-sm text-muted-foreground">
                Resources for this video will be available as the curriculum expands.
                Check back for downloadable checklists, templates, and guides.
              </p>
              <div className="mt-4 p-4 bg-muted/50 rounded-lg">
                <p className="text-xs font-medium text-muted-foreground uppercase mb-2">Key Takeaways</p>
                <ul className="text-sm text-foreground space-y-1.5 list-disc list-inside">
                  <li>Apply the concepts from this video to your properties</li>
                  <li>Test changes incrementally and track results</li>
                  <li>Join the community discussion for peer advice</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        )}

        {activeTab === 'related' && (
          <div className="space-y-3">
            {relatedVideos.length === 0 ? (
              <p className="text-sm text-muted-foreground">No related videos found.</p>
            ) : (
              relatedVideos.map(rv => (
                <Link
                  key={rv.id}
                  to={`/academy/video/${rv.id}`}
                  className="flex items-center gap-4 p-4 bg-card border border-border rounded-xl hover:shadow-md transition-all group"
                >
                  <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center shrink-0">
                    <Play className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground group-hover:text-primary transition-colors truncate">{rv.title}</p>
                    <p className="text-xs text-muted-foreground">{rv.instructor_name} · {formatDuration(rv.duration_seconds)}</p>
                  </div>
                  <Badge variant={rv.is_free ? 'default' : 'outline'} className="text-xs shrink-0">
                    {rv.is_free ? 'Free' : 'Pro'}
                  </Badge>
                  <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                </Link>
              ))
            )}
          </div>
        )}
      </div>
    </Layout>
  );
}
