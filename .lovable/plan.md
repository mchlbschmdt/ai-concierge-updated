

# App Shell and Navigation Rebuild

## Summary

Rebuild the sidebar, header, and mobile navigation to match the new multi-product platform design. The sidebar gets a deep navy background (#1E2A4A), collapsible icon-only mode, product-grouped navigation with status indicators, and new pages/routes. Mobile gets a bottom-sheet navigation instead of the current slide-in drawer.

## What Changes

### 1. Sidebar Context Update (`src/context/SidebarContext.jsx`)

Add a `collapsed` state (separate from `isOpen`) for desktop icon-only mode. Persist collapsed preference in localStorage.

- `isOpen` -- controls mobile slide/sheet visibility
- `isCollapsed` -- controls desktop icon-only vs full-width mode
- New method: `toggleCollapsed()`
- Sidebar width: `w-60` (full) or `w-16` (collapsed) on desktop

### 2. Sidebar Rewrite (`src/components/Sidebar.jsx`)

**Visual changes:**
- Background: `bg-[#1E2A4A]` deep navy instead of `bg-card`
- Text colors: active = white, inactive = `#94A3B8` (slate-400)
- Active item: left border accent in `#2563EB` + `bg-white/10`

**Logo area (top):**
- "HostlyAI" brand + "Platform" subtitle in small gray text
- Collapse/expand arrow button (ChevronLeft/ChevronRight) -- desktop only

**Navigation restructure:**

| Section | Items | Gating |
|---|---|---|
| OVERVIEW | Dashboard, My Products | Always accessible |
| AI CONCIERGE | Properties, Guests, Messages, Email Management, Knowledge Base, FAQ Editor, Travel Guide, Test AI Responses | `ai_concierge` entitlement |
| SNAPPRO PHOTOS | Photo Optimizer, My Photo Library | `snappro` entitlement |
| ANALYTICS | Analytics, Smart Insights, Quality Analytics | `analytics` entitlement |
| HOST ACADEMY | Video Library, My Progress | `academy` entitlement |
| ACCOUNT | Profile Settings, Billing and Subscriptions, Support | Always accessible |
| ADMIN | (existing admin items + Entitlements + Announcements) | `isSuperAdmin` only |

**Section header indicators:**
- Locked: gray padlock icon + "Unlock" amber button
- Trial: amber clock icon + "Trial" text
- Active: green dot

**Collapsed mode (desktop):**
- Show only icons, hide labels and section headers
- Tooltip on hover showing item label
- Section dividers remain as thin horizontal lines

### 3. Header Update (`src/components/Layout.jsx`)

**Left:** "HostlyAI Platform" text (updated from "Hostly.ai")

**Right side additions (in order):**
- Global search (keep existing)
- Announcement bell icon with unread badge count (queries `announcements` table for active count minus dismissed)
- Admin badge (keep existing, only for super_admin)
- Profile dropdown (enhanced)

**Profile dropdown enhancements:**
- Show user email
- Show mini product badges for each active entitlement (colored pills)
- "Manage Subscriptions" link to `/billing`
- "Profile Settings" link
- Sign Out button

### 4. Mobile Navigation

Replace the current mobile slide-in sidebar with a bottom sheet using the existing `MobileDrawer.jsx` pattern:

- Hamburger button in header opens a bottom sheet (`h-[85vh]`)
- Sheet contains the same nav structure as desktop sidebar
- Pull-down handle at top to dismiss
- Full-height scrollable content

### 5. New Routes and Pages

| Route | Page | Notes |
|---|---|---|
| `/products` | `MyProducts.jsx` | Product catalog showing all 5 products with subscription status, trial info, pricing |
| `/billing` | `Billing.jsx` | Placeholder -- "Billing coming soon. Contact admin for access." |
| `/support` | `Support.jsx` | Simple support page with contact info / FAQ link |
| `/snappro/library` | Extend SnapPro | Add "My Photo Library" tab/section |
| `/academy/progress` | Extend HostAcademy | Add "My Progress" tab/section |

### 6. App.jsx Route Updates

Add new routes:
- `/products` -- ungated, always accessible
- `/billing` -- ungated
- `/support` -- ungated
- `/snappro/library` -- gated by `snappro`
- `/academy/progress` -- gated by `academy`

Move Properties and Guests under AI Concierge gating in the sidebar (but keep routes ungated per existing plan -- the sidebar just visually groups them under AI Concierge).

### 7. Tailwind Config

Add the sidebar navy color as a named token:
```
sidebar: '#1E2A4A',
'sidebar-foreground': '#94A3B8',
'sidebar-active': '#FFFFFF',
```

## Files Changed

| File | Action |
|---|---|
| `tailwind.config.js` | Add sidebar color tokens |
| `src/context/SidebarContext.jsx` | Add `isCollapsed` state + `toggleCollapsed` |
| `src/components/Sidebar.jsx` | Full rewrite -- navy bg, collapse mode, new nav structure, section indicators |
| `src/components/Layout.jsx` | Update header text, add bell icon, enhance profile dropdown, use bottom sheet on mobile |
| `src/App.jsx` | Add `/products`, `/billing`, `/support`, `/snappro/library`, `/academy/progress` routes |
| `src/pages/MyProducts.jsx` | **New** -- product catalog with subscription status cards |
| `src/pages/Billing.jsx` | **New** -- placeholder billing page |
| `src/pages/Support.jsx` | **New** -- simple support/contact page |
| `src/pages/SnapPro.jsx` | Update to handle `/snappro/library` sub-route |
| `src/pages/HostAcademy.jsx` | Update to handle `/academy/progress` sub-route |
| `src/components/StatusBadge.jsx` | No changes needed (already supports all statuses) |

## Implementation Order

1. Tailwind config -- add sidebar color tokens
2. SidebarContext -- add collapsed state
3. Sidebar rewrite -- navy theme, collapsible, new nav structure
4. Layout header updates -- bell, dropdown enhancements, mobile bottom sheet
5. New placeholder pages (MyProducts, Billing, Support)
6. App.jsx route additions
7. SnapPro/HostAcademy sub-page updates

