

# Build SnapPro Photo Optimizer and Library

The `/snappro` page is currently a "Coming Soon" placeholder. This plan replaces it with the full SnapPro product.

---

## Step 1: Database Migration

Create the `snappro_images` table and `snappro-photos` storage bucket:

| Column | Type | Purpose |
|---|---|---|
| id | uuid (PK) | Image ID |
| user_id | uuid | Owner |
| original_url | text | Original uploaded image URL |
| optimized_url | text | Processed image URL |
| file_name | text | Original file name |
| file_size | integer | Size in bytes |
| settings | jsonb | Enhancement settings used |
| status | text | pending / processing / completed / failed |
| created_at | timestamptz | Upload time |

RLS policies ensure users can only access their own images. The storage bucket allows uploads up to 20MB (JPG/PNG/WebP).

## Step 2: Photo Optimizer Page (`/snappro`)

Replace the placeholder with:
- Hero section with usage counter for trial users ("3 of 10 free edits used")
- Drag-and-drop upload zone (JPG/PNG/WebP, max 20MB) with file preview
- Enhancement settings: Auto Enhance, HDR, White Balance, Brightness, Virtual Twilight toggles/sliders
- Process button that calls `incrementUsage()` before uploading; blocks if trial exhausted
- Recent uploads section showing last 5 processed images

## Step 3: Photo Library Page (`/snappro/library`)

- Responsive image grid with thumbnails
- Each card: thumbnail, file name, date, status badge
- Actions: Download, Delete (removes from storage + DB), Preview (lightbox)
- Empty state directing users to the Optimizer

## Step 4: Routing Updates (`App.jsx`)

- Wrap `/snappro` and `/snappro/library` routes with `<ProductGate productId="snappro">`

## Files Changed

| File | Action |
|---|---|
| New migration SQL | Create snappro_images table + RLS + storage bucket |
| `src/pages/SnapPro.jsx` | Full rewrite -- optimizer UI |
| `src/pages/SnapProLibrary.jsx` | New file -- photo library grid |
| `src/App.jsx` | Add ProductGate wrapping to snappro routes |

