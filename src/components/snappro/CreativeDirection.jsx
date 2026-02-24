import React, { useState, useRef, useCallback } from 'react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, Sparkles, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const VIBES = ['Luxury & High-End', 'Cozy & Inviting', 'Modern & Minimalist', 'Rustic & Charming', 'Tropical & Resort', 'Urban & Sophisticated', 'Bright & Airy', 'Dark & Moody', 'Professional & Clean'];
const TIMES = ['Golden Hour Sunset', 'Soft Morning Light', 'Midday Bright', 'Blue Hour Dusk', 'Night Ambiance', 'Overcast Natural', 'No preference'];

const CHIP_GROUPS = [
  { label: '💡 Lighting', chips: ['Make it brighter', 'Fix dark corners', 'Enhance windows', 'Add warm glow', 'Even out exposure'] },
  { label: '🌅 Sky/Outdoors', chips: ['Dramatic sunset sky', 'Clear blue sky', 'Add clouds', 'Tropical feel', 'Lush greenery', 'Vibrant landscaping'] },
  { label: '✨ Style', chips: ['Magazine quality', '5-star hotel feel', 'Professionally staged', 'Crisp and sharp', 'Cinematic color grade', 'Lifestyle editorial'] },
  { label: '🔧 Remove/Fix', chips: ['Remove clutter', 'Remove cars', 'Remove people', 'Fix perspective', 'Clean up distractions', 'Remove lens flare'] },
];

const QUICK_PHRASES = ['luxury resort feel', 'remove the', 'add warm light', '5-star hotel quality', 'magazine editorial', 'vibrant', 'professional staging', 'sunset sky', 'crisp and sharp'];

const REF_STYLES = ['None selected', 'Match Airbnb Luxe listings', 'Match Forbes Travel Guide photography', 'Match HGTV Magazine covers', 'Match Architectural Digest'];

