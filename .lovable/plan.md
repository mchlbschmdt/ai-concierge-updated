

# Fix: Complete the Test Response Flow

## What's Happening Now

The payload fix is working -- the webhook correctly receives and processes messages. But two problems remain:

1. **The conversation requires a property code first.** The SMS concierge uses a state machine: guests must text their property code (e.g., "0404") before asking questions. The test page skips this step and sends the question directly, so the system responds with "I couldn't find property [your question]."

2. **The AI response isn't captured.** The webhook generates a response but doesn't save `last_response` back to the database consistently. The test page queries `sms_conversations.last_response` which remains empty.

## Solution

Restructure the test page to call the `sms-conversation-service` edge function directly (instead of going through `openphone-webhook`). This function accepts a `processMessage` action that returns the AI response in the HTTP response body -- no need to query the database afterward.

### Changes to `src/pages/UserSmsTest.jsx`

**Step 1: Set up the conversation with the property code first**

Before sending the user's test message, automatically send the property code to establish the conversation context:

```text
1. Call sms-conversation-service with action: "processMessage", phoneNumber: testPhone, message: property.code
2. Wait for confirmation response
3. If state is "awaiting_confirmation", send "Y" to confirm
4. Then send the actual test message
5. Display the response from step 4
```

**Step 2: Use the direct response from the edge function**

Instead of querying `sms_conversations.last_response` after a 2-second delay, read the response directly from the edge function's return value:

```javascript
const { data } = await supabase.functions.invoke("sms-conversation-service", {
  body: {
    action: "processMessage",
    phoneNumber: testPhone,
    message: message,
  },
});
// data.response contains the AI's reply text
setResponse({ message: data.response, intent: data.intent || "unknown" });
```

**Step 3: Add a "Reset Conversation" step before each test**

Call the `forceResetMemory` action before each test to ensure a clean state, then walk through the property code flow:

```javascript
// Step 1: Reset conversation memory
await supabase.functions.invoke("sms-conversation-service", {
  body: { action: "forceResetMemory", phoneNumber: testPhone }
});

// Step 2: Send property code
await supabase.functions.invoke("sms-conversation-service", {
  body: { action: "processMessage", phoneNumber: testPhone, message: property.code }
});

// Step 3: Confirm property
await supabase.functions.invoke("sms-conversation-service", {
  body: { action: "processMessage", phoneNumber: testPhone, message: "Y" }
});

// Step 4: Send actual question and capture response
const { data } = await supabase.functions.invoke("sms-conversation-service", {
  body: { action: "processMessage", phoneNumber: testPhone, message: userMessage }
});

setResponse({ message: data.response, intent: "detected" });
```

### UI Updates

- Show a progress indicator during the multi-step setup ("Setting up property... Confirming... Sending question...")
- Remove the 2-second `setTimeout` delay and database query since the response comes directly from the edge function
- Keep the existing property dropdown and quick test scenarios unchanged

### Summary

| What | Before | After |
|---|---|---|
| Edge function called | `openphone-webhook` | `sms-conversation-service` (direct) |
| Property setup | Skipped (caused errors) | Auto-sends code + confirmation |
| Response capture | Query DB after 2s delay | Read from edge function return |
| Conversation reset | Not done | `forceResetMemory` before each test |

### One file changed: `src/pages/UserSmsTest.jsx`
