/**
 * Request Type Classifier v2
 * Determines the nature of the guest's message for routing:
 * - INFORMATIONAL: Guest wants to know something ("what time is check in")
 * - REQUEST: Guest wants permission or action ("can I check in early")
 * - ISSUE: Guest reports a problem ("there is a leak in the bedroom")
 * - RECOMMENDATION: Guest wants local suggestions ("what are good beaches nearby")
 * - GENERAL_KNOWLEDGE: Guest wants non-property, non-local info ("Disney hours")
 */

export type RequestType = 'INFORMATIONAL' | 'REQUEST' | 'ISSUE' | 'RECOMMENDATION' | 'GENERAL_KNOWLEDGE';

export interface RequestClassification {
  type: RequestType;
  requiresHostContact: boolean;
  shouldUseAI: boolean;
  confidence: number;
}

export class RequestTypeClassifier {

  static classify(message: string, intent: string): RequestClassification {
    const lowerMsg = message.toLowerCase().trim();

    // 1. ISSUE — must check first (highest urgency)
    if (this.isIssue(lowerMsg, intent)) {
      return { type: 'ISSUE', requiresHostContact: true, shouldUseAI: false, confidence: 0.97 };
    }

    // 2. REQUEST — permission / action / coordination
    if (this.isRequest(lowerMsg, intent)) {
      return { type: 'REQUEST', requiresHostContact: true, shouldUseAI: false, confidence: 0.95 };
    }

    // 3. RECOMMENDATION — local recs, restaurants, beaches, things to do
    if (this.isRecommendation(lowerMsg, intent)) {
      return { type: 'RECOMMENDATION', requiresHostContact: false, shouldUseAI: true, confidence: 0.94 };
    }

    // 4. GENERAL_KNOWLEDGE — external entities (theme parks, weather, area info)
    if (this.isGeneralKnowledge(lowerMsg, intent)) {
      return { type: 'GENERAL_KNOWLEDGE', requiresHostContact: false, shouldUseAI: true, confidence: 0.93 };
    }

    // 5. INFORMATIONAL — property-specific info (default)
    return { type: 'INFORMATIONAL', requiresHostContact: false, shouldUseAI: false, confidence: 0.90 };
  }

