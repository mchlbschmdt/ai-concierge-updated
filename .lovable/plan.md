

# Fix: Property Dropdown Empty in Test AI Responses

## Root Cause

All properties in the database have `user_id = NULL`. The `UserSmsTest.jsx` page filters properties with `.eq("user_id", user.id)`, which returns zero results. That's why the dropdown is empty and no property can be selected.

## Solution

Remove the `user_id` filter from the property query in `UserSmsTest.jsx`. Since this is a small deployment (not multi-tenant with strict isolation), all properties should be available to the logged-in user for testing.

## Technical Details

### File: `src/pages/UserSmsTest.jsx` (line ~35)

Change:
```
.eq("user_id", user.id)
```

To: remove this filter entirely, so the query becomes:

```javascript
const { data, error } = await supabase
  .from("properties")
  .select("id, code, property_name, address")
  .order("property_name");
```

Also add a placeholder option so the dropdown is never blank:

```html
<option value="">Select a property...</option>
```

### No other files need to change

The `QuickSmsTest.jsx` component already fetches properties without a `user_id` filter, so it works correctly.

