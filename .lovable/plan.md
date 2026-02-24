
# Full Stability AI Tools Integration for SnapPro

## Overview

Add a comprehensive "AI Tools" panel to SnapPro and rewrite the Stability AI pipeline in the edge function to route each tool to the correct Stability AI endpoint. The Cloudinary processing stage remains untouched.

## Changes

### File 1: `supabase/functions/process-image/index.ts` (rewrite Stability AI section)

**Replace** the existing Stability AI block (lines 14-66 helper functions + lines 209-339 pipeline) with:

1. **New helper functions** (replacing `buildSkyPrompt` and `buildStabilityPrompt`):
   - `fetchImageBytes(url)` -- fetches a URL and returns `Uint8Array`
   - `uploadToStorage(bytes, userId, label)` -- uploads to `snappro-photos` bucket, returns public URL or null
   - `callStability(endpoint, formData, apiKey)` -- generic POST to `api.stability.ai/v2beta/stable-image/{endpoint}`, returns `Uint8Array | null`
   - `isSkyPrompt(prompt)` -- checks if a custom prompt is sky-related
   - `buildSkyPromptFromStyle(style, settings, customPrompt)` -- expanded sky prompt builder with styles: sunset, sunrise, cotton_candy, blue_sky, dramatic_clouds, twilight, stormy, overcast
   - `buildGeneralPrompt(settings, customPrompt)` -- combines custom prompt + vibe + timeOfDay + quality descriptors (same logic as current `buildStabilityPrompt`)

2. **New 9-step sequential pipeline** (replaces lines 209-339):
   - Step 1: Background Removal (`edit/remove-background`) -- outputs PNG
   - Step 2: Object Erase via search-and-replace (`edit/search-and-replace`)
   - Step 3: Object Replace (`edit/search-and-replace`)
   - Step 4: Object Recolor (`edit/search-and-recolor`)
   - Step 5: Sky Replacement (`edit/search-and-replace` with `search_prompt: "sky, clouds, atmosphere"`)
   - Step 6: General Creative Edit (`generate/sd3` with strength 0.28, model `sd3.5-large-turbo`) -- only if custom prompt exists and is not sky-related
   - Step 7: Outpaint (`edit/outpaint`) with directional pixel values
   - Step 8: Style Transfer (`control/style`) with fidelity parameter
   - Step 9: AI Upscale (`upscale/conservative`, `upscale/creative`, or `upscale/fast`) -- always last

   Each step feeds `currentUrl` into the next. All steps are wrapped in try/catch for graceful fallback. A `stabilityStepsApplied` array tracks what ran.

3. **Updated response** includes:
   - `optimizedUrl: finalUrl` (last step's output)
   - `cloudinaryUrl: processedUrl` (always the Cloudinary result)
   - `stabilityAiApplied: stabilityStepsApplied.length > 0`
   - `processingSteps` array including all Stability step names

### File 2: `src/pages/SnapPro.jsx` (add AI Tools panel + pass state)

**New state** (line ~128, with other useState declarations):
```
const [aiTools, setAiTools] = useState({...})
```
With keys: skyReplacement, objectRemove, objectReplace, objectRecolor, backgroundRemove, outpaint, upscale, styleTransfer -- each with enabled boolean and relevant config fields.

**New "AI Tools" section** inserted between Enhancement Settings (line ~758) and Creative Direction (line ~760):
- Collapsible card with purple-accented header "AI Tools" and "Powered by Stability AI" badge
- 2-column grid of tool cards (1-column on mobile)
- Each card: icon, name, description, cost badge, toggle or "Configure" button
- Expandable inline config for each tool (sky style chips, object description inputs, color picker, direction selector, upscale mode radio, style transfer file upload)
- Dynamic cost summary bar at bottom

**Tool cards in order:**
1. Sky Replacement -- toggle + style chips (Sunset, Sunrise, Cotton Candy, Blue Sky, Dramatic Clouds, Twilight, Stormy, Custom)
2. Background Remove -- toggle + PNG transparency note
3. Erase Object -- configure button with description input
4. Replace Object -- configure button with search/replace inputs
5. Recolor Object -- configure button with target input + color chips
6. AI Upscale -- toggle + mode radio (Conservative/Creative/Fast)
7. Outpaint/Expand -- toggle + direction selector + amount slider
8. Style Transfer -- upload reference button + strength slider + preset styles

**Style Transfer upload handler**: When user picks a reference image file, immediately upload to `snappro-photos/${userId}/style_ref_${Date.now()}.jpg`, store the public URL in `aiTools.styleTransfer.referenceImageUrl`.

**Pass aiTools to edge function** in both `handleProcess` (line ~375) and `handleReprocess` (line ~470):
```
aiTools: aiTools,
```
added to the settings object.

**Processing steps display**: After the Before/After images, show a row of pill badges for each step from `processResult.processingSteps` with emoji labels (background_removed, object_erased, sky_replaced, creative_edit, outpainted, style_transferred, upscaled_conservative, etc.).

### File 3: No other files changed

CreativeDirection.jsx, PlatformSelector, IterationPanel, VersionHistory, and the database schema remain untouched.

## Technical Details

- Each Stability AI endpoint uses FormData with `Accept: image/*` header
- The pipeline is sequential: cleanup first (bg remove, erase, replace, recolor), then sky, then creative edit, then expand, then style, then upscale last
- Each step downloads the previous step's output via `fetchImageBytes`, sends to Stability, uploads result to storage, and updates `currentUrl`
- All Stability errors are caught per-step -- if one step fails, subsequent steps continue with the last successful URL
- `STABILITY_API_KEY` is already configured in secrets
- No new secrets or database changes needed
- The `snappro-photos` bucket is already public

## Estimated scope

- ~250 lines added to `process-image/index.ts` (replacing ~130 lines)
- ~300 lines added to `SnapPro.jsx` for the AI Tools panel and state management
- Edge function will be redeployed automatically
