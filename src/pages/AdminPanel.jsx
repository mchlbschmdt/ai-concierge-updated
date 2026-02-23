import React, { useState, useEffect, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Users, Key, Megaphone, BarChart3, DollarSign, Search, X, Check, ChevronDown,
  ChevronUp, Shield, Clock, Gift, Ban, Plus, Trash2, Edit2, Eye, Send
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { entitlementService } from '@/services/entitlementService';
import { roleService } from '@/services/roleService';
import { toast } from 'sonner';
import Layout from '@/components/Layout';
import { Input } from '@/components/ui/input';
import { format, formatDistanceToNow, subDays } from 'date-fns';
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip as RechartsTooltip, ResponsiveContainer, Legend
} from 'recharts';

const TABS = [
  { id: 'users', label: 'Users', icon: Users },
  { id: 'access', label: 'Access Control', icon: Key },
  { id: 'announcements', label: 'Announcements', icon: Megaphone },
  { id: 'stats', label: 'Platform Stats', icon: BarChart3 },
  { id: 'revenue', label: 'Revenue Overview', icon: DollarSign },
];

const PRODUCT_ICONS = {
  ai_concierge: '🤖',
  snappro: '📸',
  analytics: '📊',
  academy: '🎓',
  full_suite: '🏠',
};

const ANNOUNCEMENT_TYPES = [
  { value: 'info', label: 'Info', color: 'bg-blue-100 text-blue-800' },
  { value: 'warning', label: 'Warning', color: 'bg-amber-100 text-amber-800' },
  { value: 'success', label: 'Success', color: 'bg-green-100 text-green-800' },
  { value: 'promo', label: 'Upgrade Promo', color: 'bg-gradient-to-r from-amber-100 to-yellow-100 text-amber-900' },
];

const TARGET_OPTIONS = [
  { value: 'all', label: 'All users' },
  { value: 'ai_concierge', label: 'AI Concierge users' },
  { value: 'free', label: 'Free users only' },
  { value: 'trial', label: 'Trial users only' },
];

