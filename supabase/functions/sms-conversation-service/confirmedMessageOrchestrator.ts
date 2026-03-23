/**
 * Confirmed Message Orchestrator v2
 * 
 * Single execution path for confirmed-guest messages.
 * Priority order: issue → request → repetition → property info → recommendation/AI → escalation
 */

import { IntentRecognitionService } from './intentRecognitionService.ts';
import { RequestTypeClassifier, RequestClassification } from './requestTypeClassifier.ts';
import { TroubleshootingDetectionService, TroubleshootingResult } from './troubleshootingDetectionService.ts';
import { PropertyDataExtractor } from './propertyDataExtractor.ts';
import { EnhancedPropertyKnowledgeService } from './enhancedPropertyKnowledgeService.ts';
import { ConversationMemoryManager } from './conversationMemoryManager.ts';
import { HostContactService } from './hostContactService.ts';
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
  source: 'quick_lookup' | 'property_data' | 'knowledge_base' | 'troubleshooting' | 'ai_concierge' | 'host_escalation' | 'repetition_summary' | 'service_request' | 'issue_response' | 'request_response';
  shouldUpdateState: boolean;
  routing: {
    intent: string;
    requestType: string;
    propertyDataUsed: boolean;
    knowledgeBaseUsed: boolean;
    aiUsed: boolean;
    escalationTriggered: boolean;
    repetitionPrevented: boolean;
  };
}

// ═══════════════════════════════════════════════════════
// ORCHESTRATOR
// ═══════════════════════════════════════════════════════

export class ConfirmedMessageOrchestrator {

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

    // Determine if AI is needed
    const shouldUseAI = isRecommendation || isGeneralKnowledge;

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
   * Never say "I don't see that in the property guide".
   */
  static handleIssue(
    message: string,
    property: Property,
    classification: UnifiedClassification,
    conversationContext: any
  ): OrchestratorResult | null {
    if (!classification.isIssue) return null;

    console.log('🚨 [Orchestrator] ISSUE detected:', classification.troubleshootingResult?.category || 'general');

    const category = classification.troubleshootingResult?.category || 'general';
    const equipment = classification.troubleshootingResult?.equipmentType || category;

    // Check knowledge base for specific troubleshooting steps
    const kbResult = EnhancedPropertyKnowledgeService.searchPropertyKnowledge(property, message);
    let response = '';

    if (kbResult.found && kbResult.confidence >= 0.5) {
      // We have troubleshooting steps — share them warmly
      response = `Thanks for letting me know about the ${equipment} issue. Here's what usually helps:\n\n${kbResult.content}`;
      if (property.emergency_contact) {
        response += `\n\nIf that doesn't fix it, your host can help — reach them at ${property.emergency_contact}.`;
      }
    } else {
      // No specific steps — acknowledge and escalate immediately
      response = `Thanks for letting me know — I'm sorry about that! I'm going to notify your host right away so they can take care of the ${equipment} issue.`;
      if (property.emergency_contact) {
        response += ` You can also reach them directly at ${property.emergency_contact}.`;
      }
      response += ` If anything changes in the meantime, just message me here.`;
    }

    return {
      response,
      source: 'issue_response',
      shouldUpdateState: true,
      routing: {
        intent: classification.intent,
        requestType: 'ISSUE',
        propertyDataUsed: kbResult.found,
        knowledgeBaseUsed: kbResult.found,
        aiUsed: false,
        escalationTriggered: true,
        repetitionPrevented: false,
      },
    };
  }

