import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Search, Building2, Check, X, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';

export default function PropertyAssignment({ user, currentUser }) {
  const [properties, setProperties] = useState([]);
  const [accessList, setAccessList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [toggling, setToggling] = useState(null);

  useEffect(() => {
    loadData();
  }, [user.id]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [{ data: props }, { data: access }] = await Promise.all([
        supabase.from('properties').select('id, property_name, address, code, user_id').order('property_name'),
        supabase.from('property_access').select('*').eq('user_id', user.id),
      ]);
      setProperties(props || []);
      setAccessList(access || []);
    } catch (e) {
      toast.error('Failed to load properties');
    } finally {
      setLoading(false);
    }
  };

  const toggleAccess = async (property) => {
    const existing = accessList.find(a => a.property_id === property.id);
    setToggling(property.id);
    try {
      if (existing) {
        const { error } = await supabase.from('property_access').delete().eq('id', existing.id);
        if (error) throw error;
        setAccessList(prev => prev.filter(a => a.id !== existing.id));
        toast.success(`Removed access to ${property.property_name}`);
      } else {
        const { data, error } = await supabase.from('property_access').insert({
          property_id: property.id,
          user_id: user.id,
          access_level: 'manager',
          granted_by: currentUser.id,
        }).select().single();
        if (error) throw error;
        setAccessList(prev => [...prev, data]);
        toast.success(`Granted access to ${property.property_name}`);
      }
    } catch (e) {
      toast.error(e.message);
    } finally {
      setToggling(null);
    }
  };

  const filtered = properties.filter(p => {
    if (!search) return true;
    const s = search.toLowerCase();
    return p.property_name?.toLowerCase().includes(s) || p.address?.toLowerCase().includes(s) || p.code?.toLowerCase().includes(s);
  });

  // Properties they own vs shared
  const owned = filtered.filter(p => p.user_id === user.id);
  const others = filtered.filter(p => p.user_id !== user.id);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-6">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Building2 className="h-4 w-4 text-primary" />
        <h3 className="font-medium text-foreground text-sm">Property Access</h3>
        <span className="text-xs text-muted-foreground ml-auto">
          {accessList.length} shared
        </span>
      </div>

      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
        <Input
          placeholder="Search properties..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="pl-8 text-sm h-8"
        />
      </div>

      <div className="max-h-64 overflow-y-auto space-y-1 border border-border rounded-lg p-2">
        {owned.length > 0 && (
          <div className="text-xs text-muted-foreground font-medium px-2 py-1">Owned by this user</div>
        )}
        {owned.map(p => (
          <div key={p.id} className="flex items-center gap-2 px-2 py-1.5 rounded text-sm text-muted-foreground">
            <div className="w-5 h-5 rounded border border-border bg-muted flex items-center justify-center">
              <Check className="h-3 w-3" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="font-medium text-foreground truncate">{p.property_name}</div>
              <div className="text-xs text-muted-foreground truncate">{p.address}</div>
            </div>
            <span className="text-xs text-muted-foreground shrink-0">owner</span>
          </div>
        ))}

        {others.length > 0 && (
          <div className="text-xs text-muted-foreground font-medium px-2 py-1 mt-1">Other properties</div>
        )}
        {others.map(p => {
          const hasAccess = accessList.some(a => a.property_id === p.id);
          const isToggling = toggling === p.id;
          return (
            <button
              key={p.id}
              onClick={() => toggleAccess(p)}
              disabled={isToggling}
              className={`w-full flex items-center gap-2 px-2 py-1.5 rounded text-sm transition-colors text-left ${
                hasAccess ? 'bg-primary/10' : 'hover:bg-muted'
              }`}
            >
              <div className={`w-5 h-5 rounded border flex items-center justify-center shrink-0 ${
                hasAccess ? 'bg-primary border-primary' : 'border-border'
              }`}>
                {isToggling ? (
                  <Loader2 className="h-3 w-3 animate-spin text-primary-foreground" />
                ) : hasAccess ? (
                  <Check className="h-3 w-3 text-primary-foreground" />
                ) : null}
              </div>
              <div className="min-w-0 flex-1">
                <div className="font-medium text-foreground truncate">{p.property_name}</div>
                <div className="text-xs text-muted-foreground truncate">{p.address}</div>
              </div>
              <span className="text-xs text-muted-foreground shrink-0">{p.code}</span>
            </button>
          );
        })}

        {filtered.length === 0 && (
          <div className="text-center text-sm text-muted-foreground py-4">No properties found</div>
        )}
      </div>
    </div>
  );
}