export default function CreativeDirection({ direction, onDirectionChange, imageUrl, onApplyInspiration }) {
  const [activeTab, setActiveTab] = useState('guided');
  const [inspireResults, setInspireResults] = useState(null);
  const [inspireLoading, setInspireLoading] = useState(false);
  const customRef = useRef(null);

  const assembledPrompt = buildPrompt(direction);

  const handleChipToggle = (chip) => {
    const current = direction.selectedChips || [];
    if (current.includes(chip)) {
      onDirectionChange({ ...direction, selectedChips: current.filter(c => c !== chip) });
    } else if (current.length < 4) {
      onDirectionChange({ ...direction, selectedChips: [...current, chip] });
    }
  };

  const insertPhrase = (phrase) => {
    const ta = customRef.current;
    if (!ta) return;
    const start = ta.selectionStart;
    const current = direction.customPrompt || '';
    const newText = current.slice(0, start) + phrase + current.slice(start);
    if (newText.length <= 600) {
      onDirectionChange({ ...direction, customPrompt: newText });
    }
  };

  const fetchInspiration = useCallback(async () => {
    if (!imageUrl) { toast.error('Upload an image first'); return; }
    setInspireLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('snappro-inspire', {
        body: { mode: 'inspire', imageUrl },
      });
      if (error) throw error;
      if (data?.result && Array.isArray(data.result)) {
        setInspireResults(data.result);
      } else {
        toast.error('Unexpected response from AI');
      }
    } catch (err) {
      console.error(err);
      toast.error(err.message || 'Failed to get inspiration');
    } finally {
      setInspireLoading(false);
    }
  }, [imageUrl]);

  const handleTabChange = (value) => {
    setActiveTab(value);
    if (value === 'inspire' && !inspireResults && !inspireLoading) {
      fetchInspiration();
    }
  };

  return (
    <div className="bg-card border border-border rounded-xl p-6 space-y-4 animate-scale-in">
      <h2 className="text-base font-semibold text-foreground">🎨 Creative Direction</h2>

      <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
        <TabsList className="w-full">
          <TabsTrigger value="guided" className="flex-1 text-xs">✨ Guided</TabsTrigger>
          <TabsTrigger value="custom" className="flex-1 text-xs">✍️ Custom</TabsTrigger>
          <TabsTrigger value="inspire" className="flex-1 text-xs">🎲 Inspire Me</TabsTrigger>
        </TabsList>

        {/* Guided Mode */}
        <TabsContent value="guided" className="space-y-4 mt-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <SelectField label="Overall Vibe" options={VIBES} value={direction.vibe} onChange={(v) => onDirectionChange({ ...direction, vibe: v })} />
            <SelectField label="Time of Day Feel" options={TIMES} value={direction.timeOfDay} onChange={(v) => onDirectionChange({ ...direction, timeOfDay: v })} />
          </div>

          <div className="space-y-3">
            <p className="text-xs font-semibold text-foreground">Add up to 4 requests <span className="text-muted-foreground font-normal">({(direction.selectedChips || []).length}/4)</span></p>
            {CHIP_GROUPS.map((group) => (
              <div key={group.label} className="space-y-1.5">
                <p className="text-[11px] font-medium text-muted-foreground">{group.label}</p>
                <div className="flex flex-wrap gap-1.5">
                  {group.chips.map((chip) => {
                    const isSelected = (direction.selectedChips || []).includes(chip);
                    const isFull = (direction.selectedChips || []).length >= 4 && !isSelected;
                    return (
                      <button
                        key={chip}
                        type="button"
                        disabled={isFull}
                        onClick={() => handleChipToggle(chip)}
                        className={`px-2.5 py-1 text-[11px] rounded-full border transition-all ${
                          isSelected ? 'bg-primary text-primary-foreground border-primary' : isFull ? 'opacity-40 border-border text-muted-foreground cursor-not-allowed' : 'border-border text-foreground hover:border-primary/40 bg-muted/30'
                        }`}
                      >
                        {chip}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}

            {(direction.selectedChips || []).length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {direction.selectedChips.map((chip) => (
                  <span key={chip} className="inline-flex items-center gap-1 px-2.5 py-1 bg-primary/10 text-primary text-[11px] rounded-full">
                    {chip}
                    <button type="button" onClick={() => handleChipToggle(chip)}><X className="w-3 h-3" /></button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {assembledPrompt && (
            <div className="bg-muted/50 border border-border rounded-lg p-3">
              <p className="text-[11px] text-muted-foreground italic">{assembledPrompt}</p>
            </div>
          )}
        </TabsContent>

        {/* Custom Mode */}
        <TabsContent value="custom" className="space-y-4 mt-4">
          <div className="relative">
            <Textarea
              ref={customRef}
              placeholder="Describe exactly what you want... 'Make it look like a 5-star luxury resort', 'Remove the garden hose near the fence', 'Warm sunset tones on the patio'"
              value={direction.customPrompt || ''}
              onChange={(e) => e.target.value.length <= 600 && onDirectionChange({ ...direction, customPrompt: e.target.value })}
              className="min-h-[100px]"
            />
            <span className="absolute bottom-2 right-3 text-[10px] text-muted-foreground">{(direction.customPrompt || '').length}/600</span>
          </div>

          <div className="flex flex-wrap gap-1.5">
            {QUICK_PHRASES.map((p) => (
              <button key={p} type="button" onClick={() => insertPhrase(p)} className="px-2.5 py-1 text-[11px] rounded-full border border-border bg-muted/30 text-foreground hover:border-primary/40 transition-colors">
                + {p}
              </button>
            ))}
          </div>

          <div>
            <label className="text-xs font-semibold text-foreground block mb-1.5">What to AVOID</label>
            <Textarea
              placeholder="e.g. don't make it look fake, keep colors natural"
              value={direction.negativePrompt || ''}
              onChange={(e) => onDirectionChange({ ...direction, negativePrompt: e.target.value })}
              className="min-h-[60px]"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground">Reference Style</label>
            <div className="flex flex-wrap gap-2">
              {REF_STYLES.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => onDirectionChange({ ...direction, referenceStyle: s })}
                  className={`px-3 py-1.5 text-[11px] rounded-lg border transition-colors ${
                    direction.referenceStyle === s ? 'bg-primary text-primary-foreground border-primary' : 'border-border text-foreground hover:border-primary/40'
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        </TabsContent>

        {/* Inspire Me */}
        <TabsContent value="inspire" className="space-y-4 mt-4" forceMount={activeTab === 'inspire' ? undefined : undefined}>
          {inspireLoading && (
            <div className="flex items-center justify-center gap-2 py-8 text-sm text-muted-foreground">
              <Loader2 className="w-5 h-5 animate-spin text-primary" />
              ✨ Analyzing your photo...
            </div>
          )}

          {inspireResults && (
            <>
              <div className="space-y-3">
                {inspireResults.map((idea, i) => (
                  <div key={i} className={`relative border rounded-xl p-4 space-y-2 transition-colors ${idea.isRecommended ? 'border-warning bg-warning/5' : 'border-border'}`}>
                    {idea.isRecommended && (
                      <span className="absolute top-2 right-2 text-[10px] font-semibold bg-warning/20 text-warning px-2 py-0.5 rounded-full">⭐ Recommended</span>
                    )}
                    <div className="flex items-center gap-2">
                      <span className="text-2xl">{idea.emoji}</span>
                      <h3 className="text-sm font-semibold text-foreground">{idea.name}</h3>
                    </div>
                    <p className="text-xs text-muted-foreground">{idea.description}</p>
                    <button
                      type="button"
                      onClick={() => {
                        onApplyInspiration(idea);
                        setActiveTab('guided');
                      }}
                      className="px-3 py-1.5 text-xs font-medium rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
                    >
                      Apply This Direction
                    </button>
                  </div>
                ))}
              </div>
              <button type="button" onClick={fetchInspiration} className="text-xs text-primary hover:underline">
                Generate 4 more ideas
              </button>
            </>
          )}

          {!inspireLoading && !inspireResults && (
            <div className="text-center py-6">
              <button type="button" onClick={fetchInspiration} className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md border border-border text-foreground hover:bg-muted/50 transition-colors">
                <Sparkles className="w-4 h-4" /> Analyze Photo & Get Ideas
              </button>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function SelectField({ label, options, value, onChange }) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-semibold text-foreground">{label}</label>
      <select
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-3 py-2 text-xs border border-border rounded-lg bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
      >
        <option value="">Select...</option>
        {options.map((o) => <option key={o} value={o}>{o}</option>)}
      </select>
    </div>
  );
}

function buildPrompt(direction) {
  const parts = [];
  if (direction.vibe) parts.push(direction.vibe.toLowerCase());
  if (direction.timeOfDay && direction.timeOfDay !== 'No preference') parts.push(direction.timeOfDay.toLowerCase() + ' lighting');
  if (direction.selectedChips?.length) parts.push(direction.selectedChips.join(', ').toLowerCase());
  if (!parts.length) return '';
  return `Professional real estate photo, ${parts.join(', ')}...`;
}
