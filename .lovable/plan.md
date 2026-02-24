

# Add Stability AI Generative Editing to SnapPro

## Overview

Add Stability AI image-to-image processing as a second stage after Cloudinary in the `process-image` edge function. Cloudinary handles color corrections and resizing; Stability AI handles generative edits like sky replacement and custom prompt-based transformations.

## Prerequisites

A new Supabase secret is required:
- `STABILITY_API_KEY` -- obtain from platform.stability.ai (paid credits required for SD3)

Without this secret, the code gracefully skips Stability AI and returns the Cloudinary-only result. No errors.

## Changes

### File 1: `supabase/functions/process-image/index.ts`

**Add Supabase admin client** (top of file, after corsHeaders):
- Import `createClient` from supabase-js
- Create `supabaseAdmin` using `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` (auto-available in edge functions)

**Add two helper functions** (before `serve()` call):
- `buildSkyPrompt(settings)` -- returns a photorealistic prompt string based on which sky enhancement is enabled (sunsetSky, sunriseSky, dramaticClouds, perfectBlueSky, virtualTwilight)
- `buildStabilityPrompt(settings)` -- combines customPrompt + vibe context + timeOfDay context + quality descriptors into a single prompt string

**Add Stability AI processing block** (after line 148 where `processedUrl` is set, before the final return):
1. Check if sky replacement or generative edit is needed based on `settings.enhancements` flags and `settings.customPrompt` content
2. Read `STABILITY_API_KEY` from env
3. If key exists and processing is needed:
   - Fetch the Cloudinary-processed image as a blob
   - For custom prompt edits: call Stability AI SD3 image-to-image with strength 0.65
   - For sky-only replacement: call with a sky-specific prompt and strength 0.45 (preserves more of original)
   - Upload result to `snappro-photos` storage bucket
   - Set `finalUrl` to the Stability result (or keep Cloudinary URL on failure)
4. All Stability errors are caught and logged -- graceful fallback to Cloudinary result

**Update the return statement** to use `finalUrl` instead of `processedUrl` and include:
- `cloudinaryUrl` (always the Cloudinary result)
- `stabilityAiApplied` boolean
- Updated `processingSteps` array including `stability_ai_generative` when applicable

### File 2: `src/pages/SnapPro.jsx`

**Update the "Processed" label** in the Before/After section (around line 694-698):
- Show "AI Generated" badge (purple) when `processedResult.stabilityAiApplied` is true
- Show "AI Enhanced" badge (green) when Stability was not applied
- This requires storing the full edge function response; currently `processedResult` already contains `fileSizeMB` from the response, so we add `stabilityAiApplied` to it by spreading the process result data into `setProcessedResult`

### File 3: `src/components/snappro/CreativeDirection.jsx`

**Add info box below the Custom tab textarea** explaining what AI can and cannot do:
- Show only when `activeTab === 'custom'`
- Lists capabilities: sky replacement, lighting changes, color grading, style transformations
- Notes limitations: adding specific objects or removing large elements may not produce perfect results

## Technical Details

- Stability AI endpoint: `https://api.stability.ai/v2beta/stable-image/generate/sd3`
- Uses image-to-image mode (not text-to-image) to preserve the original photo structure
- Strength parameter controls how much the AI changes: 0.45 for sky-only, 0.65 for full creative edits
- Negative prompt prevents common AI artifacts (blurry, cartoon, watermark, etc.)
- Results uploaded to existing `snappro-photos` public bucket via service role client

## Files Changed

1. `supabase/functions/process-image/index.ts` -- add Stability AI stage
2. `src/pages/SnapPro.jsx` -- update processed label badges
3. `src/components/snappro/CreativeDirection.jsx` -- add AI capabilities info box
