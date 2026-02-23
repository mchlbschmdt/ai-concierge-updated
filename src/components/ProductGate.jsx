import React from 'react';
import { useEntitlementContext } from '@/context/EntitlementContext';
import { Lock, Zap, Clock, BarChart3 } from 'lucide-react';

const STATUS_CONFIG = {
  locked: { bg: 'bg-muted', text: 'text-muted-foreground', label: 'Locked', icon: Lock },
  expired: { bg: 'bg-error/10', text: 'text-error', label: 'Expired', icon: Clock },
  trial: { bg: 'bg-warning/10', text: 'text-warning', label: 'Trial', icon: Zap },
};

export default function ProductGate({ productId, children }) {
  const { hasAccess, products } = useEntitlementContext();
  const access = hasAccess(productId);

  if (access.hasAccess) return <>{children}</>;

  const product = products.find(p => p.id === productId);
  const config = STATUS_CONFIG[access.status] || STATUS_CONFIG.locked;

  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="max-w-md w-full bg-card border border-border rounded-xl p-8 text-center shadow-sm">
        <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-4">
          <span className="text-3xl">{product?.icon || '🔒'}</span>
        </div>

        <h2 className="text-xl font-bold text-foreground mb-2">
          {product?.name || 'Feature Locked'}
        </h2>
        <p className="text-sm text-muted-foreground mb-4">
          {product?.description || 'This feature requires a subscription.'}
        </p>

        {/* Status badge */}
        <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium ${config.bg} ${config.text} mb-4`}>
          <config.icon className="h-3.5 w-3.5" />
          {access.status === 'expired' && access.reason ? access.reason : config.label}
        </div>

        {/* Trial info */}
        {access.entitlement?.trial_usage_limit && (
          <p className="text-xs text-muted-foreground mb-4">
            Used {access.entitlement.trial_usage_count || 0} of {access.entitlement.trial_usage_limit} free uses
          </p>
        )}

        {/* Price */}
        {product?.price_monthly && (
          <div className="mb-6">
            <span className="text-2xl font-bold text-foreground">${product.price_monthly}</span>
            <span className="text-sm text-muted-foreground">/mo</span>
          </div>
        )}

        <button
          className="w-full py-2.5 px-4 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors"
          onClick={() => alert('Stripe billing coming soon! Contact your admin for access.')}
        >
          Upgrade to {product?.name || 'Pro'}
        </button>

        <p className="text-xs text-muted-foreground mt-3">
          Need access? Contact your administrator.
        </p>
      </div>
    </div>
  );
}
