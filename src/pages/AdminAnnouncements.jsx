import React, { useState, useEffect } from 'react';
import Layout from '@/components/Layout';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { supabase } from '@/integrations/supabase/client';
import { Megaphone, Plus, Edit, Trash2, X, ToggleLeft, ToggleRight } from 'lucide-react';

const TYPES = ['info', 'warning', 'success', 'upgrade'];

export default function AdminAnnouncements() {
  const { currentUser } = useAuth();
  const { showToast } = useToast();
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ title: '', message: '', type: 'info', target: 'all', cta_text: '', cta_url: '', is_active: true });

  useEffect(() => { fetchAnnouncements(); }, []);

  const fetchAnnouncements = async () => {
    setLoading(true);
    const { data } = await supabase.from('announcements').select('*').order('created_at', { ascending: false });
    setAnnouncements(data || []);
    setLoading(false);
  };

  const handleSave = async () => {
    try {
      if (editing) {
        await supabase.from('announcements').update({ ...form }).eq('id', editing);
      } else {
        await supabase.from('announcements').insert({ ...form, created_by: currentUser.id });
      }
      showToast(editing ? 'Announcement updated' : 'Announcement created', 'success');
      setShowForm(false);
      setEditing(null);
      setForm({ title: '', message: '', type: 'info', target: 'all', cta_text: '', cta_url: '', is_active: true });
      fetchAnnouncements();
    } catch (error) {
      showToast('Failed to save', 'error');
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this announcement?')) return;
    await supabase.from('announcements').delete().eq('id', id);
    showToast('Deleted', 'success');
    fetchAnnouncements();
  };

  const toggleActive = async (id, current) => {
    await supabase.from('announcements').update({ is_active: !current }).eq('id', id);
    fetchAnnouncements();
  };

  const startEdit = (ann) => {
    setForm({ title: ann.title || '', message: ann.message || '', type: ann.type, target: ann.target, cta_text: ann.cta_text || '', cta_url: ann.cta_url || '', is_active: ann.is_active });
    setEditing(ann.id);
    setShowForm(true);
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <Megaphone className="h-6 w-6 text-primary" /> Announcements
            </h1>
            <p className="text-sm text-muted-foreground mt-1">Push banners and messages to users</p>
          </div>
          <button onClick={() => { setEditing(null); setForm({ title: '', message: '', type: 'info', target: 'all', cta_text: '', cta_url: '', is_active: true }); setShowForm(true); }}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90">
            <Plus className="h-4 w-4" /> New Announcement
          </button>
        </div>

        {/* List */}
        <div className="space-y-3">
          {announcements.map(ann => (
            <div key={ann.id} className={`bg-card border border-border rounded-xl p-4 flex items-start gap-4 ${!ann.is_active ? 'opacity-60' : ''}`}>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className={`px-2 py-0.5 rounded text-[10px] font-medium uppercase ${
                    ann.type === 'warning' ? 'bg-warning/15 text-warning' : ann.type === 'success' ? 'bg-success/15 text-success' : ann.type === 'upgrade' ? 'bg-primary/15 text-primary' : 'bg-info/15 text-info'
                  }`}>{ann.type}</span>
                  <span className="text-xs text-muted-foreground">→ {ann.target}</span>
                  {!ann.is_active && <span className="text-xs text-muted-foreground italic">Inactive</span>}
                </div>
                <p className="font-medium text-sm text-foreground">{ann.title}</p>
                <p className="text-sm text-muted-foreground">{ann.message}</p>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => toggleActive(ann.id, ann.is_active)} className="p-1 text-muted-foreground hover:text-foreground">
                  {ann.is_active ? <ToggleRight className="h-5 w-5 text-success" /> : <ToggleLeft className="h-5 w-5" />}
                </button>
                <button onClick={() => startEdit(ann)} className="p-1 text-muted-foreground hover:text-foreground"><Edit className="h-4 w-4" /></button>
                <button onClick={() => handleDelete(ann.id)} className="p-1 text-muted-foreground hover:text-error"><Trash2 className="h-4 w-4" /></button>
              </div>
            </div>
          ))}
          {announcements.length === 0 && !loading && (
            <div className="text-center py-12 text-muted-foreground">No announcements yet</div>
          )}
        </div>

        {/* Form Modal */}
        {showForm && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-card rounded-xl border border-border p-6 w-full max-w-md">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">{editing ? 'Edit' : 'New'} Announcement</h3>
                <button onClick={() => setShowForm(false)}><X className="h-5 w-5 text-muted-foreground" /></button>
              </div>
              <div className="space-y-3">
                <input type="text" placeholder="Title" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                  className="w-full px-3 py-2 border border-border rounded-lg text-sm bg-card" />
                <textarea placeholder="Message" value={form.message} onChange={e => setForm(f => ({ ...f, message: e.target.value }))}
                  className="w-full px-3 py-2 border border-border rounded-lg text-sm bg-card" rows={3} />
                <div className="grid grid-cols-2 gap-3">
                  <select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}
                    className="px-3 py-2 border border-border rounded-lg text-sm bg-card">
                    {TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                  <input type="text" placeholder="Target (all, product_id)" value={form.target} onChange={e => setForm(f => ({ ...f, target: e.target.value }))}
                    className="px-3 py-2 border border-border rounded-lg text-sm bg-card" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <input type="text" placeholder="CTA Text" value={form.cta_text} onChange={e => setForm(f => ({ ...f, cta_text: e.target.value }))}
                    className="px-3 py-2 border border-border rounded-lg text-sm bg-card" />
                  <input type="text" placeholder="CTA URL" value={form.cta_url} onChange={e => setForm(f => ({ ...f, cta_url: e.target.value }))}
                    className="px-3 py-2 border border-border rounded-lg text-sm bg-card" />
                </div>
                <button onClick={handleSave} className="w-full py-2.5 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90">
                  {editing ? 'Update' : 'Create'} Announcement
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
