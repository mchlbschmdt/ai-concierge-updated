

# Fix: Test Message Not Processed by Webhook

## Problem

The test page sends a payload with this structure:
```text
{
  data: {
    object: "call",
    type: "message.created",
    body: "can I check in early?",
    from: "+15555555555",
    to: "0404"
  }
}
```

But the webhook expects:
```text
{
  type: "message.received",
  data: {
    object: {
      from: "+15555555555",
      to: "+18333301032",
      body: "can I check in early?",
      direction: "incoming"
    }
  }
}
```

Two mismatches:
1. **Event type**: The webhook checks `payload.type === 'message.received'` at the top level, but the test puts `type` inside `data` and uses `"message.created"` instead of `"message.received"`.
2. **Payload structure**: The webhook reads `payload.data.object` as the message object (with `from`, `to`, `body`, `direction`). The test puts the message fields directly in `data` and sets `object: "call"` as a string.
3. **`to` field**: The webhook validates that `message.to` equals the business phone number (`+18333301032`). The test sends the property code (`"0404"`), which fails this check.

Because the type doesn't match, the webhook returns a generic 200 success without processing anything, and no `sms_conversations` row is created.

## Solution

Fix the test payload in `UserSmsTest.jsx` to match the exact format the webhook expects from OpenPhone.

### File: `src/pages/UserSmsTest.jsx` (lines 62-72)

Change the payload to:
```javascript
const { data, error } = await supabase.functions.invoke("openphone-webhook", {
  body: {
    type: "message.received",
    data: {
      object: {
        id: `test-${Date.now()}`,
        from: testPhone,
        to: BUSINESS_PHONE_NUMBER,
        body: message,
        direction: "incoming",
      },
    },
  },
});
```

Where `BUSINESS_PHONE_NUMBER` is defined as `"+18333301032"` at the top of the file (matching the webhook's constant).

### Also: Update the conversation query to match by phone number and find the latest conversation

The webhook's conversation service creates/updates conversations keyed by `phone_number`, not by `property_id`. Since the test phone is `+15555555555`, the query should find the most recent conversation for that phone number. However, the property code lookup is still useful if the conversation service stores property_id -- keep it as a secondary filter but make it optional by falling back to phone-only lookup if no results.

### One file changed

| Change | Detail |
|---|---|
| Fix test payload structure | Match OpenPhone webhook expected format with `type` at top level, message fields inside `data.object` |
| Use correct `to` number | Send to business phone number, not property code |
| Add business phone constant | `const BUSINESS_PHONE_NUMBER = "+18333301032"` |

