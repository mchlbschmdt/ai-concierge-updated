

# AI Concierge Product Section Rebuild

## Summary

Restructure AI Concierge pages under `/concierge/*` routes, enhance the Properties and Messages pages with concierge-specific data (SMS status, response counts, property filters, AI vs manual badges), and integrate trial usage tracking into the Test AI Responses page.

## What Changes

### 1. New Routes Under `/concierge/*`

Add new concierge-namespaced routes in `src/App.jsx`. Keep existing routes as redirects for backward compatibility.

| New Route | Page | Gated? |
|---|---|---|
| `/concierge/properties` | `Properties` (existing, enhanced) | Yes, `ai_concierge` |
| `/concierge/messages` | `MessagesDashboard` (enhanced) | Yes, `ai_concierge` |
| `/concierge/test` | `UserSmsTest` (enhanced) | Yes, `ai_concierge` |
| `/concierge/knowledge-base` | `KnowledgeBaseEditor` (existing) | Yes, `ai_concierge` |
| `/concierge/faq` | `FaqEditor` (existing) | Yes, `ai_concierge` |
| `/concierge/travel-guide` | `TravelGuideAdmin` (existing) | Yes, `ai_concierge` |

The existing `/properties` route stays as-is (it's the general properties page, not gated). The `/concierge/properties` route wraps the same Properties component inside `ProductGate`.

### 2. Update: `src/components/Sidebar.jsx`

Update the AI Concierge nav items to use new `/concierge/*` paths:

```
items: [
  { icon: Building2, label: 'Properties', path: '/concierge/properties' },
  { icon: Users, label: 'Guests', path: '/guests' },
  { icon: MessageSquare, label: 'Messages', path: '/concierge/messages' },
  { icon: Mail, label: 'Email Management', path: '/email-management' },
  { icon: FileText, label: 'Knowledge Base', path: '/concierge/knowledge-base' },
  { icon: HelpCircle, label: 'FAQ Editor', path: '/concierge/faq' },
  { icon: MapPin, label: 'Travel Guide', path: '/concierge/travel-guide' },
  { icon: TestTube, label: 'Test AI Responses', path: '/concierge/test' },
],
```

### 3. Update: `src/components/properties/PropertyGridCard.jsx`

Add SMS status badge and monthly response count to each card:
- **SMS Status**: A small badge showing "SMS Active" (green) or "SMS Inactive" (gray). Based on whether the property has any `sms_conversations` records. For now, show a static "SMS Ready" badge since the data join would require an additional query -- can be enhanced later.
- **Response count**: "X responses this month" text, queried from `sms_conversation_messages` count for this property's code in the current month. Added as a new line below the address.
- Keep existing card design (accent bar, inline edit, file count, view details link).

### 4. Update: `src/pages/MessagesDashboard.jsx`

Add a property filter dropdown at the top of the messages page:
- Fetch user's properties from `properties` table
- Add a `<select>` dropdown: "All Properties" + each property name
- Filter messages by `sms_conversations.property_id` matching the selected property code
- Add a small badge on each message indicating "AI" (role=assistant) vs "Guest" (role=user) to show which messages were AI-handled vs manual

### 5. Update: `src/pages/UserSmsTest.jsx`

Integrate trial usage tracking:
- Import `useProductAccess` hook
- Call `incrementUsage()` before each test response is sent
- If `{ allowed: false }` is returned, abort the test (upgrade modal shows automatically)
- Add a prominent usage counter at the top: "Test response X of Y free" using `usageCount` and `trialUsesRemaining` from the hook
- For active/paid users, the counter is hidden (no limit)
- The counter shows as a styled banner similar to ProductGate's trial banner

### 6. Update: `src/App.jsx`

Add the new `/concierge/*` routes, all wrapped with `ProtectedRoute` and `ProductGate`:

```jsx
{/* AI Concierge - gated under /concierge */}
<Route path="/concierge/properties" element={
  <ProtectedRoute><ProductGate productId="ai_concierge"><Properties /></ProductGate></ProtectedRoute>
} />
<Route path="/concierge/messages" element={
  <ProtectedRoute><ProductGate productId="ai_concierge"><MessagesDashboard /></ProductGate></ProtectedRoute>
} />
<Route path="/concierge/test" element={
  <ProtectedRoute><ProductGate productId="ai_concierge"><UserSmsTest /></ProductGate></ProtectedRoute>
} />
<Route path="/concierge/knowledge-base" element={
  <ProtectedRoute><ProductGate productId="ai_concierge"><KnowledgeBaseEditor /></ProductGate></ProtectedRoute>
} />
<Route path="/concierge/faq" element={
  <ProtectedRoute><ProductGate productId="ai_concierge"><FaqEditor /></ProductGate></ProtectedRoute>
} />
<Route path="/concierge/travel-guide" element={
  <ProtectedRoute><ProductGate productId="ai_concierge"><TravelGuideAdmin /></ProductGate></ProtectedRoute>
} />
```

Keep the old `/messages`, `/test-responses`, `/knowledge-base`, `/faq-editor`, `/travel-admin` routes as `<Navigate>` redirects to the new paths for backward compatibility.

## Technical Details

### PropertyGridCard SMS Response Count

Query approach: Add a `useEffect` in `PropertyGridCard` that fetches the count of `sms_conversation_messages` for the property's code in the current month:

```js
const { count } = await supabase
  .from('sms_conversation_messages')
  .select('*', { count: 'exact', head: true })
  .eq('sms_conversations.property_id', property.code);
```

Since this is a join query, it's simpler to pass the count as a prop from the parent or use a lightweight query. For performance, we'll add a `responsesThisMonth` field that's fetched at the Properties page level and passed down.

### UserSmsTest Usage Tracking

```js
const { incrementUsage, usageCount, trialUsesRemaining, status } = useProductAccess('ai_concierge');

const testResponse = async (message) => {
  // Check usage before sending
  if (status === 'trial') {
    const result = await incrementUsage();
    if (!result.allowed) return; // Modal shown automatically
  }
  // ... existing test logic
};
```

### Messages Property Filter

Add a `propertyFilter` state and a select dropdown. The existing `filtered` variable will additionally filter by property:

```js
const [propertyFilter, setPropertyFilter] = useState('all');

const filtered = messages.filter(msg => {
  const matchesSearch = !search || ...;
  const matchesProperty = propertyFilter === 'all' || msg.property_name === propertyFilter;
  return matchesSearch && matchesProperty;
});
```

## Files Changed

| File | Action |
|---|---|
| `src/App.jsx` | Add `/concierge/*` routes, redirect old routes |
| `src/components/Sidebar.jsx` | Update AI Concierge nav paths to `/concierge/*` |
| `src/components/properties/PropertyGridCard.jsx` | Add SMS status badge and response count |
| `src/pages/MessagesDashboard.jsx` | Add property filter dropdown and AI/Guest badges |
| `src/pages/UserSmsTest.jsx` | Add trial usage tracking with `incrementUsage()` |

## Implementation Order

1. Update `src/App.jsx` -- add concierge routes and redirects
2. Update `src/components/Sidebar.jsx` -- update nav paths
3. Update `src/components/properties/PropertyGridCard.jsx` -- add badges
4. Update `src/pages/MessagesDashboard.jsx` -- add property filter
5. Update `src/pages/UserSmsTest.jsx` -- add usage tracking

