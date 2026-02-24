
# SnapPro.jsx Targeted Changes

## Change 1: Fix handleProcess and handleReprocess to pass ALL settings

Replace the edge function call in `handleProcess` (lines 367-392) to use `buildProcessingSettings` for merged adjustments and pass full enhancements, vibe, timeOfDay, selectedChips, and customPrompt.

Apply the same pattern to `handleReprocess` (lines 444-468) -- add `buildProcessingSettings` call and pass full enhancements/adjustments.

## Change 2: Download button in Before/After section

Replace the Before/After block (lines 656-668) with the enhanced version that includes:
- Download button in the header row
- "AI Enhanced" badge on processed image label
- Download for Web / Download Full Size / Copy Link footer row

## Change 3: Wider layout + two-column grid when file is selected

- Line 546: Change `max-w-4xl` to `max-w-6xl` and remove `space-y-8`
- Restructure the JSX so:
  - Header stays full-width with `mb-6`
  - Upload zone is centered `max-w-2xl mx-auto` when no file
  - When file is selected, a `grid grid-cols-1 lg:grid-cols-2 gap-6` splits: left column (upload preview + results + version history, sticky) and right column (PlatformSelector, Enhancement Settings, CreativeDirection, Process Button, IterationPanel)
  - Recent Uploads stays full-width below with `mt-6`

## Change 4: Stop silent canvas fallback for credential errors

Replace the fallback block in `handleProcess` (lines 396-414) to:
- Throw a clear error if message contains "Cloudinary" or "credentials" or "not configured"
- For other errors, show `toast.warning` and proceed with canvas fallback
- Track fallback state via new `usingCanvasFallback` useState

Apply same logic to `handleReprocess` fallback (lines 472-485).

## Additional: Fallback warning banner

Add `usingCanvasFallback` state variable. Show amber warning banner below header when true, with link to cloudinary.com. Set to `true` when canvas fallback runs, `false` when Cloudinary succeeds.

## Files changed

- `src/pages/SnapPro.jsx` only -- no other files touched
