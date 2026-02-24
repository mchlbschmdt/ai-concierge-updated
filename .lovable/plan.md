

# Replace Client-Side Canvas Processing with Cloudinary Edge Function

## Overview

Replace the client-side canvas pixel manipulation in SnapPro with a new `process-image` Supabase Edge Function that uses Cloudinary for professional-quality image processing. This gives real HDR, auto-enhance, sharpening, resizing, and color grading instead of the current "burnt orange filter" approach.

## Prerequisites: Cloudinary Secrets

Three new Supabase secrets are required. They do NOT exist yet:
- `CLOUDINARY_CLOUD_NAME`
- `CLOUDINARY_API_KEY`
- `CLOUDINARY_API_SECRET`

These must be added before the edge function will work. The user needs a free Cloudinary account at cloudinary.com to get these values.

## Changes

### 1. New Edge Function: `supabase/functions/process-image/index.ts`

Create the Cloudinary-powered processing function as specified. It:
- Receives image URL + settings from the client
- Maps enhancement toggles and adjustment sliders to Cloudinary transformations
- Handles dimension/aspect ratio resizing via Cloudinary's `c_fill,g_auto`
- Uploads to Cloudinary with signed authentication
- Returns the processed image URL

Also add to `supabase/config.toml`:
```toml
[functions.process-image]
verify_jwt = false
```

### 2. Update `src/pages/SnapPro.jsx` -- Replace `handleProcess`

Replace the `handleProcess` function (lines 333-388) to:
- Upload original to Supabase Storage (reuses existing `uploadOriginal`)
- Save a DB record with status `processing`
- Call `supabase.functions.invoke("process-image", ...)` with all settings
- Fall back to client-side canvas if the edge function fails (e.g., missing secrets)
- Update the DB record with the processed URL

Key mapping of existing variables to edge function payload:
- `settings` (autoEnhance, hdr, whiteBalance, virtualTwilight, brightness) -- passed directly
- `direction` (vibe, timeOfDay, selectedChips, customPrompt) -- passed as creative direction context
- `platformConfig` (outputWidth, outputHeight, aspectRatio) -- mapped to Cloudinary dimension transforms

### 3. No `imageProcessor.js` import exists

Search confirmed there is no `imageProcessor` import in the codebase. The client-side processing is done inline via `processImageCanvas`. This function will be kept as a **fallback** -- if the edge function returns `fallback: true` (e.g., missing Cloudinary secrets), the client-side canvas path runs instead.

### 4. Update `handleReprocess` similarly

Wire the iteration/reprocess flow through the same edge function, with canvas fallback.

## Technical Notes

- The `processImageCanvas` function (lines 184-331) is NOT deleted -- it becomes the fallback path
- The `buildProcessingSettings` helper (lines 48-106) is still used to merge creative direction into settings for the fallback path
- Platform aspect ratios are mapped in the edge function: `3:2` -> `w_1920,h_1280,c_fill,g_auto`, etc.
- The edge function uses SHA-1 signing for authenticated Cloudinary uploads
- Quality levels: print_ready=95, high_quality=85, web_optimized=75

