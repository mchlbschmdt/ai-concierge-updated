import React, { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import {
  BookOpen, Plus, Search, Upload, Pencil, Trash2, X, Check, Loader2, Filter,
} from 'lucide-react';

export default function PropertyFaqTab({ property }) {
  const { toast } = useToast();
  const [faqs, setFaqs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [subcategoryFilter, setSubcategoryFilter] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [showAddForm, setShowAddForm] = useState(false);
  const [addForm, setAddForm] = useState({ category: '', subcategory: '', question: '', answer: '', tags: '', priority: 0 });
  const [importing, setImporting] = useState(false);
  const fileInputRef = useRef(null);

  const fetchFaqs = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('faq_entries')
      .select('*')
      .eq('property_id', property.id)
      .order('priority', { ascending: false });
    if (error) {
      console.error('Error fetching FAQs:', error);
    } else {
      setFaqs(data || []);
    }
    setLoading(false);
  }, [property.id]);

  useEffect(() => { fetchFaqs(); }, [fetchFaqs]);

  const categories = [...new Set(faqs.map(f => f.category).filter(Boolean))];
  const subcategories = [...new Set(faqs.filter(f => !categoryFilter || f.category === categoryFilter).map(f => f.subcategory).filter(Boolean))];

  const filtered = faqs.filter(f => {
    if (categoryFilter && f.category !== categoryFilter) return false;
    if (subcategoryFilter && f.subcategory !== subcategoryFilter) return false;
    if (search) {
      const s = search.toLowerCase();
      const inQuestion = f.question?.toLowerCase().includes(s);
      const inAnswer = f.answer?.toLowerCase().includes(s);
      const inTags = f.tags?.some(t => t.toLowerCase().includes(s));
      if (!inQuestion && !inAnswer && !inTags) return false;
    }
    return true;
  });

  const handleAdd = async () => {
    const tags = addForm.tags ? addForm.tags.split(',').map(t => t.trim()).filter(Boolean) : [];
    const { error } = await supabase.from('faq_entries').insert({
      property_id: property.id,
      category: addForm.category || 'General',
      subcategory: addForm.subcategory || '',
      question: addForm.question,
      answer: addForm.answer,
      tags,
      priority: Number(addForm.priority) || 0,
    });
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'FAQ Added' });
      setAddForm({ category: '', subcategory: '', question: '', answer: '', tags: '', priority: 0 });
      setShowAddForm(false);
      fetchFaqs();
    }
  };

  const handleUpdate = async (id) => {
    const tags = editForm.tags
      ? (typeof editForm.tags === 'string' ? editForm.tags.split(',').map(t => t.trim()).filter(Boolean) : editForm.tags)
      : [];
    const { error } = await supabase.from('faq_entries').update({
      category: editForm.category,
      subcategory: editForm.subcategory,
      question: editForm.question,
      answer: editForm.answer,
      tags,
      priority: Number(editForm.priority) || 0,
      updated_at: new Date().toISOString(),
    }).eq('id', id);
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'FAQ Updated' });
      setEditingId(null);
      fetchFaqs();
    }
  };

  const handleToggleActive = async (faq) => {
    const { error } = await supabase.from('faq_entries').update({ is_active: !faq.is_active, updated_at: new Date().toISOString() }).eq('id', faq.id);
    if (!error) fetchFaqs();
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this FAQ entry?')) return;
    await supabase.from('faq_entries').delete().eq('id', id);
    fetchFaqs();
  };

  const handleImport = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    try {
      const text = await file.text();
      let entries;
      if (file.name.endsWith('.json')) {
        const parsed = JSON.parse(text);
        entries = Array.isArray(parsed) ? parsed : parsed.entries || parsed.faqs || parsed.questions || [parsed];
      } else if (file.name.endsWith('.csv')) {
        entries = parseCsv(text);
      } else {
        throw new Error('Unsupported file type. Use .json or .csv');
      }

      const { data, error } = await supabase.functions.invoke('match-guest-message', {
        body: { action: 'import', property_id: property.id, entries },
      });
      if (error) throw error;
      toast({ title: 'Import Complete', description: `${data.imported} entries imported.` });
      fetchFaqs();
    } catch (err) {
      toast({ title: 'Import Failed', description: err.message, variant: 'destructive' });
    } finally {
      setImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const startEdit = (faq) => {
    setEditingId(faq.id);
    setEditForm({
      category: faq.category,
      subcategory: faq.subcategory,
      question: faq.question,
      answer: faq.answer,
      tags: faq.tags?.join(', ') || '',
      priority: faq.priority,
    });
  };

  const [showPasteImport, setShowPasteImport] = useState(false);
  const [pasteInput, setPasteInput] = useState('');
  const [pasteImporting, setPasteImporting] = useState(false);

  const handlePasteImport = async () => {
    if (!pasteInput.trim()) return;
    setPasteImporting(true);
    try {
      let parsed;
      try { parsed = JSON.parse(pasteInput); } catch { 
        toast({ title: 'Invalid JSON', description: 'Please paste valid JSON data.', variant: 'destructive' }); 
        return; 
      }
      const entries = parsed.add_faqs || parsed.faqs || parsed.entries || (Array.isArray(parsed) ? parsed : null);
      if (!Array.isArray(entries) || entries.length === 0) {
        toast({ title: 'No entries found', description: 'JSON must contain an array under "add_faqs", "faqs", "entries", or be an array.', variant: 'destructive' });
        return;
      }
      const rows = entries.filter(e => e.question && e.answer).map(e => ({
        property_id: property.id,
        category: e.category || 'General',
        subcategory: e.subcategory || '',
        question: e.question,
        answer: e.answer,
        tags: Array.isArray(e.tags) ? e.tags : (e.tags ? e.tags.split(',').map(t => t.trim()) : []),
        priority: Number(e.priority) || 0,
      }));
      if (rows.length === 0) {
        toast({ title: 'No valid entries', description: 'Entries must have "question" and "answer" fields.', variant: 'destructive' });
        return;
      }
      const { error } = await supabase.from('faq_entries').insert(rows);
      if (error) throw error;
      toast({ title: 'Import Complete', description: `${rows.length} FAQ entries imported.` });
      setPasteInput('');
      setShowPasteImport(false);
      fetchFaqs();
    } catch (err) {
      toast({ title: 'Import Failed', description: err.message, variant: 'destructive' });
    } finally {
      setPasteImporting(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <BookOpen size={20} /> Knowledge Base (Structured)
        </h3>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={() => setShowAddForm(v => !v)}>
            <Plus size={14} className="mr-1" /> Add Entry
          </Button>
          <Button size="sm" variant="outline" onClick={() => fileInputRef.current?.click()} disabled={importing}>
            {importing ? <Loader2 size={14} className="mr-1 animate-spin" /> : <Upload size={14} className="mr-1" />}
            Import
          </Button>
          <Button size="sm" variant="outline" onClick={() => setShowPasteImport(v => !v)}>
            📋 Paste JSON
          </Button>
          <input ref={fileInputRef} type="file" accept=".json,.csv" onChange={handleImport} className="hidden" />
        </div>
      </div>

      {/* Paste Import */}
      {showPasteImport && (
        <div className="border rounded-lg p-4 bg-muted/30 space-y-3">
          <h4 className="font-medium text-sm">Paste FAQ JSON</h4>
          <p className="text-xs text-muted-foreground">Paste JSON with an array under "add_faqs", "faqs", "entries", or a top-level array. Each entry needs "question" and "answer" fields.</p>
          <Textarea
            value={pasteInput}
            onChange={e => setPasteInput(e.target.value)}
            placeholder='{"add_faqs": [{"category": "...", "question": "...", "answer": "...", "tags": [...]}]}'
            className="font-mono text-sm min-h-[150px]"
            disabled={pasteImporting}
          />
          <div className="flex gap-2">
            <Button size="sm" onClick={handlePasteImport} disabled={!pasteInput.trim() || pasteImporting}>
              {pasteImporting ? <><Loader2 size={14} className="mr-1 animate-spin" /> Importing...</> : <><Check size={14} className="mr-1" /> Import Entries</>}
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setShowPasteImport(false)}>
              <X size={14} className="mr-1" /> Cancel
            </Button>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-2 items-center">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={14} className="absolute left-2.5 top-2.5 text-muted-foreground" />
          <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search questions, answers, tags..." className="pl-8 h-9" />
        </div>
        {categories.length > 0 && (
          <select
            value={categoryFilter}
            onChange={e => { setCategoryFilter(e.target.value); setSubcategoryFilter(''); }}
            className="h-9 rounded-md border border-input bg-background px-3 text-sm"
          >
            <option value="">All Categories</option>
            {categories.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        )}
        {subcategories.length > 0 && categoryFilter && (
          <select
            value={subcategoryFilter}
            onChange={e => setSubcategoryFilter(e.target.value)}
            className="h-9 rounded-md border border-input bg-background px-3 text-sm"
          >
            <option value="">All Subcategories</option>
            {subcategories.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        )}
      </div>

      {/* Add Form */}
      {showAddForm && (
        <div className="border rounded-lg p-4 bg-muted/30 space-y-3">
          <h4 className="font-medium text-sm">New FAQ Entry</h4>
          <div className="grid grid-cols-2 gap-3">
            <Input placeholder="Category" value={addForm.category} onChange={e => setAddForm(p => ({ ...p, category: e.target.value }))} />
            <Input placeholder="Subcategory" value={addForm.subcategory} onChange={e => setAddForm(p => ({ ...p, subcategory: e.target.value }))} />
          </div>
          <Input placeholder="Question" value={addForm.question} onChange={e => setAddForm(p => ({ ...p, question: e.target.value }))} />
          <Textarea placeholder="Answer" value={addForm.answer} onChange={e => setAddForm(p => ({ ...p, answer: e.target.value }))} className="min-h-[80px]" />
          <div className="grid grid-cols-2 gap-3">
            <Input placeholder="Tags (comma-separated)" value={addForm.tags} onChange={e => setAddForm(p => ({ ...p, tags: e.target.value }))} />
            <Input type="number" placeholder="Priority" value={addForm.priority} onChange={e => setAddForm(p => ({ ...p, priority: e.target.value }))} />
          </div>
          <div className="flex gap-2">
            <Button size="sm" onClick={handleAdd} disabled={!addForm.question || !addForm.answer}>
              <Check size={14} className="mr-1" /> Save
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setShowAddForm(false)}>
              <X size={14} className="mr-1" /> Cancel
            </Button>
          </div>
        </div>
      )}

      {/* FAQ Table */}
      {loading ? (
        <div className="flex justify-center py-8"><Loader2 className="animate-spin" /></div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          <BookOpen className="mx-auto mb-2 opacity-50" size={32} />
          <p>No FAQ entries yet. Add entries manually or import a JSON/CSV file.</p>
        </div>
      ) : (
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground">{filtered.length} entries {categoryFilter && `in "${categoryFilter}"`}</p>
          {filtered.map(faq => (
            <div key={faq.id} className={`border rounded-lg p-3 ${!faq.is_active ? 'opacity-50 bg-muted/20' : 'bg-background'}`}>
              {editingId === faq.id ? (
                <div className="space-y-2">
                  <div className="grid grid-cols-2 gap-2">
                    <Input value={editForm.category} onChange={e => setEditForm(p => ({ ...p, category: e.target.value }))} placeholder="Category" />
                    <Input value={editForm.subcategory} onChange={e => setEditForm(p => ({ ...p, subcategory: e.target.value }))} placeholder="Subcategory" />
                  </div>
                  <Input value={editForm.question} onChange={e => setEditForm(p => ({ ...p, question: e.target.value }))} placeholder="Question" />
                  <Textarea value={editForm.answer} onChange={e => setEditForm(p => ({ ...p, answer: e.target.value }))} className="min-h-[60px]" />
                  <div className="grid grid-cols-2 gap-2">
                    <Input value={editForm.tags} onChange={e => setEditForm(p => ({ ...p, tags: e.target.value }))} placeholder="Tags" />
                    <Input type="number" value={editForm.priority} onChange={e => setEditForm(p => ({ ...p, priority: e.target.value }))} placeholder="Priority" />
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" onClick={() => handleUpdate(faq.id)}><Check size={14} className="mr-1" /> Save</Button>
                    <Button size="sm" variant="ghost" onClick={() => setEditingId(null)}><X size={14} className="mr-1" /> Cancel</Button>
                  </div>
                </div>
              ) : (
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        {faq.category && <Badge variant="secondary" className="text-xs">{faq.category}</Badge>}
                        {faq.subcategory && <Badge variant="outline" className="text-xs">{faq.subcategory}</Badge>}
                        {!faq.is_active && <Badge variant="destructive" className="text-xs">Inactive</Badge>}
                      </div>
                      <p className="font-medium text-sm">{faq.question}</p>
                      <p className="text-sm text-muted-foreground mt-1 whitespace-pre-wrap">{faq.answer}</p>
                      {faq.tags?.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {faq.tags.map((tag, i) => (
                            <span key={i} className="text-xs px-1.5 py-0.5 rounded bg-muted">{tag}</span>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="flex gap-1 shrink-0">
                      <Button size="sm" variant="ghost" onClick={() => startEdit(faq)}>
                        <Pencil size={14} />
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => handleToggleActive(faq)}>
                        {faq.is_active ? '🟢' : '⚪'}
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => handleDelete(faq.id)}>
                        <Trash2 size={14} className="text-destructive" />
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// Simple CSV parser
function parseCsv(text) {
  const lines = text.split('\n').filter(l => l.trim());
  if (lines.length < 2) return [];
  const headers = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/"/g, ''));
  return lines.slice(1).map(line => {
    const vals = line.split(',').map(v => v.trim().replace(/^"|"$/g, ''));
    const obj = {};
    headers.forEach((h, i) => { obj[h] = vals[i] || ''; });
    return obj;
  });
}
