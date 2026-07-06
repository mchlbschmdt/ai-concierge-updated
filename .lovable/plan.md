## Goal
Replace prompt-only "close & open" guardrails with authoritative Google Maps Platform lookups so recommendations returned by the SMS concierge are (a) verified `OPERATIONAL` and (b) ranked by real distance from the property.

## Approach
Use the existing **Google Maps Platform connector** (gateway-backed, already supported in Lovable). This gives us Places API (New) for search + business status, Geocoding for property coordinates, and Routes API for real driving/walking distance — all through `https://connector-gateway.lovable.dev/google_maps` with `LOVABLE_API_KEY` + `GOOGLE_MAPS_API_KEY`. No user-managed API key needed.

The connector must be linked to the project before the edge function can read `GOOGLE_MAPS_API_KEY`. That link step is the only user action.

## Steps

### 1. Link the Google Maps Platform connector
Call `standard_connectors--connect` with `connector_id: google_maps`. User picks/creates the connection; secrets `LOVABLE_API_KEY` and `GOOGLE_MAPS_API_KEY` become available to edge functions.

### 2. New helper: `googlePlacesService.ts`
Create `supabase/functions/sms-conversation-service/googlePlacesService.ts` with three functions, all going through the gateway:

- `geocodeProperty(address)` → `{lat, lng}` via `/maps/api/geocode/json`. Cache in-memory per invocation.
- `searchNearby({lat, lng, query, category, radiusMeters})` → calls Places API (New) `POST /places/v1/places:searchText` with `locationBias.circle`, `X-Goog-FieldMask: places.id,places.displayName,places.formattedAddress,places.location,places.businessStatus,places.rating,places.userRatingCount,places.priceLevel,places.primaryType,places.currentOpeningHours.openNow`. Filter out any place where `businessStatus !== 'OPERATIONAL'`.
- `computeDistances({origin, destinations, mode})` → `POST /routes/distanceMatrix/v2:computeRouteMatrix` with `travelMode: DRIVE` (and a second pass with `WALK` when the top pick is under ~1500 m). Returns `{distanceMeters, durationSeconds}` per destination.

All calls use `Authorization: Bearer ${LOVABLE_API_KEY}` + `X-Connection-Api-Key: ${GOOGLE_MAPS_API_KEY}`. Every non-ok response surfaces `{status, body}` (per gateway error-handling rules) and the caller degrades gracefully rather than throwing.

### 3. Wire into `recommendationService.ts`
Inside `getEnhancedRecommendations`, when the request category is in `LIVE_LOOKUP_CATEGORIES`:

1. Geocode the property once.
2. Call `searchNearby` with the guest's query mapped to a Places category (`restaurant`, `cafe`, `bar`, `tourist_attraction`, …), radius derived from intent: **1500 m for "quick/close", 8000 m otherwise**.
3. Keep only `OPERATIONAL` results, then call `computeDistances` and sort ascending by `durationSeconds`. Drop anything above the intent's max (5 min drive / 1 mi walk for quick, 15 min drive otherwise).
4. Take top 3, hand them to the existing OpenAI narrative wrapper as **verified facts** (name, address, real distance string like "0.6 mi · 3 min drive", rating). Prompt instructs GPT to use only these venues and the provided distances — no invention.
5. If zero verified results survive, skip Perplexity and return the existing graceful "I couldn't verify open options nearby — want me to text your host?" fallback.

Perplexity stays as a secondary fallback only if the Google Maps call itself fails (network / gateway error), not when it simply returns nothing.

### 4. Post-processing
The existing `scrubClosedVenues()` stays as a defense-in-depth guard on the final string. The regex-based distance-stripping added last turn becomes unnecessary for the Google path (real distances are always present) but stays active for the Perplexity fallback path.

### 5. Admin visibility
Add a `google_verified` boolean to the response metadata stored on the SMS conversation turn, and surface it as a green "Google-verified" badge (plus CSV column) in `src/pages/SmsConversationsAdmin.jsx`, alongside the existing "Closed venue" and "Hallucinated amenity" badges.

### 6. Config
No new secrets to request from the user — the connector provides them. No DB migration. `supabase/config.toml` unchanged (function already exists).

## Files to touch
- **New:** `supabase/functions/sms-conversation-service/googlePlacesService.ts`
- **Edit:** `supabase/functions/sms-conversation-service/recommendationService.ts`
- **Edit:** `src/pages/SmsConversationsAdmin.jsx`

## Out of scope
- Replacing the older `contextual-recommendations` edge function (uses a separate `GOOGLE_PLACES_API_KEY` secret and legacy Places Text Search; not on the SMS concierge hot path).
- Persisting geocoded coordinates to `properties` table (in-memory cache per invocation is enough for now; can be a follow-up if latency shows up in logs).
- Per-user OAuth for Google (workspace-level connector is correct for a server-side concierge).

## User action required
Approve the plan, then approve the Google Maps Platform connection prompt when it appears. After that, everything runs server-side.
