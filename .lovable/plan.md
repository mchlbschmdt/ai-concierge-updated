## Problems observed in 0404 test log

1. **Distance/type inaccuracy for "quick & close" food requests** — AI recommends a sit‑down restaurant and lists an area name (not a real venue) with a fake "~5 min" walk that's actually ~30 min. Root cause: the model is free to invent distances/venue types because we prompt for GPS distance but don't provide it, and we don't constrain by service style when the guest asks for "quick".
2. **Repetition and mixed‑up responses mid‑conversation** — Anti‑repetition/memory still replays partial content and mashes it into new answers.
3. **Fabricated pool amenity for 0404** — Orchestrator has a hard‑coded "The pool is typically accessible during daytime hours…" reply for any pool/swim keyword, regardless of whether the property has a pool. `amenityService` also emits a positive pool response too eagerly.

## Fixes

### A. Recommendation grounding (accuracy for "quick & close")
- **`recommendationService.ts` prompt** — When the guest's message contains quick/fast/close/walk/nearby modifiers, inject explicit constraints:
  - Service style must be **fast‑casual / counter‑service / takeout** (no sit‑down fine dining).
  - Must be an **actual named restaurant** (not a district, plaza, or neighborhood name).
  - Max radius: **1.0 mi walk** or **5 min drive**; if nothing qualifies, respond honestly ("Nothing truly quick within walking distance — closest fast options are X mi away") instead of inventing a walk time.
  - Forbid claiming walk/drive times unless a real distance was supplied by `LocationService`.
- **`perplexityRecommendationService.ts`** — Same "quick modifier" rules; require Perplexity to cite the venue's own listing (Google/Yelp) and return `NO_VERIFIED_RESULTS` when it can't.
- **Post‑processor** — Strip/replace any AI‑authored "X min walk / drive" phrase when `LocationService.getAccurateDistance()` returns null; replace with "distance not verified — want me to check with your host?" rather than a fabricated number.

### B. Pool hallucination for properties without a pool
- **`confirmedMessageOrchestrator.ts` (lines ~908‑909)** — Remove the generic "The pool is typically accessible…" fallback. Replace with a lookup against `property.amenities`; if pool is absent, respond "This unit doesn't have a pool on‑site — want me to point you to the nearest public/resort pool?" If unknown, escalate via handoff (same pattern already added for KB gaps).
- **`amenityService.ts`** — Only return the affirmative pool string when `amenities` explicitly includes "pool". Otherwise return the negative branch. Remove reliance on `special_notes` containing the word "pool" (that matches "no pool" too).
- **`enhancedConversationService.ts` amenity branch (~2005, ~2337)** — Route through the same amenities check before generating any pool copy. No hardcoded pool sentences.

### C. Repetition / mixed responses
- Extend the fallback‑skip filter already added last turn to also cover:
  - Any response containing a pool/amenity sentence when the amenity check was inconclusive (don't store it as "shared fact").
  - Responses whose intent was `general_inquiry` with confidence < 0.6 — do not store as canonical answer for that topic bucket.
- **`conversationalResponseGenerator.ts`** — When the new user message's intent differs from the previous stored intent bucket, clear the "last summary" prefix so it can't be prepended to an unrelated topic (fixes the "responses start getting mixed up").
- **`conversationMemoryManager.ts`** — Cap `shared_information` per topic to the last 2 entries and drop entries older than the last 6 turns to prevent stale content bleeding into new answers.

### D. Admin visibility
- Add a "Hallucinated amenity" flag in `SmsConversationsAdmin.jsx` when a response mentions pool/hot tub/grill but the property record doesn't list it. Surface as a badge and CSV column, similar to the fallback‑loop flag.

## Out of scope
- Real geocoding integration (LocationService still returns null; that's a separate project).
- Rewriting Perplexity provider selection.
- Any DB migrations — this is all edge‑function + admin UI code.

## Files to edit
- `supabase/functions/sms-conversation-service/recommendationService.ts`
- `supabase/functions/sms-conversation-service/perplexityRecommendationService.ts`
- `supabase/functions/sms-conversation-service/confirmedMessageOrchestrator.ts`
- `supabase/functions/sms-conversation-service/amenityService.ts`
- `supabase/functions/sms-conversation-service/enhancedConversationService.ts`
- `supabase/functions/sms-conversation-service/conversationalResponseGenerator.ts`
- `supabase/functions/sms-conversation-service/conversationMemoryManager.ts`
- `src/pages/SmsConversationsAdmin.jsx`
