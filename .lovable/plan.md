

# Fix: Align fileUploadService with file_uploads Table Schema

## Problem
The upload code inserts columns that don't exist in the `file_uploads` table, causing the error "Could not find the 'name' column."

## Column Mapping

| Code currently sends | Actual table column | Notes |
|---|---|---|
| `name` | `original_name` | Rename |
| `type` | `file_type` | Rename |
| `size` | `file_size` | Rename |
| `property_id` | `user_id` | Use authenticated user's ID instead |
| `url` | _(does not exist)_ | Store in `metadata` JSON |
| `uploaded_at` | _(does not exist)_ | `created_at` is auto-set |
| `storage_path` | `storage_path` | Already correct |

## Technical Details

### File: `src/services/fileUploadService.js`

Replace the `fileData` object (around line 72) from:

```javascript
const fileData = {
  property_id: propertyId,
  name: file.name,
  type: file.type,
  size: file.size,
  storage_path: storagePath,
  url: publicUrl,
  uploaded_at: new Date().toISOString()
};
```

To:

```javascript
const { data: { user } } = await supabase.auth.getUser();

const fileData = {
  user_id: user.id,
  original_name: file.name,
  file_type: file.type,
  file_size: file.size,
  storage_path: storagePath,
  metadata: {
    property_id: propertyId,
    url: publicUrl
  }
};
```

Also update the delete function to match: the `.eq('storage_path', filePath)` is fine, but remove the `.eq('property_id', propertyId)` filter since the table uses `user_id` not `property_id`. Replace with `.eq('user_id', user.id)`.

### No database changes needed
The table schema is correct as-is. Only the frontend code needs to use the right column names.
