import React, { useState, useEffect } from 'react';
import Layout from '@/components/Layout';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { entitlementService } from '@/services/entitlementService';
import { supabase } from '@/integrations/supabase/client';
import StatusBadge from '@/components/StatusBadge';
import { Shield, Search, Plus, X, Users } from 'lucide-react';

export default function AdminEntitlements() {
  const { currentUser } = useAuth();
  const { showToast } = useToast();
  const [entitlements, setEntitlements] = useState([]);
  const [products, setProducts] = useState([]);
  const [profiles, setProfiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterProduct, setFilterProduct] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [showGrantModal, setShowGrantModal] = useState(false);
  const [grantForm, setGrantForm] = useState({ userId: '', productId: '', note: '' });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [ents, prods, { data: profs }] = await Promise.all([
        entitlementService.getAllEntitlements(),
        entitlementService.getAllProducts(),
        supabase.from('profiles').select('id, email, full_name'),
      ]);
      setEntitlements(ents);
      setProducts(prods);
      setProfiles(profs || []);
    } catch (error) {
      console.error('Error:', error);
      showToast('Failed to load entitlements', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleGrant = async () => {
    try {
      await entitlementService.grantAccess(currentUser.id, grantForm.userId, grantForm.productId, { note: grantForm.note });
      showToast('Access granted successfully', 'success');
      setShowGrantModal(false);
      setGrantForm({ userId: '', productId: '', note: '' });
      fetchData();
    } catch (error) {
      showToast('Failed to grant access: ' + error.message, 'error');
    }
  };

  const handleRevoke = async (userId, productId) => {
    if (!confirm('Revoke access for this user?')) return;
    try {
      await entitlementService.revokeAccess(currentUser.id, userId, productId);
      showToast('Access revoked', 'success');
      fetchData();
    } catch (error) {
      showToast('Failed to revoke access', 'error');
    }
  };

  const getProfileEmail = (userId) => profiles.find(p => p.id === userId)?.email || userId;

  const filtered = entitlements.filter(e => {
    const email = getProfileEmail(e.user_id);
    if (searchTerm && !email.toLowerCase().includes(searchTerm.toLowerCase())) return false;
    if (filterProduct && e.product_id !== filterProduct) return false;
    if (filterStatus && e.status !== filterStatus) return false;
    return true;
  });

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <Shield className="h-6 w-6 text-primary" /> Product Entitlements
            </h1>
            <p className="text-sm text-muted-foreground mt-1">Manage user product access and trials</p>
          </div>
          <button
            onClick={() => setShowGrantModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90"
          >
            <Plus className="h-4 w-4" /> Grant Access
          </button>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search by email..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 border border-border rounded-lg text-sm bg-card"
            />
          </div>
          <select value={filterProduct} onChange={e => setFilterProduct(e.target.value)} className="px-3 py-2 border border-border rounded-lg text-sm bg-card">
            <option value="">All Products</option>
            {products.map(p => <option key={p.id} value={p.id}>{p.icon} {p.name}</option>)}
          </select>
          <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="px-3 py-2 border border-border rounded-lg text-sm bg-card">
            <option value="">All Statuses</option>
            <option value="active">Active</option>
            <option value="trial">Trial</option>
            <option value="admin_granted">Admin Granted</option>
            <option value="expired">Expired</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>

        {/* Table */}
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">User</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Product</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Status</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Usage</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Source</th>
                  <th className="text-right px-4 py-3 font-medium text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.map(ent => (
                  <tr key={ent.id} className="hover:bg-muted/30">
                    <td className="px-4 py-3 text-foreground">{getProfileEmail(ent.user_id)}</td>
                    <td className="px-4 py-3">
                      <span className="flex items-center gap-1.5">
                        {ent.products?.icon} {ent.products?.name}
                      </span>
                    </td>
                    <td className="px-4 py-3"><StatusBadge status={ent.status} compact /></td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {ent.trial_usage_limit ? `${ent.trial_usage_count || 0}/${ent.trial_usage_limit}` : '—'}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground capitalize">{ent.source?.replace('_', ' ')}</td>
                    <td className="px-4 py-3 text-right">
                      {(ent.status === 'active' || ent.status === 'trial' || ent.status === 'admin_granted') && (
                        <button onClick={() => handleRevoke(ent.user_id, ent.product_id)} className="text-xs text-error hover:underline">
                          Revoke
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filtered.length === 0 && (
              <div className="text-center py-12 text-muted-foreground">
                <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
                No entitlements found
              </div>
            )}
          </div>
        </div>

        {/* Grant Modal */}
        {showGrantModal && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-card rounded-xl border border-border p-6 w-full max-w-md">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-foreground">Grant Product Access</h3>
                <button onClick={() => setShowGrantModal(false)}><X className="h-5 w-5 text-muted-foreground" /></button>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">User</label>
                  <select value={grantForm.userId} onChange={e => setGrantForm(f => ({ ...f, userId: e.target.value }))}
                    className="w-full mt-1 px-3 py-2 border border-border rounded-lg text-sm bg-card">
                    <option value="">Select user...</option>
                    {profiles.map(p => <option key={p.id} value={p.id}>{p.email}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Product</label>
                  <select value={grantForm.productId} onChange={e => setGrantForm(f => ({ ...f, productId: e.target.value }))}
                    className="w-full mt-1 px-3 py-2 border border-border rounded-lg text-sm bg-card">
                    <option value="">Select product...</option>
                    {products.map(p => <option key={p.id} value={p.id}>{p.icon} {p.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Note (optional)</label>
                  <input type="text" value={grantForm.note} onChange={e => setGrantForm(f => ({ ...f, note: e.target.value }))}
                    className="w-full mt-1 px-3 py-2 border border-border rounded-lg text-sm bg-card" placeholder="Reason for granting access" />
                </div>
                <button onClick={handleGrant} disabled={!grantForm.userId || !grantForm.productId}
                  className="w-full py-2.5 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 disabled:opacity-50">
                  Grant Access
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
