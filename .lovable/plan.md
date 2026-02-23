

# Dashboard Rebuild (Home Screen)

## Summary

Rewrite `src/pages/Dashboard.jsx` to be a dynamic, product-aware home screen with time-aware greeting, product status cards with colored left borders, conditional stats/quick actions, a product spotlight upsell section, a recent activity feed, and a full empty state for new users.

## What Changes

### Single File: `src/pages/Dashboard.jsx` -- Full Rewrite

The entire dashboard is rebuilt. No new files needed -- it uses existing hooks (`useEntitlementContext`, `useAuth`, `useProperties`) and components (`Layout`, `StatusBadge`).

---

### Section 1: Page Header

- Time-aware greeting: "Good morning/afternoon/evening, [Name]" (uses `currentUser.user_metadata.full_name` or email prefix, plus current hour)
- Subtext: "Here's your HostlyAI Platform overview"
- Right side: notification badge ("X new notifications" from announcements query) + formatted current date

### Section 2: My Active Products (Top of page)

Horizontal scrollable row of 4 product cards (excludes `full_suite` since it grants access to the others). Each card:

| Status | Card Style |
|---|---|
| Active (`active` / `admin_granted`) | White bg, green left border (4px `border-l-4 border-success`), green dot, "Go to [Product]" link |
| Trial | White bg, amber left border, clock icon, "X uses remaining / X days remaining", "Upgrade" text |
| Locked | Gray bg (`bg-slate-50`), gray padlock, desaturated text, "Unlock from $X/mo" amber button |
| Expired | White bg, red left border, warning icon, "Reactivate" red text |

Each card shows: large emoji icon (text-3xl), product name, status badge, and contextual CTA.

### Section 3: Quick Stats (Conditional)

Only renders stat cards for products the user has access to. Uses existing `useProperties` hook for property/guest counts. Other stats are placeholder values for now (messages, SMS status, etc.):

- **AI Concierge**: Properties count (linked), Messages this week, Guests total, SMS status
- **SnapPro**: Photos processed, Photos this month, Edits remaining (all placeholder "---")
- **Analytics**: Avg response rate, Revenue, Satisfaction score (all placeholder "---")
- If no products active: skip this section entirely (empty state handles it)

### Section 4: Quick Actions (Conditional)

Grid of action buttons, only showing for active products:

- **Concierge**: Add Property, View Messages, Test AI
- **SnapPro**: Optimize a Photo, View Photo Library
- **Analytics**: View Insights, Download Report
- **Academy**: Continue Learning, Browse Videos
- Each is a `Link` card with icon, title, description, and hover arrow

### Section 5: Product Spotlight (Upsell)

"You might also like" section -- only shows if user doesn't have ALL products. Displays 1-2 locked/expired product cards with value prop text and "Start Free Trial" CTA linking to `/products`.

### Section 6: Recent Activity Feed

Timeline of recent events. Currently uses placeholder/mock data (same pattern as existing) but organized by product icon:

- AI Concierge events: message icon, guest check-in
- General events: SMS automation
- Each row: product emoji, description, relative timestamp, "View" link

### Empty State (No Active Products)

If user has zero active/trial entitlements:
- Large centered section with wave emoji
- "Welcome to HostlyAI Platform!"
- "Choose your first product to get started"
- Grid of all 5 product cards with "Start Free Trial" CTA linking to `/products`

## Data Sources

| Data | Source | Notes |
|---|---|---|
| User name | `useAuth().currentUser.user_metadata` or `.email` | Already available |
| Products list | `useEntitlementContext().products` | Already loaded |
| Access status | `useEntitlementContext().hasAccess(id)` | Returns status + trialInfo |
| Properties count | `useProperties().properties.length` | Existing hook |
| Guests count | Supabase query in component | Simple count query |
| Announcement count | Supabase query (same as Layout header) | For notification badge |
| Messages/SMS/Analytics stats | Placeholder values | Real data deferred |

## Technical Notes

- No new hooks or services needed
- Uses `useProperties` for property count (already cached)
- Guests count: inline `useEffect` with `supabase.from('guests').select('*', { count: 'exact', head: true })`
- Time greeting: simple `new Date().getHours()` check (< 12 = morning, < 17 = afternoon, else evening)
- Product cards use `grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4` for responsive layout
- Activity feed is mock data for now (real activity tracking is a future feature)

## Files Changed

| File | Action |
|---|---|
| `src/pages/Dashboard.jsx` | Full rewrite |

