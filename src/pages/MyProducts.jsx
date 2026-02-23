import React, { useMemo } from 'react';
import Layout from '@/components/Layout';
import { useEntitlementContext } from '@/context/EntitlementContext';
import { useProperties } from '@/hooks/useProperties';
import { Link } from 'react-router-dom';
import {
  ArrowRight, CheckCircle, Clock, Lock, AlertTriangle, Shield,
  XCircle, Plus, Lightbulb, Check, Sparkles
} from 'lucide-react';
import { format } from 'date-fns';

const PRODUCT_FEATURES = {
  ai_concierge: ['AI-powered SMS guest concierge', 'Email management', 'Knowledge base editor', 'FAQ auto-responses'],
  snappro: ['AI photo enhancement', 'Batch processing', 'Listing-ready exports'],
  analytics: ['Property performance dashboard', 'Smart insights', 'Response quality tracking'],
  academy: ['Expert video training', 'Step-by-step guides', 'New content monthly'],
  full_suite: ['All 4 products included', 'Priority support', 'Bundle savings', 'Early access to new features'],
};

const PRODUCT_TAGLINES = {
  ai_concierge: 'Smart guest messaging & AI responses',
  snappro: 'Professional listing photo optimization',
  analytics: 'Data-driven property insights',
  academy: 'Expert training for hosts',
  full_suite: 'Everything you need in one plan',
};

const PRODUCT_LINKS = {
  ai_concierge: '/messages',
  snappro: '/snappro',
  analytics: '/analytics',
  academy: '/academy',
  full_suite: '/',
};

function TrialProgressBar({ percentage }) {
  return (
    <div className="w-full bg-muted rounded-full h-2 mt-2">
      <div
        className="h-2 rounded-full bg-amber-500 transition-all"
        style={{ width: `${Math.min(100, Math.max(0, percentage))}%` }}
      />
    </div>
  );
}

