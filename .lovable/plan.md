

# Product Gate System (Core Access Logic)

## Summary

Enhance the existing product gating system with a dedicated `useProductAccess` hook, a rebuilt `ProductGate` component that shows trial banners and locked overlays, an upgrade modal, and a usage increment system that enforces limits before actions complete.

## What Changes

### 1. New File: `src/hooks/useProductAccess.js`

A hook that wraps `useEntitlementContext().hasAccess()` and adds computed convenience fields plus an upgrade modal trigger.

**Returns:**
- `hasAccess` (boolean) -- can they use this product right now?
- `status` -- `'active' | 'trial' | 'expired' | 'locked' | 'admin_granted'`
- `trialUsesRemaining` (number | null) -- if usage-based trial, how many left
- `trialDaysRemaining` (number | null) -- if days-based trial, how many left
- `usageCount` (number) -- current usage count
- `canUseFeature(featureKey)` -- granular feature flag check (returns true for active/admin_granted, checks feature map for trial)
- `triggerUpgrade()` -- opens the upgrade modal for this product
- `incrementUsage()` -- atomically increments usage, returns `{ allowed: boolean }`. If hitting limit, triggers upgrade modal and returns `{ allowed: false }`
- `entitlement` -- raw entitlement object for advanced use

**Implementation details:**
- Uses `useEntitlementContext()` for access data
- Manages upgrade modal state via a local state lifted through a new `UpgradeModalContext`
- `incrementUsage()` calls `entitlementService.incrementUsage()` then checks if limit reached, invalidates entitlements query cache after increment
- `canUseFeature()` uses a hardcoded `TRIAL_FEATURES` map that defines which features are available during trial per product (e.g., trial AI Concierge can use basic responses but not bulk operations)

### 2. New File: `src/context/UpgradeModalContext.jsx`

A context that manages upgrade modal state app-wide so any component can trigger it.

- `showUpgradeModal(productId)` -- opens modal for a specific product
- `hideUpgradeModal()` -- closes it
- `upgradeProductId` -- currently shown product (null when closed)

Wrap this provider inside `App.jsx` (inside `EntitlementProvider`).

### 3. Rewrite: `src/components/ProductGate.jsx`

The main gating wrapper component. Props: `productId`, `featureKey` (optional), `children`.

**Behavior by status:**

| Status | Rendering |
|---|---|
| `active` / `admin_granted` | Render children normally, no banner |
| `trial` (usage-based) | Render children + amber banner at top: "X free uses remaining -- Upgrade to unlock unlimited" with progress bar and CTA |
| `trial` (days-based) | Render children + amber banner at top: "Your trial ends in X days -- Upgrade now" with CTA |
| `locked` | Locked overlay: blurred/greyed content placeholder + centered card with product icon, name, value prop, "Start Free Trial" blue CTA + "Upgrade for $X/mo" secondary CTA |
| `expired` | Expired state: product icon, "Your access to [Product] has ended", "Reactivate for $X/mo" red CTA, last usage info |

**Trial banners** are sticky `div`s positioned at the top of the gated section (not fixed to viewport). They include:
- Usage bar: `div` progress bar showing `usageCount / usageLimit`
- Days countdown: text showing days remaining
- "Upgrade" button that calls `triggerUpgrade()`
- Dismissible (hides for session via local state, reappears on page reload)

**Locked overlay:**
- Outer wrapper: `relative overflow-hidden`
- Children rendered but wrapped in `pointer-events-none opacity-20 blur-sm select-none` div
- Centered card overlay: `absolute inset-0 flex items-center justify-center z-10`
- Card shows product icon, name, description, trial offer badge, primary CTA ("Start Free Trial"), secondary CTA ("Upgrade for $X/mo")

### 4. New File: `src/components/UpgradeModal.jsx`

The upgrade modal triggered by `triggerUpgrade()`. Renders when `upgradeProductId` is set in `UpgradeModalContext`.

**Contents:**
- Product icon (large) + product name + tagline
- Monthly / Annual toggle (local state)
- Price display (large, bold) switching between monthly and annual
- Feature list (from `PRICING_FEATURES` constant, reused from Pricing page)
- "Start Free Trial" primary blue button (links to `/billing` as placeholder until Stripe is connected)
- "Maybe later" text link that closes modal
- Close X button top-right

**Layout:** Fixed overlay with centered card, max-width 480px, scrollable if needed.

### 5. Update: `src/services/entitlementService.js` -- Fix `incrementUsage`

The current `incrementUsage` method is broken (has a no-op update). Fix it to:
1. Read current `trial_usage_count` for the user+product
2. Check if incrementing would exceed `trial_usage_limit`
3. If over limit: return `{ allowed: false, count: current, limit: limit }`
4. If allowed: update `trial_usage_count = current + 1`, return `{ allowed: true, count: current + 1, limit: limit }`

This is a read-then-write pattern (not truly atomic but sufficient for trial usage tracking).

### 6. Update: `src/context/EntitlementContext.jsx`

No changes to the context itself, but wrap children with `UpgradeModalProvider` inside the `EntitlementProvider` (or add it in `App.jsx`).

### 7. Update: `src/App.jsx`

Wrap the app tree with `UpgradeModalProvider` inside the existing `EntitlementProvider`. Add `UpgradeModal` component rendered at root level (always mounted, visibility controlled by context).

## Data Flow

```
useProductAccess('ai_concierge')
  --> useEntitlementContext().hasAccess('ai_concierge')
  --> returns { hasAccess, status, trialInfo }
  --> computes trialUsesRemaining, trialDaysRemaining
  --> triggerUpgrade() calls UpgradeModalContext.showUpgradeModal('ai_concierge')
  --> incrementUsage() calls entitlementService.incrementUsage()
      --> if limit hit: triggerUpgrade() + return { allowed: false }
      --> else: invalidate query cache + return { allowed: true }
```

## Trial Feature Map (for `canUseFeature`)

```
TRIAL_FEATURES = {
  ai_concierge: ['basic_responses', 'faq', 'property_info'],
  snappro: ['single_photo', 'basic_enhance'],
  analytics: ['dashboard_view', 'basic_stats'],
  academy: ['intro_videos'],
}
```

During trial, `canUseFeature('bulk_processing')` returns false for snappro. During active, all features return true.

## Files Changed

| File | Action |
|---|---|
| `src/hooks/useProductAccess.js` | New -- main access hook |
| `src/context/UpgradeModalContext.jsx` | New -- upgrade modal state management |
| `src/components/ProductGate.jsx` | Rewrite -- trial banners, locked overlay, expired state |
| `src/components/UpgradeModal.jsx` | New -- upgrade modal component |
| `src/services/entitlementService.js` | Edit -- fix incrementUsage method |
| `src/App.jsx` | Edit -- add UpgradeModalProvider + UpgradeModal |

## Implementation Order

1. Fix `entitlementService.incrementUsage()` 
2. Create `UpgradeModalContext`
3. Create `useProductAccess` hook
4. Create `UpgradeModal` component
5. Rewrite `ProductGate` component
6. Wire up providers in `App.jsx`

