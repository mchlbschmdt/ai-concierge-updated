

# Product Platform Architecture: Entitlements, Gating, and Admin Management

## Overview

Transform the existing Hostly.ai app into a product platform with 5 subscription products. This phase focuses on the **entitlement system, access gating, sidebar restructuring, and admin management** -- not Stripe billing or new product UIs (SnapPro/Host Academy).

## Database Changes

### New Tables

**1. `products` -- Product catalog**
| Column | Type | Notes |
|---|---|---|
| id | text | PK -- 'ai_concierge', 'snappro', 'analytics', 'academy', 'full_suite' |
| name | text | Display name |
| description | text | Short description |
| icon | text | Emoji |
| price_monthly | decimal | Display price (no billing yet) |
| price_annual | decimal | Annual price |
| trial_type | text | 'days' or 'usage' or 'none' |
| trial_limit | integer | 14 days or 10 uses |
| sort_order | integer | Display order |
| is_active | boolean | Default true |

RLS: Anyone authenticated can SELECT. Only super_admins can INSERT/UPDATE/DELETE (using existing `is_super_admin()` function).

**2. `user_entitlements` -- Access control table**
| Column | Type | Notes |
|---|---|---|
| id | uuid | PK |
| user_id | uuid | References auth.users(id) |
| product_id | text | References products(id) |
| status | text | 'active', 'trial', 'expired', 'cancelled', 'admin_granted' |
| source | text | 'stripe', 'admin_grant', 'trial' |
| stripe_subscription_id | text | For future Stripe integration |
| trial_started_at | timestamptz | When trial began |
| trial_ends_at | timestamptz | When trial expires |
| trial_usage_count | integer | Default 0 |
| trial_usage_limit | integer | Max trial uses |
| access_starts_at | timestamptz | Default now() |
| access_ends_at | timestamptz | NULL = indefinite |
| granted_by | uuid | Admin who granted |
| grant_note | text | Admin's reason |
| created_at | timestamptz | Auto |
| updated_at | timestamptz | Auto |
| UNIQUE(user_id, product_id) | | One entitlement per product per user |

RLS: Users can SELECT their own entitlements. Super admins can SELECT/INSERT/UPDATE/DELETE all.

**3. `admin_actions` -- Audit log**
| Column | Type | Notes |
|---|---|---|
| id | uuid | PK |
| admin_id | uuid | Who performed action |
| action_type | text | 'grant_access', 'revoke_access', 'set_trial', 'override_billing' |
| target_user_id | uuid | Affected user |
| product_id | text | Affected product |
| details | jsonb | Extra metadata |
| created_at | timestamptz | Auto |

RLS: Only super_admins can SELECT/INSERT.

**4. `announcements` -- Admin push banners**
| Column | Type | Notes |
|---|---|---|
| id | uuid | PK |
| title | text | Banner title |
| message | text | Banner body |
| type | text | 'info', 'warning', 'success', 'upgrade' |
| target | text | 'all', product_id, or 'free_users' |
| cta_text | text | Button text |
| cta_url | text | Button link |
| is_active | boolean | Default true |
| starts_at | timestamptz | Default now() |
| ends_at | timestamptz | Nullable |
| created_by | uuid | Admin |
| created_at | timestamptz | Auto |

RLS: Anyone authenticated can SELECT active announcements. Only super_admins can INSERT/UPDATE/DELETE.

**Seed data:** Insert the 5 products with pricing/trial info.

**Important:** We keep the existing `user_roles` table and `is_super_admin()` function for admin access. We do NOT add a role column to profiles. The `user_entitlements` table handles product access; `user_roles` handles admin privileges.

### Existing Tables -- No Schema Changes

The `properties` table stays as-is. We will NOT add `ai_responses_used`, `ai_responses_limit`, or `stripe_subscription_item_id` columns now since billing is deferred. Usage tracking for AI Concierge trials will use the `user_entitlements.trial_usage_count` field.

## New Services and Hooks

### `src/services/entitlementService.js`

Core service for checking product access:

```text
- getUserEntitlements(userId) -- fetch all entitlements for a user
- hasProductAccess(userId, productId) -- returns { hasAccess, status, reason }
  - Checks: active/admin_granted = true
  - Checks: trial + not expired + under usage limit = true
  - full_suite grants access to all 4 individual products
- incrementUsage(userId, productId) -- bump trial_usage_count
- grantAccess(adminId, userId, productId, options) -- admin grant
- revokeAccess(adminId, userId, productId) -- admin revoke
```

### `src/hooks/useEntitlements.js`

React hook wrapping entitlementService with React Query:

```text
- useEntitlements() -- returns { entitlements, hasAccess(productId), isLoading }
- Caches entitlements per session
- Auto-refetches on focus
```

### `src/context/EntitlementContext.jsx`

Context provider that wraps the app and provides entitlement state globally. Loads entitlements once on auth, exposes `hasAccess(productId)` to any component.

## Access Gating

### `src/components/ProductGate.jsx`

A wrapper component used on gated pages:

```text
<ProductGate productId="ai_concierge">
  <MessagesDashboard />
</ProductGate>
```

If user lacks access, shows an upgrade card with:
- Product name, icon, description, price
- Trial status (if applicable): "You've used 8 of 10 free responses"
- "Upgrade" button (placeholder for now -- just shows a message)
- "Contact admin" fallback

### Route Gating Map

