

# Plan: Implement Priority-Solve-Before-Escalation Rules

## Summary
Embed your new operational rules into the SMS concierge across three layers: the AI system prompt, the orchestration pipeline, and the style service. The core change is shifting from "escalate immediately on issues" to "troubleshoot first, escalate only if unresolved."

## Current Behavior (Problems)
1. **Issues auto-escalate**: When no knowledge base steps exist, `handleIssue` immediately triggers host handoff — no troubleshooting attempt
2. **AI underutilized**: `shouldUseAI` is only `true` for RECOMMENDATION and GENERAL_KNOWLEDGE — issues and ambiguous questions bypass AI entirely
3. **No confidence-based responses**: All unknowns treated identically (escalate to host)
4. **No specific escalation contact**: Escalation messages use generic phrasing instead of the property manager number `+1 321-340-6333`

## Changes

### 1. Update AI system prompt (`ai-concierge/index.ts`)

In both `buildPropertyContext` and `buildSlimPropertyContext`, replace the STRICT RULES section with the full new ruleset:

- **Priority Rule**: Answer from property data → best-guess from typical rental behavior → helpful alternatives → troubleshooting steps → escalate only as last resort
- **Troubleshooting Mode**: When guest reports a problem, MUST acknowledge + provide 2-4 specific troubleshooting steps + explain expected outcome + only escalate if unresolved
- **Confidence-Based Responses**: HIGH → answer directly, MEDIUM → hedge with "Typically..." / "Usually...", LOW → offer to confirm
- **Unknown Info Handling**: Provide most helpful likely answer first, then optionally offer to confirm — never lead with "I'll double-check with the host"
- **Anti-Repetition**: Never repeat previously provided info unless asked; prioritize most recent question
- **Escalation Behavior**: When escalating, explain WHY, summarize the request, and confirm contacting Property Manager at +1 321-340-6333. Never use vague "I'll check on that"

### 2. Update orchestrator issue handling (`confirmedMessageOrchestrator.ts`)

**`handleIssue` method (lines 197-268)**: Change the "no KB steps found" path. Instead of immediately setting `triggerHandoff = true`, route to AI concierge for troubleshooting guidance first:

- When KB has steps → use them (unchanged)
- When KB has NO steps → return `null` so the message falls through to AI concierge with a troubleshooting-mode context flag, NOT immediate host escalation
- Only escalate after AI has provided troubleshooting and guest confirms issue persists

**`classifyMessage` method (line 162)**: Update `shouldUseAI` to also be `true` for ISSUE type (so unresolved issues get AI troubleshooting instead of immediate escalation).

### 3. Update slim AI context rules (`confirmedMessageOrchestrator.ts`, lines 554-567)

Add new response rules to the `responseRules` array:
- Troubleshooting-first instruction for ISSUE-type messages
- Confidence-based response guidance
- Anti-repetition rule
- Escalation format with specific contact number

### 4. Update escalation language (`conciergeStyleService.ts`)

- Update `getEscalationResponse` to include specific property manager number `+1 321-340-6333` in all escalation variants
- Update `getIssueAcknowledgment` to always include troubleshooting steps (even generic ones) before offering escalation
- Add new method `getTroubleshootingPrompt` that returns category-specific troubleshooting steps for common issues (AC, WiFi, hot tub, leak, TV, lock) as a fallback when KB has nothing

### 5. Update issue acknowledgment flow

Add a new `TROUBLESHOOTING_STEPS` bank in `conciergeStyleService.ts` with generic steps per category:
- **AC/heating**: Check thermostat settings, ensure doors/windows closed, check breaker
- **WiFi**: Verify correct network name, restart router, move closer to router
- **Hot tub**: Check timer/jets button, wait 15 min for heating, verify breaker
- **Leak**: Locate and turn off water source, contain with towels, then escalate
- **TV**: Check input/source button, ensure HDMI connected, replace remote batteries
- **Lock/access**: Re-enter code slowly, check battery indicator, try alternate entry

## Files Modified
1. `supabase/functions/ai-concierge/index.ts` — system prompt rules
2. `supabase/functions/sms-conversation-service/confirmedMessageOrchestrator.ts` — issue routing + slim context rules
3. `supabase/functions/sms-conversation-service/conciergeStyleService.ts` — escalation language + troubleshooting step banks

## Expected Result
- Issues get troubleshooting guidance before any host alert
- AI handles ambiguous questions and general knowledge
- Escalation messages include specific property manager contact
- Responses use confidence-based language instead of uniform "I'll check with the host"
- No unnecessary host alerts for solvable problems

