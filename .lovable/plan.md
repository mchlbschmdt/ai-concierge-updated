

# SnapPro Integration into Platform

## Summary

Replace the placeholder SnapPro page with two fully functional pages: a Photo Optimizer (`/snappro/optimize`) with drag-drop upload and AI processing, and a Photo Library (`/snappro/library`) with a grid of processed photos. Both wrapped in `ProductGate`. Requires a new `snappro_images` database table and a new edge function for photo processing.

## Current State

- SnapPro has a placeholder "Coming Soon" page at `/snappro`
- Routes exist for `/snappro` and `/snappro/library` but both render the same placeholder
- Sidebar has two nav items (Photo Optimizer, My Photo Library)
- Product gating infrastructure is ready (`ProductGate`, `useProductAccess`, `incrementUsage`)
- Storage bucket `uploads` exists (private), `avatars` exists (public)
- No `snappro_images` table exists yet

## What Changes

### 1. Database: Create `snappro_images` Table

New migration to create the table for storing processed photo metadata:

```sql
CREATE TABLE public.snappro_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  original_storage_path TEXT NOT NULL,
  processed_storage_path TEXT,
  original_name TEXT NOT NULL,
  file_size BIGINT,
  settings JSONB DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'pending',
  processing_started_at TIMESTAMPTZ,
  processing_completed_at TIMESTAMPTZ
);

ALTER TABLE public.snappro_images ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own images" ON public.snappro_images
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own images" ON public.snappro_images
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own images" ON public.snappro_images
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own images" ON public.snappro_images
  FOR DELETE USING (auth.uid() = user_id);
```

Also create a public storage bucket for processed photos:

```sql
INSERT INTO storage.buckets (id, name, public)
VALUES ('snappro-photos', 'snappro-photos', true);

CREATE POLICY "Users can upload snappro photos"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'snappro-photos' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can view their snappro photos"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'snappro-photos' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their snappro photos"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'snappro-photos' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Public can view snappro photos"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'snappro-photos');
```

### 2. New File: `src/pages/SnapProOptimize.jsx` -- Photo Optimizer Page

The main editor page with:

- **Drag-drop upload zone**: Large dashed-border area accepting image files (JPG, PNG, WEBP). Shows preview after drop.
- **Settings panel** (right side on desktop, below on mobile):
  - Enhancement level: Auto / Light / Medium / Strong (radio buttons)
  - White balance correction toggle
  - Brightness/contrast auto-adjust toggle
  - Output format: JPEG / PNG / WebP dropdown
  - Quality slider (70-100%)
- **Process button**: Uploads original to `snappro-photos` bucket, creates `snappro_images` record, calls `incrementUsage()` for trial users, then simulates processing (for now, copies original as "processed" since actual AI processing requires a separate service)
- **Result display**: Shows processed image with download button
- **Trial counter** (top right): Uses `useProductAccess('snappro')` to show "X of 10 free photos used" for trial users
- Light theme matching the platform design system

### 3. Rewrite: `src/pages/SnapPro.jsx` -- Photo Library Page

Replace the placeholder with a full photo library:

- **Grid layout**: 3 columns on desktop, 2 on tablet, 1 on mobile
- **Each card**: Thumbnail image, date processed, settings badges (enhancement level, format), download button
- **Click to expand**: Modal with larger image view and re-download options (before/after comparison ready for when processing is real)
- **Empty state**: "No photos yet" with CTA to go to optimizer
- **FAB button** (bottom right): Fixed "Process another photo" button linking to `/snappro/optimize`
- **Upgrade nudge**: For trial users at 8+ of 10 uses, show inline amber card suggesting upgrade
- Data source: `snappro_images` table filtered by `user_id`, ordered by `created_at DESC`

### 4. Update: `src/App.jsx` -- Update SnapPro Routes

Replace existing SnapPro routes:

```jsx
<Route path="/snappro" element={<Navigate to="/snappro/optimize" replace />} />
<Route path="/snappro/optimize" element={
  <ProtectedRoute><ProductGate productId="snappro"><SnapProOptimize /></ProductGate></ProtectedRoute>
} />
<Route path="/snappro/library" element={
  <ProtectedRoute><ProductGate productId="snappro"><SnapPro /></ProductGate></ProtectedRoute>
} />
```

### 5. Update: `src/components/Sidebar.jsx` -- Update SnapPro Nav Paths

```
items: [
  { icon: Camera, label: 'Photo Optimizer', path: '/snappro/optimize' },
  { icon: Image, label: 'My Photo Library', path: '/snappro/library' },
],
```

### 6. Update: `src/pages/Dashboard.jsx` -- Fix SnapPro Route References

Update `PRODUCT_ROUTES.snappro` from `/snappro` to `/snappro/optimize` and the action card links accordingly.

### 7. Standalone Access Note

The standalone access flow (photo.rentalprep.com users) is handled by Supabase auth -- same email = same account automatically. No code changes needed for account merging since Supabase handles email-based identity. The `/register` page already creates accounts with trial entitlements for all products (via the `handle_new_user` trigger). Users arriving from photo.rentalprep.com can register normally and will get snappro trial access along with all other trial entitlements.

## Files Changed

| File | Action |
|---|---|
| Database migration | New -- `snappro_images` table + storage bucket |
| `src/pages/SnapProOptimize.jsx` | New -- drag-drop photo optimizer with settings panel |
| `src/pages/SnapPro.jsx` | Rewrite -- photo library grid with expand modal |
| `src/App.jsx` | Edit -- update SnapPro routes |
| `src/components/Sidebar.jsx` | Edit -- update nav path to `/snappro/optimize` |
| `src/pages/Dashboard.jsx` | Edit -- update snappro route reference |

## Implementation Order

1. Run database migration (create `snappro_images` table + storage bucket)
2. Create `src/pages/SnapProOptimize.jsx`
3. Rewrite `src/pages/SnapPro.jsx` as photo library
4. Update routes in `src/App.jsx`
5. Update sidebar nav in `src/components/Sidebar.jsx`
6. Update dashboard links in `src/pages/Dashboard.jsx`

