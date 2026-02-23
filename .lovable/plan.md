

# Admin Panel Rebuild (Unified Tabbed Control Center)

## Summary

Consolidate the existing separate admin pages (`AdminDashboard`, `UserManagement`, `AdminEntitlements`, `AdminAnnouncements`) into a single unified admin panel at `/admin` with 5 sub-tabs. Add new Platform Stats and Revenue Overview tabs. Replace scattered admin routes with a single tabbed page.

## Current State

- `/admin` -- basic stats dashboard (`AdminDashboard.jsx`)
- `/admin/users` -- user table with role toggle (`UserManagement.jsx`)
- `/admin/entitlements` -- entitlement table with grant/revoke (`AdminEntitlements.jsx`)
- `/admin/announcements` -- announcement CRUD (`AdminAnnouncements.jsx`)
- All routes use `requireSuperAdmin` via `ProtectedRoute`
- Sidebar has 7 separate admin nav items

## What Changes

### 1. New File: `src/pages/AdminPanel.jsx` -- Single Tabbed Admin Page

The unified admin page with a tab bar at the top. Uses local state (`activeTab`) to switch between 5 tabs. Each tab is a self-contained section rendered inline (no sub-routing needed).

**Tab bar:**
- Users (icon: Users)
- Access Control (icon: Key)
- Announcements (icon: Megaphone)
- Platform Stats (icon: BarChart3)
- Revenue Overview (icon: DollarSign)

Tab selection stored in URL hash (`/admin#users`, `/admin#access`, etc.) so direct links work and browser back button is preserved.

---

### Tab 1: Users

Carries over existing `UserManagement` logic with enhancements:

- **Search bar** (email, name) + **Plan filter** dropdown (active/trial/free/all) + **Status filter** + **Date sort toggle**
- **User table columns**: Avatar + Name + Email | Joined date | Product badges (colored emoji pills for each active product) | Total MRR (sum of active product prices) | Last active (placeholder -- "Recently") | "Manage Access" button
- **Mobile**: Card layout (same data, stacked)

**"Manage Access" drawer** (slides in from right):
- User info header: name, email, join date
- All 5 products listed with current status badge for this user
- Per-product action buttons:
  - "Grant Access" -- opens inline form: duration picker (7d/30d/90d/indefinite/custom date) + note field. Calls `entitlementService.grantAccess()` with appropriate `access_ends_at`
  - "Grant Trial" -- inline form: trial type (days/uses) + limit amount. Calls `grantAccess()` with `status: 'trial'` and trial params
  - "Revoke Access" -- confirmation dialog with reason. Calls `entitlementService.revokeAccess()`
  - "Extend Trial" -- adds X more days/uses to existing trial (updates `trial_ends_at` or `trial_usage_limit`)
- Close button (X) at top-right

Data source: `roleService.getAllUsersWithRoles()` merged with `entitlementService.getAllEntitlements()` and `profiles`

### Tab 2: Access Control

- **Bulk operations section** (3 action cards):
  - "Grant product to all users" -- select product + duration, applies to all users
  - "Revoke expired trials" -- one-click cleanup button
  - "Send upgrade nudge" -- placeholder button (shows toast "Coming soon")
- **Access overview table**: Product name | Total active count | Total trial count | Total expired count | Revenue/mo (active count x price_monthly)

Data: aggregated from `entitlementService.getAllEntitlements()` grouped by product_id

### Tab 3: Announcements

Carries over existing `AdminAnnouncements` logic with enhancements:

- Existing announcement list with active/inactive toggle, edit, delete
- Enhanced "New Announcement" form with:
  - Title, Message (textarea)
  - Type selector: Info (blue) / Warning (amber) / Success (green) / Upgrade Promo (gold)
  - Target audience dropdown: All users / AI Concierge users / Free users / Specific product
  - CTA text + CTA URL fields
  - Schedule fields: starts_at date picker, ends_at date picker
  - **Preview section**: renders the announcement banner as it would appear to users
- All existing CRUD operations preserved

### Tab 4: Platform Stats

- **Key metrics cards** (2 rows):
  - Row 1: Total Users | New This Week | Active Paid Users | Churn Rate (placeholder)
  - Row 2: MRR (sum of active entitlements x product prices) | MRR Growth % (placeholder) | Avg Revenue Per User
  - Row 3: Per-product breakdown: user count + revenue for each product
