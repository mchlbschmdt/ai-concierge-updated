import React, { useState } from 'react';
import { useProductAccess } from '@/hooks/useProductAccess';
import { Lock, Clock, Zap, AlertTriangle, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function ProductGate({ productId, featureKey, children }) {
  const {
    hasAccess,
    status,
    trialUsesRemaining,
    trialDaysRemaining,
    usageCount,
    entitlement,
    product,
    triggerUpgrade,
  } = useProductAccess(productId);

  const [bannerDismissed, setBannerDismissed] = useState(false);

  // Active or admin granted — render children normally
  if (hasAccess && (status === 'active' || status === 'admin_granted')) {
    return <>{children}</>;
  }

  // Trial (usage-based) — render children with usage banner
  if (hasAccess && status === 'trial' && trialUsesRemaining != null) {
    const limit = entitlement?.trial_usage_limit || 0;
    const pct = limit > 0 ? Math.min(100, (usageCount / limit) * 100) : 0;

    return (
      <div className="relative">
        {!bannerDismissed && (
          <div className="sticky top-0 z-20 bg-warning/10 border-b border-warning/20 px-4 py-3 flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <Zap className="w-4 h-4 text-warning shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground">
                  ⏰ {trialUsesRemaining} free use{trialUsesRemaining !== 1 ? 's' : ''} remaining
                </p>
                <div className="w-full max-w-xs h-1.5 bg-muted rounded-full mt-1.5 overflow-hidden">
                  <div
                    className="h-full bg-warning rounded-full transition-all"
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button size="sm" variant="default" onClick={triggerUpgrade} className="text-xs">
                Upgrade to unlock unlimited
              </Button>
              <button onClick={() => setBannerDismissed(true)} className="text-muted-foreground hover:text-foreground text-xs">✕</button>
            </div>
          </div>
        )}
        {children}
      </div>
    );
  }

  // Trial (days-based) — render children with days banner
  if (hasAccess && status === 'trial' && trialDaysRemaining != null) {
    return (
      <div className="relative">
        {!bannerDismissed && (
          <div className="sticky top-0 z-20 bg-warning/10 border-b border-warning/20 px-4 py-3 flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-warning shrink-0" />
              <p className="text-sm font-medium text-foreground">
                🕐 Your trial ends in {trialDaysRemaining} day{trialDaysRemaining !== 1 ? 's' : ''}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button size="sm" variant="default" onClick={triggerUpgrade} className="text-xs">
                Upgrade now
              </Button>
              <button onClick={() => setBannerDismissed(true)} className="text-muted-foreground hover:text-foreground text-xs">✕</button>
            </div>
          </div>
        )}
        {children}
      </div>
    );
  }

  // Trial with no specific limit info — just render
  if (hasAccess && status === 'trial') {
    return <>{children}</>;
  }

  // Expired state
  if (status === 'expired') {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="max-w-md w-full bg-card border border-border rounded-xl p-8 text-center shadow-sm">
          <div className="w-16 h-16 rounded-2xl bg-destructive/10 flex items-center justify-center mx-auto mb-4">
            <AlertTriangle className="w-8 h-8 text-destructive" />
          </div>
          <h2 className="text-xl font-bold text-foreground mb-2">
            Your access to {product?.name || 'this feature'} has ended
          </h2>
          <p className="text-sm text-muted-foreground mb-6">
            Reactivate to continue using all features.
          </p>
          <Button onClick={triggerUpgrade} variant="destructive" className="w-full">
            Reactivate for ${product?.price_monthly || '—'}/mo
          </Button>
          <p className="text-xs text-muted-foreground mt-3">
            Need help? Contact your administrator.
          </p>
        </div>
      </div>
    );
  }

  // Locked state — blurred overlay
  return (
    <div className="relative min-h-[60vh]">
      {/* Blurred placeholder */}
      <div className="pointer-events-none opacity-20 blur-sm select-none" aria-hidden="true">
        {children}
      </div>

      {/* Centered lock card */}
      <div className="absolute inset-0 flex items-center justify-center z-10">
        <div className="max-w-md w-full bg-card border border-border rounded-xl p-8 text-center shadow-lg mx-4">
          <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-4">
            <span className="text-3xl">{product?.icon || '🔒'}</span>
          </div>
          <h2 className="text-xl font-bold text-foreground mb-2">
            Unlock {product?.name || 'this feature'}
          </h2>
          <p className="text-sm text-muted-foreground mb-4">
            {product?.description || 'This feature requires a subscription.'}
          </p>

          {product?.trial_type && (
            <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-warning/10 text-warning text-xs font-semibold mb-4">
              🎁 {product.trial_type === 'usage'
                ? `${product.trial_limit} free uses available`
                : `${product.trial_limit}-day free trial`}
            </span>
          )}

          <div className="space-y-2 mt-4">
            <Button onClick={triggerUpgrade} className="w-full">
              <Sparkles className="w-4 h-4 mr-2" />
              Start Free Trial
            </Button>
            {product?.price_monthly && (
              <p className="text-xs text-muted-foreground">
                Then ${product.price_monthly}/mo · Cancel anytime
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
