import React, { useState, useEffect, useMemo } from 'react';
import Layout from '@/components/Layout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import {
  CreditCard, ChevronDown, ChevronUp, Download, AlertTriangle,
  Package, Crown, ArrowRight, Calendar, DollarSign, Shield,
  Sparkles, X, ExternalLink, Check
} from 'lucide-react';

const PRODUCT_NAMES = {
  ai_concierge: 'AI Concierge',
  snappro: 'SnapPro Photos',
  analytics: 'Analytics Suite',
  academy: 'Host Academy',
  full_suite: 'Full Suite',
};

const PRODUCT_PRICES = {
  ai_concierge: 29.99,
  snappro: 14.99,
  analytics: 19.99,
  academy: 19.99,
  full_suite: 69.99,
};

const STATUS_STYLES = {
  active: 'bg-success/10 text-success border-success/20',
  trial: 'bg-warning/10 text-warning border-warning/20',
  expired: 'bg-destructive/10 text-destructive border-destructive/20',
  admin_granted: 'bg-primary/10 text-primary border-primary/20',
};

const STATUS_LABELS = {
  active: 'Active',
  trial: 'Trial',
  expired: 'Expired',
  admin_granted: 'Granted',
};

// Mock billing history
const MOCK_INVOICES = [
  { id: 1, date: '2026-02-01', description: 'AI Concierge — Monthly', amount: 89.97, status: 'paid' },
  { id: 2, date: '2026-02-01', description: 'Analytics Suite — Monthly', amount: 19.99, status: 'paid' },
  { id: 3, date: '2026-01-01', description: 'AI Concierge — Monthly', amount: 59.98, status: 'paid' },
  { id: 4, date: '2026-01-01', description: 'Analytics Suite — Monthly', amount: 19.99, status: 'paid' },
  { id: 5, date: '2025-12-01', description: 'AI Concierge — Monthly', amount: 29.99, status: 'paid' },
];

