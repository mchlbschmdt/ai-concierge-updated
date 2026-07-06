# Fix conversations module + improve guest relevance

Since the app isn't public yet, skipping issue #1 (no live traffic). Addressing the remaining code issues and tightening the guest-facing response quality.

## 1. Fix `SmsConversationsAdmin.jsx`

**Realtime channel leak** — `useEffect` currently ignores the cleanup returned by `subscribeToChanges()`. Move the channel setup inline into the effect and return `supabase.removeChannel(channel)`. Split into two effects so filter/page changes only re-run `loadConversations`, not the realtime subscription.

**Stats accuracy** — `ConversationStats` currently reflects only the current page (max 20). Fetch aggregate counts server-side (total, confirmed, active-24h, top intent) via a lightweight `sms_conversations` count query and pass those to `ConversationStats` instead of the page slice.

**Search sanitization** — Escape `%`, `,`, `(`, `)` in `searchQuery` before interpolating into `.or()`. Also debounce search input (300ms) and trigger `loadConversations` on change.

**State filter UI** — Add a multi-select or checkbox group in `ConversationFilters` for `conversation_state` (Confirmed / Awaiting Property ID / Awaiting Confirmation) wired to `filters.states`.

**Semantic colors** — Replace hardcoded `bg-blue-50`, `bg-green-50`, `bg-yellow-50`, `bg-purple-50`, `text-white` in `ConversationStats` and `ConversationStateBadge` with design tokens (`bg-primary/10`, `bg-success/10`, `bg-warning/10`, `bg-secondary/10`, `text-primary-foreground`, etc.) per the core design-system rule.

## 2. Improve guest response relevance

Reviewed the confirmed conversations — responses are on-brand but a few gaps hurt relevance:

**a. Add "Response Quality" column + filter to admin**
Surface `response_quality_ratings` join in the table so admins can spot low-rated responses at a glance. Add a "Needs review" filter for conversations with a rating ≤ 2 or `last_response IS NULL` after a guest message.

**b. Show conversation freshness prominently**
Add a "Stale" tag for conversations where `awaiting_property_id` state has persisted > 10 minutes without resolution (currently 6 of 11 stuck). Helps identify property-code prompt failures.

**c. Detail modal: side-by-side transcript with intent + provenance**
Enhance `ConversationDetailModal` to render the full `sms_conversation_messages` thread (guest ↔ AI) with each AI turn labeled by intent + source (FAQ direct / FAQ rephrase / AI context / fallback — from the existing provenance metadata). Makes it obvious when the AI drifted off-topic or repeated itself.

**d. "Minimum necessary answer" audit view**
The Luxury Concierge persona rule requires pruning replies to answer only the detected intent. Add a small heuristic flag in the admin (response length > 400 chars OR contains >2 emojis OR includes info unrelated to `last_intent`) so admins can quickly spot data-dumpy replies for prompt tuning.

**e. Confirmed but no intent captured**
1 of 5 confirmed conversations has NULL `last_intent`. Backfill isn't feasible for old rows, but verify `ai-concierge` always writes `last_intent` on response — add a check in the edge function and log a warning if intent classification returns empty for a confirmed conversation.

## Technical details

- **Files changed:** `src/pages/SmsConversationsAdmin.jsx`, `src/components/conversations/ConversationStats.jsx`, `src/components/conversations/ConversationFilters.jsx`, `src/components/conversations/ConversationStateBadge.jsx`, `src/components/conversations/ConversationDetailModal.jsx`, `src/components/conversations/IntentTag.jsx`
- **Edge function:** `supabase/functions/ai-concierge/index.ts` — add intent-empty warning log; no behavior change
- **No DB migrations** — all data already exists in `sms_conversations`, `sms_conversation_messages`, `response_quality_ratings`
- **No new dependencies**

## Out of scope
- Diagnosing zero live traffic (deferred until app is public)
- Changing the AI prompt/persona itself — this is admin visibility + guardrails only
- Editing older NULL-intent rows
