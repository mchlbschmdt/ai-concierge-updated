

# Fix: Webhook Signature Verification Still Failing (401)

## Problem
The updated `verifyWebhookSignature` function is still computing an incorrect HMAC, causing every incoming SMS to be rejected with 401. The logs confirm the new code is deployed (v2.1) but signature verification fails silently -- no debug output about what specifically mismatched.

## Root Cause Analysis
The OpenPhone signature format `hmac;1;timestamp;signature` splits into 4 parts, but the code destructures as `[, , timestamp, signature]` skipping index 1 (the version "1"). This is correct. However, there are two likely remaining issues:

1. **The webhook secret may not be base64-encoded** -- the 44-char length is suggestive but not conclusive. The secret could be a raw string that should be used directly as UTF-8.
2. **Body normalization** -- Supabase edge runtime may alter whitespace/encoding when `req.text()` is called, changing the body hash.

## Fix (Two-Part)

### 1. Add bypass using existing `BYPASS_SIGNATURE_VERIFICATION` secret
You already have this secret configured. Add a check at the top of the verification block: if `BYPASS_SIGNATURE_VERIFICATION` is set to `"true"`, skip verification entirely. This unblocks SMS immediately.

### 2. Add debug logging to signature verification
Log the computed vs expected signature so we can diagnose the exact mismatch and fix verification permanently.

### Code Change (openphone-webhook/index.ts, lines 232-260)
```typescript
// Check bypass flag first
const bypassVerification = Deno.env.get('BYPASS_SIGNATURE_VERIFICATION') === 'true';

if (bypassVerification) {
  console.log('⚠️ Signature verification BYPASSED via BYPASS_SIGNATURE_VERIFICATION flag');
} else if (webhookSecret && signature) {
  const isValid = await verifyWebhookSignature(body, signature, webhookSecret);
  if (!isValid) {
    // Return 401
  }
} ...
```

Also add debug logging inside `verifyWebhookSignature` to log computed vs expected signatures so the root cause can be identified and fixed permanently.

## Expected Result
SMS messages from OpenPhone will be accepted immediately (via bypass), and the debug logs will reveal the exact signature mismatch for a permanent fix.

