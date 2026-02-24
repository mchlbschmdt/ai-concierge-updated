
# Fix: Platform Dimensions Not Applied to Processed Image

## Problem

When a platform is selected (e.g., Airbnb Hero at 1920x1280), the processed image output still uses the original uploaded image dimensions. The `processImageCanvas` function (line 129-131) always sets the canvas to the source image's native width/height and never reads the platform's configured output dimensions.

## Root Cause

1. `processImageCanvas` receives only `processingSettings` (enhancement toggles/sliders) -- it has no access to `platformConfig` (which contains `outputWidth`, `outputHeight`, `aspectRatio`)
2. The canvas is created at `img.width` x `img.height` with no resizing step
3. `handleProcess` (line 246) calls `processImageCanvas(originalUrl, settings)` without passing `platformConfig`

## Solution

### File: `src/pages/SnapPro.jsx`

**1. Update `processImageCanvas` signature** to accept an optional dimensions object:

```javascript
const processImageCanvas = async (sourceUrl, processingSettings, outputDims) => {
```

**2. After drawing the source image, resize the canvas** if platform dimensions are specified:

```javascript
img.onload = () => {
  // Start with a temp canvas at original size for processing
  const tempCanvas = document.createElement('canvas');
  tempCanvas.width = img.width;
  tempCanvas.height = img.height;
  const tempCtx = tempCanvas.getContext('2d');
  tempCtx.drawImage(img, 0, 0);

  // ... apply all pixel effects on tempCanvas ...

  // Final output canvas at target dimensions
  const outW = outputDims?.width || img.width;
  const outH = outputDims?.height || img.height;
  const finalCanvas = document.createElement('canvas');
  finalCanvas.width = outW;
  finalCanvas.height = outH;
  const finalCtx = finalCanvas.getContext('2d');
  finalCtx.drawImage(tempCanvas, 0, 0, outW, outH);

  finalCanvas.toBlob((blob) => resolve(blob), 'image/jpeg', 0.92);
};
```

This approach processes the image at its native resolution (preserving quality) and then scales the final output to the target dimensions.

**3. Update `handleProcess`** to pass platform dimensions:

```javascript
const outputDims = platformConfig.outputWidth && platformConfig.outputHeight
  ? { width: platformConfig.outputWidth, height: platformConfig.outputHeight }
  : null;
const processedBlob = await processImageCanvas(originalUrl, settings, outputDims);
```

**4. Update `handleReprocess`** similarly to pass dimensions through.

## Files Changed

| File | Change |
|---|---|
| `src/pages/SnapPro.jsx` | Add `outputDims` parameter to `processImageCanvas`, resize canvas to target dimensions after processing, pass `platformConfig` dimensions from `handleProcess` and `handleReprocess` |

## Additional Fixes (from previous approved plan, bundled here)

These three issues from the prior conversation will also be fixed in this same edit:

**A. Creative Direction tabs not responding** (`CreativeDirection.jsx`): Convert to controlled `Tabs` with `activeTab` state; use native `<button>` for "Apply This Direction"; switch to guided tab on apply.

**B. Sky swap not working** (`SnapPro.jsx`): Add sky color-grade processing block to `processImageCanvas` that applies tinted gradients to the top 35% of the image based on `processingSettings.skySwap` value.

**C. Creative Direction selections not affecting output** (`SnapPro.jsx`): Add `buildProcessingSettings(settings, direction)` helper that maps vibe, time of day, and chip selections to numeric adjustments for brightness/warmth/saturation/contrast. Call this helper before `processImageCanvas` in both `handleProcess` and `handleReprocess`.
