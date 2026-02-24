import React, { useState } from 'react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import StylePresets from './StylePresets';
import OverlayBuilder from './OverlayBuilder';
import AskAiChat from './AskAiChat';

const DEFAULT_TWEAKS = { brightness: 0, warmth: 0, saturation: 0, contrast: 0, sharpness: 50 };

function Slider({ label, value, min, max, onChange }) {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <label className="text-xs font-medium text-foreground">{label}</label>
        <span className="text-[11px] text-muted-foreground">{value > 0 ? '+' : ''}{value}</span>
      </div>
      <input type="range" min={min} max={max} value={value} onChange={(e) => onChange(Number(e.target.value))} className="w-full accent-primary" />
    </div>
  );
}

export default function IterationPanel({ settings, onReprocess, processedImageUrl, originalImageUrl, currentUser, isReprocessing }) {
  const [tweaks, setTweaks] = useState(DEFAULT_TWEAKS);

  const handleApplyTweaks = () => {
    const updatedSettings = {
      ...settings,
      brightness: tweaks.brightness,
      warmth: tweaks.warmth,
      saturation: tweaks.saturation,
      contrast: tweaks.contrast,
      sharpness: tweaks.sharpness,
    };
    onReprocess(updatedSettings, `Tweaks: brightness ${tweaks.brightness}, warmth ${tweaks.warmth}`);
  };

  return (
    <div className="bg-card border border-border rounded-xl p-6 space-y-4 animate-scale-in">
      <div>
        <h2 className="text-base font-semibold text-foreground">🎨 Refine This Photo</h2>
        <p className="text-xs text-muted-foreground mt-0.5">Not quite right? Adjust and re-process in seconds. Uses your original photo — no quality loss.</p>
      </div>

      <Tabs defaultValue="tweaks" className="w-full">
        <TabsList className="w-full">
          <TabsTrigger value="tweaks" className="flex-1 text-xs">Quick Tweaks</TabsTrigger>
          <TabsTrigger value="style" className="flex-1 text-xs">Change Style</TabsTrigger>
          <TabsTrigger value="overlays" className="flex-1 text-xs">Add Overlays</TabsTrigger>
          <TabsTrigger value="ask_ai" className="flex-1 text-xs">Ask AI</TabsTrigger>
        </TabsList>

        {/* Quick Tweaks */}
        <TabsContent value="tweaks" className="space-y-4 mt-4">
          <div className="space-y-3">
            <Slider label="Brightness" value={tweaks.brightness} min={-50} max={50} onChange={(v) => setTweaks(t => ({ ...t, brightness: v }))} />
            <Slider label="Warmth" value={tweaks.warmth} min={-50} max={50} onChange={(v) => setTweaks(t => ({ ...t, warmth: v }))} />
            <Slider label="Saturation" value={tweaks.saturation} min={-50} max={50} onChange={(v) => setTweaks(t => ({ ...t, saturation: v }))} />
            <Slider label="Contrast" value={tweaks.contrast} min={-50} max={50} onChange={(v) => setTweaks(t => ({ ...t, contrast: v }))} />
            <Slider label="Sharpness" value={tweaks.sharpness} min={0} max={100} onChange={(v) => setTweaks(t => ({ ...t, sharpness: v }))} />
          </div>

          <div className="flex items-center justify-between">
            <button type="button" className="text-xs text-primary hover:underline" onClick={() => setTweaks(DEFAULT_TWEAKS)}>
              Reset to Default
            </button>
            <Button size="sm" onClick={handleApplyTweaks} disabled={isReprocessing}>
              {isReprocessing ? <><Loader2 className="w-3 h-3 mr-1 animate-spin" /> Re-processing...</> : '⚡ Apply Tweaks'}
            </Button>
          </div>
        </TabsContent>

        {/* Change Style */}
        <TabsContent value="style" className="mt-4">
          <StylePresets settings={settings} onReprocess={onReprocess} isReprocessing={isReprocessing} />
        </TabsContent>

        {/* Add Overlays */}
        <TabsContent value="overlays" className="mt-4">
          <OverlayBuilder processedImageUrl={processedImageUrl} currentUser={currentUser} />
        </TabsContent>

        {/* Ask AI */}
        <TabsContent value="ask_ai" className="mt-4">
          <AskAiChat settings={settings} onReprocess={onReprocess} isReprocessing={isReprocessing} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
