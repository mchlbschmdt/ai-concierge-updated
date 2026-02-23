

# Product Catalog / Pricing Page

## Summary

Create a new pricing page at `/pricing` (public, no auth required) and a reusable `PricingModal` component for in-app upsell. Features a monthly/annual toggle, 5 product cards in a responsive grid, a standout Full Suite card with "BEST VALUE" badge, and an FAQ accordion section.

## What Changes

### 1. New File: `src/pages/Pricing.jsx`

The main pricing page, accessible without login.

**Page structure:**

- **Header**: "Simple, transparent pricing" title + "Choose the plan that works for you" subtitle
- **Billing toggle**: Monthly / Annual switch. Annual shows "Save ~17%" badge. Uses local `useState('monthly')`.
- **Product grid**: `grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3` with 5 cards. Full Suite card spans or is visually distinct.
- **FAQ accordion**: 6 questions with expand/collapse (local state, no library needed).

**Each product card:**
- Colored circle (48px) with product emoji icon
- Product name + one-line description (from `products` table)
- Price: large bold number, switches between `price_monthly` and `price_annual / 12` based on toggle. Shows "/month" or "/year" label.
- Trial badge: amber pill -- "10 free responses" (usage-based) or "7-day free trial" (days-based), derived from `trial_type` and `trial_limit`
- Feature list: 5-8 items with green checkmarks (hardcoded per product, expanded from `PRODUCT_FEATURES`)
- CTA: "Start Free Trial" blue button linking to `/register` (for unauthenticated) or `/billing` (for authenticated)
- "Learn more" text link below

**Full Suite card -- standout treatment:**
- "BEST VALUE" badge: amber background, rotated `rotate-12` and positioned `absolute top-3 -right-2`
- Card border: `ring-2 ring-primary` blue gradient border effect
- Extra line: "Save $X.XX/mo vs buying separately" calculated from sum of individual monthly prices minus bundle price
- Sub-items: lists all 4 included products with green checks and their individual prices struck through

**For authenticated users (in-app):**
- If user has entitlement for a product, card shows "Already Active" with green check, CTA grayed out
- Uses `useEntitlementContext` (with safe fallback for unauthenticated visitors)

### 2. New File: `src/components/PricingModal.jsx`

A modal wrapper that renders the same pricing content for in-app upsell contexts.

- Takes `isOpen`, `onClose`, optional `highlightProduct` prop
- Fixed overlay with centered scrollable container
- Renders the same card grid (extracted as a shared `PricingCards` component or inline)
- If `highlightProduct` is set, that card gets a pulsing border highlight

### 3. Feature Lists (expanded from MyProducts)

```
PRICING_FEATURES = {
  ai_concierge: [
    "AI-powered SMS guest concierge",
    "Automated check-in/out messages",
    "Email management & drafts",
    "Knowledge base editor",
    "FAQ auto-responses",
    "Travel guide recommendations",
    "Multi-property support",
    "Conversation analytics"
  ],
  snappro: [
    "AI photo enhancement",
    "Auto white-balance & lighting",
    "Batch processing",
    "Listing-ready exports",
    "Before/after comparisons"
  ],
  analytics: [
    "Property performance dashboard",
    "Smart insights & trends",
    "Response quality tracking",
    "Guest satisfaction metrics",
    "Weekly email reports"
  ],
  academy: [
    "Expert video training library",
    "Step-by-step hosting guides",
    "New content added monthly",
    "Progress tracking"
  ],
  full_suite: [
    "AI Concierge (all features)",
    "SnapPro Photos (all features)",
    "Analytics Suite (all features)",
    "Host Academy (all features)",
    "Priority support",
    "Early access to new features",
    "Bundle savings vs individual"
  ]
}
```

### 4. FAQ Section

Accordion with local state (`expandedIndex`). Each item is a button that toggles a `div` with answer text. Uses ChevronDown icon that rotates on expand.

Questions:
1. Can I cancel anytime? -- Yes, cancel anytime from your billing page.
2. Does AI Concierge charge per property? -- Yes, $29.99/property/month.
3. What happens when my trial ends? -- You'll be prompted to upgrade. No auto-charge.
4. Can I switch plans? -- Yes, changes are pro-rated automatically.
5. Do you offer refunds? -- Yes, 7-day money-back guarantee on all plans.
6. Is there a contract? -- No, all plans are month-to-month or annual with no lock-in.

### 5. Route Addition in `src/App.jsx`

Add `/pricing` as a **public route** (no `ProtectedRoute` wrapper):
```
<Route path="/pricing" element={<Pricing />} />
```

### 6. Layout Consideration

The pricing page uses a minimal layout (no sidebar) for public visitors. It checks if user is authenticated:
- **Authenticated**: renders inside `<Layout>` with sidebar
- **Unauthenticated**: renders with a simple header (logo + "Sign In" link) and no sidebar

This is handled with a conditional check on `currentUser` from `useAuth`.

## Data Sources

| Data | Source |
|---|---|
| Products list | `useProducts()` hook (public query, works without auth) |
| User access status | `useEntitlementContext()` (safe fallback when no auth) |
| Features | Hardcoded `PRICING_FEATURES` constant |
| Prices | `product.price_monthly` and `product.price_annual` from DB |
| Trial info | `product.trial_type` and `product.trial_limit` from DB |
| Savings calculation | Sum of individual `price_monthly` minus `full_suite.price_monthly` |

## Annual Price Display

When toggle is "Annual":
- Show `price_annual` as the total
- Show per-month equivalent: `(price_annual / 12).toFixed(2)`
- Show savings badge: calculate `((price_monthly * 12 - price_annual) / (price_monthly * 12) * 100).toFixed(0)` percent saved

## Files Changed

| File | Action |
|---|---|
| `src/pages/Pricing.jsx` | New -- full pricing page |
| `src/components/PricingModal.jsx` | New -- modal wrapper for in-app upsell |
| `src/App.jsx` | Add `/pricing` public route |

## Implementation Order

1. `src/pages/Pricing.jsx` -- main page with all sections
2. `src/components/PricingModal.jsx` -- modal wrapper reusing pricing cards
3. `src/App.jsx` -- add route

