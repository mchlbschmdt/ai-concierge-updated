/**
 * FAQ Matching Service — called from within the SMS pipeline
 * Queries faq_entries for a property, scores them, and returns the best match.
 * This runs BEFORE any AI call.
 */

import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

export interface FaqMatchResult {
  matched: boolean;
  faqId: string | null;
  answer: string | null;
  question: string | null;
  confidence: number;
  level: 'HIGH' | 'MEDIUM' | 'LOW' | 'NONE';
  topMatches: Array<{ question: string; answer: string; score: number }>;
}

export class FaqMatchingService {

  static async matchMessage(
    supabase: SupabaseClient,
    propertyId: string, // uuid
    guestMessage: string
  ): Promise<FaqMatchResult> {
    try {
      const { data: faqs, error } = await supabase
        .from('faq_entries')
        .select('id, category, subcategory, question, answer, tags, priority')
        .eq('property_id', propertyId)
        .eq('is_active', true)
        .order('priority', { ascending: false });

      if (error || !faqs || faqs.length === 0) {
        return { matched: false, faqId: null, answer: null, question: null, confidence: 0, level: 'NONE', topMatches: [] };
      }

      const msgLower = guestMessage.toLowerCase();
      const msgWords = tokenize(msgLower);

      const scored = faqs.map((faq: any) => ({
        ...faq,
        score: computeScore(msgLower, msgWords, faq),
      }));

      scored.sort((a: any, b: any) => b.score - a.score);

      const best = scored[0];
      const confidence = best.score;
      const level: FaqMatchResult['level'] =
        confidence >= 0.6 ? 'HIGH' :
        confidence >= 0.35 ? 'MEDIUM' :
        confidence > 0.1 ? 'LOW' : 'NONE';

      // Log match
      await supabase.from('faq_match_logs').insert({
        property_id: propertyId,
        guest_message: guestMessage,
        matched_faq_id: level !== 'NONE' ? best.id : null,
        confidence_score: confidence,
        ai_used: level === 'LOW' || level === 'NONE',
        response_source: level === 'NONE' ? 'ai' : 'faq',
      }).then(() => {});

      console.log(`📚 [FaqMatch] "${guestMessage.substring(0, 40)}..." → ${level} (${(confidence * 100).toFixed(0)}%)`);

      return {
        matched: level !== 'NONE',
        faqId: level !== 'NONE' ? best.id : null,
        answer: level !== 'NONE' ? best.answer : null,
        question: level !== 'NONE' ? best.question : null,
        confidence,
        level,
        topMatches: scored.slice(0, 3).filter((s: any) => s.score > 0.1).map((s: any) => ({
          question: s.question,
          answer: s.answer,
          score: s.score,
        })),
      };
    } catch (err) {
      console.error('❌ [FaqMatch] Error:', err);
      return { matched: false, faqId: null, answer: null, question: null, confidence: 0, level: 'NONE', topMatches: [] };
    }
  }
}

function computeScore(msgLower: string, msgWords: string[], faq: any): number {
  let score = 0;

  // Tag overlap (40%)
  if (faq.tags?.length > 0) {
    const tagMatches = faq.tags.filter((tag: string) => msgLower.includes(tag.toLowerCase())).length;
    score += (tagMatches / faq.tags.length) * 0.4;
  }

  // Question keyword overlap (35%)
  const questionWords = tokenize(faq.question.toLowerCase());
  if (questionWords.length > 0) {
    const setQ = new Set(questionWords);
    const matches = msgWords.filter(w => setQ.has(w)).length;
    score += (matches / questionWords.length) * 0.35;
  }

  // Bigram fuzzy (15%)
  const qBigrams = getBigrams(msgLower);
  const tBigrams = getBigrams(faq.question.toLowerCase());
  if (qBigrams.size > 0 && tBigrams.size > 0) {
    let m = 0;
    for (const bg of qBigrams) { if (tBigrams.has(bg)) m++; }
    score += ((2 * m) / (qBigrams.size + tBigrams.size)) * 0.15;
  }

  // Category match (10%)
  if (msgLower.includes(faq.category?.toLowerCase() || '') || msgLower.includes(faq.subcategory?.toLowerCase() || '')) {
    score += 0.1;
  }

  // Priority boost
  score += Math.min((faq.priority || 0) * 0.01, 0.05);

  return Math.min(score, 1.0);
}

function tokenize(text: string): string[] {
  return text.replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter(w => w.length > 2);
}

function getBigrams(str: string): Set<string> {
  const bigrams = new Set<string>();
  const clean = str.replace(/\s+/g, ' ').trim();
  for (let i = 0; i < clean.length - 1; i++) {
    bigrams.add(clean.substring(i, i + 2));
  }
  return bigrams;
}
