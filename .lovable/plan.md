

# Fix: Add JSON to Storage Bucket Allowed MIME Types

## Problem

The `property-files` storage bucket currently only allows these MIME types:
- `image/jpeg`, `image/png`, `image/gif`, `image/webp`
- `application/pdf`, `text/plain`
- `application/msword`, `application/vnd.openxmlformats-officedocument.wordprocessingml.document`

It is **missing** `application/json`, `text/csv`, and `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet` -- which is why `.json` uploads fail.

## Solution

Run a single SQL statement to update the bucket's allowed MIME types to include all file types the Knowledge Base uploader supports, while keeping the existing image types.

## Technical Details

### SQL to execute (database migration)

```text
UPDATE storage.buckets
SET allowed_mime_types = ARRAY[
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'application/pdf',
  'text/plain',
  'text/csv',
  'application/json',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
]
WHERE id = 'property-files';

NOTIFY pgrst, 'reload schema';
```

### What this adds
- `application/json` -- for .json files
- `text/csv` -- for .csv files
- `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet` -- for .xlsx files

### No frontend changes needed
The client-side code already accepts these file types.

