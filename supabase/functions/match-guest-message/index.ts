import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

interface FaqEntry {
  id: string;
  category: string;
  subcategory: string;
  question: string;
  answer: string;
  tags: string[];
  priority: number;
}

interface MatchResult {
  faq: FaqEntry | null;
  confidence: number; // 0-1
  level: 'HIGH' | 'MEDIUM' | 'LOW' | 'NONE';
  topMatches: Array<{ faq: FaqEntry; score: number }>;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const { property_id, guest_message, action, entries } = await req.json();

    // ── Bulk import action ──
    if (action === 'import' && property_id && entries) {
      return await handleImport(supabase, property_id, entries, corsHeaders);
    }

    if (!property_id || !guest_message) {
      return new Response(JSON.stringify({ error: 'property_id and guest_message are required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Fetch all active FAQ entries for this property
    const { data: faqs, error } = await supabase
      .from('faq_entries')
      .select('id, category, subcategory, question, answer, tags, priority')
      .eq('property_id', property_id)
      .eq('is_active', true)
      .order('priority', { ascending: false });

    if (error) throw error;

    if (!faqs || faqs.length === 0) {
      return new Response(JSON.stringify({
        faq: null,
        confidence: 0,
        level: 'NONE',
        topMatches: [],
      } as MatchResult), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Score each FAQ
    const scored = faqs.map((faq: FaqEntry) => ({
      faq,
      score: computeMatchScore(guest_message, faq),
    }));

    scored.sort((a: any, b: any) => b.score - a.score);

    const best = scored[0];
    const confidence = best.score;
    const level: MatchResult['level'] =
      confidence >= 0.6 ? 'HIGH' :
      confidence >= 0.35 ? 'MEDIUM' :
      confidence > 0.1 ? 'LOW' : 'NONE';

    const result: MatchResult = {
      faq: level !== 'NONE' ? best.faq : null,
      confidence,
      level,
      topMatches: scored.slice(0, 3).filter((s: any) => s.score > 0.1),
    };

    // Log the match
    await supabase.from('faq_match_logs').insert({
      property_id,
      guest_message,
      matched_faq_id: result.faq?.id || null,
      confidence_score: confidence,
      ai_used: level === 'LOW' || level === 'NONE',
      response_source: level === 'NONE' ? 'ai' : 'faq',
    });

    console.log(`📚 FAQ Match: "${guest_message.substring(0, 50)}..." → ${level} (${(confidence * 100).toFixed(0)}%) → ${result.faq?.question?.substring(0, 40) || 'none'}`);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (err) {
    console.error('match-guest-message error:', err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

// ═══════════════════════════════════════════
// SCORING ENGINE
// ═══════════════════════════════════════════

function computeMatchScore(message: string, faq: FaqEntry): number {
  const msgLower = message.toLowerCase();
  const msgWords = tokenize(msgLower);

  let score = 0;

  // 1. Tag overlap (highest weight)
  if (faq.tags && faq.tags.length > 0) {
    const tagMatches = faq.tags.filter(tag =>
      msgLower.includes(tag.toLowerCase())
    ).length;
    score += (tagMatches / faq.tags.length) * 0.4;
  }

  // 2. Question keyword overlap
  const questionWords = tokenize(faq.question.toLowerCase());
  const questionOverlap = computeWordOverlap(msgWords, questionWords);
  score += questionOverlap * 0.35;

  // 3. Fuzzy partial match on question
  const fuzzyScore = fuzzyPartialMatch(msgLower, faq.question.toLowerCase());
  score += fuzzyScore * 0.15;

  // 4. Category/subcategory keyword match
  if (msgLower.includes(faq.category.toLowerCase()) || msgLower.includes(faq.subcategory.toLowerCase())) {
    score += 0.1;
  }

  // 5. Priority boost (small)
  score += Math.min(faq.priority * 0.01, 0.05);

  return Math.min(score, 1.0);
}

function tokenize(text: string): string[] {
  return text
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length > 2);
}

function computeWordOverlap(wordsA: string[], wordsB: string[]): number {
  if (wordsB.length === 0) return 0;
  const setB = new Set(wordsB);
  const matches = wordsA.filter(w => setB.has(w)).length;
  return matches / Math.max(wordsB.length, 1);
}

function fuzzyPartialMatch(query: string, target: string): number {
  // Bigram similarity
  const qBigrams = getBigrams(query);
  const tBigrams = getBigrams(target);
  if (qBigrams.size === 0 || tBigrams.size === 0) return 0;

  let matches = 0;
  for (const bg of qBigrams) {
    if (tBigrams.has(bg)) matches++;
  }
  return (2 * matches) / (qBigrams.size + tBigrams.size);
}

function getBigrams(str: string): Set<string> {
  const bigrams = new Set<string>();
  const clean = str.replace(/\s+/g, ' ').trim();
  for (let i = 0; i < clean.length - 1; i++) {
    bigrams.add(clean.substring(i, i + 2));
  }
  return bigrams;
}

// ═══════════════════════════════════════════
// BULK IMPORT
// ═══════════════════════════════════════════

async function handleImport(supabase: any, propertyId: string, entries: any[], headers: Record<string, string>) {
  const rows = entries.map((entry: any) => ({
    property_id: propertyId,
    category: entry.category || 'General',
    subcategory: entry.subcategory || '',
    question: entry.question || '',
    answer: entry.answer || '',
    tags: Array.isArray(entry.tags)
      ? entry.tags
      : typeof entry.tags === 'string'
        ? entry.tags.split(',').map((t: string) => t.trim()).filter(Boolean)
        : [],
    priority: entry.priority || 0,
    is_active: true,
  })).filter((r: any) => r.question && r.answer);

  if (rows.length === 0) {
    return new Response(JSON.stringify({ error: 'No valid entries found' }), {
      status: 400, headers: { ...headers, 'Content-Type': 'application/json' },
    });
  }

  const { data, error } = await supabase.from('faq_entries').insert(rows).select();
  if (error) throw error;

  console.log(`📥 Imported ${data.length} FAQ entries for property ${propertyId}`);

  return new Response(JSON.stringify({ imported: data.length, entries: data }), {
    headers: { ...headers, 'Content-Type': 'application/json' },
  });
}