- **Charts** (using existing recharts dependency):
  - User growth over time (LineChart) -- queries `profiles.created_at` grouped by week
  - Revenue by product (BarChart) -- active entitlements x prices
  - Trial conversion rate by product (BarChart) -- active vs expired trial counts
  - Conversion funnel placeholder (static display for now)

Data: aggregated from profiles, user_entitlements, and products tables

### Tab 5: Revenue Overview

- **Top-level cards**: MRR, ARR (MRR x 12), Churn placeholder, Upcoming Renewals placeholder
- **Recent transactions table**: Lists recent `admin_actions` of type grant/revoke as transaction proxies
- **Failed payments**: Placeholder "No Stripe connected yet" message with link to `/billing`
- **Upcoming renewals**: Placeholder section

This tab is mostly placeholder until Stripe is integrated. Shows what data will be available.

---

### 2. Update: `src/App.jsx` -- Simplify Admin Routes

Replace the 6 separate admin routes with a single route:

```
<Route path="/admin" element={<ProtectedRoute requireSuperAdmin><AdminPanel /></ProtectedRoute>} />
```

Remove imports for `AdminDashboard`, `UserManagement`, `AdminEntitlements`, `AdminAnnouncements`. Keep `AdminPropertiesView` route as-is (it serves a different purpose).

### 3. Update: `src/components/Sidebar.jsx` -- Simplify Admin Nav

Replace the 7 `ADMIN_ITEMS` with a condensed list:

```
{ icon: Shield, label: 'Admin Panel', path: '/admin' },
{ icon: Building2, label: 'All Properties', path: '/admin/properties' },
{ icon: MessagesSquare, label: 'SMS Conversations', path: '/sms-conversations' },
{ icon: TestTube, label: 'System Diagnostics', path: '/admin/system-diagnostics' },
```

The Users, Entitlements, and Announcements links are now tabs within the Admin Panel.

---

## Data Flow

| Data | Query | Tab |
|---|---|---|
| All profiles | `supabase.from('profiles').select(...)` | Users, Stats |
| All entitlements | `entitlementService.getAllEntitlements()` | Users, Access, Stats, Revenue |
| All products | `entitlementService.getAllProducts()` | All tabs |
| User roles | `roleService.getAllUsersWithRoles()` | Users |
| Announcements | `supabase.from('announcements').select(...)` | Announcements |
| Admin actions | `supabase.from('admin_actions').select(...)` | Revenue |
| Properties count | `supabase.from('properties').select('*', { count: 'exact', head: true })` | Stats |
| Weekly signups | `supabase.from('profiles').select('created_at')` with date filter | Stats |

Data is fetched once on mount (with loading state), and individual tabs use the shared data. Mutations (grant, revoke, toggle) trigger a refetch.

## Technical Notes

- Tab state managed via URL hash for deep-linking (`/admin#users`, `/admin#access`, `/admin#announcements`, `/admin#stats`, `/admin#revenue`)
- User access drawer is a `fixed right-0` panel with `translate-x` animation
- Charts use `recharts` (already installed): `LineChart`, `BarChart`, `ResponsiveContainer`
- All admin operations continue using `entitlementService` and `roleService` -- no new services needed
- No database changes required -- all tables and RLS policies already support super_admin access
- Grant duration options: uses `access_ends_at` field on `user_entitlements` table (already exists)
- Extend trial: updates `trial_ends_at` or `trial_usage_limit` via direct supabase update (super_admin RLS allows this)

## Files Changed

| File | Action |
|---|---|
| `src/pages/AdminPanel.jsx` | New -- unified tabbed admin page (~600 lines) |
| `src/App.jsx` | Edit -- replace 4 admin routes with 1, update imports |
| `src/components/Sidebar.jsx` | Edit -- simplify ADMIN_ITEMS array |

## Files That Can Be Deleted (Optional Cleanup)

These are superseded by the unified AdminPanel but can be kept for reference:
- `src/pages/AdminDashboard.jsx`
- `src/pages/UserManagement.jsx`
- `src/pages/AdminEntitlements.jsx`
- `src/pages/AdminAnnouncements.jsx`

## Implementation Order

1. Create `src/pages/AdminPanel.jsx` with all 5 tabs
2. Update `src/App.jsx` routes and imports
3. Update `src/components/Sidebar.jsx` admin nav items

