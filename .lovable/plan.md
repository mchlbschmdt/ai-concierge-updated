

# SnapPro Advanced Photo Editor -- Implementation Plan

This is a major feature expansion spanning new UI components, an AI-powered edge function, database schema changes, and client-side canvas compositing. The work is broken into 4 sections matching the request.

---

## Overview of Changes

| Area | Files | Description |
|---|---|---|
| Database | 1 migration | Add `parent_image_id`, `version_number`, `version_label`, `iteration_prompt` columns to `snappro_images` |
| Edge Function | 1 new function (`snappro-inspire`) | GPT-4o vision call for "Inspire Me" creative suggestions |
| Components | ~8 new files | Platform selector, creative direction engine, iteration panel, overlay builder |
| Main Page | `SnapPro.jsx` rewrite | Integrate all new sections into the existing settings flow |
| Config | `config.toml` | Register the new edge function |

---

## Section 1: Platform Selector

**New file: `src/components/snappro/PlatformSelector.jsx`**

- 9 platform cards in a 3-col grid (2-col mobile) with single-select behavior
- Selected state: blue border, tint, checkmark badge
- Each platform triggers a smooth accordion sub-panel (CSS max-height transition, 300ms ease)

**New file: `src/components/snappro/PlatformSubPanels.jsx`**

- Contains all 9 sub-panel components (Airbnb, VRBO, Instagram, Paid Ads, Email, Print, Website, Video Thumbnail, Custom)
- Each sub-panel renders its specific radio buttons, checkboxes, chips, and inputs
- Platform selection auto-updates a `platformConfig` state object containing: output dimensions, aspect ratio, DPI, format, and auto-applied enhancement toggles
- The "Auto-apply best practices" checkboxes in Airbnb/VRBO panels will programmatically toggle the existing enhancement settings

**Output info box** added below existing settings: shows "Output: WxHpx (ratio) -- DPIdpi -- format" with platform-specific requirement badges.

**State shape:**
```javascript
platformConfig: {
  platform: 'airbnb' | 'vrbo' | 'instagram' | ... ,
  photoType: string,
  outputWidth: number,
  outputHeight: number,
  aspectRatio: string,
  dpi: number,
  format: 'jpeg' | 'webp' | 'png' | 'tiff' | 'pdf',
  subOptions: { ... platform-specific ... },
  overlays: { logo, text, watermark configs }
}
```

---

## Section 2: Creative Direction Engine

**New file: `src/components/snappro/CreativeDirection.jsx`**

Three tabs using the existing Radix tabs component:

### Guided Mode (default)
- Vibe dropdown (9 options) and Time of Day dropdown (7 options)
- Chip grid organized into 4 groups (Lighting, Sky/Outdoors, Style, Remove/Fix) -- max 4 selections
- Selected chips shown as removable tags
- Live "assembled prompt" preview in a gray box that concatenates selections into natural language

### Custom Mode
- Large textarea (max 600 chars) with character counter
- Quick-add phrase chips that insert at cursor position
- "What to AVOID" textarea (becomes negative prompt)
- Reference Style radio buttons

### Inspire Me
- On tab click: uploads original image to storage if not already uploaded, then calls the `snappro-inspire` edge function
- Loading state with spinner
- Displays 4 suggestion cards with emoji, name, description, "Recommended" badge, and "Apply This Direction" button
- "Apply" switches to Guided mode and pre-fills settings
- "Generate 4 more ideas" link for refresh

**New edge function: `supabase/functions/snappro-inspire/index.ts`**

- Receives the image URL and calls Lovable AI gateway (google/gemini-3-flash-preview since it supports vision) with the system prompt from the spec
- Returns 4 creative direction suggestions as JSON
- Uses `LOVABLE_API_KEY` (already available)
- Handles 429/402 rate limit errors

**Config update: `supabase/config.toml`**
```toml
[functions.snappro-inspire]
verify_jwt = false
```

---

## Section 3: Post-Completion Iteration Panel

**New file: `src/components/snappro/IterationPanel.jsx`**

Appears after processing completes, below the before/after view. Contains 4 tabs:

