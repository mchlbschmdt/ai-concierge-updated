

# Fix: Allow JSON Uploads in Storage Bucket

## What's Happening

The `property-files` storage bucket in Supabase is rejecting `.json` files because `application/json` is not in its allowed MIME types list. The migration to fix this was not executed previously.

## Steps

1. **Run SQL migration** to update the `property-files` bucket's `allowed_mime_types` to include all file types the UI supports:
   - `application/pdf`
   - `application/vnd.openxmlformats-officedocument.wordprocessingml.document` (DOCX)
   - `text/plain` (TXT)
   - `text/csv` (CSV)
   - `application/json` (JSON)
   - `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet` (XLSX)

2. **Notify PostgREST to reload its schema cache** so the updated bucket configuration takes effect immediately. Without this step, the old restrictions may persist due to caching.

## Technical Details

### Migration SQL

```text
UPDATE storage.buckets
SET allowed_mime_types = ARRAY[
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain',
  'text/csv',
  'application/json',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
]
WHERE id = 'property-files';

NOTIFY pgrst, 'reload schema';
```

### Files Changed
- One new SQL migration file (no frontend code changes needed)

