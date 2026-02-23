import { supabase } from '@/integrations/supabase/client';

export const PRODUCT_IDS = {
  AI_CONCIERGE: 'ai_concierge',
  SNAPPRO: 'snappro',
  ANALYTICS: 'analytics',
  ACADEMY: 'academy',
  FULL_SUITE: 'full_suite',
};

export const entitlementService = {
  async getUserEntitlements(userId) {
    const { data, error } = await supabase
      .from('user_entitlements')
      .select('*, products(*)')
      .eq('user_id', userId);

    if (error) throw error;
    return data || [];
  },

  checkAccess(entitlements, productId) {
    // Full suite grants access to all individual products
    const relevant = entitlements.filter(
      e => e.product_id === productId || e.product_id === PRODUCT_IDS.FULL_SUITE
    );

    if (relevant.length === 0) {
      return { hasAccess: false, status: 'locked', reason: 'No subscription' };
    }

    for (const ent of relevant) {
      if (ent.status === 'active' || ent.status === 'admin_granted') {
        return { hasAccess: true, status: ent.status, entitlement: ent };
      }
    }

    // Check trial
    for (const ent of relevant) {
      if (ent.status === 'trial') {
        const now = new Date();
        const isExpiredByDate = ent.trial_ends_at && now > new Date(ent.trial_ends_at);
        const isOverLimit = ent.trial_usage_limit != null && ent.trial_usage_count >= ent.trial_usage_limit;

        if (!isExpiredByDate && !isOverLimit) {
          return {
            hasAccess: true,
            status: 'trial',
            entitlement: ent,
            trialInfo: {
              usageCount: ent.trial_usage_count || 0,
              usageLimit: ent.trial_usage_limit,
              endsAt: ent.trial_ends_at,
              daysRemaining: ent.trial_ends_at
                ? Math.max(0, Math.ceil((new Date(ent.trial_ends_at) - now) / (1000 * 60 * 60 * 24)))
                : null,
            },
          };
        }

        return {
          hasAccess: false,
          status: 'expired',
          reason: isExpiredByDate ? 'Trial expired' : 'Trial usage limit reached',
          entitlement: ent,
        };
      }
    }

    // Cancelled / expired statuses
    const latest = relevant[0];
    return { hasAccess: false, status: latest.status, reason: `Subscription ${latest.status}` };
  },

  async incrementUsage(userId, productId) {
    // If user has active/admin_granted access (direct or via full_suite), allow immediately
    const { data: paidEnt } = await supabase
      .from('user_entitlements')
      .select('status')
      .eq('user_id', userId)
      .in('product_id', [productId, PRODUCT_IDS.FULL_SUITE])
      .in('status', ['active', 'admin_granted'])
      .limit(1);

    if (paidEnt && paidEnt.length > 0) {
      return { allowed: true, count: 0, limit: null };
    }

    // Read current trial usage
    const { data: current, error: readErr } = await supabase
      .from('user_entitlements')
      .select('trial_usage_count, trial_usage_limit')
      .eq('user_id', userId)
      .eq('product_id', productId)
      .eq('status', 'trial')
      .single();

    if (readErr || !current) {
      return { allowed: false, count: 0, limit: 0, error: 'No trial entitlement found' };
    }

    const count = current.trial_usage_count || 0;
    const limit = current.trial_usage_limit;

    // If there's a limit and we've reached it, deny
    if (limit != null && count >= limit) {
      return { allowed: false, count, limit };
    }

    // Increment
    const { error: updateErr } = await supabase
      .from('user_entitlements')
      .update({ trial_usage_count: count + 1, updated_at: new Date().toISOString() })
      .eq('user_id', userId)
      .eq('product_id', productId);

    if (updateErr) {
      return { allowed: false, count, limit, error: updateErr.message };
    }

    return { allowed: true, count: count + 1, limit };
  },

  async grantAccess(adminId, userId, productId, options = {}) {
    const entitlementData = {
      user_id: userId,
      product_id: productId,
      status: options.status || 'admin_granted',
      source: 'admin_grant',
      granted_by: adminId,
      grant_note: options.note || null,
      access_starts_at: new Date().toISOString(),
      access_ends_at: options.expiresAt || null,
      trial_usage_count: 0,
      trial_usage_limit: options.usageLimit || null,
      trial_started_at: options.trialStartsAt || null,
      trial_ends_at: options.trialEndsAt || null,
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from('user_entitlements')
      .upsert(entitlementData, { onConflict: 'user_id,product_id' })
      .select()
      .single();

    if (error) throw error;

    // Log admin action
    await supabase.from('admin_actions').insert({
      admin_id: adminId,
      action_type: 'grant_access',
      target_user_id: userId,
      product_id: productId,
      details: { note: options.note, status: entitlementData.status },
    });

    return data;
  },

  async revokeAccess(adminId, userId, productId) {
    const { error } = await supabase
      .from('user_entitlements')
      .update({ status: 'cancelled', updated_at: new Date().toISOString() })
      .eq('user_id', userId)
      .eq('product_id', productId);

    if (error) throw error;

    await supabase.from('admin_actions').insert({
      admin_id: adminId,
      action_type: 'revoke_access',
      target_user_id: userId,
      product_id: productId,
      details: {},
    });
  },

  async getAllProducts() {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('is_active', true)
      .order('sort_order');

    if (error) throw error;
    return data || [];
  },

  async getAllEntitlements() {
    const { data, error } = await supabase
      .from('user_entitlements')
      .select('*, products(*)');

    if (error) throw error;
    return data || [];
  },
};
