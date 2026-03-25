

# Plan: Support FAQ JSON Paste Import

## Problem
The user is pasting structured FAQ JSON (with `add_faqs` key) into the Airbnb Message Parser on the Messages tab. That parser only understands `messages` arrays, so it fails with "Could not find message array in JSON data." The Knowledge Base tab has file import but no paste area.

## Changes

### 1. Add JSON paste import to PropertyFaqTab.jsx
Add a textarea + button (similar to AirbnbMessageParser) in the Knowledge Base tab that:
- Accepts pasted JSON with `add_faqs` or `faqs` or `entries` array formats
- Parses each entry and inserts rows into `faq_entries` with the property's UUID
- Shows success count or error feedback

### 2. Update AirbnbMessageParser to detect FAQ format
When the pasted JSON contains `add_faqs`, `faqs`, or `entries` keys (and no `messages` key):
- Show a helpful toast: "This looks like FAQ data. Please use the Knowledge Base tab to import it."
- Prevent the misleading "Could not find message array" error

### Files Modified
1. `src/components/PropertyFaqTab.jsx` — add paste-to-import textarea section above the existing table
2. `src/components/AirbnbMessageParser.jsx` — add FAQ format detection with redirect message

