

# Fix: SMS Messages Not Getting Responses

## Root Cause

The `openphone-webhook` edge function is **rejecting every incoming SMS** with a 401 error because webhook signature verification always fails.

The bug is in `verifyWebhookSignature`: the OpenPhone webhook secret is a **base64-encoded** signing key, but the code uses it as a raw UTF-8 string. Per OpenPhone's docs (now Quo), step 3 is "Decode signing key from base64", then use the binary key for HMAC-SHA256. The current code skips this decode step, so no computed signature ever matches.

The secret length of 44 characters (visible in logs) confirms it's a base64-encoded 32-byte key.

## Fix

### 1. Fix signature verification in `openphone-webhook/index.ts`

Replace the `verifyWebhookSignature` function to:
- **Base64-decode the webhook secret** before using it as the HMAC key
- Use the correct signed data format: `timestamp + "." + body`
- Remove the verbose multi-approach guessing logic -- only the correct algorithm is needed
- Keep one clean verification path

```typescript
async function verifyWebhookSignature(body: string, signature: string, secret: string): Promise<boolean> {
  const parts = signature.split(';');
  if (parts.length !== 4 || parts[0] !== 'hmac') return false;

  const [, , timestamp, providedSignature] = parts;
  const payload = timestamp + '.' + body;

  // Key step: base64-decode the secret before using as HMAC key
  const keyBytes = Uint8Array.from(atob(secret), c => c.charCodeAt(0));

  const key = await crypto.subtle.importKey(
    'raw', keyBytes,
    { name: 'HMAC', hash: 'SHA-256' },
    false, ['sign']
  );

  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(payload));
  const computed = btoa(String.fromCharCode(...new Uint8Array(sig)));

  return computed === providedSignature;
}
```

### 2. Clean up excessive debug logging

Remove the ~100 lines of verbose signature debug logging. Keep a single success/fail log line.

### 3. Redeploy the edge function

Deploy the updated `openphone-webhook` function so real SMS messages from OpenPhone are accepted and processed.

## Expected Result

After this fix, incoming SMS messages will pass signature verification, be forwarded to `sms-conversation-service`, and generate responses back to the guest.

