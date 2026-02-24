import React from 'react';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';

const STYLE_PRESETS = [
  { id: 'golden', emoji: '🌅', name: 'Golden Hour', settings: { brightness: 15, warmth: 30, saturation: 10, contrast: 5, hdr: true } },
  { id: 'bright', emoji: '☀️', name: 'Bright & Airy', settings: { brightness: 25, warmth: 5, saturation: -5, contrast: -10, autoEnhance: true } },
  { id: 'twilight', emoji: '🌙', name: 'Twilight Dusk', settings: { brightness: -15, warmth: -10, saturation: 15, contrast: 15, virtualTwilight: true } },
  { id: 'crisp', emoji: '📸', name: 'Clean & Crisp', settings: { brightness: 5, warmth: 0, saturation: 0, contrast: 10, sharpness: 80, autoEnhance: true } },
  { id: 'luxury', emoji: '🏨', name: 'Luxury Resort', settings: { brightness: 10, warmth: 15, saturation: 15, contrast: 10, hdr: true } },
  { id: 'cinematic', emoji: '🎬', name: 'Cinematic Film', settings: { brightness: -5, warmth: 10, saturation: -10, contrast: 25 } },
  { id: 'bw', emoji: '⬛', name: 'B&W Dramatic', settings: { brightness: 5, saturation: -100, contrast: 30 } },
  { id: 'nature', emoji: '🌿', name: 'Nature Vibrant', settings: { brightness: 10, warmth: 5, saturation: 30, contrast: 5 } },
];

const SKY_OPTIONS = [
  { id: 'sunset', emoji: '🌅', label: 'Sunset' },
  { id: 'sunrise', emoji: '🌄', label: 'Sunrise' },
  { id: 'blue', emoji: '💙', label: 'Perfect Blue' },
  { id: 'dramatic', emoji: '☁️', label: 'Dramatic Clouds' },
  { id: 'none', emoji: '🚫', label: 'No Sky Swap' },
];

export default function StylePresets({ settings, onReprocess, isReprocessing, activeStyle, activeSky }) {
  const [currentStyle, setCurrentStyle] = React.useState(activeStyle || null);
  const [currentSky, setCurrentSky] = React.useState(activeSky || 'none');

  const applyStyle = (preset) => {
    setCurrentStyle(preset.id);
    const merged = { ...settings, ...preset.settings };
    onReprocess(merged, preset.name);
  };

  const applySky = (sky) => {
    setCurrentSky(sky.id);
    if (sky.id === 'none') {
      onReprocess({ ...settings, skySwap: null }, 'No sky swap');
    } else {
      onReprocess({ ...settings, skySwap: sky.id }, `Sky: ${sky.label}`);
    }
  };

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        {STYLE_PRESETS.map((preset) => (
          <div
            key={preset.id}
            className={`relative flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition-all cursor-pointer ${
              currentStyle === preset.id ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/30'
            }`}
            onClick={() => !isReprocessing && applyStyle(preset)}
          >
            <span className="text-2xl">{preset.emoji}</span>
            <span className="text-[11px] font-semibold text-foreground text-center">{preset.name}</span>
            {currentStyle === preset.id ? (
              <span className="text-[10px] text-primary font-medium">Active ✓</span>
            ) : (
              <span className="text-[10px] text-muted-foreground">Try It</span>
            )}
            {isReprocessing && currentStyle === preset.id && (
              <Loader2 className="w-3 h-3 animate-spin text-primary absolute top-1 right-1" />
            )}
          </div>
        ))}
      </div>

      <div className="space-y-2">
        <p className="text-xs font-semibold text-foreground">Sky Quick-Switch</p>
        <div className="flex flex-wrap gap-2">
          {SKY_OPTIONS.map((sky) => (
            <button
              key={sky.id}
              type="button"
              disabled={isReprocessing}
              onClick={() => applySky(sky)}
              className={`px-3 py-1.5 text-xs rounded-lg border transition-colors flex items-center gap-1.5 ${
                currentSky === sky.id ? 'bg-primary text-primary-foreground border-primary' : 'border-border text-foreground hover:border-primary/40'
              }`}
            >
              <span>{sky.emoji}</span> {sky.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