  // ─── ISSUE detection ────────────────────────────────────────────────
  private static isIssue(msg: string, intent: string): boolean {
    if (intent.startsWith('troubleshoot_')) return true;

    const issuePatterns = [
      /\b(broken|not working|doesn'?t work|won'?t work|stopped working)\b/,
      /\b(leak|leaking|leaks|flooded|flooding)\b/,
      /\b(stuck|jammed|won'?t open|won'?t close|won'?t lock|won'?t unlock)\b/,
      /\b(no power|no electricity|power.?out|lights.?out|tripped)\b/,
      /\b(no hot water|cold water|water.?heater)\b/,
      /\b(smell|smells|odor|stink)\b/,
      /\b(bug|bugs|roach|ant|ants|pest|mice|mouse|rat)\b/,
      /\b(clog|clogged|backed up|overflow|overflowing)\b/,
      /\b(mold|mildew)\b/,
      /\b(alarm|beeping|loud noise|noise)\b/,
      /\b(ac|a\/c|air condition|heater|heat|hvac)\s*(is|isn'?t|not|broken|off|out|won'?t)/,
      /\bthere('s| is) (a |an )?(leak|problem|issue|crack|stain|hole)/,
      /\b(door|lock|window|toilet|sink|shower|faucet|dishwasher|oven|stove|microwave|refrigerator|fridge|dryer|washer|tv|television|remote|garage)\b.*\b(broken|not working|won'?t|issue|problem)\b/,
      /\b(issue|problem)\s+(with|in)\b/,
    ];

    return issuePatterns.some(p => p.test(msg));
  }

  // ─── REQUEST detection (permission / action / coordination) ─────────
  private static isRequest(msg: string, intent: string): boolean {
    if (intent.startsWith('request_')) return true;

    const requestPatterns = [
      /\bcan (i|we)\s+(check.?in|check.?out|arrive|leave|stay|extend|bring|have|use|park)\b/,
      /\b(early|late)\s+(check.?in|check.?out|arrival|departure)\b/,
      /\bis (it|there)\s+(ok|okay|possible|allowed|fine)\s+(to|if)\b/,
      /\b(am i|are we)\s+(allowed|able|permitted)\b/,
      /\b(would it be|is it)\s+(possible|ok|okay)\b/,
      /\b(could (i|we|you))\s+(arrange|book|schedule|get|have|use|bring)\b/,
      /\b(want|need|like) to\s+(check.?in|check.?out|arrive|leave|stay|extend|bring)\b.*\b(early|late|before|after)\b/,
      /\b(turn on|activate|enable|start|heat)\s+(the\s+)?(pool|hot tub|jacuzzi|fireplace|grill)\b/,
      /\b(book|access|use|want to use|need access|get access to)\s+(the\s+)?(waterpark|water park|gym|golf|resort|spa|massage)\b/,
      /\b(schedule|arrange|want|need|book)\s+(grocery|groceries|chef|massage|cleaning|shuttle)\b/,
      /\bplease (turn|activate|enable|book|schedule|arrange)\b/,
      /\bI (want|need|would like) to (turn|activate|book|use|access|bring)\b/,
      /\bhow (much|many|long)\s+(extra|more|additional)\b.*\b(stay|night|hour)\b/,
    ];

    return requestPatterns.some(p => p.test(msg));
  }

  // ─── RECOMMENDATION detection ──────────────────────────────────────
  private static isRecommendation(msg: string, intent: string): boolean {
    const recIntents = [
      'ask_food_recommendations', 'ask_coffee_recommendations', 'ask_attractions',
      'ask_activities', 'ask_local_events', 'ask_venue_vibe', 'ask_venue_busyness',
      'ask_packing_tips', 'ask_best_time_to_visit',
    ];
    if (recIntents.includes(intent)) return true;

    const recPatterns = [
      /\b(recommend|suggestion|where.*(eat|go|visit|drink|shop|hike))\b/,
      /\b(best|good|great|nice|top|favorite|favourite)\s+(restaurant|bar|cafe|beach|park|trail|hike|spot|place|shop|store|brunch|breakfast|lunch|dinner|pizza|sushi|seafood|taco|burger|bbq|bakery|ice cream|dessert|coffee)\b/,
      /\b(restaurant|bar|cafe|beach|park|trail|hike|spot|place|shop|store|brunch|breakfast|lunch|dinner)\s*(near|nearby|around|close|here)?\b/,
      /\bwhere (can|should|do|to)\s+(i|we)\s+(eat|go|visit|drink|shop|hike|swim|surf|snorkel|kayak|get)\b/,
      /\b(things to do|activities|attractions|entertainment|nightlife|live music)\b/,
      /\b(beach|beaches|swimming|surfing|snorkeling|kayaking|boating|fishing)\b/,
      /\bwhat('s|s| is) (there to do|to see|good around here|fun)\b/,
      /\b(any|know any|got any)\s+(good|great|nice)?\s*(restaurant|bar|cafe|beach|place|spot|recommendation)\b/,
      /\bfamily.?(friendly|fun|activities|things)\b/,
      /\b(date night|romantic|upscale|casual|cheap eats|fast food|takeout|delivery)\b.*\b(place|spot|restaurant|option)\b/,
      // Direct food/drink words — these are ALWAYS recommendations, never property info
      /\b(restaurants?|brunch|dinner|lunch|breakfast|coffee|bars?|cocktails?|food|eat|dining)\b/,
      /\b(things to do|what to do|stuff to do|where to go)\b/,
      /\b(happy hour|wine bar|brewery|pub|tapas|ramen|tacos?|burgers?|seafood|steakhouse|bistro|diner)\b/,
    ];

    return recPatterns.some(p => p.test(msg));
  }

  // ─── GENERAL KNOWLEDGE detection ───────────────────────────────────
  private static isGeneralKnowledge(msg: string, intent: string): boolean {
    if (intent === 'ask_general_knowledge' || intent === 'ask_weather') return true;

    const gkPatterns = [
      /\b(disney|disneyland|magic kingdom|epcot|hollywood studios|animal kingdom)\s+(park\s+)?(hours?|times?|schedule|open|close|tickets?|price)/i,
      /\b(universal|islands of adventure|volcano bay)\s+(park\s+)?(hours?|times?|schedule|open|close|tickets?|price)/i,
      /\bwhat time does (disney|universal|the park|seaworld)/i,
      /\bwhen does (disney|universal|the park|seaworld) (open|close)/i,
      /\b(buy|purchase|get|where to buy)\s+(disney|universal|park|theme park)?\s*tickets?/i,
      /\bweather\s+(in|near|around|for|this)\b/i,
      /\bwhat'?s the weather/i,
      /\b(how far|how long|distance|drive time)\s+(is|to)\s+(disney|universal|airport|downtown|the beach)/i,
    ];

    return gkPatterns.some(p => p.test(msg));
  }

  static getTypeDescription(type: RequestType): string {
    switch (type) {
      case 'ISSUE': return 'Problem or maintenance issue requiring attention';
      case 'REQUEST': return 'Permission or service request requiring host coordination';
      case 'RECOMMENDATION': return 'Local recommendation or activity suggestion';
      case 'GENERAL_KNOWLEDGE': return 'General knowledge query (external to property)';
      case 'INFORMATIONAL': return 'Property-specific information question';
      default: return 'Unknown request type';
    }
  }
}
