import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { X, Info, AlertTriangle, CheckCircle, Zap } from 'lucide-react';

const TYPE_STYLES = {
  info: { bg: 'bg-info/10', border: 'border-info/20', text: 'text-info', icon: Info },
  warning: { bg: 'bg-warning/10', border: 'border-warning/20', text: 'text-warning', icon: AlertTriangle },
  success: { bg: 'bg-success/10', border: 'border-success/20', text: 'text-success', icon: CheckCircle },
  upgrade: { bg: 'bg-primary/10', border: 'border-primary/20', text: 'text-primary', icon: Zap },
};

export default function AnnouncementBanner() {
  const [announcements, setAnnouncements] = useState([]);
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
        .or(`ends_at.is.null,ends_at.gte.${now}`);

      if (data) setAnnouncements(data.filter(a => !dismissed.includes(a.id)));
    };
    fetchAnnouncements();
  }, []);

  const dismiss = (id) => {
    const updated = [...dismissed, id];
    setDismissed(updated);
    localStorage.setItem('dismissed_announcements', JSON.stringify(updated));
    setAnnouncements(prev => prev.filter(a => a.id !== id));
  };

  if (announcements.length === 0) return null;

  return (
    <div className="space-y-2 mb-4">
      {announcements.map(ann => {
        const style = TYPE_STYLES[ann.type] || TYPE_STYLES.info;
        const Icon = style.icon;
        return (
          <div key={ann.id} className={`${style.bg} border ${style.border} rounded-lg px-4 py-3 flex items-center gap-3`}>
            <Icon className={`h-4 w-4 ${style.text} flex-shrink-0`} />
            <div className="flex-1 min-w-0">
              {ann.title && <span className="font-medium text-sm text-foreground mr-2">{ann.title}</span>}
              <span className="text-sm text-foreground/80">{ann.message}</span>
              {ann.cta_text && ann.cta_url && (
                <a href={ann.cta_url} className={`ml-2 text-sm font-medium ${style.text} hover:underline`}>
                  {ann.cta_text} →
                </a>
              )}
            </div>
            <button onClick={() => dismiss(ann.id)} className="text-muted-foreground hover:text-foreground p-1">
              <X className="h-4 w-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