| Product | Gated Routes |
|---|---|
| ai_concierge | /messages, /email-management, /test-responses, /knowledge-base, /faq-editor, /travel-admin |
| analytics | /analytics, /insights, /quality-analytics |
| snappro | /snappro (new, coming soon page) |
| academy | /academy (new, coming soon page) |

Ungated routes (always accessible): /, /properties, /add-property, /property/:id, /guests, /profile-settings, /onboarding, /install

## Sidebar Restructure

Reorganize sidebar into product-grouped sections. Locked products show grayed-out items with a lock icon:

```text
OVERVIEW
  Dashboard

PROPERTIES (always accessible)
  Properties
  Guests

AI CONCIERGE [status badge]
  Messages
  Email Management
  Test AI
  Knowledge Base
  FAQ Editor
  Travel Guide

ANALYTICS SUITE [status badge]
  Analytics
  Smart Insights
  Quality Analytics

SNAPPRO [coming soon badge]
  Photo Optimizer

HOST ACADEMY [coming soon badge]
  Training Library

ACCOUNT
  Profile Settings

ADMIN (super_admin only)
  Admin Dashboard
  User Management
  All Properties
  SMS Conversations
  System Diagnostics
```

Each product section header shows a status pill badge:
- Active: green
- Trial: amber with remaining count/days
- Locked: gray lock icon

Clicking a locked nav item navigates to the route but `ProductGate` shows the upgrade prompt.

## Admin Enhancements

### Updated Admin Dashboard (`/admin`)

Add new sections:
- **Product Entitlements Overview**: Cards showing total active/trial/expired users per product
- **Quick Actions**: Grant product access, push announcement
- Keep existing stats (users, properties, conversations)

### New Admin Page: `/admin/entitlements`

Table of all user entitlements with:
- Search/filter by user email, product, status
- Actions: Grant access, revoke access, extend trial, set custom expiry
- Each action logs to `admin_actions`

### New Admin Page: `/admin/announcements`

CRUD interface for announcements:
- Create banner with title, message, type, target audience
- Set active period (starts_at, ends_at)
- Toggle active/inactive
- Preview banner

### Updated User Management (`/admin/users`)

Add per-user product access panel:
- When viewing a user, show their entitlements as product cards
- Toggle access per product
- Set custom trial dates
- View usage stats

## Announcement Banner Component

### `src/components/AnnouncementBanner.jsx`

Rendered at the top of the Layout, below the header:
- Fetches active announcements targeted at the current user
- Matches on 'all', specific product_id the user has, or 'free_users' (users with no active paid entitlements)
- Dismissible (stores dismissed IDs in localStorage)
- Color-coded by type (info=blue, warning=amber, success=green, upgrade=purple)

## New Pages (Placeholder)

### `/snappro` -- Coming Soon page
Simple branded card: "SnapPro Photos -- Coming Soon. AI-powered photo optimization for your listings. $9.99/mo"

### `/academy` -- Coming Soon page
Simple branded card: "Host Academy -- Coming Soon. Video training library for STR hosts. $19.99/mo"

## Auto-Trial on Signup

When a new user registers, automatically create trial entitlements:
- AI Concierge: usage-based trial (10 uses)
- Analytics Suite: 7-day trial
- SnapPro: usage-based trial (10 uses)
- Host Academy: usage-based trial (3 uses)

This is handled by updating the `handle_new_user()` database trigger to also insert default trial entitlements.

## Files Changed Summary

| File | Action |
|---|---|
| Database migration | New tables: products, user_entitlements, admin_actions, announcements + seed data + updated handle_new_user trigger |
| `src/services/entitlementService.js` | **New** -- Core entitlement checking logic |
| `src/hooks/useEntitlements.js` | **New** -- React Query hook for entitlements |
| `src/context/EntitlementContext.jsx` | **New** -- Global entitlement context provider |
| `src/components/ProductGate.jsx` | **New** -- Access gate wrapper component |
| `src/components/AnnouncementBanner.jsx` | **New** -- Admin push banner component |
| `src/components/Sidebar.jsx` | **Rewrite** -- Product-grouped nav with status badges |
| `src/components/Layout.jsx` | **Update** -- Add EntitlementProvider + AnnouncementBanner |
| `src/App.jsx` | **Update** -- Add new routes, wrap gated routes with ProductGate |
| `src/pages/Dashboard.jsx` | **Update** -- Show product cards with access status |
| `src/pages/AdminDashboard.jsx` | **Update** -- Add entitlement overview cards |
| `src/pages/UserManagement.jsx` | **Update** -- Add per-user entitlement management |
| `src/pages/AdminEntitlements.jsx` | **New** -- Full entitlement management table |
| `src/pages/AdminAnnouncements.jsx` | **New** -- Announcement CRUD |
| `src/pages/SnapPro.jsx` | **New** -- Coming soon placeholder |
| `src/pages/HostAcademy.jsx` | **New** -- Coming soon placeholder |
| `tailwind.config.js` | Minor update -- ensure status badge colors are available |

## Implementation Order

1. Database migration (tables + seed + trigger)
2. Entitlement service + hook + context
3. ProductGate component
4. Sidebar restructure with product grouping
5. Layout updates (context provider + announcement banner)
6. App.jsx route updates
7. Dashboard product cards
8. Admin entitlement management pages
9. Admin announcements page
10. Coming soon placeholder pages
11. Auto-trial on signup (trigger update)

