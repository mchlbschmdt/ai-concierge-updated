import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { Link } from 'react-router-dom';
import {
  Bell, Check, MessageSquare, Camera, AlertTriangle, CreditCard,
  Sparkles, X, ChevronRight
} from 'lucide-react';

const TYPE_CONFIG = {
  message: { icon: MessageSquare, color: 'text-primary', bg: 'bg-primary/10', emoji: '🤖' },
  photo: { icon: Camera, color: 'text-purple-600', bg: 'bg-purple-100', emoji: '📸' },
  trial: { icon: AlertTriangle, color: 'text-warning', bg: 'bg-warning/10', emoji: '⚠️' },
  payment: { icon: CreditCard, color: 'text-destructive', bg: 'bg-destructive/10', emoji: '💳' },
  welcome: { icon: Sparkles, color: 'text-success', bg: 'bg-success/10', emoji: '🎉' },
  info: { icon: Bell, color: 'text-primary', bg: 'bg-primary/10', emoji: 'ℹ️' },
};

export default function NotificationDropdown() {
  const { currentUser } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const dropdownRef = useRef(null);

  useEffect(() => {
    if (currentUser?.id) fetchNotifications();
  }, [currentUser?.id]);

  // Close on outside click
  useEffect(() => {
    const handler = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Realtime subscription
  useEffect(() => {
    if (!currentUser?.id) return;
    const channel = supabase
      .channel('notifications-realtime')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${currentUser.id}`,
      }, (payload) => {
        setNotifications(prev => [payload.new, ...prev]);
        setUnreadCount(prev => prev + 1);
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [currentUser?.id]);

  const fetchNotifications = async () => {
    const { data } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', currentUser.id)
      .order('created_at', { ascending: false })
      .limit(20);

    const items = data || [];
    setNotifications(items);
    setUnreadCount(items.filter(n => !n.is_read).length);
  };

  const markAllRead = async () => {
    if (!currentUser?.id) return;
    await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('user_id', currentUser.id)
      .eq('is_read', false);

    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    setUnreadCount(0);
  };

  const markRead = async (id) => {
    await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('id', id);

    setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
    setUnreadCount(prev => Math.max(0, prev - 1));
  };

  const timeAgo = (dateStr) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    return `${days}d ago`;
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-lg hover:bg-white/10 transition-colors"
        aria-label="Notifications"
      >
        <Bell className="h-5 w-5 text-primary-foreground/70" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] bg-destructive text-destructive-foreground text-[10px] font-bold rounded-full flex items-center justify-center px-1">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 bg-card rounded-xl shadow-xl border border-border z-50 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <h3 className="text-sm font-semibold text-foreground">Notifications</h3>
            {unreadCount > 0 && (
              <button
                onClick={markAllRead}
                className="text-xs text-primary hover:text-primary/80 font-medium flex items-center gap-1"
              >
                <Check className="h-3 w-3" /> Mark all read
              </button>
            )}
          </div>

          {/* List */}
          <div className="max-h-80 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="py-10 text-center">
                <Bell className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">No notifications yet</p>
              </div>
            ) : (
              notifications.map(n => {
                const config = TYPE_CONFIG[n.type] || TYPE_CONFIG.info;
                return (
                  <button
                    key={n.id}
                    onClick={() => { if (!n.is_read) markRead(n.id); }}
                    className={`w-full text-left flex items-start gap-3 px-4 py-3 hover:bg-muted/50 transition-colors border-b border-border/50 last:border-0 ${
                      !n.is_read ? 'bg-primary/[0.03]' : ''
                    }`}
                  >
                    <div className={`w-8 h-8 rounded-lg ${config.bg} flex items-center justify-center shrink-0 mt-0.5`}>
                      <span className="text-sm">{config.emoji}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm ${!n.is_read ? 'font-medium text-foreground' : 'text-muted-foreground'}`}>
                        {n.message}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">{timeAgo(n.created_at)}</p>
                    </div>
                    {!n.is_read && (
                      <div className="w-2 h-2 rounded-full bg-primary shrink-0 mt-2" />
                    )}
                  </button>
                );
              })
            )}
          </div>

          {/* Footer */}
          {notifications.length > 0 && (
            <div className="border-t border-border px-4 py-2.5">
              <Link
                to="/"
                onClick={() => setIsOpen(false)}
                className="text-xs text-primary hover:text-primary/80 font-medium flex items-center gap-1"
              >
                View all notifications <ChevronRight className="h-3 w-3" />
              </Link>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
