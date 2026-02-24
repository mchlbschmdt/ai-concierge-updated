import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { ChevronDown, ChevronUp, Upload, Loader2 } from 'lucide-react';

const CREDIT_COSTS = {
  skyReplacement: 4,
  backgroundRemove: 2,
  objectRemove: 4,
  objectReplace: 5,
  objectRecolor: 3,
  upscale: 8,
  outpaint: 4,
  styleTransfer: 6,
};

const SKY_STYLES = [
  { value: 'sunset', label: 'Sunset' },
  { value: 'sunrise', label: 'Sunrise' },
  { value: 'cotton_candy', label: 'Cotton Candy' },
  { value: 'blue_sky', label: 'Blue Sky' },
  { value: 'dramatic_clouds', label: 'Dramatic Clouds' },
  { value: 'twilight', label: 'Twilight' },
  { value: 'stormy', label: 'Stormy' },
  { value: 'custom', label: 'Custom...' },
];

const COLOR_PRESETS = [
  { value: 'navy blue', label: 'Navy' },
  { value: 'forest green', label: 'Forest Green' },
  { value: 'charcoal gray', label: 'Charcoal' },
  { value: 'white', label: 'White' },
  { value: 'red', label: 'Red' },
];

const OUTPAINT_DIRECTIONS = [
  { value: 'all', label: 'All sides' },
  { value: 'left', label: 'Left' },
  { value: 'right', label: 'Right' },
  { value: 'top', label: 'Top' },
  { value: 'bottom', label: 'Bottom' },
  { value: 'left+right', label: 'Left+Right' },
  { value: 'top+bottom', label: 'Top+Bottom' },
];

function CostBadge({ cost }) {
  return (
    <span className="text-[10px] bg-muted text-muted-foreground rounded-full px-2 py-0.5 font-medium">
      ~{cost} credits
    </span>
  );
}