  /**
   * STEP 3: Handle REQUESTS — respond like a host, don't give informational answers.
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

    // Early check-in / late check-out
    if (/\b(early|before)\b.*\b(check.?in|arrive|arrival)\b/.test(msg) || /\bcheck.?in\b.*\b(early|before|earlier)\b/.test(msg)) {
      response = `Early check-in can sometimes be arranged depending on the cleaning schedule. I can check on that for you — what time were you hoping to arrive?`;
    } else if (/\b(late|after|later|extend)\b.*\b(check.?out|departure|leave|stay)\b/.test(msg) || /\bcheck.?out\b.*\b(late|later|extend)\b/.test(msg)) {
      response = `Late checkout is sometimes possible depending on the next booking. What time were you thinking? I'll check with the host for you.`;
    } else if (/\b(bring|pet|dog|cat|animal)\b/.test(msg)) {
      // Check house rules first
      if (property.house_rules && /pet/i.test(property.house_rules)) {
        response = property.house_rules.match(/[^.]*pet[^.]*/i)?.[0]?.trim() || '';
        if (response) {
          response = `Regarding pets: ${response}. Want me to confirm any details with the host?`;
        }
      }
      if (!response) {
        response = `Let me check with the host about that for you. I'll get back to you with their answer!`;
      }
    } else if (/\b(extra|more|additional)\s+(guest|person|people|visitor)\b/.test(msg)) {
      response = `I'll check with the host about additional guests for you. How many people are you thinking?`;
    } else if (/\b(turn on|activate|heat|start)\s+(the\s+)?(pool|hot tub|jacuzzi|fireplace|grill)\b/.test(msg)) {
      // Check for service fees
      const serviceFees = property.service_fees as Record<string, any> | undefined;
      if (serviceFees) {
        const poolFee = Object.entries(serviceFees).find(([k]) => /pool|heat|hot tub/i.test(k));
        if (poolFee) {
          const [name, fee] = poolFee;
          response = `The ${name} is available — it's $${fee.price || 'TBD'} ${fee.unit || ''}. ${fee.description || ''} Want me to set that up for you?`;
        }
      }
      if (!response) {
        response = `Let me check on that for you. I'll reach out to the host to get it sorted!`;
      }
    } else {
      // Generic request handling — always host-like
      response = `Let me check on that with the host and get back to you!`;
    }

    return {
      response,
      source: 'request_response',
      shouldUpdateState: true,
      routing: {
        intent: classification.intent,
        requestType: 'REQUEST',
        propertyDataUsed: false,
        knowledgeBaseUsed: false,
        aiUsed: false,
        escalationTriggered: false,
        repetitionPrevented: false,
      },
    };
  }

  /**
   * STEP 4: Repetition prevention.
   * Checks if the same topic was recently answered. Returns rephrased response or null.
   */
  static checkRepetition(
    message: string,
    classification: UnifiedClassification,
    conversationContext: any
  ): OrchestratorResult | null {
    // Don't prevent repetition for issues or requests
    if (classification.isIssue || classification.isRequest) return null;

    const topic = extractTopicFromMessage(message, classification.intent);
    const recentShare = ConversationMemoryManager.hasAlreadySharedInformation(conversationContext, topic, 5);

    if (recentShare.shared && recentShare.summary) {
      console.log(`♻️ [Orchestrator] Repetition for "${topic}" (${recentShare.minutesAgo}m ago)`);

      // Rephrase instead of saying "I already told you"
      const rephrased = rephrasePreviousAnswer(topic, recentShare.summary);
      return {
        response: rephrased,
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
        response: structuredResult.content,
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
        response: kbResult.content,
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

    // No property data → return null to fall through to escalation
    console.log('❌ [Orchestrator] No property data found');
    return null;
  }

  /**
   * STEP 6: Build slim AI context for recommendation / general knowledge queries.
   */
  static buildSlimAIContext(
    message: string,
    property: Property,
    conversation: Conversation,
    classification: UnifiedClassification,
    recentHistory: Array<{ role: string; content: string }>
  ): Record<string, any> {
    const context = (conversation.conversation_context as any) || {};
    const guestName = context.guestName || context.guest_name || null;

    const recentIntents = context.recent_intents?.slice(0, 5) || [];
    const memorySummary = recentIntents.length > 0
      ? `Recent topics: ${recentIntents.join(', ')}`
      : 'New conversation';

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
      conversationHistory: recentHistory.slice(-10),
      memorySummary,
      responseRules: [
        'Keep responses SMS-friendly — under 280 chars when possible, max 450.',
        'Warm vacation rental host tone, not hotel or corporate.',
        'Give 2-3 specific places with names and a reason they are great.',
        'Never invent property-specific facts.',
        'If unsure, offer to check with the host. Never say "I don\'t see that in the property guide."',
        'Do not repeat recommendations already given in conversation history.',
        'No numbered multi-part responses (1/2, 2/2). Single natural flow.',
        'Be concise and conversational — like texting a helpful friend.',
      ],
    };
  }

  /**
   * STEP 7: Host escalation — when property-specific info is missing.
   * Never say "property guide" or "I don't see that information".
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

    // Check if we recently offered host contact
    const recentlyOffered = conversationContext?.last_host_contact_offer_timestamp &&
      (Date.now() - new Date(conversationContext.last_host_contact_offer_timestamp).getTime()) < 300000;

    let response: string;
    if (recentlyOffered) {
      response = `I'll need to confirm ${topicPhrase} with the host. Want me to reach out to them for you?`;
    } else if (property.emergency_contact) {
      response = `Let me check on ${topicPhrase} for you. Would you like me to ask the host? You can also reach them at ${property.emergency_contact}.`;
    } else {
      response = `I'll need to confirm ${topicPhrase} with the host. Want me to reach out to them for you?`;
    }

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
   * Track response in memory.
   */
  static trackResponseInMemory(
    conversationContext: any,
    message: string,
    response: string,
    classification: UnifiedClassification
  ): any {
    const topic = extractTopicFromMessage(message, classification.intent);
    const summary = response.length > 100 ? response.substring(0, 97) + '...' : response;

    return ConversationMemoryManager.updateMemory(
      conversationContext,
      classification.intent,
      classification.requestType,
      { sharedContent: { topic, content: response, summary } }
    );
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

/**
 * Rephrase a previously shared answer instead of repeating verbatim.
 */
function rephrasePreviousAnswer(topic: string, previousSummary: string): string {
  const topicPhrase = getTopicPhrase(topic);

  // Contextualize based on topic type
  if (topic === 'checkout_info') {
    const timeMatch = previousSummary.match(/\d{1,2}(:\d{2})?\s*(am|pm|AM|PM)?/);
    if (timeMatch) {
      return `Checkout is still at ${timeMatch[0]}. If you need a little extra time, I can check availability for you!`;
    }
  }
  if (topic === 'checkin_info') {
    const timeMatch = previousSummary.match(/\d{1,2}(:\d{2})?\s*(am|pm|AM|PM)?/);
    if (timeMatch) {
      return `Check-in is at ${timeMatch[0]} as I mentioned. Need any other details about getting in?`;
    }
  }
  if (topic === 'wifi_info') {
    return `I shared the WiFi info just a bit ago — scroll up to grab it! Need help with anything else?`;
  }

  // Generic rephrase
  if (previousSummary && previousSummary.length < 120) {
    return `As I mentioned: ${previousSummary.toLowerCase().replace(/^(as i mentioned[,:]\s*)/i, '')} — anything else I can help with?`;
  }

  return `I shared ${topicPhrase} just a moment ago. Want me to look into something else?`;
}
