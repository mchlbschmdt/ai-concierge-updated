

# Fix: SnapPro Showing "Unlock" Despite Having Access

## Problem

The `ProductGate` component wraps SnapPro pages in `App.jsx` (the router level), but the `EntitlementProvider` that supplies entitlement data lives inside `Layout.jsx` (rendered inside the page component). Since `ProductGate` runs before `Layout` mounts, it always gets the fallback "no access" response and shows the lock screen.

```
App.jsx
  -> ProductGate (needs EntitlementProvider... but it's not here)
    -> SnapPro page
      -> Layout (EntitlementProvider is here -- too late!)
```

## Solution

Move the `EntitlementProvider` up from `Layout.jsx` into `App.jsx`, alongside the other providers (AuthProvider, UpgradeModalProvider, etc.). This ensures all `ProductGate` components and `useProductAccess` hooks have access to entitlement data.

## Changes

### 1. `src/App.jsx`
- Import `EntitlementProvider` from `@/context/EntitlementContext`
- Wrap it around the `<Routes>` block, inside `AuthProvider` (since it depends on auth) and inside `UpgradeModalProvider`

### 2. `src/components/Layout.jsx`
- Remove the `EntitlementProvider` wrapper from the Layout return (since it now lives higher up)
- Remove the `EntitlementProvider` import

This is a small, surgical fix -- just moving a provider up one level in the component tree. No logic changes needed.

