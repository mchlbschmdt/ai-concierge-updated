# Fix issues found in unit 0404 test log

## What went wrong

From `sms-conversation-service` logs (guest +15555555555 at Plentiful Views Atlantis):

1. **"is there any more laundry detergent?"** → responded with `"I want to make sure I give you the right info — let me confirm that for you."`
   - Log: `⚠️ [KB Lock] No KB data for property-specific question — using safe confirmation fallback`
   - Host handoff SMS was sent to the property manager, but the guest was never told. The reply implies the AI is about to answer, then never does.

2. **"I found a sock under the bed"** → responded with `"Just to confirm: i want to make sure i give you the right info — let me confirm that for you. — anything else I can help with?"`
   - Log: `♻️ [Orchestrator] Repetition for "general_info" (0m ago)`
   - Two failures compounded: (a) the previous fallback got stored as "shared information" and (b) the anti-repetition engine replayed it verbatim with a "Just to confirm:" prefix. Result: garbled, useless response.
   - Also: a lost item report was classified as `general_inquiry` with `intent: general_inquiry, confidence: 0.5`. It should be routed as a housekeeping/lost-and-found report, not a KB lookup.

3. **Handoff opacity**: whenever the orchestrator escalates to the host it should tell the guest, not stay silent behind a "let me confirm" line.

## Fixes

### A. Rewrite the KB-empty fallback so it is honest and actionable
File: `supabase/functions/sms-conversation-service/confirmedMessageOrchestrator.ts` (the `[KB Lock] … safe confirmation fallback` branch)

- Replace the current text with something like:
  > "I don't have that on file for {property_name} — I just messaged your host to double-check and they'll follow up shortly. Anything else I can help with in the meantime?"
- Only send this when we are *actually* triggering the host handoff for the same turn, so the guest's message matches the SMS the manager receives.
- Mark this response internally as `response_type: 'handoff_ack'` so downstream logic knows it is not real data.

### B. Stop anti-repetition from replaying fallback / handoff responses
Files: `conversationMemoryManager.ts`, `confirmedMessageOrchestrator.ts`

- When storing `shared_information` / `last_response_summary`, skip entries whose `response_type` is `handoff_ack`, `fallback`, or `clarify`. Only real data-bearing answers become "shared".
- In the repetition guard, if the only prior "share" for this topic is a fallback, do not prepend `"Just to confirm:"` or replay the prior text. Treat the new message as a first-time answer.
- Never re-emit a stored summary that starts with "I want to make sure" / "let me confirm" / "I don't have that on file" — add an explicit deny-list check before replay.

### C. Improve intent classification for lost items and housekeeping reports
File: `supabase/functions/sms-conversation-service/intentRecognitionService.ts` (and `enhancedIntentRouter.ts` if it does a second pass)

- Add a `report_lost_item` / `report_housekeeping_issue` intent with keyword+regex triggers: `found`, `left behind`, `under the bed`, `missing`, `sock`, `earring`, `charger`, `wallet`, `passport`, `stain`, `broken`, `leak`, `not working`.
- Route these intents through the host handoff path (same as restricted intents), never through the FAQ/KB lookup.
- Response template: "Thanks for letting us know — I've flagged this for your host and housekeeping so they can take care of it."
- Include the item text verbatim in the outbound host SMS.

### D. Make host handoffs transparent to the guest
File: `hostContactService.ts` + orchestrator

- Whenever a host SMS is sent, the guest reply for that turn must include a short acknowledgement: "I've looped in your host — they'll follow up shortly." Never emit "let me confirm" alone when a handoff fires.
- Add a single helper `buildHandoffAckMessage(intent, propertyName)` and use it in every handoff site so wording stays consistent.
- Keep the de-duplication window (don't re-alert host on the same intent within N minutes), but *do* still acknowledge to the guest each time.

### E. Prevent the "Just to confirm: i want to make sure…" cascade
File: `conversationalResponseGenerator.ts` (the `Just to confirm:` prefixer)

- Skip the prefix entirely when the base message already contains a hedging phrase (`want to make sure`, `let me confirm`, `don't have that on file`, `looped in your host`).
- Skip the prefix when the prior turn was a `handoff_ack` or `fallback`.

### F. Admin log visibility
File: `src/pages/SmsConversationsAdmin.jsx`

- Add a new detection flag `hasUnhelpfulFallback` = response matches `/want to make sure|let me confirm that for you/i` and no KB/FAQ source recorded. Show as a "Fallback loop" badge next to the existing "Cross-property" / "Auto-approved" flags and include in CSV export. This makes future regressions visible in the admin panel.

## Files touched

- `supabase/functions/sms-conversation-service/confirmedMessageOrchestrator.ts`
- `supabase/functions/sms-conversation-service/conversationMemoryManager.ts`
- `supabase/functions/sms-conversation-service/conversationalResponseGenerator.ts`
- `supabase/functions/sms-conversation-service/intentRecognitionService.ts`
- `supabase/functions/sms-conversation-service/enhancedIntentRouter.ts`
- `supabase/functions/sms-conversation-service/hostContactService.ts`
- `src/pages/SmsConversationsAdmin.jsx`

No database migrations, no new secrets.

## Out of scope

- Rewriting the whole intent classifier (only adding the lost-item / housekeeping intents).
- Changing OpenPhone webhook or handoff routing numbers.
- Recommendation grounding work (already shipped in Wave 2).