function ToolToggle({ checked, onChange }) {
  return (
    <button type="button" role="switch" aria-checked={checked} onClick={() => onChange(!checked)}
      className={`relative w-10 h-5 rounded-full transition-colors shrink-0 ${checked ? 'bg-purple-600' : 'bg-muted-foreground/30'}`}>
      <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${checked ? 'translate-x-5' : ''}`} />
    </button>
  );
}

function Chip({ selected, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`text-[11px] px-2.5 py-1 rounded-full border font-medium transition-colors ${
        selected
          ? 'bg-purple-600 text-white border-purple-600'
          : 'bg-muted/50 text-foreground border-border hover:border-purple-400'
      }`}
    >
      {children}
    </button>
  );
}

function ToolCard({ icon, name, description, cost, children, action }) {
  return (
    <div className="bg-muted/30 border border-border rounded-lg p-4 space-y-3">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-start gap-2 min-w-0">
          <span className="text-lg leading-none mt-0.5">{icon}</span>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-foreground">{name}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <CostBadge cost={cost} />
          {action}
        </div>
      </div>
      {children}
    </div>
  );
}

export default function AiToolsPanel({ aiTools, setAiTools, currentUser }) {
  const [collapsed, setCollapsed] = useState(false);
  const [configuring, setConfiguring] = useState(null); // which tool is open for config
  const [uploadingRef, setUploadingRef] = useState(false);
  const refFileInput = useRef(null);

  const update = (key, val) => setAiTools(prev => ({ ...prev, [key]: { ...prev[key], ...val } }));

  const estimatedCost = Object.entries(CREDIT_COSTS).reduce((sum, [key, cost]) => {
    return sum + (aiTools[key]?.enabled ? cost : 0);
  }, 0);

  const handleStyleRefUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !currentUser?.id) return;
    setUploadingRef(true);
    try {
      const path = `${currentUser.id}/style_ref_${Date.now()}.jpg`;
      const { error } = await supabase.storage.from('snappro-photos').upload(path, file, { contentType: file.type });
      if (error) throw error;
      const { data: { publicUrl } } = supabase.storage.from('snappro-photos').getPublicUrl(path);
      update('styleTransfer', { enabled: true, referenceImageUrl: publicUrl, referenceImageFile: file.name });
      toast.success('Reference image uploaded');
    } catch (err) {
      console.error(err);
      toast.error('Failed to upload reference image');
    } finally {
      setUploadingRef(false);
    }
  };

  return (
    <div className="bg-card border border-border rounded-xl p-6 space-y-4 animate-scale-in">
      {/* Header */}
      <button
        type="button"
        className="w-full flex items-center justify-between"
        onClick={() => setCollapsed(!collapsed)}
      >
        <div className="flex items-center gap-2">
          <span className="text-purple-600 text-lg">✨</span>
          <h2 className="text-base font-semibold text-foreground">AI Tools</h2>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-[10px] text-muted-foreground">Powered by Stability AI</span>
          {collapsed ? <ChevronDown className="w-4 h-4 text-muted-foreground" /> : <ChevronUp className="w-4 h-4 text-muted-foreground" />}
        </div>
      </button>

      {!collapsed && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* ROW 1 — Sky & Outdoors */}
            <ToolCard
              icon="🌅" name="Sky Replacement" description="Replace sky with AI-generated scene"
              cost={CREDIT_COSTS.skyReplacement}
              action={<ToolToggle checked={aiTools.skyReplacement?.enabled || false} onChange={(v) => update('skyReplacement', { enabled: v })} />}
            >
              {aiTools.skyReplacement?.enabled && (
                <div className="space-y-2">
                  <div className="flex flex-wrap gap-1.5">
                    {SKY_STYLES.map(s => (
                      <Chip
                        key={s.value}
                        selected={aiTools.skyReplacement?.style === s.value}
                        onClick={() => update('skyReplacement', { style: s.value })}
                      >
                        {s.label}
                      </Chip>
                    ))}
                  </div>
                  {aiTools.skyReplacement?.style === 'custom' && (
                    <input
                      type="text"
                      placeholder="Describe your sky…"
                      value={aiTools.skyReplacement?.customSkyDescription || ''}
                      onChange={(e) => update('skyReplacement', { customSkyDescription: e.target.value })}
                      className="w-full text-xs bg-background border border-border rounded-md px-3 py-2 text-foreground placeholder:text-muted-foreground"
                    />
                  )}
                </div>
              )}
            </ToolCard>

            <ToolCard
              icon="🏠" name="Background Remove" description="Cut out subject onto transparent bg"
              cost={CREDIT_COSTS.backgroundRemove}
              action={<ToolToggle checked={aiTools.backgroundRemove?.enabled || false} onChange={(v) => update('backgroundRemove', { enabled: v })} />}
            >
              {aiTools.backgroundRemove?.enabled && (
                <p className="text-[11px] text-muted-foreground bg-muted/50 rounded px-2 py-1.5">Outputs PNG with transparency</p>
              )}
            </ToolCard>

            {/* ROW 2 — Object Tools */}
            <ToolCard
              icon="✂️" name="Erase Object" description="Remove any object from the photo"
              cost={CREDIT_COSTS.objectRemove}
              action={
                <Button size="sm" variant="outline" className="text-xs h-7" onClick={() => setConfiguring(configuring === 'erase' ? null : 'erase')}>
                  Configure
                </Button>
              }
            >
              {configuring === 'erase' && (
                <div className="space-y-2">
                  <input
                    type="text"
                    placeholder="e.g. garden hose, trash can, parked car"
                    value={aiTools.objectRemove?.description || ''}
                    onChange={(e) => update('objectRemove', { description: e.target.value })}
                    className="w-full text-xs bg-background border border-border rounded-md px-3 py-2 text-foreground placeholder:text-muted-foreground"
                  />
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Enable</span>
                    <ToolToggle checked={aiTools.objectRemove?.enabled || false} onChange={(v) => update('objectRemove', { enabled: v })} />
                  </div>
                </div>
              )}
            </ToolCard>

            <ToolCard
              icon="🔄" name="Replace Object" description="Swap one object for another"
              cost={CREDIT_COSTS.objectReplace}
              action={
                <Button size="sm" variant="outline" className="text-xs h-7" onClick={() => setConfiguring(configuring === 'replace' ? null : 'replace')}>
                  Configure
                </Button>
              }
            >
              {configuring === 'replace' && (
                <div className="space-y-2">
                  <input
                    type="text"
                    placeholder="What to find? e.g. old patio furniture"
                    value={aiTools.objectReplace?.searchFor || ''}
                    onChange={(e) => update('objectReplace', { searchFor: e.target.value })}
                    className="w-full text-xs bg-background border border-border rounded-md px-3 py-2 text-foreground placeholder:text-muted-foreground"
                  />
                  <input
                    type="text"
                    placeholder="Replace with? e.g. modern teak sectional"
                    value={aiTools.objectReplace?.replaceWith || ''}
                    onChange={(e) => update('objectReplace', { replaceWith: e.target.value })}
                    className="w-full text-xs bg-background border border-border rounded-md px-3 py-2 text-foreground placeholder:text-muted-foreground"
                  />
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Enable</span>
                    <ToolToggle checked={aiTools.objectReplace?.enabled || false} onChange={(v) => update('objectReplace', { enabled: v })} />
                  </div>
                </div>
              )}
            </ToolCard>

            <ToolCard
              icon="🎨" name="Recolor Object" description="Change color of any specific item"
              cost={CREDIT_COSTS.objectRecolor}
              action={
                <Button size="sm" variant="outline" className="text-xs h-7" onClick={() => setConfiguring(configuring === 'recolor' ? null : 'recolor')}>
                  Configure
                </Button>
              }
            >
              {configuring === 'recolor' && (
                <div className="space-y-2">
                  <input
                    type="text"
                    placeholder="What to recolor? e.g. front door, shutters"
                    value={aiTools.objectRecolor?.searchFor || ''}
                    onChange={(e) => update('objectRecolor', { searchFor: e.target.value })}
                    className="w-full text-xs bg-background border border-border rounded-md px-3 py-2 text-foreground placeholder:text-muted-foreground"
                  />
                  <div className="flex flex-wrap gap-1.5">
                    {COLOR_PRESETS.map(c => (
                      <Chip
                        key={c.value}
                        selected={aiTools.objectRecolor?.color === c.value}
                        onClick={() => update('objectRecolor', { color: c.value })}
                      >
                        {c.label}
                      </Chip>
                    ))}
                  </div>
                  <input
                    type="text"
                    placeholder="Or type a custom color…"
                    value={aiTools.objectRecolor?.color || ''}
                    onChange={(e) => update('objectRecolor', { color: e.target.value })}
                    className="w-full text-xs bg-background border border-border rounded-md px-3 py-2 text-foreground placeholder:text-muted-foreground"
                  />
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Enable</span>
                    <ToolToggle checked={aiTools.objectRecolor?.enabled || false} onChange={(v) => update('objectRecolor', { enabled: v })} />
                  </div>
                </div>
              )}
            </ToolCard>

            {/* ROW 3 — Enhance & Expand */}
            <ToolCard
              icon="⬆️" name="AI Upscale" description="4x resolution boost with added detail"
              cost={CREDIT_COSTS.upscale}
              action={<ToolToggle checked={aiTools.upscale?.enabled || false} onChange={(v) => update('upscale', { enabled: v })} />}
            >
              {aiTools.upscale?.enabled && (
                <div className="space-y-1.5">
                  {['conservative', 'creative', 'fast'].map(mode => (
                    <label key={mode} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="upscale-mode"
                        checked={aiTools.upscale?.mode === mode}
                        onChange={() => update('upscale', { mode })}
                        className="accent-purple-600"
                      />
                      <span className="text-xs text-foreground capitalize">{mode}</span>
                      <span className="text-[10px] text-muted-foreground">
                        {mode === 'conservative' && '— preserves exact detail'}
                        {mode === 'creative' && '— AI adds fine detail'}
                        {mode === 'fast' && '— minimal processing time'}
                      </span>
                    </label>
                  ))}
                </div>
              )}
            </ToolCard>

            <ToolCard
              icon="🖼" name="Outpaint / Expand" description="Extend the photo beyond its edges"
              cost={CREDIT_COSTS.outpaint}
              action={<ToolToggle checked={aiTools.outpaint?.enabled || false} onChange={(v) => update('outpaint', { enabled: v })} />}
            >
              {aiTools.outpaint?.enabled && (
                <div className="space-y-3">
                  <div className="flex flex-wrap gap-1.5">
                    {OUTPAINT_DIRECTIONS.map(d => (
                      <Chip
                        key={d.value}
                        selected={aiTools.outpaint?.direction === d.value}
                        onClick={() => update('outpaint', { direction: d.value })}
                      >
                        {d.label}
                      </Chip>
                    ))}
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">Expansion: {aiTools.outpaint?.amount || 200}px</span>
                    </div>
                    <input
                      type="range"
                      min={100}
                      max={500}
                      step={50}
                      value={aiTools.outpaint?.amount || 200}
                      onChange={(e) => update('outpaint', { amount: Number(e.target.value) })}
                      className="w-full accent-purple-600"
                    />
                  </div>
                  <p className="text-[10px] text-muted-foreground">Useful for fixing tight crops or creating social media banner space</p>
                </div>
              )}
            </ToolCard>

            {/* ROW 4 — Style */}
            <ToolCard
              icon="🎭" name="Style Transfer" description="Apply the visual style of another photo"
              cost={CREDIT_COSTS.styleTransfer}
              action={
                <Button
                  size="sm"
                  variant="outline"
                  className="text-xs h-7"
                  onClick={() => refFileInput.current?.click()}
                  disabled={uploadingRef}
                >
                  {uploadingRef ? <Loader2 className="w-3 h-3 animate-spin" /> : <Upload className="w-3 h-3 mr-1" />}
                  Upload Reference
                </Button>
              }
            >
              <input ref={refFileInput} type="file" accept="image/jpeg,image/png" className="hidden" onChange={handleStyleRefUpload} />
              {aiTools.styleTransfer?.referenceImageFile && (
                <p className="text-[11px] text-green-600 font-medium">✓ {aiTools.styleTransfer.referenceImageFile}</p>
              )}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Strength: {Math.round((aiTools.styleTransfer?.strength || 0.5) * 100)}%</span>
                  <ToolToggle checked={aiTools.styleTransfer?.enabled || false} onChange={(v) => update('styleTransfer', { enabled: v })} />
                </div>
                <input
                  type="range"
                  min={20}
                  max={80}
                  value={Math.round((aiTools.styleTransfer?.strength || 0.5) * 100)}
                  onChange={(e) => update('styleTransfer', { strength: Number(e.target.value) / 100 })}
                  className="w-full accent-purple-600"
                />
              </div>
            </ToolCard>
          </div>

          {/* Cost Summary */}
          {estimatedCost > 0 && (
            <div className="flex items-center justify-between bg-purple-50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800 rounded-lg px-4 py-2.5">
              <span className="text-xs font-medium text-purple-700 dark:text-purple-300">
                Estimated cost: ~{estimatedCost} Stability AI credits
              </span>
              <span className="text-[10px] text-purple-500 dark:text-purple-400">per process</span>
            </div>
          )}
        </>
      )}
    </div>
  );
}
