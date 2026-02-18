

# Fix: JSON File Upload Rejected by Storage Bucket

## Problem

The Knowledge Base uploader correctly lists `.json` as a supported file type in the UI, and the client-side validation passes it through. However, when the file reaches Supabase Storage, the `property-files` bucket rejects it because its allowed MIME types do not include `application/json`.

## Solution

Run a SQL migration to update the `property-files` storage bucket configuration to allow all the MIME types that the UI advertises as supported. This ensures the bucket accepts the same file types the client allows.

## Technical Details

### File: New SQL migration

Add a migration that updates the `property-files` bucket's `allowed_mime_types` to include all supported types:

```sql
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
```

### Files Modified (1 file)
1. New migration in `supabase/migrations/` -- update bucket allowed MIME types

No frontend code changes needed -- the client-side already supports `.json`.

