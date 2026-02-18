

# Fix: "View Details" Shows Wrong Property

## Root Cause

The route `/property/:id` renders `PropertyManager.jsx`, but that component **ignores the URL parameter** completely. It fetches and displays **all** properties in a list. So clicking "View Details" on any property card shows the same full list, with whichever property appears first (Disney/1434) looking like the "selected" one.

## Solution

Update `PropertyManager.jsx` to:
1. Read the `:id` parameter from the URL using `useParams()`
2. When an ID is present, filter to show only that single property
3. Add a "Back to Properties" link for easy navigation
4. Keep the full list behavior when no ID is provided (if the route is used that way elsewhere)

## Technical Details

### File: `src/pages/PropertyManager.jsx`

- Import `useParams` from `react-router-dom`
- Extract `const { id } = useParams()`
- After properties load, filter: `const displayProperties = id ? properties.filter(p => p.id === id) : properties`
- Render `displayProperties` instead of `properties` in the list
- Add a back link to `/properties` at the top when viewing a single property
- Update the page title to show the property name when viewing a single property

This is a small, focused fix -- one file changed, and the routing/data logic stays the same.

