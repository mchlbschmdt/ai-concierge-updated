

# Build SnapPro Photo Optimizer and Library

The `/snappro` page is currently a "Coming Soon" placeholder. This plan replaces it with the full SnapPro product: a **Photo Optimizer** (drag-and-drop upload with enhancement settings) and a **Photo Library** (gallery of processed images), both gated behind the `snappro` entitlement with a 10-photo trial.

---

## What You'll Get

- **Photo Optimizer** (`/snappro`) -- Drag-and-drop upload area, enhancement settings (brightness, contrast, white balance, HDR), and a process button that uploads to Supabase Storage and tracks usage against trial limits.
- **Photo Library** (`/snappro/library`) -- Grid of all optimized photos with download, delete, and preview actions. Shows before/after comparison if originals are stored.
- **Trial Gating** -- Trial users can process up to 10 photos; after that the upgrade modal appears automatically.

---

## Technical Details

### 1. Database Migration

Create the `snappro_images` table:

| Column | Type | Purpose |
|---|---|---|
| id | uuid (PK) | Image ID |
| user_id | uuid (FK -> auth.users) | Owner |
| original_url | text | Original uploaded image URL |
| optimized_url | text | Processed image URL |
| file_name | text | Original file name |
| file_size | integer | Size in bytes |
| settings | jsonb | Enhancement settings used |
| status | text | pending / processing / completed / failed |
| created_at | timestamptz | Upload time |

RLS policies: users can only see/manage their own images.

Ensure the `snappro-photos` storage bucket exists (public, with size/type limits).

### 2. Photo Optimizer Page (`/snappro`)

Replace the placeholder with a full optimizer UI:

- **Hero section**: "SnapPro Photo Optimizer" heading with usage counter for trial users ("3 of 10 free edits used")
- **Upload zone**: Drag-and-drop area accepting JPG/PNG/WEBP (max 20MB), with file preview
- **Enhancement settings panel**: Toggles/sliders for Auto Enhance, HDR, White Balance, Brightness boost, Virtual Twilight
- **Process button**: Calls `incrementUsage()` from `useProductAccess('snappro')` before uploading; if trial exhausted, shows upgrade modal
- **Recent uploads**: Shows last 5 processed images below the upload area

### 3. Photo Library Page (`/snappro/library`)

- **Grid layout**: Responsive image grid with thumbnails
- **Each card**: Thumbnail, file name, date, file size, status badge
- **Actions**: Download (opens optimized URL), Delete (removes from storage + DB), Preview (lightbox modal)
- **Empty state**: "No photos yet -- head to the Optimizer to get started"
- **Sorting**: Newest first by default

### 4. Routing Updates (`App.jsx`)

- Wrap `/snappro` route with `<ProductGate productId="snappro">` (currently missing the gate)
- Both routes already exist; just need the gate added to the optimizer route

### 5. Files Changed

| File | Action |
|---|---|
| `supabase/migrations/[timestamp].sql` | Create `snappro_images` table + RLS + storage bucket |
| `src/integrations/supabase/types.ts` | Add `snappro_images` type definitions |
| `src/pages/SnapPro.jsx` | Full rewrite -- optimizer UI with upload, settings, processing |
| `src/pages/SnapProLibrary.jsx` | New file -- photo library grid with download/delete |
| `src/App.jsx` | Add ProductGate to `/snappro`, point `/snappro/library` to new component |