### Quick Tweaks
- 5 sliders (Brightness, Warmth, Saturation, Contrast, Sharpness) with range inputs
- Conditional Sky Blend / Sky Warmth sliders
- "Reset to Default" and "Apply Tweaks" button
- Re-processes using original image + updated settings

### Change Style
- 8 style preset cards in 4-col grid with "Active" / "Try It" states
- Sky swap row with 5 options
- Re-processes with preset settings on click

### Add Overlays (client-side Canvas compositing)

**New file: `src/components/snappro/OverlayBuilder.jsx`**

- Logo section: upload/position/size/opacity controls
- Text overlay: 2 line inputs, font/weight/size/color/shadow/background band controls
- Watermark: text/opacity/position controls
- Live canvas preview thumbnail (~200px)
- "Apply Overlays and Download" button -- composites on canvas, exports as JPEG blob
- "Save to Library" button -- uploads composited blob to storage and inserts new `snappro_images` row with `parent_image_id`

### Ask AI
- Chat thread UI (component state, not persisted)
- Text input with quick-request chips
- Calls Lovable AI gateway via the existing `snappro-inspire` edge function (with a different mode/endpoint) to interpret natural language into settings JSON
- Auto-applies returned settings and re-processes
- Handles "undo", "compare", "keep this one" special commands

**Version History strip** (outside tabs): thumbnail row of all versions (v1, v2, v3...) with labels, blue dot for current, download icon on hover.

---

## Section 4: Database Changes

**Migration SQL:**

```sql
ALTER TABLE public.snappro_images
  ADD COLUMN IF NOT EXISTS parent_image_id uuid REFERENCES public.snappro_images(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS version_number integer DEFAULT 1,
  ADD COLUMN IF NOT EXISTS version_label text,
  ADD COLUMN IF NOT EXISTS iteration_prompt text;
```

No new RLS policies needed -- existing per-user policies cover these columns.

---

## Integration into SnapPro.jsx

The main `SnapPro.jsx` page will be restructured to:

1. Upload zone (unchanged)
2. **Platform Selector** (new -- Section 1)
3. Enhancement Settings (existing toggles preserved)
4. **Creative Direction** (new -- Section 2)
5. Process Photo button (existing)
6. Before/After slider + **Iteration Panel** (new -- Section 3, shown after processing)
7. **Version History** strip (new -- shown when multiple versions exist)
8. Recent Uploads (existing)

The existing `DEFAULT_SETTINGS` object will be extended to include `platform`, `creativeDirection`, and `overlays` keys. The `handleProcess` function will pass all settings to the processing flow. Re-processing from the iteration panel will always reference the original upload URL.

---

## File Summary

| File | Action |
|---|---|
| `supabase/migrations/[timestamp].sql` | New -- add columns to `snappro_images` |
| `supabase/functions/snappro-inspire/index.ts` | New -- AI vision suggestions and chat interpretation |
| `supabase/config.toml` | Edit -- register `snappro-inspire` |
| `src/components/snappro/PlatformSelector.jsx` | New |
| `src/components/snappro/PlatformSubPanels.jsx` | New |
| `src/components/snappro/CreativeDirection.jsx` | New |
| `src/components/snappro/IterationPanel.jsx` | New |
| `src/components/snappro/OverlayBuilder.jsx` | New |
| `src/components/snappro/VersionHistory.jsx` | New |
| `src/components/snappro/StylePresets.jsx` | New |
| `src/components/snappro/AskAiChat.jsx` | New |
| `src/pages/SnapPro.jsx` | Major edit -- integrate all new sections |

---

## Notes

- The "Inspire Me" and "Ask AI" features use the Lovable AI gateway (google/gemini-3-flash-preview) via a single edge function with mode routing. The `LOVABLE_API_KEY` is already configured.
- The actual photo enhancement (color correction, HDR, etc.) currently uses a client-side Canvas processor. The platform/creative direction settings will be stored in the settings JSONB but the Canvas processing logic from the previous plan remains the processing engine. The AI chat just translates natural language to settings adjustments.
- Overlay compositing is intentionally client-side Canvas (logos, text, bands) as specified.
- All re-processing uses the original uploaded file to avoid quality degradation.

