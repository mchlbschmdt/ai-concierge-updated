import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { X, Info, AlertTriangle, CheckCircle, Sparkles, ChevronLeft, ChevronRight } from 'lucide-react';

const TYPE_STYLES = {
  info: { bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-700', icon: Info },
  warning: { bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-700', icon: AlertTriangle },
  success: { bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-700', icon: CheckCircle },
  upgrade: {
    bg: 'bg-gradient-to-r from-amber-50 via-yellow-50 to-amber-50',
    border: 'border-amber-300',
    text: 'text-amber-800',
    icon: Sparkles,
  },
};

export default function AnnouncementBanner() {
  const [announcements, setAnnouncements] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [dismissed, setDismissed] = useState(() => {
    try { return JSON.parse(localStorage.getItem('dismissed_announcements') || '[]'); }
    catch { return []; }
  });

  useEffect(() => {
    const fetchAnnouncements = async () => {
      const now = new Date().toISOString();
      const { data } = await supabase
        .from('announcements')
        .select('*')
        .eq('is_active', true)
        .lte('starts_at', now)
        .or(`ends_at.is.null,ends_at.gte.${now}`)
        .order('created_at', { ascending: false });

      if (data) setAnnouncements(data.filter(a => !dismissed.includes(a.id)));
    };
    fetchAnnouncements();
  }, []);

  const dismiss = (id) => {
    const updated = [...dismissed, id];
    setDismissed(updated);
    localStorage.setItem('dismissed_announcements', JSON.stringify(updated));
    const remaining = announcements.filter(a => a.id !== id);
    setAnnouncements(remaining);
    if (currentIndex >= remaining.length && remaining.length > 0) {
      setCurrentIndex(remaining.length - 1);
    }
  };

  if (announcements.length === 0) return null;

  const ann = announcements[currentIndex];
  if (!ann) return null;

  const style = TYPE_STYLES[ann.type] || TYPE_STYLES.info;
  const Icon = style.icon;
  const isUpgrade = ann.type === 'upgrade';
  const hasMultiple = announcements.length > 1;

  return (
    <div className="mb-4">
      <div className={`${style.bg} border ${style.border} rounded-xl px-4 py-3 flex items-center gap-3 ${isUpgrade ? 'shadow-sm' : ''}`}>
        <Icon className={`h-4 w-4 ${style.text} flex-shrink-0`} />
        
        <div className="flex-1 min-w-0">
          {ann.title && <span className={`font-semibold text-sm ${style.text} mr-2`}>{ann.title}</span>}
          <span className="text-sm text-foreground/80">{ann.message}</span>
          {ann.cta_text && ann.cta_url && (
            <a
              href={ann.cta_url}
              className={`ml-2 text-sm font-semibold ${style.text} hover:underline ${
                isUpgrade ? 'inline-flex items-center gap-1 bg-amber-200/50 px-2.5 py-0.5 rounded-full' : ''
              }`}
            >
              {ann.cta_text} →
            </a>
          )}
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {hasMultiple && (
            <>
              <button
                onClick={() => setCurrentIndex(i => (i - 1 + announcements.length) % announcements.length)}
                className="p-1 rounded hover:bg-black/5 transition-colors"
                aria-label="Previous"
              >
                <ChevronLeft className="h-3.5 w-3.5 text-muted-foreground" />
              </button>
              <span className="text-xs text-muted-foreground font-medium min-w-[32px] text-center">
                {currentIndex + 1}/{announcements.length}
              </span>
              <button
                onClick={() => setCurrentIndex(i => (i + 1) % announcements.length)}
                className="p-1 rounded hover:bg-black/5 transition-colors"
                aria-label="Next"
              >
                <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
              </button>
            </>
          )}
          <button onClick={() => dismiss(ann.id)} className="text-muted-foreground hover:text-foreground p-1 ml-1">
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
