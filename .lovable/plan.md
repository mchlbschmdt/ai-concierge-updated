

# Fix: SnapPro "Process Photo" Triggers Upgrade Modal for Paid/Admin Users

## Problem

When clicking "Process Photo", the `handleProcess` function calls `incrementUsage()`. This function in `entitlementService.js` (line 82) queries for an entitlement with `status = 'trial'`. Since the user has `admin_granted` status, the query returns nothing, so `incrementUsage` returns `{ allowed: false }`, which triggers the upgrade modal.

The `ProductGate` correctly lets the user through -- the page renders fine. But every attempt to actually process a photo gets blocked.

## Solution

Two changes:

### 1. `src/pages/SnapPro.jsx` -- Skip `incrementUsage` for paid/admin users

In the `handleProcess` function, only call `incrementUsage()` when the user's status is `trial`. For `active` or `admin_granted` users, skip the usage check entirely.

```javascript
// Before processing, only check trial limits for trial users
if (status === 'trial') {
  const result = await incrementUsage();
  if (!result.allowed) return;
}
```

### 2. `src/services/entitlementService.js` -- Make `incrementUsage` aware of non-trial statuses

Update the `incrementUsage` method to first check if the user has an `active` or `admin_granted` entitlement (including `full_suite`). If so, return `{ allowed: true }` immediately without touching any counters.

This provides a safety net so even if `incrementUsage` is called for a non-trial user, it won't block them.

## Files Changed

| File | Change |
|---|---|
| `src/pages/SnapPro.jsx` | Guard `incrementUsage()` call with `status === 'trial'` check |
| `src/services/entitlementService.js` | Add active/admin_granted check at top of `incrementUsage` |