function StatusBadgeInline({ status }) {
  const config = {
    active: { label: 'Active', className: 'bg-emerald-100 text-emerald-700', icon: <CheckCircle className="h-3 w-3" /> },
    trial: { label: 'Trial', className: 'bg-amber-100 text-amber-700', icon: <Clock className="h-3 w-3" /> },
    expired: { label: 'Expired', className: 'bg-red-100 text-red-700', icon: <AlertTriangle className="h-3 w-3" /> },
    admin_granted: { label: 'Admin Access', className: 'bg-blue-100 text-blue-700', icon: <Shield className="h-3 w-3" /> },
    cancelled: { label: 'Cancelled', className: 'bg-muted text-muted-foreground', icon: <XCircle className="h-3 w-3" /> },
    locked: { label: 'Locked', className: 'bg-muted text-muted-foreground', icon: <Lock className="h-3 w-3" /> },
  };
  const c = config[status] || config.locked;
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${c.className}`}>
      {c.icon} {c.label}
    </span>
  );
}

function SubscriptionCard({ product, access, properties }) {
  const ent = access.entitlement;
  const isConcierge = product.id === 'ai_concierge';

  const borderColor = {
    active: 'border-l-emerald-500',
    admin_granted: 'border-l-blue-500',
    trial: 'border-l-amber-500',
    expired: 'border-l-red-500',
    cancelled: 'border-l-muted-foreground',
  }[access.status] || 'border-l-muted-foreground';

  // Trial progress
  let trialProgress = null;
  let trialDetail = null;
  if (access.status === 'trial' && access.trialInfo) {
    const ti = access.trialInfo;
    if (ti.usageLimit != null) {
      const pct = (ti.usageCount / ti.usageLimit) * 100;
      trialDetail = `${ti.usageCount} of ${ti.usageLimit} free uses remaining`;
      trialProgress = <TrialProgressBar percentage={pct} />;
    } else if (ti.endsAt) {
      const totalDays = ent.trial_started_at
        ? Math.ceil((new Date(ti.endsAt) - new Date(ent.trial_started_at)) / (1000 * 60 * 60 * 24))
        : 14;
      const elapsed = totalDays - (ti.daysRemaining || 0);
      const pct = totalDays > 0 ? (elapsed / totalDays) * 100 : 0;
      trialDetail = `Trial ends ${format(new Date(ti.endsAt), 'MMM d')} — ${ti.daysRemaining} days left`;
      trialProgress = <TrialProgressBar percentage={pct} />;
    }
  }

  return (
    <div className={`bg-card border border-border rounded-xl border-l-4 ${borderColor} overflow-hidden`}>
      <div className="p-5 grid grid-cols-1 md:grid-cols-[1fr_1.5fr_1fr] gap-4">
        {/* Left: Icon + Name */}
        <div className="flex items-start gap-3">
          <span className="text-4xl">{product.icon}</span>
          <div>
            <h3 className="font-semibold text-foreground text-lg">{product.name}</h3>
            <p className="text-xs text-muted-foreground">{PRODUCT_TAGLINES[product.id] || product.description}</p>
          </div>
        </div>

        {/* Center: Status + Details */}
        <div className="space-y-2">
          <StatusBadgeInline status={access.status} />

          {access.status === 'active' && (
            <p className="text-sm text-muted-foreground">
              Renews monthly — ${product.price_monthly || '—'}/mo
            </p>
          )}

          {access.status === 'admin_granted' && (
            <p className="text-sm text-muted-foreground">
              Access granted by admin
              {ent?.access_ends_at && ` • Expires ${format(new Date(ent.access_ends_at), 'MMM d, yyyy')}`}
            </p>
          )}

          {access.status === 'trial' && trialDetail && (
            <>
              <p className="text-sm text-amber-700">{trialDetail}</p>
              {trialProgress}
            </>
          )}

          {access.status === 'expired' && (
            <p className="text-sm text-red-600">{access.reason || 'Trial expired'}</p>
          )}

          {access.status === 'cancelled' && (
            <p className="text-sm text-muted-foreground">Subscription cancelled</p>
          )}

          {/* CTAs */}
          <div className="flex items-center gap-3 pt-1">
            {(access.status === 'active' || access.status === 'admin_granted') && (
              <Link to={PRODUCT_LINKS[product.id] || '/'} className="text-sm font-medium text-primary hover:underline inline-flex items-center gap-1">
                Go to {product.name} <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            )}
            {access.status === 'trial' && (
              <Link to="/billing" className="text-sm font-semibold text-amber-700 bg-amber-100 hover:bg-amber-200 px-3 py-1 rounded-lg transition-colors">
                Upgrade Now
              </Link>
            )}
            {(access.status === 'expired' || access.status === 'cancelled') && (
              <Link to="/billing" className="text-sm font-semibold text-red-600 hover:underline inline-flex items-center gap-1">
                Reactivate <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            )}
          </div>
        </div>

        {/* Right: Features */}
        <div className="hidden md:block">
          <p className="text-xs font-medium text-muted-foreground mb-1.5 uppercase tracking-wide">Includes</p>
          <ul className="space-y-1">
            {(PRODUCT_FEATURES[product.id] || []).map((f, i) => (
              <li key={i} className="flex items-start gap-1.5 text-xs text-foreground">
                <Check className="h-3 w-3 text-emerald-500 mt-0.5 shrink-0" />
                {f}
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* AI Concierge: property expansion */}
      {isConcierge && access.hasAccess && properties.length > 0 && (
        <div className="border-t border-border bg-muted/30 px-5 py-3 flex items-center gap-4 flex-wrap">
          <span className="text-sm text-muted-foreground">{properties.length} {properties.length === 1 ? 'property' : 'properties'} active</span>
          <div className="flex items-center gap-2 flex-wrap">
            {properties.slice(0, 5).map(p => (
              <span key={p.id} className="text-xs bg-card border border-border rounded px-2 py-0.5">{p.property_name}</span>
            ))}
            {properties.length > 5 && <span className="text-xs text-muted-foreground">+{properties.length - 5} more</span>}
          </div>
          <Link to="/add-property" className="ml-auto text-xs font-medium text-primary hover:underline inline-flex items-center gap-1">
            <Plus className="h-3 w-3" /> Add Property
          </Link>
        </div>
      )}

      {/* Bottom actions */}
      {(access.status === 'active' || access.status === 'trial') && (
        <div className="border-t border-border px-5 py-2.5 flex items-center gap-4">
          <Link to="/billing" className="text-xs text-muted-foreground hover:text-foreground transition-colors">Manage Billing</Link>
          <button
            onClick={() => { if (window.confirm(`Cancel ${product.name} subscription? This will take effect at the end of your billing period.`)) { /* placeholder */ } }}
            className="text-xs text-muted-foreground hover:text-red-600 transition-colors"
          >
            Cancel
          </button>
        </div>
      )}
    </div>
  );
}

function AvailableProductCard({ product }) {
  const features = PRODUCT_FEATURES[product.id] || [];
  const trialLabel = product.trial_type === 'usage'
    ? `Get ${product.trial_limit || 'free'} free uses`
    : `Start free trial`;

  return (
    <div className="bg-card border border-border rounded-xl p-5 flex flex-col">
      <div className="flex items-center gap-2.5 mb-2">
        <span className="text-3xl">{product.icon}</span>
        <div>
          <h3 className="font-semibold text-foreground">{product.name}</h3>
          <p className="text-xs text-muted-foreground">{PRODUCT_TAGLINES[product.id] || product.description}</p>
        </div>
      </div>
      <p className="text-lg font-bold text-foreground mb-3">${product.price_monthly || '—'}<span className="text-sm font-normal text-muted-foreground">/mo</span></p>
      <ul className="space-y-1.5 mb-4 flex-1">
        {features.map((f, i) => (
          <li key={i} className="flex items-start gap-1.5 text-sm text-muted-foreground">
            <Check className="h-3.5 w-3.5 text-emerald-500 mt-0.5 shrink-0" /> {f}
          </li>
        ))}
      </ul>
      <Link
        to="/billing"
        className="w-full text-center text-sm font-semibold bg-amber-500 hover:bg-amber-600 text-white py-2 rounded-lg transition-colors"
      >
        {trialLabel}
      </Link>
    </div>
  );
}

export default function MyProducts() {
  const { entitlements, hasAccess, products, isLoading } = useEntitlementContext();
  const { properties } = useProperties();

  // Build per-product access map
  const productAccess = useMemo(() => {
    const map = {};
    for (const p of products) {
      map[p.id] = hasAccess(p.id);
    }
    return map;
  }, [products, hasAccess]);

  // Split into subscribed (any entitlement exists) vs available
  const subscribedProducts = useMemo(() => {
    const entitledIds = new Set(entitlements.map(e => e.product_id));
    return products.filter(p => entitledIds.has(p.id));
  }, [products, entitlements]);

  const availableProducts = useMemo(() => {
    const entitledIds = new Set(entitlements.map(e => e.product_id));
    return products.filter(p => !entitledIds.has(p.id));
  }, [products, entitlements]);

  // Bundle savings calculation
  const bundleBanner = useMemo(() => {
    const fullSuiteAccess = productAccess.full_suite;
    if (fullSuiteAccess?.hasAccess) return null;

    const activeIndividual = products.filter(
      p => p.id !== 'full_suite' && productAccess[p.id]?.hasAccess
    );
    if (activeIndividual.length < 2) return null;

    const currentSpend = activeIndividual.reduce((sum, p) => sum + (p.price_monthly || 0), 0);
    const bundleProduct = products.find(p => p.id === 'full_suite');
    const bundlePrice = bundleProduct?.price_monthly || 59.99;
    const savings = currentSpend - bundlePrice;
    if (savings <= 0) return null;

    return { currentSpend, bundlePrice, savings };
  }, [products, productAccess]);

  if (isLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[40vh]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-5xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">My Products</h1>
            <p className="text-sm text-muted-foreground">Manage your subscriptions and access</p>
          </div>
          {availableProducts.length > 0 && (
            <a href="#available" className="text-sm font-medium text-primary hover:underline inline-flex items-center gap-1">
              Browse all products <ArrowRight className="h-3.5 w-3.5" />
            </a>
          )}
        </div>

        {/* Section 1: Current Subscriptions */}
        <section>
          <h2 className="text-lg font-semibold text-foreground mb-3">Current Subscriptions</h2>
          {subscribedProducts.length === 0 ? (
            <div className="bg-card border border-border rounded-xl p-8 text-center">
              <Sparkles className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
              <p className="text-foreground font-medium mb-1">No subscriptions yet</p>
              <p className="text-sm text-muted-foreground">Check out our products below to get started!</p>
            </div>
          ) : (
            <div className="space-y-4">
              {subscribedProducts.map(p => (
                <SubscriptionCard
                  key={p.id}
                  product={p}
                  access={productAccess[p.id] || { hasAccess: false, status: 'locked' }}
                  properties={properties}
                />
              ))}
            </div>
          )}
        </section>

        {/* Section 3: Bundle Banner (placed before available products for visibility) */}
        {bundleBanner && (
          <section className="bg-gradient-to-r from-amber-50 to-yellow-50 border border-amber-200 rounded-xl p-5 flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <div className="flex items-center gap-2">
              <Lightbulb className="h-6 w-6 text-amber-600" />
              <div>
                <p className="font-semibold text-foreground">Save with the Full Suite</p>
                <p className="text-sm text-muted-foreground">
                  You're paying ${bundleBanner.currentSpend.toFixed(2)}/mo — save <span className="font-bold text-amber-700">${bundleBanner.savings.toFixed(2)}/mo</span> with the bundle at ${bundleBanner.bundlePrice.toFixed(2)}/mo
                </p>
              </div>
            </div>
            <Link
              to="/billing"
              className="sm:ml-auto shrink-0 text-sm font-semibold bg-amber-500 hover:bg-amber-600 text-white px-4 py-2 rounded-lg transition-colors inline-flex items-center gap-1"
            >
              Switch to Full Suite <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </section>
        )}

        {/* Section 2: Available Products */}
        {availableProducts.length > 0 && (
          <section id="available">
            <h2 className="text-lg font-semibold text-foreground mb-3">Available Products</h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {availableProducts.map(p => (
                <AvailableProductCard key={p.id} product={p} />
              ))}
            </div>
          </section>
        )}
      </div>
    </Layout>
  );
}
