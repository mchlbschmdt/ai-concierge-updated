/**
 * Confirmed Message Orchestrator
 * 
 * Single primary execution path for all confirmed-guest messages.
 * Replaces the scattered routing in enhancedConversationService.
 * 
 * Pipeline: classify → troubleshoot → property-first → repetition check → AI fallback → host escalation
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
  source: 'quick_lookup' | 'property_data' | 'knowledge_base' | 'troubleshooting' | 'ai_concierge' | 'host_escalation' | 'repetition_summary' | 'service_request';
  shouldUpdateState: boolean;
  routing: {
    intent: string;
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
   * Consolidates IntentRecognitionService + RequestTypeClassifier + TroubleshootingDetectionService.
   */
  static classifyMessage(message: string): UnifiedClassification {
    // Intent detection
    const intentResult = IntentRecognitionService.recognizeIntent(message);

    // Request type classification
    const requestClassification = RequestTypeClassifier.classify(message, intentResult.intent);

    // Troubleshooting detection
    const troubleshootingResult = TroubleshootingDetectionService.detectTroubleshootingIntent(message);

    // Determine if property-specific
    const propertySpecificIntents = [
      'ask_checkout_time', 'ask_checkin_time', 'ask_access',
      'ask_wifi', 'ask_parking', 'ask_amenity', 'ask_emergency_contact',
      'ask_property_specific', 'ask_additional_services', 'ask_resort_amenities',
      'ask_garbage', 'ask_grocery', 'ask_transportation_no_car', 'ask_grocery_transport',
    ];

    const generalKnowledgeIntents = [
      'ask_general_knowledge', 'ask_food_recommendations', 'ask_coffee_recommendations',
      'ask_attractions', 'ask_activities', 'ask_weather', 'ask_packing_tips',
      'ask_best_time_to_visit', 'ask_transportation', 'ask_local_events',
      'ask_directions', 'ask_venue_vibe', 'ask_venue_busyness',
    ];

    const isPropertySpecific = propertySpecificIntents.includes(intentResult.intent) ||
      requestClassification.type === 'INFORMATION';
    const isGeneralKnowledge = generalKnowledgeIntents.includes(intentResult.intent) ||
      requestClassification.type === 'GENERAL_KNOWLEDGE';

    // Override: troubleshooting always wins
    const isTroubleshooting = troubleshootingResult.isTroubleshooting;

    // Should use AI only when needed
    const shouldUseAI = !isTroubleshooting &&
      (isGeneralKnowledge || requestClassification.shouldUseAI) &&
      !propertySpecificIntents.includes(intentResult.intent);

    const classification: UnifiedClassification = {
      intent: isTroubleshooting ? `troubleshoot_${troubleshootingResult.category}` : intentResult.intent,
      requestType: requestClassification.type,
      isPropertySpecific: isTroubleshooting ? true : isPropertySpecific,
      isGeneralKnowledge: isTroubleshooting ? false : isGeneralKnowledge,
      isTroubleshooting,
      troubleshootingResult: isTroubleshooting ? troubleshootingResult : null,
      requiresHostContact: requestClassification.requiresHostContact || (isTroubleshooting && troubleshootingResult.urgency !== 'low'),
      shouldUseAI,
      confidence: isTroubleshooting ? 0.98 : Math.max(intentResult.confidence, requestClassification.confidence),
      subIntents: intentResult.subIntents,
      hasKids: intentResult.hasKids,
    };

    console.log('📋 [Orchestrator] Unified classification:', {
      intent: classification.intent,
      type: classification.requestType,
      propertySpecific: classification.isPropertySpecific,
      troubleshooting: classification.isTroubleshooting,
      shouldUseAI: classification.shouldUseAI,
      confidence: classification.confidence,
    });

    return classification;
  }

  /**
   * STEP 2: Handle troubleshooting/urgent messages.
   * Returns a response if troubleshooting, or null to continue the pipeline.
   */
  static handleTroubleshooting(
    message: string,
    property: Property,
    classification: UnifiedClassification,
    conversationContext: any
  ): OrchestratorResult | null {
    if (!classification.isTroubleshooting || !classification.troubleshootingResult) {
      return null;
    }

    console.log('🔧 [Orchestrator] STEP 2: Troubleshooting isolated —', classification.troubleshootingResult.category);

    let response = '';
    let propertyDataUsed = false;

    // Try to find troubleshooting steps in knowledge base
    const kbResult = EnhancedPropertyKnowledgeService.searchPropertyKnowledge(property, message);
    if (kbResult.found && kbResult.confidence >= 0.4) {
      response = kbResult.content;
      propertyDataUsed = true;
    }

    // Generate host contact offer
    const hostOffer = HostContactService.generateHostContactOffer(property, {
      knowledgeFound: propertyDataUsed,
      isTroubleshooting: true,
      isUrgent: classification.troubleshootingResult.urgency === 'critical' || classification.troubleshootingResult.urgency === 'high',
      category: classification.troubleshootingResult.category,
      equipmentType: classification.troubleshootingResult.equipmentType,
    }, conversationContext);

    if (response) {
      response += '\n\n' + hostOffer;
    } else {
      response = hostOffer;
    }

    return {
      response,
      source: 'troubleshooting',
      shouldUpdateState: true,
      routing: {
        intent: classification.intent,
        propertyDataUsed,
        knowledgeBaseUsed: propertyDataUsed,
        aiUsed: false,
        escalationTriggered: true,
        repetitionPrevented: false,
      },
    };
  }

  /**
   * STEP 3: Property-first retrieval.
   * Checks structured fields → knowledge base → returns null if nothing found.
   */
  static handlePropertyRetrieval(
    message: string,
    property: Property,
    classification: UnifiedClassification
  ): OrchestratorResult | null {
    if (!classification.isPropertySpecific) {
      return null;
    }

    console.log('🏠 [Orchestrator] STEP 3: Property-first retrieval for intent:', classification.intent);

    // 3a: Structured property fields
    const structuredResult = PropertyDataExtractor.extractPropertyData(property, classification.intent, message);
    if (structuredResult.hasData && structuredResult.content) {
      console.log('✅ [Orchestrator] Structured property data found');
      return {
        response: structuredResult.content,
        source: 'property_data',
        shouldUpdateState: true,
        routing: {
          intent: classification.intent,
          propertyDataUsed: true,
          knowledgeBaseUsed: false,
          aiUsed: false,
          escalationTriggered: false,
          repetitionPrevented: false,
        },
      };
    }

    // 3b: Knowledge base search
    const kbResult = EnhancedPropertyKnowledgeService.searchPropertyKnowledge(property, message);
    if (kbResult.found && kbResult.content) {
      console.log('✅ [Orchestrator] Knowledge base match found (confidence:', kbResult.confidence, ')');
      return {
        response: kbResult.content,
        source: 'knowledge_base',
        shouldUpdateState: true,
        routing: {
          intent: classification.intent,
          propertyDataUsed: false,
          knowledgeBaseUsed: true,
          aiUsed: false,
          escalationTriggered: false,
          repetitionPrevented: false,
        },
      };
    }

    // 3c: Property-specific question with no data → host escalation (STEP 6 early exit)
    console.log('❌ [Orchestrator] No property data found — escalating to host');
    return null; // Will be caught by STEP 6
  }

  /**
   * STEP 4: Repetition prevention.
   * Checks if the same topic was recently answered. Returns abbreviated response or null.
   */
  static checkRepetition(
    message: string,
    classification: UnifiedClassification,
    conversationContext: any
  ): OrchestratorResult | null {
    const topic = extractTopicFromMessage(message, classification.intent);
    const recentShare = ConversationMemoryManager.hasAlreadySharedInformation(conversationContext, topic, 5);

    if (recentShare.shared && recentShare.summary) {
      console.log(`♻️ [Orchestrator] STEP 4: Repetition detected for "${topic}" (${recentShare.minutesAgo}m ago)`);
      const abbreviated = ConversationMemoryManager.abbreviateResponse('', topic, recentShare.summary);
      return {
        response: abbreviated,
        source: 'repetition_summary',
        shouldUpdateState: false,
        routing: {
          intent: classification.intent,
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
   * STEP 5: Build a slim AI context payload.
   * Only sends relevant property snippets — NOT the full raw object.
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

    // Build concise memory summary
    const recentIntents = context.recent_intents?.slice(0, 5) || [];
    const memorySummary = recentIntents.length > 0
      ? `Recent topics: ${recentIntents.join(', ')}`
      : 'New conversation';

    // Only include relevant property snippets
    const propertySnippets: Record<string, string> = {
      name: property.property_name,
      address: property.address,
    };

    // Add only non-null fields that might be relevant
    if (property.local_recommendations) propertySnippets.local_recommendations = property.local_recommendations;
    if (property.knowledge_base) {
      // Only send relevant KB sections, not the whole thing
      const kbSearch = EnhancedPropertyKnowledgeService.searchPropertyKnowledge(property, message);
      if (kbSearch.found) {
        propertySnippets.relevant_knowledge = kbSearch.content;
      }
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
      conversationHistory: recentHistory.slice(-10),
      memorySummary,
      responseRules: [
        'Keep under 280 chars for SMS when possible (max 450).',
        'Warm vacation rental tone, not hotel or corporate.',
        'Give 2-3 specific places with names and why they are great.',
        'Never invent property-specific facts.',
        'If unsure, say so and offer to contact the host.',
        'Do not repeat recommendations already given in conversation history.',
      ],
    };
  }

  /**
   * STEP 6: Host escalation.
   * Used when property-specific answer is missing or uncertain.
   */
  static buildHostEscalation(
    message: string,
    property: Property,
    classification: UnifiedClassification,
    conversationContext: any
  ): OrchestratorResult {
    console.log('📞 [Orchestrator] STEP 6: Host escalation — no confident answer');

    const topic = extractTopicFromMessage(message, classification.intent);
    const hostOffer = HostContactService.generateHostContactOffer(property, {
      knowledgeFound: false,
      isTroubleshooting: false,
      isUrgent: false,
      topic,
    }, conversationContext);

    return {
      response: hostOffer,
      source: 'host_escalation',
      shouldUpdateState: true,
      routing: {
        intent: classification.intent,
        propertyDataUsed: false,
        knowledgeBaseUsed: false,
        aiUsed: false,
        escalationTriggered: true,
        repetitionPrevented: false,
      },
    };
  }

  /**
   * Track what was shared in memory after a successful response.
   */
  static trackResponseInMemory(
    conversationContext: any,
    message: string,
    response: string,
    classification: UnifiedClassification
  ): any {
    const topic = extractTopicFromMessage(message, classification.intent);
    const summary = response.length > 100 ? response.substring(0, 97) + '...' : response;

    const updatedContext = ConversationMemoryManager.updateMemory(
      conversationContext,
      classification.intent,
      classification.requestType,
      { sharedContent: { topic, content: response, summary } }
    );

    return updatedContext;
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
