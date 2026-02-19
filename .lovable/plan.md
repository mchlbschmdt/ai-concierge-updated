

# Fix: AI Response Appears Blank on Test Page

## Root Cause

The `sms_conversations` table stores `property_id` as the property **code** (e.g., "1434"), not the property UUID. But the query on line 83 of `UserSmsTest.jsx` filters with `.eq("property_id", selectedProperty)` where `selectedProperty` is the UUID. This always returns 0 rows, so the response is never displayed.

## Solution

Use `property.code` instead of `property.id` when querying `sms_conversations`.

## Technical Details

### File: `src/pages/UserSmsTest.jsx` (line 83)

Change:
```javascript
.eq("property_id", selectedProperty)
```

To:
```javascript
.eq("property_id", property.code)
```

The `property` variable is already resolved on line 58:
```javascript
const property = properties.find(p => p.id === selectedProperty);
```

So `property.code` gives the correct text code that matches `sms_conversations.property_id`.

### Also use `.maybeSingle()` instead of `.single()` (line 86)

Replace `.single()` with `.maybeSingle()` to avoid a 406 error when no conversation exists yet, and show a friendly message instead of a thrown error.

### One file changed, two lines modified

| Line | Before | After |
|---|---|---|
| 83 | `.eq("property_id", selectedProperty)` | `.eq("property_id", property.code)` |
| 86 | `.single()` | `.maybeSingle()` |

Add a fallback message if no conversation is found:
```javascript
if (conversation) {
  setResponse({ message: conversation.last_response, intent: conversation.last_intent });
} else {
  setResponse({ message: "No response recorded. The webhook may not have saved a reply.", intent: "none" });
}
```
