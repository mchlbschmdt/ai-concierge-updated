
# My Products Page (Subscription Manager)

## Summary

Rewrite `src/pages/MyProducts.jsx` into a full subscription management page with three sections: current subscriptions with detailed status cards, available products grid for upsell, and a bundle savings banner. Uses existing `useEntitlementContext` and `useProperties` hooks.

## What Changes

### Single File: `src/pages/MyProducts.jsx` -- Full Rewrite

---

### Page Header

- Title: "My Products"
- Subtitle: "Manage your subscriptions and access"
- Right side: "Browse all products" link (scrolls to Section 2 or is decorative since this IS the products page)

### Section 1: Current Subscriptions

Shows every product the user has an entitlement for (any status: active, trial, expired, admin_granted). Each is an expanded row card with:

**Layout per card:**
- Left column: Large emoji icon (text-4xl) + product name + tagline
- Center column: Status-specific content:

| Status | Display |
|---|---|
| `active` | Green "Active" badge, "Renews monthly - $X/mo", "Manage" button |
| `trial` (usage) | Amber badge, "X of Y free uses remaining", progress bar (% used), "Upgrade Now" amber CTA |
| `trial` (days) | Amber badge, "Trial ends [date] - X days left", progress bar (days elapsed / total), "Upgrade Now" amber CTA |
| `expired` | Red badge, "Expired" + reason text, "Reactivate" red CTA |
| `admin_granted` | Blue badge, "Access granted by admin", optional expiry date if `access_ends_at` is set |
| `cancelled` | Gray badge, "Cancelled", "Reactivate" CTA |

- Right column: 3-4 feature bullet points (hardcoded per product)
- Bottom row: "Manage Billing" link (placeholder -- links to `/billing`) and "Cancel" button (shows a confirmation `window.confirm` dialog, does not actually cancel yet since Stripe is not integrated)

**Special AI Concierge card:**
- Below the status section, shows property count: "X properties active"
- "Add Property" link to `/add-property`
- If properties loaded, shows a compact list of property names (max 5, with "+N more" overflow)

**If user has zero entitlements:** This section shows a friendly message: "You don't have any subscriptions yet. Check out our products below!"

### Section 2: Available Products

Grid of products the user does NOT have (or has expired/cancelled). Each card:
- Product icon, name, price
- 3 key features as checkmark bullet points (hardcoded per product)
- "Start Free Trial" or "Get X Free Uses" CTA button (amber, links to `/billing` as placeholder)
- If no available products (user has everything): section hidden

### Section 3: Bundle Offer Banner

Only shown if user has 2+ individual active/trial products but NOT `full_suite`. Displays:
- Amber/gold gradient background (`bg-gradient-to-r from-amber-50 to-yellow-50 border-amber-200`)
- Lightbulb emoji + "Save with the Full Suite"
- Calculates: sum of individual product monthly prices the user pays vs $59.99 bundle
- Shows savings: "You could save $X/mo"
- "Switch to Full Suite" CTA button linking to `/billing`

## Data Sources

| Data | Source |
|---|---|
| Products catalog | `useEntitlementContext().products` |
| User entitlements | `useEntitlementContext().entitlements` |
| Access check | `useEntitlementContext().hasAccess(id)` |
| Properties list | `useProperties().properties` (for AI Concierge card) |
| Feature lists | Hardcoded `PRODUCT_FEATURES` constant |

## Technical Details

### Feature lists constant

```text
PRODUCT_FEATURES = {
  ai_concierge: ["AI-powered SMS guest concierge", "Email management", "Knowledge base editor", "FAQ auto-responses"],
  snappro: ["AI photo enhancement", "Batch processing", "Listing-ready exports"],
  analytics: ["Property performance dashboard", "Smart insights", "Response quality tracking"],
  academy: ["Expert video training", "Step-by-step guides", "New content monthly"],
  full_suite: ["All 4 products included", "Priority support", "Bundle savings", "Early access to new features"],
}
```

### Trial progress bar

Simple div-based bar: outer `bg-muted rounded-full h-2`, inner with percentage width and `bg-amber-500 rounded-full h-2`. Calculation:
- Usage-based: `(usageCount / usageLimit) * 100`
- Days-based: uses `trial_started_at` and `trial_ends_at` to compute elapsed percentage

### Bundle savings calculation

Sums `price_monthly` from the `products` table for each product the user has active access to (excluding full_suite). Compares against the full_suite price. Only shows banner if savings > 0.

## Files Changed

| File | Action |
|---|---|
| `src/pages/MyProducts.jsx` | Full rewrite |
