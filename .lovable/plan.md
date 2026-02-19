

# Overhaul: AI-First Smart Concierge Response System

## The Problem

The current system uses a rigid keyword-matching pipeline (3,081 lines of if/else chains) to classify guest messages. When a question like "How can I turn the A/C down?" doesn't match any keyword list, it falls through to a generic food recommendation fallback -- completely wrong. The system has 40+ hardcoded intent categories but can't handle natural language that doesn't fit a predefined bucket.

## The Solution

Replace the keyword-first architecture with an **AI-first approach**: send every confirmed-state message to an LLM that has the full property context (knowledge base, amenities, local recommendations, conversation history). The AI acts as the concierge brain, and the system only falls back to keyword matching for simple lookups (wifi password, checkout time) as a fast-path optimization.

## Architecture

### Current Flow (Broken)
```text
Message -> Keyword Intent Detection (895 lines)
        -> 40+ if/else branches (3081 lines)
        -> Maybe hits AI for food recs
        -> Usually hits generic fallback
```

### New Flow
```text
Message -> Quick Property Data Check (wifi, parking, checkout = instant answer)
        -> If not a quick lookup: AI Concierge (with full property context + conversation history)
        -> AI generates natural, contextual response
        -> Update conversation memory
```

## Technical Changes

### 1. New Edge Function: `ai-concierge` (New File)

A clean edge function that wraps the existing OpenAI API key to act as the concierge brain.

**System prompt includes:**
- Full property details (name, address, wifi, parking, check-in/out, access, house rules, amenities, knowledge base, local recommendations, special notes)
- Last 10 messages from the conversation for context
- Guest name if known
- Property location context

**Key behaviors baked into the prompt:**
- Answer like a friendly local who knows the property inside and out
- For property questions (A/C, TV, appliances): check the knowledge base and special notes first, give specific instructions
- For local recommendations: give 2-3 specific places with why they're great, distance, and vibe
- Never give generic responses -- always tie answers back to the specific property and area
- If you truly don't know, say so honestly and offer to connect them with the host
- Remember what was discussed earlier in the conversation

### 2. Simplified `enhancedConversationService.ts` -- Rewrite the `processMessage` Confirmed State

Replace the massive confirmed-state processing (lines 169-226) with:

```text
1. Quick-check: Is this a simple property data lookup? (wifi, parking, checkout, access, emergency)
   - If yes: return the data directly (fast path, no AI needed)
   
2. For everything else: Call ai-concierge with:
   - The guest's message
   - Full property object
   - Last 10 conversation messages from sms_conversation_messages table
   - Guest name from conversation context
   
3. Store the AI response in conversation history (sms_conversation_messages table)

4. Return the response
```

This replaces the 2,500+ lines of intent routing, follow-up detection, diversification, multi-query parsing, etc. with a single AI call that handles all of it naturally.

### 3. Conversation Memory via `sms_conversation_messages` Table

The table already exists. Each message exchange will be stored:
- Guest message (role: "user")  
- AI response (role: "assistant")

When calling the AI concierge, load the last 10 messages to provide conversation context. This enables natural follow-ups without any special "follow-up detection" code.

### 4. Quick Property Data Lookups (Fast Path)

Keep a simplified version of property data extraction for instant answers that don't need AI:

| Query Pattern | Response Source |
|---|---|
| wifi, password, network | `property.wifi_name` + `property.wifi_password` |
| checkout, check out | `property.check_out_time` |
| check in | `property.check_in_time` |
| parking | `property.parking_instructions` |
| access, door, code, locked out | `property.access_instructions` |
| emergency, contact, host | `property.emergency_contact` |

If the data field is empty, fall through to the AI concierge which can search the knowledge base.

### 5. Files Changed

| File | Action |
|---|---|
| `supabase/functions/ai-concierge/index.ts` | **New** -- Clean AI concierge edge function |
| `supabase/functions/sms-conversation-service/enhancedConversationService.ts` | **Major rewrite** -- Replace 2500+ lines of intent routing with AI-first flow |
| `supabase/functions/sms-conversation-service/index.ts` | Minor update to pass conversation messages |

### 6. What Gets Removed

The following complexity is replaced by the AI's natural language understanding:
- `intentRecognitionService.ts` -- 895 lines of keyword matching (kept only for backward compat, but no longer primary)
- `conversationalResponseGenerator.ts` -- 500+ lines of templated responses
- `multiQueryParser.ts` -- AI handles multi-part questions naturally
- `followUpDetection` logic -- conversation history handles this
- `recommendationDiversifier.ts` -- AI prompt handles this
- `vibeDetectionService.ts` -- AI understands vibes naturally
- `troubleshootingDetectionService.ts` -- AI handles troubleshooting naturally

These files won't be deleted (to avoid breaking anything), but the main flow will bypass them.

### 7. AI Concierge System Prompt (Key Section)

```text
You are the personal concierge for guests staying at {property_name} at {address}.

PROPERTY DETAILS:
- WiFi: {wifi_name} / {wifi_password}
- Check-in: {check_in_time} | Check-out: {check_out_time}
- Parking: {parking_instructions}
- Access: {access_instructions}
- Emergency Contact: {emergency_contact}
- House Rules: {house_rules}
- Amenities: {amenities}

PROPERTY KNOWLEDGE BASE:
{knowledge_base}

LOCAL RECOMMENDATIONS:
{local_recommendations}

SPECIAL NOTES:
{special_notes}

INSTRUCTIONS:
- You are a friendly, knowledgeable local. Respond naturally and specifically.
- For property questions (A/C, TV, appliances, wifi issues): check the knowledge base above for specific instructions. If found, give step-by-step help.
- For local recommendations: give 2-3 specific places with brief descriptions and approximate distance.
- Never say "I don't have that information" if the answer is in the property details above.
- If you truly can't help, offer to connect them with the host at {emergency_contact}.
- Keep responses concise (under 300 chars for SMS). Split into multiple messages if needed.
- Remember the conversation context from previous messages.
```

### 8. What This Fixes

- **"How can I turn the A/C down?"** -- AI reads the knowledge base, finds A/C instructions, gives specific answer
- **Follow-up questions** -- AI has conversation history, maintains context naturally
- **Generic responses** -- AI always has the full property context, never falls back to generic
- **Unknown queries** -- AI can reason about the property and area even for novel questions
- **Multi-part questions** -- AI handles "What's the wifi and where should we eat?" in one natural response

