

# Fix: Add JSON to Storage Bucket Allowed MIME Types

## Problem
The `property-files` storage bucket is still missing `application/json` from its allowed MIME types. Previous attempts to run the migration were not executed -- the bucket configuration has not changed.

## Solution
Run a SQL update to add the missing MIME types to the bucket. You will see an "Approve" button for the database change -- please click it to apply the fix.

## Technical Details

### SQL Migration (one statement)

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

### What gets added
- `application/json` -- .json files
- `text/csv` -- .csv files  
- `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet` -- .xlsx files

### No frontend code changes needed

### After approval
Try uploading the JSON file again in the Knowledge Base uploader to confirm the fix works.

