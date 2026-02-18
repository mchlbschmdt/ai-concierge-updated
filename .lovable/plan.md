

# Fix File Upload Flow and Add File Type Badges

## Problems Found

1. **Files never load on page refresh**: `fetchProperties` only queries the `properties` table. Nobody ever fetches from the `file_uploads` table, so `property.files` is always empty after a page reload.
2. **Field name mismatch**: After upload, the service returns `{ original_name, storage_path, file_type, ... }` but `PropertyFilesList` renders `file.name` and `file.path` -- so even newly uploaded files won't display correctly.
3. **No file type badges**: The file list shows a generic icon for every file type.

## Plan

### 1. Load files from `file_uploads` table on property fetch

**File: `src/services/propertyService.js`**

After fetching properties, query `file_uploads` for the current user and group them by `metadata->property_id`. Attach the matching files to each property object as `property.files`.

### 2. Normalize file data shape

**File: `src/hooks/useProperties.js`**

Update `handleFileAdded` to normalize the file data from the upload service into a consistent shape used throughout the app:

```text
{
  name: fileData.original_name,
  path: fileData.storage_path,
  type: fileData.file_type,
  size: fileData.file_size,
  uploaded_at: new Date().toISOString()
}
```

Update `handleFileDeleted` to filter by `file.path` (already does this).

### 3. Add file type badges to the files list

**File: `src/components/PropertyFilesList.jsx`**

- Import `Badge` from `@/components/ui/badge`
- Map the file type string to a short label (JSON, PDF, TXT, CSV, XLSX, DOCX)
- Display a colored badge next to each file name
- Use the file's `type` or fall back to extension parsing from the file name
- Fix the date display to use a simple ISO string instead of `file.uploaded_at?.seconds * 1000`

### 4. Normalize files fetched from the database

**File: `src/services/propertyService.js`**

Create a helper that maps `file_uploads` rows into the normalized shape:

```text
{
  name: row.original_name,
  path: row.storage_path,
  type: row.file_type,
  size: row.file_size,
  uploaded_at: row.created_at
}
```

## Files Changed

| File | Change |
|---|---|
| `src/services/propertyService.js` | Fetch files from `file_uploads` and attach to properties |
| `src/hooks/useProperties.js` | Normalize file data in `handleFileAdded` |
| `src/components/PropertyFilesList.jsx` | Add file type badges, fix field names and date display |

## No database changes needed

The `file_uploads` table schema is already correct. This is purely a frontend data-flow fix.
