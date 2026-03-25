/**
 * Confirmed Message Orchestrator v3
 * 
 * Single execution path for confirmed-guest messages.
 * Priority: "yes" confirmation → issue → request → repetition → property info → recommendation/AI → escalation
 * 
 * Now includes:
 * - "Yes" detection tied to previous host-contact offers
 * - Luxury concierge tone via ConciergeStyleService
 * - Response variation for repeated intents
 * - Host handoff state tracking
 */

import { IntentRecognitionService } from './intentRecognitionService.ts';
import { RequestTypeClassifier, RequestClassification } from './requestTypeClassifier.ts';
import { TroubleshootingDetectionService, TroubleshootingResult } from './troubleshootingDetectionService.ts';
import { PropertyDataExtractor } from './propertyDataExtractor.ts';
import { EnhancedPropertyKnowledgeService } from './enhancedPropertyKnowledgeService.ts';
import { ConversationMemoryManager, ThreadType } from './conversationMemoryManager.ts';
import { HostContactService } from './hostContactService.ts';
import { ConciergeStyleService } from './conciergeStyleService.ts';
import { MessageUtils } from './messageUtils.ts';
import { Property, Conversation } from './types.ts';

// ═══════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════

export interface UnifiedClassification {
  intent: string;
  requestType: RequestClassification['type'];
  isPropertySpecific: boolean;
  isGeneralKnowledge: boolean;
  isRecommendation: boolean;
  isIssue: boolean;
  isRequest: boolean;
  isTroubleshooting: boolean;
  troubleshootingResult: TroubleshootingResult | null;
  requiresHostContact: boolean;
  shouldUseAI: boolean;
  confidence: number;
  subIntents?: string[];
  hasKids?: boolean;
}

export interface OrchestratorResult {
  response: string;
  source: 'quick_lookup' | 'property_data' | 'knowledge_base' | 'troubleshooting' | 'ai_concierge' | 'host_escalation' | 'repetition_summary' | 'service_request' | 'issue_response' | 'request_response' | 'yes_confirmation' | 'issue_followup';
  shouldUpdateState: boolean;
  triggerHostHandoff?: boolean;
  handoffReason?: string;
  handoffSummary?: string;
  routing: {
    intent: string;
    requestType: string;
    propertyDataUsed: boolean;
    knowledgeBaseUsed: boolean;
    aiUsed: boolean;
    escalationTriggered: boolean;
    repetitionPrevented: boolean;
    hostHandoffTriggered?: boolean;
  };
}

// ═══════════════════════════════════════════════════════
// ORCHESTRATOR
// ═══════════════════════════════════════════════════════

export class ConfirmedMessageOrchestrator {

  /**
   * STEP 0: Detect follow-ups and re-route to correct thread.
   * Also handles "yes" confirmation tied to previous host-contact offers.
   */
  static handleFollowUpOrConfirmation(
    message: string,
    property: Property,
    conversationContext: any
  ): { followUpThread: ThreadType | null; yesResult: OrchestratorResult | null } {
    // Check "yes" confirmation first
    const yesResult = this.handleYesConfirmation(message, property, conversationContext);
    if (yesResult) return { followUpThread: null, yesResult };

    // Detect follow-up thread
    const followUpThread = ConversationMemoryManager.detectFollowUpThread(message, conversationContext);
    if (followUpThread) {
      console.log(`🧵 [Orchestrator] Follow-up detected → ${followUpThread} thread`);
    }
    return { followUpThread, yesResult: null };
  }