// ─── Main Component ───
export default function AdminPanel() {
  const location = useLocation();
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const [activeTab, setActiveTab] = useState('users');

  // Shared data
  const [profiles, setProfiles] = useState([]);
  const [entitlements, setEntitlements] = useState([]);
  const [products, setProducts] = useState([]);
  const [announcements, setAnnouncements] = useState([]);
  const [adminActions, setAdminActions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const hash = location.hash.replace('#', '');
    if (TABS.some(t => t.id === hash)) setActiveTab(hash);
  }, [location.hash]);

  const switchTab = (id) => {
    setActiveTab(id);
    navigate(`/admin#${id}`, { replace: true });
  };

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [profs, ents, prods, anns, actions] = await Promise.all([
        supabase.from('profiles').select('*').order('created_at', { ascending: false }),
        entitlementService.getAllEntitlements(),
        entitlementService.getAllProducts(),
        supabase.from('announcements').select('*').order('created_at', { ascending: false }),
        supabase.from('admin_actions').select('*').order('created_at', { ascending: false }).limit(50),
      ]);
      setProfiles(profs.data || []);
      setEntitlements(ents);
      setProducts(prods);
      setAnnouncements(anns.data || []);
      setAdminActions(actions.data || []);
    } catch (e) {
      toast.error('Failed to load admin data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAll(); }, []);

  const TabContent = () => {
    switch (activeTab) {
      case 'users': return <UsersTab profiles={profiles} entitlements={entitlements} products={products} currentUser={currentUser} onRefresh={fetchAll} />;
      case 'access': return <AccessControlTab entitlements={entitlements} products={products} profiles={profiles} currentUser={currentUser} onRefresh={fetchAll} />;
      case 'announcements': return <AnnouncementsTab announcements={announcements} currentUser={currentUser} onRefresh={fetchAll} />;
      case 'stats': return <PlatformStatsTab profiles={profiles} entitlements={entitlements} products={products} />;
      case 'revenue': return <RevenueTab entitlements={entitlements} products={products} adminActions={adminActions} />;
      default: return null;
    }
  };

  return (
    <Layout>
      <div className="p-4 md:p-6 max-w-7xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <Shield className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold text-foreground">Admin Panel</h1>
        </div>

        {/* Tab bar */}
        <div className="flex gap-1 mb-6 overflow-x-auto pb-1 border-b border-border">
          {TABS.map(tab => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => switchTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium whitespace-nowrap rounded-t-lg transition-colors ${
                  activeTab === tab.id
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                }`}
              >
                <Icon className="h-4 w-4" />
                <span className="hidden sm:inline">{tab.label}</span>
              </button>
            );
          })}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </div>
        ) : (
          <TabContent />
        )}
      </div>
    </Layout>
  );
}

// ─── USERS TAB ───
function UsersTab({ profiles, entitlements, products, currentUser, onRefresh }) {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [drawerUser, setDrawerUser] = useState(null);

  const usersWithData = useMemo(() => {
    return profiles.map(p => {
      const userEnts = entitlements.filter(e => e.user_id === p.id);
      const activeProducts = userEnts.filter(e => e.status === 'active' || e.status === 'admin_granted');
      const trialProducts = userEnts.filter(e => e.status === 'trial');
      const mrr = activeProducts.reduce((sum, e) => {
        const prod = products.find(pr => pr.id === e.product_id);
        return sum + (prod?.price_monthly || 0);
      }, 0);
      return { ...p, entitlements: userEnts, activeProducts, trialProducts, mrr };
    });
  }, [profiles, entitlements, products]);

  const filtered = useMemo(() => {
    let list = usersWithData;
    if (search) {
      const s = search.toLowerCase();
      list = list.filter(u => u.email?.toLowerCase().includes(s) || u.full_name?.toLowerCase().includes(s));
    }
    if (statusFilter === 'active') list = list.filter(u => u.activeProducts.length > 0);
    if (statusFilter === 'trial') list = list.filter(u => u.trialProducts.length > 0 && u.activeProducts.length === 0);
    if (statusFilter === 'free') list = list.filter(u => u.activeProducts.length === 0 && u.trialProducts.length === 0);
    return list;
  }, [usersWithData, search, statusFilter]);

  return (
    <div>
      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search by name or email..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          className="px-3 py-2 rounded-md border border-input bg-background text-sm"
        >
          <option value="all">All Users</option>
          <option value="active">Active Paid</option>
          <option value="trial">Trial Only</option>
          <option value="free">Free</option>
        </select>
      </div>

      <div className="text-sm text-muted-foreground mb-3">{filtered.length} users</div>

      {/* Table */}
      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">User</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden md:table-cell">Joined</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden lg:table-cell">Products</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden lg:table-cell">MRR</th>
              <th className="text-right px-4 py-3 font-medium text-muted-foreground">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {filtered.map(user => (
              <tr key={user.id} className="hover:bg-muted/30 transition-colors">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">
                      {(user.full_name || user.email)?.[0]?.toUpperCase() || '?'}
                    </div>
                    <div>
                      <div className="font-medium text-foreground">{user.full_name || 'No name'}</div>
                      <div className="text-xs text-muted-foreground">{user.email}</div>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3 text-muted-foreground hidden md:table-cell">
                  {format(new Date(user.created_at), 'MMM d, yyyy')}
                </td>
                <td className="px-4 py-3 hidden lg:table-cell">
                  <div className="flex gap-1">
                    {user.activeProducts.map(e => (
                      <span key={e.product_id} className="text-base" title={e.product_id}>{PRODUCT_ICONS[e.product_id] || '📦'}</span>
                    ))}
                    {user.trialProducts.map(e => (
                      <span key={e.product_id} className="text-base opacity-50" title={`${e.product_id} (trial)`}>{PRODUCT_ICONS[e.product_id] || '📦'}</span>
                    ))}
                    {user.activeProducts.length === 0 && user.trialProducts.length === 0 && (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </div>
                </td>
                <td className="px-4 py-3 hidden lg:table-cell font-medium text-foreground">
                  {user.mrr > 0 ? `$${user.mrr.toFixed(2)}` : '—'}
                </td>
                <td className="px-4 py-3 text-right">
                  <button
                    onClick={() => setDrawerUser(user)}
                    className="px-3 py-1.5 text-xs font-medium rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
                  >
                    Manage Access
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Drawer */}
      {drawerUser && (
        <UserAccessDrawer
          user={drawerUser}
          products={products}
          currentUser={currentUser}
          onClose={() => setDrawerUser(null)}
          onRefresh={onRefresh}
        />
      )}
    </div>
  );
}

// ─── USER ACCESS DRAWER ───
function UserAccessDrawer({ user, products, currentUser, onClose, onRefresh }) {
  const [actionProduct, setActionProduct] = useState(null);
  const [actionType, setActionType] = useState(null);
  const [duration, setDuration] = useState('30');
  const [note, setNote] = useState('');
  const [trialDays, setTrialDays] = useState('7');
  const [trialUses, setTrialUses] = useState('10');
  const [submitting, setSubmitting] = useState(false);

  const handleGrant = async (productId) => {
    setSubmitting(true);
    try {
      const expiresAt = duration === 'indefinite' ? null : new Date(Date.now() + parseInt(duration) * 86400000).toISOString();
      await entitlementService.grantAccess(currentUser.id, user.id, productId, {
        status: 'admin_granted', note, expiresAt,
      });
      toast.success(`Access granted for ${productId}`);
      setActionProduct(null); setActionType(null);
      onRefresh();
    } catch (e) {
      toast.error(e.message);
    } finally { setSubmitting(false); }
  };

  const handleGrantTrial = async (productId) => {
    setSubmitting(true);
    try {
      await entitlementService.grantAccess(currentUser.id, user.id, productId, {
        status: 'trial',
        trialStartsAt: new Date().toISOString(),
        trialEndsAt: new Date(Date.now() + parseInt(trialDays) * 86400000).toISOString(),
        usageLimit: parseInt(trialUses) || null,
        note,
      });
      toast.success(`Trial granted for ${productId}`);
      setActionProduct(null); setActionType(null);
      onRefresh();
    } catch (e) {
      toast.error(e.message);
    } finally { setSubmitting(false); }
  };

  const handleRevoke = async (productId) => {
    setSubmitting(true);
    try {
      await entitlementService.revokeAccess(currentUser.id, user.id, productId);
      toast.success(`Access revoked for ${productId}`);
      setActionProduct(null); setActionType(null);
      onRefresh();
    } catch (e) {
      toast.error(e.message);
    } finally { setSubmitting(false); }
  };

  return (
    <>
      <div className="fixed inset-0 bg-black/40 z-40" onClick={onClose} />
      <div className="fixed right-0 top-0 bottom-0 w-full max-w-md bg-background border-l border-border z-50 overflow-y-auto shadow-2xl animate-in slide-in-from-right">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-bold text-foreground">Manage Access</h2>
            <button onClick={onClose} className="p-1 rounded-md hover:bg-muted"><X className="h-5 w-5" /></button>
          </div>

          {/* User info */}
          <div className="mb-6 p-4 rounded-lg bg-muted/50 border border-border">
            <div className="font-medium text-foreground">{user.full_name || 'No name'}</div>
            <div className="text-sm text-muted-foreground">{user.email}</div>
            <div className="text-xs text-muted-foreground mt-1">Joined {format(new Date(user.created_at), 'MMM d, yyyy')}</div>
          </div>

          {/* Products */}
          <div className="space-y-3">
            {products.map(prod => {
              const ent = user.entitlements?.find(e => e.product_id === prod.id);
              const isExpanded = actionProduct === prod.id;

              return (
                <div key={prod.id} className="border border-border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{PRODUCT_ICONS[prod.id] || '📦'}</span>
                      <span className="font-medium text-foreground text-sm">{prod.name}</span>
                    </div>
                    <StatusBadge status={ent?.status} />
                  </div>

                  {/* Action buttons */}
                  <div className="flex flex-wrap gap-2 mt-2">
                    <button onClick={() => { setActionProduct(prod.id); setActionType('grant'); }} className="px-2 py-1 text-xs rounded bg-green-100 text-green-800 hover:bg-green-200 transition-colors flex items-center gap-1">
                      <Gift className="h-3 w-3" /> Grant
                    </button>
                    <button onClick={() => { setActionProduct(prod.id); setActionType('trial'); }} className="px-2 py-1 text-xs rounded bg-amber-100 text-amber-800 hover:bg-amber-200 transition-colors flex items-center gap-1">
                      <Clock className="h-3 w-3" /> Trial
                    </button>
                    {ent && (ent.status === 'active' || ent.status === 'admin_granted' || ent.status === 'trial') && (
                      <button onClick={() => { setActionProduct(prod.id); setActionType('revoke'); }} className="px-2 py-1 text-xs rounded bg-red-100 text-red-800 hover:bg-red-200 transition-colors flex items-center gap-1">
                        <Ban className="h-3 w-3" /> Revoke
                      </button>
                    )}
                  </div>

                  {/* Inline action form */}
                  {isExpanded && actionType === 'grant' && (
                    <div className="mt-3 p-3 bg-muted/50 rounded-md space-y-2">
                      <select value={duration} onChange={e => setDuration(e.target.value)} className="w-full px-2 py-1.5 text-sm border border-input rounded bg-background">
                        <option value="7">7 days</option>
                        <option value="30">30 days</option>
                        <option value="90">90 days</option>
                        <option value="365">1 year</option>
                        <option value="indefinite">Indefinite</option>
                      </select>
                      <Input placeholder="Note (optional)" value={note} onChange={e => setNote(e.target.value)} className="text-sm" />
                      <div className="flex gap-2">
                        <button onClick={() => handleGrant(prod.id)} disabled={submitting} className="px-3 py-1.5 text-xs rounded bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50">
                          {submitting ? 'Granting...' : 'Confirm Grant'}
                        </button>
                        <button onClick={() => { setActionProduct(null); setActionType(null); }} className="px-3 py-1.5 text-xs rounded bg-muted text-muted-foreground">Cancel</button>
                      </div>
                    </div>
                  )}

                  {isExpanded && actionType === 'trial' && (
                    <div className="mt-3 p-3 bg-muted/50 rounded-md space-y-2">
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-xs text-muted-foreground">Days</label>
                          <Input type="number" value={trialDays} onChange={e => setTrialDays(e.target.value)} className="text-sm" />
                        </div>
                        <div>
                          <label className="text-xs text-muted-foreground">Usage limit</label>
                          <Input type="number" value={trialUses} onChange={e => setTrialUses(e.target.value)} className="text-sm" />
                        </div>
                      </div>
                      <Input placeholder="Note (optional)" value={note} onChange={e => setNote(e.target.value)} className="text-sm" />
                      <div className="flex gap-2">
                        <button onClick={() => handleGrantTrial(prod.id)} disabled={submitting} className="px-3 py-1.5 text-xs rounded bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50">
                          {submitting ? 'Granting...' : 'Confirm Trial'}
                        </button>
                        <button onClick={() => { setActionProduct(null); setActionType(null); }} className="px-3 py-1.5 text-xs rounded bg-muted text-muted-foreground">Cancel</button>
                      </div>
                    </div>
                  )}

                  {isExpanded && actionType === 'revoke' && (
                    <div className="mt-3 p-3 bg-red-50 rounded-md space-y-2">
                      <p className="text-xs text-red-800">Are you sure you want to revoke access to {prod.name}?</p>
                      <div className="flex gap-2">
                        <button onClick={() => handleRevoke(prod.id)} disabled={submitting} className="px-3 py-1.5 text-xs rounded bg-destructive text-destructive-foreground hover:bg-destructive/90 disabled:opacity-50">
                          {submitting ? 'Revoking...' : 'Confirm Revoke'}
                        </button>
                        <button onClick={() => { setActionProduct(null); setActionType(null); }} className="px-3 py-1.5 text-xs rounded bg-muted text-muted-foreground">Cancel</button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </>
  );
}

function StatusBadge({ status }) {
  if (!status) return <span className="px-2 py-0.5 text-xs rounded-full bg-muted text-muted-foreground">None</span>;
  const styles = {
    active: 'bg-green-100 text-green-800',
    admin_granted: 'bg-blue-100 text-blue-800',
    trial: 'bg-amber-100 text-amber-800',
    cancelled: 'bg-red-100 text-red-800',
    expired: 'bg-muted text-muted-foreground',
  };
  return <span className={`px-2 py-0.5 text-xs rounded-full ${styles[status] || styles.expired}`}>{status}</span>;
}

// ─── ACCESS CONTROL TAB ───
function AccessControlTab({ entitlements, products, profiles, currentUser, onRefresh }) {
  const [bulkProduct, setBulkProduct] = useState('');
  const [bulkDuration, setBulkDuration] = useState('7');
  const [submitting, setSubmitting] = useState(false);

  const stats = useMemo(() => {
    return products.map(p => {
      const pEnts = entitlements.filter(e => e.product_id === p.id);
      return {
        ...p,
        active: pEnts.filter(e => e.status === 'active' || e.status === 'admin_granted').length,
        trial: pEnts.filter(e => e.status === 'trial').length,
        expired: pEnts.filter(e => e.status === 'cancelled' || e.status === 'expired').length,
        revenue: pEnts.filter(e => e.status === 'active' || e.status === 'admin_granted').length * (p.price_monthly || 0),
      };
    });
  }, [entitlements, products]);

  const handleRevokeExpired = async () => {
    setSubmitting(true);
    try {
      const now = new Date().toISOString();
      const expired = entitlements.filter(e => e.status === 'trial' && e.trial_ends_at && e.trial_ends_at < now);
      for (const e of expired) {
        await supabase.from('user_entitlements').update({ status: 'cancelled', updated_at: now }).eq('id', e.id);
      }
      toast.success(`Revoked ${expired.length} expired trials`);
      onRefresh();
    } catch (e) {
      toast.error(e.message);
    } finally { setSubmitting(false); }
  };

  return (
    <div className="space-y-6">
      {/* Bulk ops */}
      <div className="grid gap-4 md:grid-cols-3">
        <div className="p-4 rounded-lg border border-border bg-card">
          <h3 className="font-medium text-foreground mb-2 text-sm">Grant to All Users</h3>
          <select value={bulkProduct} onChange={e => setBulkProduct(e.target.value)} className="w-full px-2 py-1.5 text-sm border border-input rounded bg-background mb-2">
            <option value="">Select product...</option>
            {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
          <button disabled className="w-full px-3 py-1.5 text-xs rounded bg-primary text-primary-foreground opacity-50 cursor-not-allowed">
            Coming Soon
          </button>
        </div>
        <div className="p-4 rounded-lg border border-border bg-card">
          <h3 className="font-medium text-foreground mb-2 text-sm">Revoke Expired Trials</h3>
          <p className="text-xs text-muted-foreground mb-3">Clean up all expired trial entitlements.</p>
          <button onClick={handleRevokeExpired} disabled={submitting} className="w-full px-3 py-1.5 text-xs rounded bg-destructive text-destructive-foreground hover:bg-destructive/90 disabled:opacity-50">
            {submitting ? 'Processing...' : 'Revoke Expired'}
          </button>
        </div>
        <div className="p-4 rounded-lg border border-border bg-card">
          <h3 className="font-medium text-foreground mb-2 text-sm">Send Upgrade Nudge</h3>
          <p className="text-xs text-muted-foreground mb-3">Email trial users near expiry.</p>
          <button onClick={() => toast.info('Coming soon')} className="w-full px-3 py-1.5 text-xs rounded bg-primary text-primary-foreground hover:bg-primary/90">
            Send Nudge
          </button>
        </div>
      </div>

      {/* Access table */}
      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Product</th>
              <th className="text-center px-4 py-3 font-medium text-muted-foreground">Active</th>
              <th className="text-center px-4 py-3 font-medium text-muted-foreground">Trial</th>
              <th className="text-center px-4 py-3 font-medium text-muted-foreground">Expired</th>
              <th className="text-right px-4 py-3 font-medium text-muted-foreground">Revenue/mo</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {stats.map(s => (
              <tr key={s.id} className="hover:bg-muted/30">
                <td className="px-4 py-3 flex items-center gap-2 font-medium text-foreground">
                  <span>{PRODUCT_ICONS[s.id] || '📦'}</span> {s.name}
                </td>
                <td className="px-4 py-3 text-center text-green-700 font-medium">{s.active}</td>
                <td className="px-4 py-3 text-center text-amber-700 font-medium">{s.trial}</td>
                <td className="px-4 py-3 text-center text-muted-foreground">{s.expired}</td>
                <td className="px-4 py-3 text-right font-medium text-foreground">${s.revenue.toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── ANNOUNCEMENTS TAB ───
function AnnouncementsTab({ announcements: initialAnnouncements, currentUser, onRefresh }) {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: '', message: '', type: 'info', target: 'all', cta_text: '', cta_url: '', starts_at: '', ends_at: '' });
  const [editing, setEditing] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSave = async () => {
    if (!form.title || !form.message) { toast.error('Title and message required'); return; }
    setSubmitting(true);
    try {
      const payload = {
        title: form.title,
        message: form.message,
        type: form.type,
        target: form.target,
        cta_text: form.cta_text || null,
        cta_url: form.cta_url || null,
        starts_at: form.starts_at || new Date().toISOString(),
        ends_at: form.ends_at || null,
        created_by: currentUser.id,
        is_active: true,
      };

      if (editing) {
        await supabase.from('announcements').update(payload).eq('id', editing);
      } else {
        await supabase.from('announcements').insert(payload);
      }
      toast.success(editing ? 'Announcement updated' : 'Announcement created');
      setShowForm(false); setEditing(null);
      setForm({ title: '', message: '', type: 'info', target: 'all', cta_text: '', cta_url: '', starts_at: '', ends_at: '' });
      onRefresh();
    } catch (e) {
      toast.error(e.message);
    } finally { setSubmitting(false); }
  };

  const toggleActive = async (id, currentActive) => {
    await supabase.from('announcements').update({ is_active: !currentActive }).eq('id', id);
    toast.success(currentActive ? 'Announcement disabled' : 'Announcement enabled');
    onRefresh();
  };

  const deleteAnn = async (id) => {
    await supabase.from('announcements').delete().eq('id', id);
    toast.success('Deleted');
    onRefresh();
  };

  const editAnn = (ann) => {
    setForm({
      title: ann.title || '',
      message: ann.message || '',
      type: ann.type || 'info',
      target: ann.target || 'all',
      cta_text: ann.cta_text || '',
      cta_url: ann.cta_url || '',
      starts_at: ann.starts_at ? ann.starts_at.slice(0, 16) : '',
      ends_at: ann.ends_at ? ann.ends_at.slice(0, 16) : '',
    });
    setEditing(ann.id);
    setShowForm(true);
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="font-medium text-foreground">Announcements</h3>
        <button onClick={() => { setShowForm(!showForm); setEditing(null); }} className="px-3 py-1.5 text-sm rounded-md bg-primary text-primary-foreground hover:bg-primary/90 flex items-center gap-1">
          <Plus className="h-4 w-4" /> New
        </button>
      </div>

      {/* Form */}
      {showForm && (
        <div className="p-4 border border-border rounded-lg bg-card space-y-3">
          <Input placeholder="Title" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} />
          <textarea placeholder="Message" value={form.message} onChange={e => setForm({ ...form, message: e.target.value })} className="w-full px-3 py-2 border border-input rounded-md bg-background text-sm min-h-[80px]" />
          <div className="grid grid-cols-2 gap-3">
            <select value={form.type} onChange={e => setForm({ ...form, type: e.target.value })} className="px-2 py-1.5 text-sm border border-input rounded bg-background">
              {ANNOUNCEMENT_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
            <select value={form.target} onChange={e => setForm({ ...form, target: e.target.value })} className="px-2 py-1.5 text-sm border border-input rounded bg-background">
              {TARGET_OPTIONS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input placeholder="CTA text (optional)" value={form.cta_text} onChange={e => setForm({ ...form, cta_text: e.target.value })} />
            <Input placeholder="CTA URL (optional)" value={form.cta_url} onChange={e => setForm({ ...form, cta_url: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-muted-foreground">Starts at</label>
              <Input type="datetime-local" value={form.starts_at} onChange={e => setForm({ ...form, starts_at: e.target.value })} />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Ends at</label>
              <Input type="datetime-local" value={form.ends_at} onChange={e => setForm({ ...form, ends_at: e.target.value })} />
            </div>
          </div>

          {/* Preview */}
          {form.title && (
            <div className={`p-3 rounded-lg ${ANNOUNCEMENT_TYPES.find(t => t.value === form.type)?.color || 'bg-blue-100 text-blue-800'}`}>
              <div className="font-medium text-sm">{form.title}</div>
              <div className="text-xs mt-1">{form.message}</div>
              {form.cta_text && <button className="mt-2 px-3 py-1 text-xs font-medium rounded bg-white/50">{form.cta_text}</button>}
            </div>
          )}

          <div className="flex gap-2">
            <button onClick={handleSave} disabled={submitting} className="px-4 py-2 text-sm rounded bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50">
              {submitting ? 'Saving...' : editing ? 'Update' : 'Publish'}
            </button>
            <button onClick={() => { setShowForm(false); setEditing(null); }} className="px-4 py-2 text-sm rounded bg-muted text-muted-foreground">Cancel</button>
          </div>
        </div>
      )}

      {/* List */}
      <div className="space-y-2">
        {initialAnnouncements.map(ann => (
          <div key={ann.id} className="p-4 border border-border rounded-lg flex items-start justify-between gap-3">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <span className={`w-2 h-2 rounded-full ${ann.is_active ? 'bg-green-500' : 'bg-muted-foreground'}`} />
                <span className="font-medium text-foreground text-sm">{ann.title}</span>
                <span className={`px-2 py-0.5 text-xs rounded-full ${ANNOUNCEMENT_TYPES.find(t => t.value === ann.type)?.color || 'bg-muted text-muted-foreground'}`}>{ann.type}</span>
              </div>
              <p className="text-xs text-muted-foreground">{ann.message}</p>
              <div className="text-xs text-muted-foreground mt-1">Target: {ann.target} • Created {formatDistanceToNow(new Date(ann.created_at), { addSuffix: true })}</div>
            </div>
            <div className="flex gap-1">
              <button onClick={() => toggleActive(ann.id, ann.is_active)} className="p-1.5 rounded hover:bg-muted" title={ann.is_active ? 'Disable' : 'Enable'}>
                {ann.is_active ? <Eye className="h-4 w-4 text-green-600" /> : <Eye className="h-4 w-4 text-muted-foreground" />}
              </button>
              <button onClick={() => editAnn(ann)} className="p-1.5 rounded hover:bg-muted"><Edit2 className="h-4 w-4 text-muted-foreground" /></button>
              <button onClick={() => deleteAnn(ann.id)} className="p-1.5 rounded hover:bg-muted"><Trash2 className="h-4 w-4 text-destructive" /></button>
            </div>
          </div>
        ))}
        {initialAnnouncements.length === 0 && <p className="text-sm text-muted-foreground text-center py-8">No announcements yet.</p>}
      </div>
    </div>
  );
}

// ─── PLATFORM STATS TAB ───
function PlatformStatsTab({ profiles, entitlements, products }) {
  const totalUsers = profiles.length;
  const newThisWeek = profiles.filter(p => new Date(p.created_at) > subDays(new Date(), 7)).length;
  const activePaid = entitlements.filter(e => e.status === 'active' || e.status === 'admin_granted').length;
  const uniquePaidUsers = new Set(entitlements.filter(e => e.status === 'active' || e.status === 'admin_granted').map(e => e.user_id)).size;

  const mrr = useMemo(() => {
    return entitlements
      .filter(e => e.status === 'active' || e.status === 'admin_granted')
      .reduce((sum, e) => {
        const p = products.find(pr => pr.id === e.product_id);
        return sum + (p?.price_monthly || 0);
      }, 0);
  }, [entitlements, products]);

  const arpu = uniquePaidUsers > 0 ? mrr / uniquePaidUsers : 0;

  // Weekly signup chart data
  const weeklyData = useMemo(() => {
    const weeks = [];
    for (let i = 11; i >= 0; i--) {
      const start = subDays(new Date(), (i + 1) * 7);
      const end = subDays(new Date(), i * 7);
      const count = profiles.filter(p => {
        const d = new Date(p.created_at);
        return d >= start && d < end;
      }).length;
      weeks.push({ week: format(end, 'MMM d'), users: count });
    }
    return weeks;
  }, [profiles]);

  // Revenue by product chart
  const revenueByProduct = useMemo(() => {
    return products.map(p => {
      const active = entitlements.filter(e => e.product_id === p.id && (e.status === 'active' || e.status === 'admin_granted')).length;
      return { name: p.name, revenue: active * (p.price_monthly || 0), users: active };
    });
  }, [entitlements, products]);

  return (
    <div className="space-y-6">
      {/* Key metrics */}
      <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
        <MetricCard label="Total Users" value={totalUsers} />
        <MetricCard label="New This Week" value={newThisWeek} />
        <MetricCard label="Paid Users" value={uniquePaidUsers} />
        <MetricCard label="MRR" value={`$${mrr.toFixed(2)}`} />
      </div>
      <div className="grid gap-4 grid-cols-2 md:grid-cols-3">
        <MetricCard label="Active Subscriptions" value={activePaid} />
        <MetricCard label="Avg Revenue/User" value={`$${arpu.toFixed(2)}`} />
        <MetricCard label="Churn Rate" value="—" subtitle="Coming soon" />
      </div>

      {/* Charts */}
      <div className="grid gap-6 md:grid-cols-2">
        <div className="border border-border rounded-lg p-4 bg-card">
          <h3 className="font-medium text-foreground mb-4 text-sm">User Growth (Weekly)</h3>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={weeklyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="week" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
              <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
              <RechartsTooltip />
              <Line type="monotone" dataKey="users" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <div className="border border-border rounded-lg p-4 bg-card">
          <h3 className="font-medium text-foreground mb-4 text-sm">Revenue by Product</h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={revenueByProduct}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
              <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
              <RechartsTooltip />
              <Bar dataKey="revenue" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Per-product breakdown */}
      <div className="border border-border rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Product</th>
              <th className="text-center px-4 py-3 font-medium text-muted-foreground">Users</th>
              <th className="text-right px-4 py-3 font-medium text-muted-foreground">Revenue/mo</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {revenueByProduct.map(r => (
              <tr key={r.name} className="hover:bg-muted/30">
                <td className="px-4 py-3 font-medium text-foreground">{r.name}</td>
                <td className="px-4 py-3 text-center text-muted-foreground">{r.users}</td>
                <td className="px-4 py-3 text-right font-medium text-foreground">${r.revenue.toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function MetricCard({ label, value, subtitle }) {
  return (
    <div className="p-4 rounded-lg border border-border bg-card">
      <div className="text-xs text-muted-foreground font-medium">{label}</div>
      <div className="text-2xl font-bold text-foreground mt-1">{value}</div>
      {subtitle && <div className="text-xs text-muted-foreground mt-0.5">{subtitle}</div>}
    </div>
  );
}

// ─── REVENUE TAB ───
function RevenueTab({ entitlements, products, adminActions }) {
  const mrr = entitlements
    .filter(e => e.status === 'active' || e.status === 'admin_granted')
    .reduce((sum, e) => {
      const p = products.find(pr => pr.id === e.product_id);
      return sum + (p?.price_monthly || 0);
    }, 0);

  return (
    <div className="space-y-6">
      <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
        <MetricCard label="MRR" value={`$${mrr.toFixed(2)}`} />
        <MetricCard label="ARR" value={`$${(mrr * 12).toFixed(2)}`} />
        <MetricCard label="Churn" value="—" subtitle="Connect Stripe" />
        <MetricCard label="Renewals This Week" value="—" subtitle="Connect Stripe" />
      </div>

      {/* Recent admin actions as proxy transactions */}
      <div>
        <h3 className="font-medium text-foreground mb-3 text-sm">Recent Admin Actions</h3>
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Action</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Product</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {adminActions.slice(0, 20).map(a => (
                <tr key={a.id} className="hover:bg-muted/30">
                  <td className="px-4 py-3 text-foreground">{a.action_type}</td>
                  <td className="px-4 py-3 text-muted-foreground">{a.product_id || '—'}</td>
                  <td className="px-4 py-3 text-muted-foreground">{formatDistanceToNow(new Date(a.created_at), { addSuffix: true })}</td>
                </tr>
              ))}
              {adminActions.length === 0 && (
                <tr><td colSpan="3" className="px-4 py-8 text-center text-muted-foreground">No actions recorded yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="p-6 rounded-lg border border-dashed border-border bg-muted/30 text-center">
        <DollarSign className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
        <p className="text-sm font-medium text-foreground">Stripe Integration</p>
        <p className="text-xs text-muted-foreground mt-1">Connect Stripe to see real-time payment data, failed charges, and upcoming renewals.</p>
      </div>
    </div>
  );
}
