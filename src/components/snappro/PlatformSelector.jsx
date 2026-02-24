import React, { useState } from 'react';
import { CheckCircle } from 'lucide-react';
import PlatformSubPanels from './PlatformSubPanels';

const PLATFORMS = [
  { id: 'airbnb', icon: '🏠', name: 'Airbnb Listing', desc: 'Optimized for Airbnb search & detail pages' },
  { id: 'vrbo', icon: '🏖', name: 'VRBO Listing', desc: 'Sized & enhanced for VRBO galleries' },
  { id: 'instagram', icon: '📱', name: 'Instagram/Social', desc: 'Perfect for feed, stories & reels' },
  { id: 'paid_ads', icon: '🎯', name: 'Paid Ads', desc: 'Facebook, IG & Google ad formats' },
  { id: 'email', icon: '📧', name: 'Email Campaign', desc: 'Lightweight for inboxes' },
  { id: 'print', icon: '🖨', name: 'Print/Brochure', desc: 'High-res for physical media' },
  { id: 'website', icon: '🌐', name: 'Website/Portfolio', desc: 'Web-optimized hero & gallery' },
  { id: 'video_thumb', icon: '🎬', name: 'Video Thumbnail', desc: 'Eye-catching video covers' },
  { id: 'custom', icon: '✨', name: 'Custom/Other', desc: 'Configure everything manually' },
];

export default function PlatformSelector({ platformConfig, onPlatformChange, onSettingsAutoApply }) {
  const selected = platformConfig.platform;

  const handleSelect = (id) => {
    const isDeselect = selected === id;
    const newPlatform = isDeselect ? null : id;
    
    const defaults = getPlatformDefaults(newPlatform);
    onPlatformChange({ ...platformConfig, platform: newPlatform, ...defaults });
    
    if (!isDeselect && defaults.autoSettings) {
      onSettingsAutoApply(defaults.autoSettings);
    }
  };

  return (
    <div className="bg-card border border-border rounded-xl p-6 space-y-4 animate-scale-in">
      <h2 className="text-base font-semibold text-foreground">📍 Where Will This Be Used?</h2>
      <p className="text-xs text-muted-foreground">Select a platform to auto-configure optimal settings</p>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {PLATFORMS.map((p) => (
          <button
            key={p.id}
            onClick={() => handleSelect(p.id)}
            className={`relative flex flex-col items-center gap-1.5 p-4 rounded-xl border-2 transition-all text-center ${
              selected === p.id
                ? 'border-primary bg-primary/5 shadow-sm'
                : 'border-border hover:border-primary/30 hover:bg-muted/30'
            }`}
          >
            {selected === p.id && (
              <div className="absolute top-1.5 right-1.5">
                <CheckCircle className="w-4 h-4 text-primary" />
              </div>
            )}
            <span className="text-2xl">{p.icon}</span>
            <span className="text-xs font-semibold text-foreground leading-tight">{p.name}</span>
            <span className="text-[10px] text-muted-foreground leading-tight">{p.desc}</span>
          </button>
        ))}
      </div>

      {/* Sub-panel accordion */}
      <div
        className="overflow-hidden transition-all duration-300 ease-in-out"
        style={{ maxHeight: selected ? '2000px' : '0px', opacity: selected ? 1 : 0 }}
      >
        {selected && (
          <div className="pt-4 border-t border-border mt-2">
            <PlatformSubPanels platform={selected} config={platformConfig} onChange={onPlatformChange} onSettingsAutoApply={onSettingsAutoApply} />
          </div>
        )}
      </div>

      {/* Output info box */}
      {selected && platformConfig.outputWidth && (
        <div className="flex flex-wrap items-center gap-2 bg-muted/50 border border-border rounded-lg px-4 py-2.5 text-xs">
          <span className="font-medium text-foreground">
            Output: {platformConfig.outputWidth}×{platformConfig.outputHeight}px ({platformConfig.aspectRatio}) · {platformConfig.dpi || 72}dpi · {platformConfig.format || 'jpeg'}
          </span>
          {platformConfig.requirementMet && (
            <span className="inline-flex items-center gap-1 text-success font-medium">
              <CheckCircle className="w-3 h-3" /> {platformConfig.requirementLabel}
            </span>
          )}
        </div>
      )}
    </div>
  );
}

function getPlatformDefaults(platform) {
  switch (platform) {
    case 'airbnb':
      return { outputWidth: 1920, outputHeight: 1280, aspectRatio: '3:2', dpi: 72, format: 'jpeg', requirementMet: true, requirementLabel: 'Meets Airbnb minimum', autoSettings: { autoEnhance: true, hdr: true } };
    case 'vrbo':
      return { outputWidth: 1600, outputHeight: 1200, aspectRatio: '4:3', dpi: 72, format: 'jpeg', requirementMet: true, requirementLabel: 'Meets VRBO requirements', autoSettings: { autoEnhance: true } };
    case 'instagram':
      return { outputWidth: 1080, outputHeight: 1080, aspectRatio: '1:1', dpi: 72, format: 'jpeg', requirementMet: true, requirementLabel: 'Meets Instagram square', autoSettings: null };
    case 'paid_ads':
      return { outputWidth: 1200, outputHeight: 628, aspectRatio: '1.91:1', dpi: 72, format: 'jpeg', requirementMet: true, requirementLabel: 'Meets Facebook ad specs', autoSettings: null };
    case 'email':
      return { outputWidth: 600, outputHeight: 400, aspectRatio: '3:2', dpi: 72, format: 'jpeg', requirementMet: true, requirementLabel: 'Email optimized', autoSettings: null };
    case 'print':
      return { outputWidth: 3000, outputHeight: 2400, aspectRatio: '5:4', dpi: 300, format: 'jpeg', requirementMet: false, requirementLabel: 'Check resolution', autoSettings: null };
    case 'website':
      return { outputWidth: 1600, outputHeight: 900, aspectRatio: '16:9', dpi: 72, format: 'webp', requirementMet: true, requirementLabel: 'Web optimized', autoSettings: null };
    case 'video_thumb':
      return { outputWidth: 1280, outputHeight: 720, aspectRatio: '16:9', dpi: 72, format: 'jpeg', requirementMet: true, requirementLabel: 'YouTube thumbnail ready', autoSettings: null };
    case 'custom':
      return { outputWidth: null, outputHeight: null, aspectRatio: null, dpi: 72, format: 'jpeg', requirementMet: false, requirementLabel: '', autoSettings: null };
    default:
      return {};
  }
}
