import { useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useEntitlementContext } from '@/context/EntitlementContext';
import { useUpgradeModal } from '@/context/UpgradeModalContext';
import { entitlementService } from '@/services/entitlementService';
import { useQueryClient } from '@tanstack/react-query';

const TRIAL_FEATURES = {
  ai_concierge: ['basic_responses', 'faq', 'property_info'],
  snappro: ['single_photo', 'basic_enhance'],
  analytics: ['dashboard_view', 'basic_stats'],
  academy: ['intro_videos'],
};

export function useProductAccess(productId) {
  const { currentUser } = useAuth();
  const { hasAccess: checkAccess, products, refreshEntitlements } = useEntitlementContext();
  const { showUpgradeModal } = useUpgradeModal();
  const queryClient = useQueryClient();

  const access = checkAccess(productId);
  const product = products.find(p => p.id === productId);
  const entitlement = access.entitlement || null;
  const trialInfo = access.trialInfo || {};

  const status = access.hasAccess
    ? access.status
    : access.status || 'locked';

  const trialUsesRemaining = trialInfo.usageLimit != null
    ? Math.max(0, trialInfo.usageLimit - (trialInfo.usageCount || 0))
    : null;

  const trialDaysRemaining = trialInfo.daysRemaining ?? null;

  const canUseFeature = useCallback((featureKey) => {
    if (status === 'active' || status === 'admin_granted') return true;
    if (status === 'trial') {
      const allowed = TRIAL_FEATURES[productId] || [];
      return allowed.includes(featureKey);
    }
    return false;
  }, [status, productId]);

  const triggerUpgrade = useCallback(() => {
    showUpgradeModal(productId);
  }, [showUpgradeModal, productId]);

  const incrementUsage = useCallback(async () => {
    if (!currentUser?.id) return { allowed: false };

    const result = await entitlementService.incrementUsage(currentUser.id, productId);

    if (!result.allowed) {
      triggerUpgrade();
      queryClient.invalidateQueries({ queryKey: ['entitlements'] });
      return { allowed: false };
    }

    queryClient.invalidateQueries({ queryKey: ['entitlements'] });
    return { allowed: true };
  }, [currentUser?.id, productId, triggerUpgrade, queryClient]);

  return {
    hasAccess: access.hasAccess,
    status,
    trialUsesRemaining,
    trialDaysRemaining,
    usageCount: trialInfo.usageCount || 0,
    canUseFeature,
    triggerUpgrade,
    incrementUsage,
    entitlement,
    product,
  };
}
