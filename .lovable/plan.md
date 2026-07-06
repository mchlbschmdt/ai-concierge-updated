
# Fix SMS Concierge issues surfaced by unit 0404

Unit 0404 = Plentiful Views Atlantis, 404 Ave De La Constitucion, Unit 803, San Juan, PR. Reviewing 40+ turns from that thread found six categories of bugs — none of which are prompt tuning; they are all logic/data-scope leaks in `sms-conversation-service`.

## Bugs confirmed from the transcript

1. **Reunion/Disney data leaked into a San Juan condo.** Parking questions returned "GATED COMMUNITY ACCESS… 1434 Titian Ct" (that string only exists on property 1434 in the DB). Coffee returned "Starbucks just outside the main gate" and "lobby café", waterpark responses assumed Reunion Resort hours, brunch answer referenced Reunion. Root cause: `amenityService.ts`, `locationService.ts`, `contextualResponseService.ts`, `conversationalResponseGenerator.ts`, and `propertyDataExtractorEnhanced.ts` all contain Reunion-specific literals returned with no property gating.
2. **Hallucinated restaurants.** "Café de la Calle", "Bistro Café", "Café Puerto Rico", "Pinky's in Condado" — recommendation service invented venues instead of grounding on `curated_links` or the property address.
3. **Anti-repetition replays wrong prior message.** Guest asked "something more upscale" (brunch follow-up) and got "As I mentioned: oh no — sorry about the sink trouble…". Same pattern for "yes please" replaying an unrelated apology. The replay path in `propertyDataExtractorEnhanced.ts` and `conversationMemoryManager.ts` uses `recentShare.summary` without checking that the recent share matches the current intent.
4. **Restricted intent auto-approved.** Early check-in returned "Done! Your host has been alerted and will follow up" — violates the core rule that early check-in / late checkout / bag drop must escalate to the manager, not be confirmed by the AI.
5. **FAQ regression on garbage.** "where is the garbage?" returned the correct trash chute answer; "where do I take the garbage?" / "where do I throw trash" returned the generic "I still don't have specific information about garbage_info" placeholder. Latest response on record ("I want to make sure I give you the right info — let me confirm that for you.") is a further regression on `ask_garbage`. Synonym/alias coverage is inconsistent.
6. **Duplicate/verbatim replies to distinct questions.** "Where should I park?", "where can you park at Disney?", "where can you park at Magic Kingdom?" all returned the same (wrong) parking dump. No intent differentiation between property-parking vs off-site parking.

## What we'll change

### A. Remove cross-property leakage (highest priority)
- Delete `property1434Data.ts` and every `Property1434Handler.*` call site in `propertyDataExtractor.ts`. This dataset only helps one property and pollutes the shared code paths; property 1434's real facts live in the `properties` row and `knowledge_base`.
- In `amenityService.ts`, `locationService.ts`, `contextualResponseService.ts`, `conversationalResponseGenerator.ts`, `propertyDataExtractorEnhanced.ts`: replace every Reunion / Disney / waterpark / shuttle literal with a lookup from the current `property` object (address, amenities, `knowledge_base`, `curated_links`). If the property has no relevant data, return a neutral "let me check with the host" — never a Reunion string.
- Add a lint-style unit test that greps the built bundle for banned literals (`Reunion`, `Titian`, `1434`, `Magic Kingdom`, `Seven Eagles`) outside of comments.

### B. Ground recommendations, kill hallucinations
- `openai-recommendations` and `perplexityRecommendationService.ts`: require `property.address` + city + `curated_links` in the prompt, and instruct the model to only return venues from the curated set or clearly-real chains. If curated links are empty for the category, respond "I don't have a vetted list for that yet — want me to ask the host?" instead of inventing names.
- Add a post-generation sanity filter: strip any restaurant name that doesn't appear in curated_links AND isn't a known chain, replacing with the curated-fallback message.

### C. Fix the "As I mentioned…" replay
- In `propertyDataExtractorEnhanced.ts` and `conversationMemoryManager.ts`, only trigger a replay when `recentShare.intent === currentIntent`. Otherwise fall through to fresh generation.
- Remove blanket "As I mentioned" strings; keep only the neutral rephrasings already implemented in `confirmedMessageOrchestrator.ts`.

### D. Enforce restricted intents (early check-in / late checkout / bag drop)
- In `enhancedIntentRouter.ts` / `confirmedMessageOrchestrator.ts`, when intent ∈ {`ask_early_checkin`, `ask_late_checkout`, `ask_bag_drop`}: always return the host-handoff response ("I'll check with the host — what time works?") and trigger the manager SMS. Never emit "Done!" or "your host has been alerted and will follow up" from the AI path.
- Add a guard test: feed each restricted phrasing and assert the response does not contain "Done", "confirmed", "approved", "you're all set".

### E. FAQ / knowledge base consistency
- Expand alias map in `faqMatchingService.ts` so garbage/trash/rubbish/dumpster/chute all resolve to the same entry; parking/park/garage/valet resolve together; wifi/internet/network together. Add regression tests for the 0404 phrasings that failed.
- When property `knowledge_base` contains a matching passage (as it does for the trash chute), it must always win over the generic "I still don't have specific information about X" fallback. Fix the ordering in `confirmedMessageOrchestrator.ts` so KB search runs before the generic placeholder.

### F. Distinguish on-site parking vs off-site parking
- In `intentRecognitionService.ts`, classify "where do I park at {Disney/Magic Kingdom/park/beach/venue}" as `ask_offsite_parking`, not `ask_parking`. `ask_offsite_parking` routes to recommendations (or "I don't have parking info for that venue — check their site") instead of dumping the property's parking instructions.

### G. Admin visibility
- Add a "Reunion leakage" flag in `SmsConversationsAdmin.jsx` (regex on `last_response` for banned literals) so we can spot any residual contamination in-app.
- Add a "Restricted-intent auto-approved" flag (regex on `last_response` for approval language when `last_intent` is restricted).

## Files to touch

```text
supabase/functions/sms-conversation-service/
  amenityService.ts
  locationService.ts
  contextualResponseService.ts
  conversationalResponseGenerator.ts
  conversationMemoryManager.ts
  confirmedMessageOrchestrator.ts
  propertyDataExtractor.ts
  propertyDataExtractorEnhanced.ts
  intentRecognitionService.ts
  enhancedIntentRouter.ts
  faqMatchingService.ts
  property1434Data.ts             (DELETE)
supabase/functions/openai-recommendations/
  enhancedPromptBuilders.ts
  openaiService.ts
src/components/conversations/
  ConversationDetailModal.jsx     (surface new flags)
src/pages/SmsConversationsAdmin.jsx (compute new flags)
```

No DB migration needed. No new secrets.

## Out of scope
- Prompt/persona rewrites (the persona is fine; the data plumbing is the problem).
- Backfilling old conversation rows.
- Fixing zero live traffic (app not public yet).
- SnapPro / Academy / Analytics.

## Verification
- Re-run the exact 0404 transcript against the updated service in a test harness; assert no "Reunion/Titian/Magic Kingdom" tokens, no "Done!/approved" on restricted intents, garbage synonyms all return the trash-chute answer, and brunch follow-up doesn't replay the sink apology.
- Add the flag columns to the admin table and confirm 0404's row shows clean once fixes deploy.