  /**
   * Check if "yes" is confirming a previous host-contact offer.
   */
  static handleYesConfirmation(
    message: string,
    property: Property,
    conversationContext: any
  ): OrchestratorResult | null {
    const msg = message.toLowerCase().trim();
    const isYes = /^(yes|yeah|yep|yea|sure|please|ok|okay|y|go ahead|do it|that would be great|yes please|please do)$/i.test(msg)
      || /^(yes|yeah|sure|please),?\s*(that would|i'd|i would)/i.test(msg);

    if (!isYes) return null;

    const awaitingHandoff = conversationContext?.awaiting_guest_confirmation_for_handoff;
    const lastOffered = conversationContext?.last_host_contact_offer_timestamp;
    const handoffReason = conversationContext?.pending_handoff_reason || 'guest request';
    const handoffTopic = conversationContext?.pending_handoff_topic || 'their request';

    if (!awaitingHandoff && !lastOffered) return null;

    if (lastOffered) {
      const elapsed = Date.now() - new Date(lastOffered).getTime();
      if (elapsed > 600000) return null;
    }

    console.log('✅ [Orchestrator] "Yes" confirmation → triggering host handoff for:', handoffReason);

    return {
      response: ConciergeStyleService.getHandoffConfirmation(),
      source: 'yes_confirmation',
      shouldUpdateState: true,
      triggerHostHandoff: true,
      handoffReason,
      handoffSummary: `Guest confirmed handoff for: ${handoffTopic}`,
      routing: {
        intent: 'host_handoff_confirmed',
        requestType: 'REQUEST',
        propertyDataUsed: false,
        knowledgeBaseUsed: false,
        aiUsed: false,
        escalationTriggered: false,
        repetitionPrevented: false,
        hostHandoffTriggered: true,
      },
    };
  }

  /**
   * STEP 1: Classify the message ONCE into a unified routing object.
   */
  static classifyMessage(message: string): UnifiedClassification {
    const intentResult = IntentRecognitionService.recognizeIntent(message);
    const requestClassification = RequestTypeClassifier.classify(message, intentResult.intent);
    const troubleshootingResult = TroubleshootingDetectionService.detectTroubleshootingIntent(message);

    const propertySpecificIntents = [
      'ask_checkout_time', 'ask_checkin_time', 'ask_access',
      'ask_wifi', 'ask_parking', 'ask_amenity', 'ask_emergency_contact',
      'ask_property_specific', 'ask_additional_services', 'ask_resort_amenities',
      'ask_garbage', 'ask_grocery', 'ask_transportation_no_car', 'ask_grocery_transport',
    ];

    const isIssue = requestClassification.type === 'ISSUE' || troubleshootingResult.isTroubleshooting;
    const isRequest = requestClassification.type === 'REQUEST';
    const isRecommendation = requestClassification.type === 'RECOMMENDATION';
    const isGeneralKnowledge = requestClassification.type === 'GENERAL_KNOWLEDGE';
    const isPropertySpecific = !isIssue && !isRequest && !isRecommendation && !isGeneralKnowledge &&
      (propertySpecificIntents.includes(intentResult.intent) || requestClassification.type === 'INFORMATIONAL');

    const shouldUseAI = isRecommendation || isGeneralKnowledge || isIssue;

    const classification: UnifiedClassification = {
      intent: isIssue ? `troubleshoot_${troubleshootingResult.category || 'general'}` : intentResult.intent,
      requestType: requestClassification.type,
      isPropertySpecific,
      isGeneralKnowledge,
      isRecommendation,
      isIssue,
      isRequest,
      isTroubleshooting: isIssue,
      troubleshootingResult: isIssue ? troubleshootingResult : null,
      requiresHostContact: requestClassification.requiresHostContact || isIssue,
      shouldUseAI,
      confidence: Math.max(intentResult.confidence, requestClassification.confidence),
      subIntents: intentResult.subIntents,
      hasKids: intentResult.hasKids,
    };

    console.log('📋 [Orchestrator] Classification:', {
      intent: classification.intent,
      requestType: classification.requestType,
      isIssue, isRequest, isRecommendation, isPropertySpecific, isGeneralKnowledge,
      shouldUseAI: classification.shouldUseAI,
      confidence: classification.confidence,
    });

    return classification;
  }

  /**
   * STEP 2: Handle ISSUES — acknowledge, empathize, escalate.
   * Uses ConciergeStyleService for varied, warm responses.
   * Auto-triggers host handoff for urgent issues.
   */
  static handleIssue(
    message: string,
    property: Property,
    classification: UnifiedClassification,
    conversationContext: any
  ): OrchestratorResult | null {
    if (!classification.isIssue) return null;

    const category = classification.troubleshootingResult?.category || 'general';
    const equipment = classification.troubleshootingResult?.equipmentType || category;

    // Check if this is a follow-up to an already-escalated issue
    const recentEscalation = conversationContext?.host_handoff_sent &&
      conversationContext?.unresolved_issue_type === category &&
      conversationContext?.host_handoff_timestamp &&
      (Date.now() - new Date(conversationContext.host_handoff_timestamp).getTime()) < 1800000; // 30 min

    if (recentEscalation) {
      console.log('🔄 [Orchestrator] Follow-up to already-escalated issue:', category);
      return {
        response: ConciergeStyleService.getIssueFollowUp(),
        source: 'issue_followup',
        shouldUpdateState: false,
        routing: {
          intent: classification.intent,
          requestType: 'ISSUE',
          propertyDataUsed: false,
          knowledgeBaseUsed: false,
          aiUsed: false,
          escalationTriggered: false,
          repetitionPrevented: true,
        },
      };
    }

    console.log('🚨 [Orchestrator] ISSUE detected:', category);

    // Check knowledge base for troubleshooting steps
    const kbResult = EnhancedPropertyKnowledgeService.searchPropertyKnowledge(property, message);
    let response: string;
    let triggerHandoff = false;

    if (kbResult.found && kbResult.confidence >= 0.5) {
      response = ConciergeStyleService.getIssueAcknowledgment(equipment, true, property.emergency_contact || undefined);
      response += `\n\n${kbResult.content}`;
      if (property.emergency_contact) {
        response += `\n\nIf that doesn't do the trick, your host is at ${property.emergency_contact}.`;
      }
    } else {
      response = ConciergeStyleService.getIssueAcknowledgment(equipment, false, property.emergency_contact || undefined);
      triggerHandoff = true; // Auto-alert host for unresolved issues
    }

    return {
      response,
      source: 'issue_response',
      shouldUpdateState: true,
      triggerHostHandoff: triggerHandoff,
      handoffReason: `Issue reported: ${equipment}`,
      handoffSummary: `Guest reported ${equipment} issue: "${message}"`,
      routing: {
        intent: classification.intent,
        requestType: 'ISSUE',
        propertyDataUsed: kbResult.found,
        knowledgeBaseUsed: kbResult.found,
        aiUsed: false,
        escalationTriggered: true,
        repetitionPrevented: false,
        hostHandoffTriggered: triggerHandoff,
      },
    };
  }

  /**
   * STEP 3: Handle REQUESTS — respond like a host with varied phrasing.
   */
  static handleRequest(
    message: string,
    property: Property,
    classification: UnifiedClassification,
    conversationContext: any
  ): OrchestratorResult | null {
    if (!classification.isRequest) return null;

    console.log('🤝 [Orchestrator] REQUEST detected:', classification.intent);

    const msg = message.toLowerCase();
    let response = '';
    let triggerHandoff = false;
    let setAwaitingConfirmation = false;
    let pendingTopic = '';

    // Early check-in
    if (/\b(early|before)\b.*\b(check.?in|arrive|arrival)\b/.test(msg) || /\bcheck.?in\b.*\b(early|before|earlier)\b/.test(msg)) {
      response = ConciergeStyleService.getRequestResponse('early_checkin');
      setAwaitingConfirmation = true;
      pendingTopic = 'early check-in';
    }
    // Late check-out
    else if (/\b(late|after|later|extend)\b.*\b(check.?out|departure|leave|stay)\b/.test(msg) || /\bcheck.?out\b.*\b(late|later|extend)\b/.test(msg)) {
      response = ConciergeStyleService.getRequestResponse('late_checkout');
      setAwaitingConfirmation = true;
      pendingTopic = 'late checkout';
    }
    // Pets
    else if (/\b(bring|pet|dog|cat|animal)\b/.test(msg)) {
      if (property.house_rules && /pet/i.test(property.house_rules)) {
        const petRule = property.house_rules.match(/[^.]*pet[^.]*/i)?.[0]?.trim();
        if (petRule) {
          response = `Regarding pets: ${petRule}. Want me to confirm any other details with the host?`;
        }
      }
      if (!response) {
        response = ConciergeStyleService.getRequestResponse('pets');
        setAwaitingConfirmation = true;
        pendingTopic = 'pet policy';
      }
    }
    // Extra guests
    else if (/\b(extra|more|additional)\s+(guest|person|people|visitor)\b/.test(msg)) {
      response = ConciergeStyleService.getRequestResponse('extra_guests');
      setAwaitingConfirmation = true;
      pendingTopic = 'additional guests';
    }
    // Amenity activation (pool heat, hot tub, etc.)
    else if (/\b(turn on|activate|heat|start)\s+(the\s+)?(pool|hot tub|jacuzzi|fireplace|grill)\b/.test(msg)) {
      const serviceFees = property.service_fees as Record<string, any> | undefined;
      if (serviceFees) {
        const poolFee = Object.entries(serviceFees).find(([k]) => /pool|heat|hot tub/i.test(k));
        if (poolFee) {
          const [name, fee] = poolFee;
          response = `The ${name} is available — it's $${fee.price || 'TBD'} ${fee.unit || ''}. ${fee.description || ''} Want me to set that up for you?`;
          setAwaitingConfirmation = true;
          pendingTopic = name;
        }
      }
      if (!response) {
        response = ConciergeStyleService.getRequestResponse('generic');
        setAwaitingConfirmation = true;
        pendingTopic = 'amenity activation';
      }
    }
    // Explicit host request
    else if (/\b(speak|talk|contact|call|reach|text)\s*(with|to|the)?\s*(host|owner|manager|landlord)\b/.test(msg)) {
      response = ConciergeStyleService.getEscalationResponse('explicit_host_request', {
        hostContact: property.emergency_contact || undefined,
      });
      triggerHandoff = true;
    }
    // Generic request
    else {
      response = ConciergeStyleService.getRequestResponse('generic');
      setAwaitingConfirmation = true;
      pendingTopic = 'their request';
    }

    return {
      response,
      source: 'request_response',
      shouldUpdateState: true,
      triggerHostHandoff: triggerHandoff,
      handoffReason: triggerHandoff ? 'Guest requested to speak with host' : undefined,
      handoffSummary: triggerHandoff ? `Guest wants to speak with host: "${message}"` : undefined,
      routing: {
        intent: classification.intent,
        requestType: 'REQUEST',
        propertyDataUsed: false,
        knowledgeBaseUsed: false,
        aiUsed: false,
        escalationTriggered: setAwaitingConfirmation,
        repetitionPrevented: false,
        hostHandoffTriggered: triggerHandoff,
      },
    };
  }

  /**
   * STEP 4: Repetition prevention — thread-aware.
   * Only checks repetition within the SAME thread.
   */
  static checkRepetition(
    message: string,
    classification: UnifiedClassification,
    conversationContext: any,
    threadType?: ThreadType
  ): OrchestratorResult | null {
    if (classification.isIssue || classification.isRequest) return null;

    const effectiveThread = threadType || ConversationMemoryManager.intentToThreadType(classification.intent, classification.requestType);

    // Thread-based repetition check
    const threadRep = ConversationMemoryManager.hasThreadRepetition(conversationContext, effectiveThread, classification.intent);
    if (threadRep.repeated && threadRep.summary) {
      console.log(`♻️ [Orchestrator] Thread repetition in "${effectiveThread}": ${classification.intent}`);
      const rephrased = rephrasePreviousAnswer(
        extractTopicFromMessage(message, classification.intent),
        threadRep.summary
      );
      return {
        response: ConciergeStyleService.polish(rephrased),
        source: 'repetition_summary',
        shouldUpdateState: false,
        routing: {
          intent: classification.intent,
          requestType: classification.requestType,
          propertyDataUsed: false,
          knowledgeBaseUsed: false,
          aiUsed: false,
          escalationTriggered: false,
          repetitionPrevented: true,
        },
      };
    }

    // Legacy shared_information check as fallback
    const topic = extractTopicFromMessage(message, classification.intent);
    const recentShare = ConversationMemoryManager.hasAlreadySharedInformation(conversationContext, topic, 5);
    if (recentShare.shared && recentShare.summary) {
      console.log(`♻️ [Orchestrator] Repetition for "${topic}" (${recentShare.minutesAgo}m ago)`);
      const rephrased = rephrasePreviousAnswer(topic, recentShare.summary);
      return {
        response: ConciergeStyleService.polish(rephrased),
        source: 'repetition_summary',
        shouldUpdateState: false,
        routing: {
          intent: classification.intent,
          requestType: classification.requestType,
          propertyDataUsed: false,
          knowledgeBaseUsed: false,
          aiUsed: false,
          escalationTriggered: false,
          repetitionPrevented: true,
        },
      };
    }

    return null;
  }

  /**
   * STEP 5: Property-first retrieval.
   */
  static handlePropertyRetrieval(
    message: string,
    property: Property,
    classification: UnifiedClassification
  ): OrchestratorResult | null {
    if (!classification.isPropertySpecific) return null;

    console.log('🏠 [Orchestrator] Property retrieval for:', classification.intent);

    // 5a: Structured fields
    const structuredResult = PropertyDataExtractor.extractPropertyData(property, classification.intent, message);
    if (structuredResult.hasData && structuredResult.content) {
      return {
        response: ConciergeStyleService.polish(structuredResult.content),
        source: 'property_data',
        shouldUpdateState: true,
        routing: {
          intent: classification.intent,
          requestType: classification.requestType,
          propertyDataUsed: true,
          knowledgeBaseUsed: false,
          aiUsed: false,
          escalationTriggered: false,
          repetitionPrevented: false,
        },
      };
    }

    // 5b: Knowledge base
    const kbResult = EnhancedPropertyKnowledgeService.searchPropertyKnowledge(property, message);
    if (kbResult.found && kbResult.content) {
      return {
        response: ConciergeStyleService.polish(kbResult.content),
        source: 'knowledge_base',
        shouldUpdateState: true,
        routing: {
          intent: classification.intent,
          requestType: classification.requestType,
          propertyDataUsed: false,
          knowledgeBaseUsed: true,
          aiUsed: false,
          escalationTriggered: false,
          repetitionPrevented: false,
        },
      };
    }

    console.log('❌ [Orchestrator] No property data found');
    return null;
  }

  /**
   * STEP 6: Build slim AI context for recommendation / general knowledge queries.
   * Now thread-aware — only passes relevant thread memory, not global.
   */
  static buildSlimAIContext(
    message: string,
    property: Property,
    conversation: Conversation,
    classification: UnifiedClassification,
    recentHistory: Array<{ role: string; content: string }>,
    activeThreadType?: ThreadType
  ): Record<string, any> {
    const context = (conversation.conversation_context as any) || {};
    const guestName = context.guestName || context.guest_name || null;

    // Thread-aware memory summary
    const threadType = activeThreadType || ConversationMemoryManager.intentToThreadType(classification.intent, classification.requestType);
    const activeThread = ConversationMemoryManager.getThread(context, threadType);
    const threads = context.threads || {};

    // Build memory summary from threads only
    const threadSummaries: string[] = [];
    for (const [type, thread] of Object.entries(threads) as [string, any][]) {
      if (!thread.resolved && thread.last_response_summary) {
        threadSummaries.push(`${type}: ${thread.last_response_summary}`);
      }
    }
    const memorySummary = threadSummaries.length > 0
      ? `Active topics:\n${threadSummaries.join('\n')}`
      : 'New conversation';

    // If this is a follow-up in recommendation thread, include last recs
    const threadMeta = activeThread?.meta || {};

    const propertySnippets: Record<string, string> = {
      name: property.property_name,
      address: property.address,
    };

    if (property.local_recommendations) propertySnippets.local_recommendations = property.local_recommendations;
    if (property.knowledge_base) {
      const kbSearch = EnhancedPropertyKnowledgeService.searchPropertyKnowledge(property, message);
      if (kbSearch.found) propertySnippets.relevant_knowledge = kbSearch.content;
    }
    if (property.emergency_contact) propertySnippets.emergency_contact = property.emergency_contact;
    if (property.special_notes) propertySnippets.special_notes = property.special_notes;

    return {
      message,
      guestName,
      propertyName: property.property_name,
      propertyAddress: property.address,
      propertySnippets,
      intent: classification.intent,
      requestType: classification.requestType,
      activeThread: threadType,
      threadContext: activeThread ? {
        lastIntent: activeThread.last_intent,
        lastSummary: activeThread.last_response_summary,
        turnCount: activeThread.turn_count,
        meta: threadMeta,
      } : null,
      conversationHistory: recentHistory.slice(-10),
      memorySummary,
      responseRules: [
        'You are a luxury vacation rental concierge — warm, polished, and knowledgeable like a trusted local friend.',
        'Keep responses SMS-friendly — 1-3 sentences, max 400 chars. Concise and conversational.',
        'For recommendations: give 2-3 specific places with names and a one-line reason each.',
        'Never invent property-specific facts. If unsure, say "Let me confirm that for you."',
        'Never say "property guide", "general_info", or "I don\'t see that information."',
        'No numbered multi-part responses (1/2, 2/2). Single natural flow.',
        'Sound like a warm host texting — not a hotel front desk or chatbot.',
        'Use contractions naturally (it\'s, there\'s, you\'ll, we\'re).',
        'For recommendations, NEVER say "I\'ll need to confirm with the host" — just give local suggestions.',
        activeThread?.turn_count && activeThread.turn_count > 0
          ? `This is a follow-up in the ${threadType} thread. Previous: "${activeThread.last_response_summary}". Do NOT repeat what was already said — refine, add new info, or rephrase.`
          : '',
      ].filter(Boolean),
    };
  }

  /**
   * STEP 7: Host escalation — when property-specific info is missing.
   * Sets state for "yes" confirmation tracking.
   */
  static buildHostEscalation(
    message: string,
    property: Property,
    classification: UnifiedClassification,
    conversationContext: any
  ): OrchestratorResult {
    console.log('📞 [Orchestrator] Host escalation — no confident answer');

    const topic = extractTopicFromMessage(message, classification.intent);
    const topicPhrase = getTopicPhrase(topic);

    const response = ConciergeStyleService.getEscalationResponse('unanswerable', {
      topic: topicPhrase,
      hostContact: property.emergency_contact || undefined,
    });

    return {
      response,
      source: 'host_escalation',
      shouldUpdateState: true,
      routing: {
        intent: classification.intent,
        requestType: classification.requestType,
        propertyDataUsed: false,
        knowledgeBaseUsed: false,
        aiUsed: false,
        escalationTriggered: true,
        repetitionPrevented: false,
      },
    };
  }

  /**
   * Track response in memory + escalation state + thread update.
   */
  static trackResponseInMemory(
    conversationContext: any,
    message: string,
    response: string,
    classification: UnifiedClassification,
    orchestratorResult?: OrchestratorResult
  ): any {
    const topic = extractTopicFromMessage(message, classification.intent);
    const summary = response.length > 100 ? response.substring(0, 97) + '...' : response;

    let updated = ConversationMemoryManager.updateMemory(
      conversationContext,
      classification.intent,
      classification.requestType,
      { sharedContent: { topic, content: response, summary } }
    );

    // Track variation index
    updated = ConciergeStyleService.incrementVariationIndex(updated, classification.intent);

    // ── Update thread ──────────────────────────────────────────────────
    const threadType = ConversationMemoryManager.intentToThreadType(classification.intent, classification.requestType);
    const isResolved = orchestratorResult?.source === 'property_data'
      || orchestratorResult?.source === 'quick_lookup'
      || orchestratorResult?.source === 'knowledge_base';
    updated = ConversationMemoryManager.updateThread(
      updated,
      threadType,
      classification.intent,
      summary,
      undefined,
      isResolved
    );

    // If switching to a new thread type, resolve the previous escalation thread
    // so post-escalation topics don't bleed in
    if (threadType !== 'escalation' && threadType !== 'issue' && updated.threads?.escalation && !updated.threads.escalation.resolved) {
      const escAge = Date.now() - new Date(updated.threads.escalation.last_updated).getTime();
      if (escAge > 60000) { // 1 min — user moved on
        updated = ConversationMemoryManager.resolveThread(updated, 'escalation');
      }
    }
    if (threadType !== 'issue' && updated.threads?.issue && !updated.threads.issue.resolved) {
      const issueAge = Date.now() - new Date(updated.threads.issue.last_updated).getTime();
      if (issueAge > 120000) { // 2 min
        updated = ConversationMemoryManager.resolveThread(updated, 'issue');
      }
    }

    // Track escalation state
    if (orchestratorResult?.source === 'host_escalation' || orchestratorResult?.source === 'request_response') {
      updated.awaiting_guest_confirmation_for_handoff = true;
      updated.pending_handoff_reason = orchestratorResult.handoffReason || classification.intent;
      updated.pending_handoff_topic = topic;
      updated.last_host_contact_offer_timestamp = new Date().toISOString();
    }

    if (orchestratorResult?.triggerHostHandoff) {
      updated.host_handoff_sent = true;
      updated.host_handoff_timestamp = new Date().toISOString();
      updated.host_handoff_reason = orchestratorResult.handoffReason;
      updated.unresolved_issue_type = classification.troubleshootingResult?.category || null;
      updated.awaiting_host_response = true;
      updated.awaiting_guest_confirmation_for_handoff = false;
    }

    if (orchestratorResult?.source === 'yes_confirmation') {
      updated.awaiting_guest_confirmation_for_handoff = false;
      updated.host_handoff_sent = true;
      updated.host_handoff_timestamp = new Date().toISOString();
    }

    return updated;
  }
}

// ═══════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════

function extractTopicFromMessage(message: string, intent: string): string {
  const lower = message.toLowerCase();
  if (lower.includes('wifi') || lower.includes('internet')) return 'wifi_info';
  if (lower.includes('parking')) return 'parking_info';
  if (lower.includes('pool')) return 'pool_info';
  if (lower.includes('hot tub') || lower.includes('jacuzzi')) return 'hot_tub_info';
  if (lower.includes('checkout') || lower.includes('check-out') || lower.includes('check out')) return 'checkout_info';
  if (lower.includes('checkin') || lower.includes('check-in') || lower.includes('check in')) return 'checkin_info';
  if (lower.includes('tv') || lower.includes('television')) return 'tv_info';
  if (lower.includes('grill') || lower.includes('bbq')) return 'grill_info';
  if (lower.includes('garbage') || lower.includes('trash')) return 'garbage_info';
  if (lower.includes('grocery')) return 'grocery_info';
  if (lower.includes('emergency') || lower.includes('contact host')) return 'emergency_contact';
  if (lower.includes('access') || lower.includes('key') || lower.includes('door')) return 'access_info';
  if (lower.includes('beach')) return 'beach_recs';
  if (lower.includes('restaurant') || lower.includes('food') || lower.includes('eat')) return 'food_recs';

  const intentMap: Record<string, string> = {
    'ask_wifi': 'wifi_info',
    'ask_parking': 'parking_info',
    'ask_amenity': 'amenity_info',
    'ask_checkout_time': 'checkout_info',
    'ask_checkin_time': 'checkin_info',
    'ask_access': 'access_info',
    'ask_emergency_contact': 'emergency_contact',
    'ask_food_recommendations': 'food_recs',
    'ask_coffee_recommendations': 'coffee_recs',
    'ask_attractions': 'attraction_recs',
  };

  return intentMap[intent] || 'general_info';
}

function getTopicPhrase(topic: string): string {
  const phrases: Record<string, string> = {
    'wifi_info': 'the WiFi details',
    'checkout_info': 'checkout time',
    'checkin_info': 'check-in details',
    'parking_info': 'parking',
    'amenity_info': 'that amenity',
    'access_info': 'access instructions',
    'pool_info': 'pool info',
    'hot_tub_info': 'hot tub details',
    'garbage_info': 'trash pickup',
    'grocery_info': 'nearby stores',
    'emergency_contact': 'host contact info',
    'general_info': 'that',
  };
  return phrases[topic] || 'that';
}

function rephrasePreviousAnswer(topic: string, previousSummary: string): string {
  const topicPhrase = getTopicPhrase(topic);

  if (topic === 'checkout_info') {
    const timeMatch = previousSummary.match(/\d{1,2}(:\d{2})?\s*(am|pm|AM|PM)?/);
    if (timeMatch) {
      const variations = [
        `Checkout is still at ${timeMatch[0]}. If you need a little extra time, I can check for you!`,
        `It's ${timeMatch[0]} for checkout. Want me to look into a later time?`,
      ];
      return variations[Math.floor(Math.random() * variations.length)];
    }
  }
  if (topic === 'checkin_info') {
    const timeMatch = previousSummary.match(/\d{1,2}(:\d{2})?\s*(am|pm|AM|PM)?/);
    if (timeMatch) {
      return `Check-in is at ${timeMatch[0]}. Need any other details about getting in?`;
    }
  }
  if (topic === 'wifi_info') {
    return `I shared the WiFi info just a bit ago — scroll up to grab it! Need anything else?`;
  }

  // Never use "As I mentioned" — just rephrase naturally
  if (previousSummary && previousSummary.length < 120) {
    const starters = [
      `Just to confirm: ${previousSummary.toLowerCase().replace(/^(as i mentioned[,:]\s*|just to remind you[,:]\s*)/i, '')}`,
      `Quick reminder: ${previousSummary.toLowerCase().replace(/^(as i mentioned[,:]\s*)/i, '')}`,
      previousSummary.replace(/^(As I mentioned[,:]\s*)/i, ''),
    ];
    return `${starters[Math.floor(Math.random() * starters.length)]} — anything else I can help with?`;
  }

  return `I shared ${topicPhrase} just a moment ago. Want me to look into something else?`;
}
