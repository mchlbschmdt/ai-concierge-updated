

# Feed Uploaded Files into the AI Concierge + Knowledge Base Editor + Quality Ratings

## Problem

The Airbnb JSON files (`messages.json`, `host_quick_replies.json`) uploaded to properties are stored in Supabase Storage and tracked in `file_uploads`, but the AI concierge never reads them. The `PropertyService` only queries the `properties` table's `knowledge_base` text column -- uploaded files are completely invisible to the AI brain.

Additionally, the `AirbnbMessageParser` component references Firebase methods (`doc`, `getDoc`, `updateDoc`) and is non-functional with Supabase.

## Part 1: Feed Uploaded Files to the AI Concierge

### Changes to `supabase/functions/sms-conversation-service/propertyService.ts`

After fetching the property from the `properties` table, also query `file_uploads` for any files linked to that property via `metadata->property_id`. For text-based files (JSON, TXT, CSV), fetch the actual file content from Supabase Storage and append it to the property context.

```text
1. Query file_uploads WHERE metadata->>'property_id' = property.id
2. For each file:
   - Fetch the file content from the storage URL in metadata->>'url'
   - For JSON files: parse and stringify for context
   - For text/CSV: include raw content (truncated to 3000 chars per file)
3. Attach as a new field: property.uploaded_files_content
```

### Changes to `supabase/functions/ai-concierge/index.ts`

Add the uploaded files content to the system prompt under a new section:

```text
=== UPLOADED KNOWLEDGE BASE FILES ===
{property.uploaded_files_content}
```

This gives the AI access to the Airbnb message history and host quick replies, so it can learn from past guest interactions and use the host's own language patterns.

## Part 2: Structured Knowledge Base Editor

### Changes to `src/components/property-forms/AdditionalInfoSection.jsx`

Replace the single "Knowledge Base" textarea with categorized sub-sections:

| Section | Placeholder Example |
|---|---|
| A/C and Climate Control | "Thermostat is on hallway wall. Set to Cool, adjust with arrows." |
| TV and Entertainment | "Samsung Smart TV, use black remote. Netflix pre-logged in." |
| Kitchen and Appliances | "Keurig on counter, pods in drawer. Dishwasher pods under sink." |
| Washer/Dryer | "Stacked in hallway closet. Detergent on shelf." |
| General Notes | Existing free-form knowledge_base content |

On save, all sections are concatenated into the single `knowledge_base` column using markdown headers (e.g., `## A/C and Climate Control`). On load, the existing text is parsed back into sections by splitting on those headers. No database migration needed.

### Changes to `src/components/PropertyEditForm.jsx`

Apply the same structured editor to the edit form for existing properties.

## Part 3: Response Quality Rating System

### New Database Table: `response_quality_ratings`

| Column | Type | Notes |
|---|---|---|
| id | uuid | Primary key |
| property_id | uuid | FK to properties |
| user_id | uuid | Who rated |
| test_message | text | The question asked |
| ai_response | text | The AI response |
| rating | text | "thumbs_up" or "thumbs_down" |
| feedback | text | Optional text feedback |
| created_at | timestamptz | Auto-set |

RLS policy: users can insert and select their own ratings.

### Changes to `src/pages/UserSmsTest.jsx`

- Add ThumbsUp/ThumbsDown icon buttons next to each AI response in the conversation history
- Clicking saves the rating to `response_quality_ratings` via Supabase
- Show a small stats bar at the top: "X responses rated, Y% positive"
- Rated messages show a subtle checkmark so they aren't re-rated

## Part 4: Fix AirbnbMessageParser

### Changes to `src/components/AirbnbMessageParser.jsx`

Replace the broken Firebase calls with Supabase equivalents:
- Instead of writing to Firestore, store parsed messages as a JSON file in Supabase Storage under the property's knowledge base path
- Create a `file_uploads` record linking it to the property
- This makes the parsed Airbnb messages automatically available to the AI concierge (via Part 1)

## Files Changed Summary

| File | Change |
|---|---|
| `supabase/functions/sms-conversation-service/propertyService.ts` | Fetch uploaded files content from storage |
| `supabase/functions/ai-concierge/index.ts` | Add uploaded files section to system prompt |
| `src/components/property-forms/AdditionalInfoSection.jsx` | Structured knowledge base editor |
| `src/components/PropertyEditForm.jsx` | Same structured editor for edit flow |
| `src/pages/UserSmsTest.jsx` | Thumbs up/down rating UI and stats |
| `src/components/AirbnbMessageParser.jsx` | Fix Firebase to Supabase |
| Database migration | New `response_quality_ratings` table |