function CancelModal({ product, onClose, onConfirm }) {
  const [step, setStep] = useState(1);
  const [reason, setReason] = useState('');

  const benefits = {
    ai_concierge: ['AI-powered guest messaging', 'Property knowledge base', '24/7 automated responses'],
    snappro: ['Photo enhancement AI', 'Listing optimization', 'Unlimited photo library'],
    analytics: ['Performance insights', 'Revenue tracking', 'Data history'],
    academy: ['Expert training videos', 'Progress tracking', 'Certificates'],
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-card border border-border rounded-2xl max-w-md w-full p-6 relative animate-scale-in">
        <button onClick={onClose} className="absolute top-4 right-4 text-muted-foreground hover:text-foreground">
          <X className="h-5 w-5" />
        </button>

        {step === 1 && (
          <>
            <div className="w-12 h-12 rounded-xl bg-destructive/10 flex items-center justify-center mb-4">
              <AlertTriangle className="h-6 w-6 text-destructive" />
            </div>
            <h3 className="text-lg font-bold text-foreground mb-2">Cancel {PRODUCT_NAMES[product]}?</h3>
            <p className="text-sm text-muted-foreground mb-4">You'll lose access to these features:</p>
            <ul className="space-y-2 mb-6">
              {(benefits[product] || []).map((b, i) => (
                <li key={i} className="flex items-center gap-2 text-sm text-foreground">
                  <X className="h-4 w-4 text-destructive shrink-0" />
                  {b}
                </li>
              ))}
            </ul>
            <p className="text-xs text-muted-foreground mb-4 bg-muted/50 p-3 rounded-lg">
              <Calendar className="h-3.5 w-3.5 inline mr-1" />
              Access continues until end of current billing period.
            </p>
            <div className="flex gap-2">
              <Button variant="outline" onClick={onClose} className="flex-1">Keep Subscription</Button>
              <Button variant="destructive" onClick={() => setStep(2)} className="flex-1">Continue</Button>
            </div>
          </>
        )}

        {step === 2 && (
          <>
            <h3 className="text-lg font-bold text-foreground mb-2">Help us improve</h3>
            <p className="text-sm text-muted-foreground mb-4">Why are you cancelling? (optional)</p>
            <div className="space-y-2 mb-4">
              {['Too expensive', 'Not using it enough', 'Missing features', 'Found alternative', 'Other'].map(r => (
                <button
                  key={r}
                  onClick={() => setReason(r)}
                  className={`w-full text-left px-4 py-2.5 rounded-lg text-sm border transition-colors ${
                    reason === r
                      ? 'border-primary bg-primary/5 text-foreground'
                      : 'border-border text-muted-foreground hover:border-primary/30'
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setStep(1)} className="flex-1">Back</Button>
              <Button variant="destructive" onClick={() => onConfirm(reason)} className="flex-1">
                Cancel Subscription
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default function Billing() {
  const { currentUser } = useAuth();
  const [entitlements, setEntitlements] = useState([]);
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedConcierge, setExpandedConcierge] = useState(false);
  const [cancelProduct, setCancelProduct] = useState(null);

  useEffect(() => {
    if (currentUser?.id) fetchData();
  }, [currentUser?.id]);

  const fetchData = async () => {
    const [eRes, pRes] = await Promise.all([
      supabase.from('user_entitlements').select('*').eq('user_id', currentUser.id),
      supabase.from('properties').select('id, property_name, code').eq('user_id', currentUser.id),
    ]);
    setEntitlements(eRes.data || []);
    setProperties(pRes.data || []);
    setLoading(false);
  };

  const activeEntitlements = useMemo(() =>
    entitlements.filter(e => e.status === 'active' || e.status === 'trial' || e.status === 'admin_granted'),
    [entitlements]
  );

  const hasFullSuite = activeEntitlements.some(e => e.product_id === 'full_suite' && e.status === 'active');

  const monthlyTotal = useMemo(() => {
    if (hasFullSuite) return PRODUCT_PRICES.full_suite;
    let total = 0;
    activeEntitlements.forEach(e => {
      if (e.status !== 'active') return;
      if (e.product_id === 'ai_concierge') {
        total += properties.length * PRODUCT_PRICES.ai_concierge;
      } else if (PRODUCT_PRICES[e.product_id]) {
        total += PRODUCT_PRICES[e.product_id];
      }
    });
    return total;
  }, [activeEntitlements, properties, hasFullSuite]);

  const individualTotal = useMemo(() => {
    let total = properties.length * PRODUCT_PRICES.ai_concierge;
    total += PRODUCT_PRICES.snappro + PRODUCT_PRICES.analytics + PRODUCT_PRICES.academy;
    return total;
  }, [properties]);

  const fullSuiteSavings = individualTotal - PRODUCT_PRICES.full_suite;

  const handleCancelConfirm = async (reason) => {
    // Future: call Stripe cancellation endpoint
    console.log(`Cancel ${cancelProduct} with reason: ${reason}`);
    setCancelProduct(null);
  };

  if (loading) {
    return (
      <Layout>
        <div className="p-6 flex items-center justify-center min-h-[60vh]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="p-6 md:p-8 max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <CreditCard className="h-6 w-6 text-primary" /> Billing & Subscriptions
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Manage your plans, payments, and invoices</p>
        </div>

        {/* ===== SECTION 1: Current Plan Summary ===== */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-semibold text-foreground">Current Plans</h2>
              <div className="text-right">
                <p className="text-2xl font-bold text-foreground">${monthlyTotal.toFixed(2)}<span className="text-sm font-normal text-muted-foreground">/mo</span></p>
              </div>
            </div>

            {activeEntitlements.length === 0 ? (
              <div className="text-center py-8">
                <Package className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">No active subscriptions</p>
                <Button size="sm" className="mt-3" onClick={() => window.location.href = '/products'}>
                  Browse Products
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {activeEntitlements.map(ent => {
                  const isConcierge = ent.product_id === 'ai_concierge';
                  const price = isConcierge
                    ? properties.length * PRODUCT_PRICES.ai_concierge
                    : PRODUCT_PRICES[ent.product_id] || 0;
                  const nextBilling = ent.access_ends_at
                    ? new Date(ent.access_ends_at).toLocaleDateString()
                    : '—';

                  return (
                    <div key={ent.id} className="border border-border rounded-xl p-4">
                      <div className="flex items-center justify-between gap-4">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                            <Package className="h-5 w-5 text-primary" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-foreground">{PRODUCT_NAMES[ent.product_id] || ent.product_id}</p>
                            {isConcierge && ent.status === 'active' && (
                              <p className="text-xs text-muted-foreground">
                                {properties.length} {properties.length === 1 ? 'property' : 'properties'} × ${PRODUCT_PRICES.ai_concierge}/mo
                              </p>
                            )}
                            {ent.status === 'trial' && ent.trial_ends_at && (
                              <p className="text-xs text-warning">
                                Trial ends {new Date(ent.trial_ends_at).toLocaleDateString()}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-3 shrink-0">
                          <Badge className={`text-xs border ${STATUS_STYLES[ent.status] || STATUS_STYLES.active}`}>
                            {STATUS_LABELS[ent.status] || ent.status}
                          </Badge>
                          {ent.status === 'active' && (
                            <span className="text-sm font-semibold text-foreground">${price.toFixed(2)}</span>
                          )}
                          {ent.status === 'active' && (
                            <Button variant="outline" size="sm" className="text-xs">Manage</Button>
                          )}
                        </div>
                      </div>

                      {/* Expandable concierge property list */}
                      {isConcierge && properties.length > 0 && (
                        <>
                          <button
                            onClick={() => setExpandedConcierge(!expandedConcierge)}
                            className="flex items-center gap-1 mt-3 text-xs text-primary hover:text-primary/80 transition-colors"
                          >
                            {expandedConcierge ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                            {expandedConcierge ? 'Hide' : 'Show'} properties
                          </button>
                          {expandedConcierge && (
                            <div className="mt-2 space-y-1.5 pl-2 border-l-2 border-primary/20 ml-1">
                              {properties.map(p => (
                                <div key={p.id} className="flex items-center justify-between text-xs py-1">
                                  <span className="text-foreground">{p.property_name}</span>
                                  <span className="text-muted-foreground">${PRODUCT_PRICES.ai_concierge}/mo</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </>
                      )}

                      {/* Next billing date for active subs */}
                      {ent.status === 'active' && nextBilling !== '—' && (
                        <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
                          <Calendar className="h-3 w-3" /> Next billing: {nextBilling}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* Switch to annual CTA */}
            {monthlyTotal > 0 && (
              <div className="mt-4 flex items-center justify-between p-3 bg-primary/5 border border-primary/20 rounded-xl">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-primary" />
                  <span className="text-sm font-medium text-foreground">
                    Switch to Annual — Save ${(monthlyTotal * 12 * 0.17).toFixed(0)}/year
                  </span>
                </div>
                <Button size="sm" variant="default" className="text-xs">
                  Switch Plan <ArrowRight className="h-3 w-3 ml-1" />
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* ===== SECTION 2: Full Suite Upsell ===== */}
        {!hasFullSuite && activeEntitlements.some(e => e.status === 'active') && fullSuiteSavings > 0 && (
          <Card className="border-primary/30 bg-gradient-to-br from-primary/5 to-accent/5">
            <CardContent className="p-6">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                  <Crown className="h-6 w-6 text-primary" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-bold text-foreground">Upgrade to Full Suite</h3>
                  <p className="text-sm text-muted-foreground mt-1 mb-3">
                    Get all products for one price. Save <span className="font-semibold text-success">${fullSuiteSavings.toFixed(2)}/mo</span> compared to individual subscriptions.
                  </p>
                  <div className="grid grid-cols-2 gap-2 mb-4">
                    {Object.entries(PRODUCT_NAMES).filter(([k]) => k !== 'full_suite').map(([key, name]) => (
                      <div key={key} className="flex items-center gap-1.5 text-xs text-foreground">
                        <Check className="h-3.5 w-3.5 text-success" /> {name}
                      </div>
                    ))}
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xl font-bold text-foreground">${PRODUCT_PRICES.full_suite}<span className="text-sm font-normal text-muted-foreground">/mo</span></span>
                    <span className="text-sm text-muted-foreground line-through">${individualTotal.toFixed(2)}/mo</span>
                    <Button size="sm">Upgrade Now</Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* ===== SECTION 3: Payment Method ===== */}
        <Card>
          <CardContent className="p-6">
            <h2 className="text-lg font-semibold text-foreground mb-4">Payment Method</h2>
            <div className="flex items-center justify-between p-4 border border-border rounded-xl">
              <div className="flex items-center gap-3">
                <div className="w-12 h-8 rounded bg-muted flex items-center justify-center">
                  <CreditCard className="h-5 w-5 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">•••• •••• •••• 4242</p>
                  <p className="text-xs text-muted-foreground">Visa · Expires 12/2027</p>
                </div>
              </div>
              <Badge variant="secondary" className="text-xs">Default</Badge>
            </div>
            <div className="flex gap-2 mt-4">
              <Button variant="outline" size="sm" className="text-xs">
                <ExternalLink className="h-3 w-3 mr-1.5" /> Update Payment Method
              </Button>
              <Button variant="ghost" size="sm" className="text-xs">
                Add Backup Card
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* ===== SECTION 4: Billing History ===== */}
        <Card>
          <CardContent className="p-6">
            <h2 className="text-lg font-semibold text-foreground mb-4">Billing History</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-2 text-xs font-medium text-muted-foreground uppercase">Date</th>
                    <th className="text-left py-2 text-xs font-medium text-muted-foreground uppercase">Description</th>
                    <th className="text-right py-2 text-xs font-medium text-muted-foreground uppercase">Amount</th>
                    <th className="text-center py-2 text-xs font-medium text-muted-foreground uppercase">Status</th>
                    <th className="text-right py-2 text-xs font-medium text-muted-foreground uppercase"></th>
                  </tr>
                </thead>
                <tbody>
                  {MOCK_INVOICES.map(inv => (
                    <tr key={inv.id} className="border-b border-border/50 last:border-0">
                      <td className="py-3 text-foreground">{new Date(inv.date).toLocaleDateString()}</td>
                      <td className="py-3 text-foreground">{inv.description}</td>
                      <td className="py-3 text-right font-medium text-foreground">${inv.amount.toFixed(2)}</td>
                      <td className="py-3 text-center">
                        <Badge variant="secondary" className="text-xs capitalize">{inv.status}</Badge>
                      </td>
                      <td className="py-3 text-right">
                        <button className="text-muted-foreground hover:text-primary transition-colors" title="Download invoice">
                          <Download className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-xs text-muted-foreground mt-3">
              Full invoice history will be available once Stripe billing is connected.
            </p>
          </CardContent>
        </Card>

        {/* ===== SECTION 5: Danger Zone ===== */}
        {activeEntitlements.some(e => e.status === 'active') && (
          <Card className="border-destructive/20">
            <CardContent className="p-6">
              <div className="flex items-center gap-2 mb-4">
                <Shield className="h-5 w-5 text-destructive" />
                <h2 className="text-lg font-semibold text-foreground">Danger Zone</h2>
              </div>
              <p className="text-sm text-muted-foreground mb-4">
                Cancelling a subscription ends access at the end of your current billing period.
              </p>
              <div className="space-y-2">
                {activeEntitlements.filter(e => e.status === 'active').map(ent => (
                  <div key={ent.id} className="flex items-center justify-between p-3 border border-border rounded-lg">
                    <span className="text-sm font-medium text-foreground">{PRODUCT_NAMES[ent.product_id] || ent.product_id}</span>
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-xs text-destructive border-destructive/30 hover:bg-destructive/10"
                      onClick={() => setCancelProduct(ent.product_id)}
                    >
                      Cancel
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Cancel Modal */}
      {cancelProduct && (
        <CancelModal
          product={cancelProduct}
          onClose={() => setCancelProduct(null)}
          onConfirm={handleCancelConfirm}
        />
      )}
    </Layout>
  );
}
