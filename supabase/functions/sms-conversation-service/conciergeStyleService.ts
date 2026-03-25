/**
 * Concierge Style Service
 * 
 * Applies a luxury vacation rental concierge tone to all guest-facing responses.
 * Handles response variation, anti-repetition phrasing, and premium formatting.
 */

export class ConciergeStyleService {

  // ═══ RESPONSE POLISHING ═══════════════════════════════════════════════

  /**
   * Polish any drafted response into luxury concierge tone.
   * Keeps facts unchanged, just adjusts phrasing.
   */
  static polish(response: string, context?: { intent?: string; requestType?: string; isEscalation?: boolean }): string {
    let polished = response;

    // Remove numbered response parts
    polished = polished.replace(/\s*\(?\d+\/\d+\)?\s*/g, ' ');
    polished = polished.replace(/^\d+\.\s+/gm, '• ');

    // Replace robotic phrases with concierge language
    const replacements: [RegExp, string][] = [
      [/I don't (see|have|find) that (information|info|in the property guide)/gi, "I'll need to double-check that for you"],
      [/property guide/gi, 'property details'],
      [/general_info/gi, ''],
      [/I('ll| will) need to confirm (that |this )?with the host/gi, "Happy to double-check that for you"],
      [/Want me to (reach out|contact the host)\??/gi, 'Want me to take care of that for you?'],
      [/Want me to reach out to (your |the )?host\??/gi, 'Want me to take care of that for you?'],
      [/I('m| am) going to notify your host/gi, "I've alerted your host"],
      [/There is no (\w+)/gi, "There isn't a $1"],
      [/There are no (\w+)/gi, "There aren't any $1"],
      [/What time were you hoping to arrive\??/gi, 'What time were you thinking of arriving?'],
      [/Check-in is at (\d)/gi, 'Check-in begins at $1'],
      [/I don't have the specifics on/gi, "I'll want to confirm"],
    ];

    for (const [pattern, replacement] of replacements) {
      polished = polished.replace(pattern, replacement);
    }

    // Remove excessive emojis (keep max 1-2)
    const emojiCount = (polished.match(/[\u{1F300}-\u{1F9FF}]/gu) || []).length;
    if (emojiCount > 2) {
      let count = 0;
      polished = polished.replace(/[\u{1F300}-\u{1F9FF}]/gu, (match) => {
        count++;
        return count <= 1 ? match : '';
      });
    }

    // Clean up double spaces and trailing whitespace
    polished = polished.replace(/\s{2,}/g, ' ').trim();

    return polished;
  }

  // ═══ RESPONSE VARIATION ═══════════════════════════════════════════════

  /**
   * Get a varied response for a repeated intent.
   * Rotates through phrasings to prevent copy-paste feel.
   */
  static getVariedResponse(intent: string, baseData: Record<string, string>, variationIndex: number = 0): string {
    const variations = RESPONSE_VARIATIONS[intent];
    if (!variations || variations.length === 0) return '';

    const idx = variationIndex % variations.length;
    let response = variations[idx];

    // Interpolate data
    for (const [key, value] of Object.entries(baseData)) {
      response = response.replace(new RegExp(`\{${key}\}`, 'g'), value);
    }

    return response;
  }

  /**
   * Get variation index from conversation context
   */
  static getVariationIndex(conversationContext: any, intent: string): number {
    const intentCounts = conversationContext?.intent_variation_counts || {};
    return intentCounts[intent] || 0;
  }

  /**
   * Increment variation index in context
   */
  static incrementVariationIndex(conversationContext: any, intent: string): any {
    const updated = { ...conversationContext };
    if (!updated.intent_variation_counts) updated.intent_variation_counts = {};
    updated.intent_variation_counts[intent] = (updated.intent_variation_counts[intent] || 0) + 1;
    return updated;
  }

  // ═══ ESCALATION LANGUAGE ══════════════════════════════════════════════

  static getEscalationResponse(type: 'urgent' | 'unanswerable' | 'approval' | 'explicit_host_request', details?: { topic?: string; hostContact?: string }): string {
    const topic = details?.topic || 'that';
    const pmContact = '+1 321-340-6333';

    switch (type) {
      case 'urgent':
        return `Thanks for letting me know — I'm sorry about that. I've reached out to the property manager at ${pmContact} so they can jump on it right away. If anything changes, just message me here.`;

      case 'unanswerable':
        return `I want to make sure you get the right answer on ${topic}. I'll reach out to the property manager at ${pmContact} to confirm for you.`;

      case 'approval':
        return `That one needs the property manager's approval — I'm reaching out to them at ${pmContact} now.`;

      case 'explicit_host_request':
        return `Of course! You can reach the property manager at ${pmContact}. I've also flagged your conversation so they have context.`;
    }
  }

  static getHandoffConfirmation(): string {
    const confirmations = [
      "Perfect — I've passed that along and your host will be in the loop.",
      "Done! Your host has been alerted and will follow up with you.",
      "All set — I've reached out to your host with the details.",
      "Got it — your host has been notified. They'll be in touch!",
    ];
    return confirmations[Math.floor(Math.random() * confirmations.length)];
  }

  static getPostHandoffFollowUp(): string {
    return "In the meantime, feel free to ask me anything else!";
  }

  // ═══ ISSUE RESPONSES ══════════════════════════════════════════════════

  static getIssueAcknowledgment(equipment: string, hasSteps: boolean, hostContact?: string): string {
    if (hasSteps) {
      return `Thanks for letting me know about the ${equipment}. Here's what usually helps:`;
    }

    const acks = [
      `Thanks for letting me know — I'm sorry about the ${equipment} issue. I've alerted your host so they can take care of it.`,
      `I'm sorry to hear that! I've notified your host about the ${equipment} situation so they can get it sorted.`,
      `Oh no — sorry about the ${equipment} trouble. I'm letting your host know right now so it gets handled.`,
    ];
    let response = acks[Math.floor(Math.random() * acks.length)];
    if (hostContact) response += ` You can also reach them directly at ${hostContact}.`;
    response += " If anything changes, just message me here.";
    return response;
  }

  static getIssueFollowUp(): string {
    const followUps = [
      "Your host is aware and working on it. Anything else I can help with in the meantime?",
      "The host has been notified — is there anything else you need while that gets resolved?",
      "I've kept your host in the loop. Let me know if you need anything else!",
    ];
    return followUps[Math.floor(Math.random() * followUps.length)];
  }

  // ═══ REQUEST RESPONSES ════════════════════════════════════════════════

  static getRequestResponse(requestType: string, data?: Record<string, string>): string {
    const variations = REQUEST_VARIATIONS[requestType];
    if (!variations) return "Let me check on that for you — I'll reach out to the host.";
    return variations[Math.floor(Math.random() * variations.length)];
  }
}

// ═══ VARIATION BANKS ════════════════════════════════════════════════════

const RESPONSE_VARIATIONS: Record<string, string[]> = {
  'early_checkin': [
    "Early check-in can sometimes be arranged depending on the cleaning schedule. What time were you thinking of arriving?",
    "It's not always guaranteed, but we can usually check based on timing. When were you planning to get there?",
    "We may be able to accommodate that depending on turnover — what time works best for you?",
    "Happy to check on that! It depends on the cleaning schedule. What time did you have in mind?",
    "That can sometimes be worked out! When were you hoping to arrive? I'll check with the host.",
  ],
  'late_checkout': [
    "Late checkout is sometimes possible depending on the next booking. What time were you thinking? I'll check for you.",
    "We might be able to arrange a later checkout — what time would work best? I'll reach out to the host.",
    "Happy to look into that! When were you hoping to leave? It usually depends on the next reservation.",
    "That can sometimes be accommodated. What time did you have in mind? I'll check availability for you.",
  ],
  'checkout_info': [
    "Checkout is at {time}. If you need a little extra time, I can check availability for you!",
    "Checkout time is {time}. Let me know if you need anything before then!",
    "You're all set to check out by {time}. Need any help with anything else?",
  ],
  'checkin_info': [
    "Check-in begins at {time}. {access}",
    "You can check in starting at {time}. {access}",
    "Check-in time is {time}. {access}",
  ],
  'wifi_info': [
    "Here's the WiFi — Network: {name}, Password: {password}",
    "WiFi details: Network is {name} and the password is {password}.",
    "Got you! WiFi network: {name}, Password: {password}",
  ],
};

const REQUEST_VARIATIONS: Record<string, string[]> = {
  'early_checkin': [
    "Early check-in can sometimes be arranged depending on the cleaning schedule. What time were you thinking of arriving?",
    "It's not always guaranteed, but we can usually check based on timing. When were you planning to get there?",
    "We may be able to accommodate that depending on turnover — what time works best for you?",
  ],
  'late_checkout': [
    "Late checkout is sometimes possible depending on the next booking. What time were you thinking? I'll check for you.",
    "We might be able to arrange a later checkout — what time would work best? I'll reach out to the host.",
  ],
  'pets': [
    "Let me check with the host about pets for you. I'll get back to you with their answer!",
    "Happy to look into the pet policy — I'll check with the host and confirm.",
  ],
  'extra_guests': [
    "I'll check with the host about additional guests for you. How many people are you thinking?",
    "Happy to look into that — how many extra guests would that be?",
  ],
  'generic': [
    "Let me check on that for you — I'll reach out to the host.",
    "Happy to look into that! I'll confirm with the host and get back to you.",
    "I can take care of that — let me check with the host for you.",
  ],
};
