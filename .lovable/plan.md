## Problem

Restaurant recommendations for 0404 still miss on two dimensions:
1. **Distance** — model recommends places that aren't actually close, despite the "quick/close" guardrails already added.
2. **Operating status** — one recommendation was permanently closed. Nothing in the pipeline verifies a venue is still open.

Root cause: the current path relies on `openai-recommendations` (GPT with no live web/search grounding) as the primary generator. Perplexity (which does have live search) is only a fallback and uses an outdated model (`llama-3.1-sonar-small-128k-online`). GPT invents plausible-sounding names/distances and has no way to know a business closed.

## Fixes

### A. Flip the provider priority for local recs — Perplexity first, GPT only as narrative wrapper
- **`recommendationService.ts`** — In `getEnhancedRecommendations`, when `requestType` is a local-place category (`dinner`, `restaurant`, `food`, `coffee`, `cafe`, `attractions`, `activities`, `things to do`, `bar`, `nightlife`), call `PerplexityRecommendationService.getLocalRecommendations` FIRST. Only fall back to the `openai-recommendations` edge function if Perplexity throws or returns `NO_VERIFIED_RESULTS`.
- Keep all existing rejection/memory/validation logic wrapping the result.

### B. Upgrade Perplexity model + add "currently operating" + real-distance guardrails
- **`perplexityRecommendationService.ts`**
  - Switch model from `llama-3.1-sonar-small-128k-online` (deprecated) to `sonar` (or `sonar-pro` for the recs call — better multi-source grounding).
  - Add to the system prompt: "Only return businesses that are CURRENTLY OPERATING. Do not return any place marked 'Permanently closed', 'Temporarily closed', or without a recent (last 90 days) review/activity signal. If uncertain, exclude it."
  - Require each pick to include an approximate distance in miles AND the source domain used to verify it's open (Google Maps/Yelp/TripAdvisor listing). Reject picks the model can't cite.
  - Tighten `NO_VERIFIED_RESULTS` trigger: also emit it when fewer than 1 pick survives the open-status filter.
  - Add `search_recency_filter: 'month'` and `search_domain_filter: ['google.com','yelp.com','tripadvisor.com','opentable.com','maps.google.com']` to the request body so citations come from listing sites, not blog posts.

### C. Post-response scrub for closure/distance red flags
- **`recommendationService.ts`** — After the final recommendation string is assembled (both Perplexity and GPT paths), run a light regex scrub:
  - If response contains `permanently closed`, `temporarily closed`, `closed for renovation`, drop that pick or replace the whole response with a graceful "I couldn't verify open options nearby right now — want me to text your host?"
  - Strip any absolute distance claim (`\d+\s?(min|minute)s?\s?(walk|drive)`) when the response also contains area/district language without a specific street name — replaces with `approx` phrasing already used in section A of the previous plan.

### D. Admin visibility
- **`src/pages/SmsConversationsAdmin.jsx`** — Add a `hasClosedVenueMention` flag (regex: `permanently closed|temp(orarily)? closed|closed for renovation`). Surface as a red "Closed venue" badge and CSV column, alongside the existing fallback/hallucinated-amenity badges.

## Out of scope
- Adding a Google Places / Yelp Fusion connector for authoritative open-status lookups (would be a real fix but requires the user to link a new connector — call it out in the follow-up).
- Real geocoding for accurate distances (still deferred).
- Any DB migrations.

## Files to edit
- `supabase/functions/sms-conversation-service/recommendationService.ts`
- `supabase/functions/sms-conversation-service/perplexityRecommendationService.ts`
- `src/pages/SmsConversationsAdmin.jsx`

## Follow-up to raise with user after implementation
Recommend linking a **Google Places** (or Yelp) connector so the AI can verify `business_status = OPERATIONAL` and pull real driving/walking distance from the property's coordinates — that's the only durable fix for both complaints. Perplexity + prompt guardrails reduce the failure rate but can't eliminate it.
