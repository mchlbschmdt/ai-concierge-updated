import React from 'react';

const PHOTO_TYPES = ['Exterior/Hero Shot', 'Interior/Living', 'Bedroom', 'Bathroom', 'Kitchen', 'Outdoor/Pool/Deck', 'View from Property'];

function RadioGroup({ label, options, value, onChange }) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-semibold text-foreground">{label}</label>
      <div className="flex flex-wrap gap-2">
        {options.map((opt) => {
          const val = typeof opt === 'string' ? opt : opt.value;
          const lbl = typeof opt === 'string' ? opt : opt.label;
          return (
            <button
              key={val}
              type="button"
              onClick={() => onChange(val)}
              className={`px-3 py-1.5 text-xs rounded-lg border transition-colors ${
                value === val ? 'bg-primary text-primary-foreground border-primary' : 'bg-card border-border text-foreground hover:border-primary/40'
              }`}
            >
              {lbl}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function ChipRow({ label, options, value, onChange }) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-semibold text-foreground">{label}</label>
      <div className="flex flex-wrap gap-1.5">
        {options.map((opt) => (
          <button
            key={opt}
            type="button"
            onClick={() => onChange(opt)}
            className={`px-2.5 py-1 text-[11px] rounded-full border transition-colors ${
              value === opt ? 'bg-primary text-primary-foreground border-primary' : 'bg-muted border-border text-foreground hover:border-primary/40'
            }`}
          >
            {opt}
          </button>
        ))}
      </div>
    </div>
  );
}

export default function PlatformSubPanels({ platform, config, onChange, onSettingsAutoApply }) {
  const sub = config.subOptions || {};
  const updateSub = (key, val) => onChange({ ...config, subOptions: { ...sub, [key]: val } });

  switch (platform) {
    case 'airbnb':
      return (
        <div className="space-y-4">
          <RadioGroup label="Photo Type" options={PHOTO_TYPES} value={sub.photoType} onChange={(v) => updateSub('photoType', v)} />
          <RadioGroup
            label="Listing Tier"
            options={[
              { value: 'standard', label: 'Standard (1024×683px min)' },
              { value: 'hero', label: 'Hero/Cover (1920×1280px 3:2)' },
              { value: 'gallery', label: 'Full gallery' },
            ]}
            value={sub.listingTier}
            onChange={(v) => {
              updateSub('listingTier', v);
              if (v === 'hero') onChange({ ...config, outputWidth: 1920, outputHeight: 1280, subOptions: { ...sub, listingTier: v } });
            }}
          />
          <label className="flex items-center gap-2 text-xs text-foreground cursor-pointer">
            <input
              type="checkbox"
              checked={sub.autoBestPractices || false}
              onChange={(e) => {
                updateSub('autoBestPractices', e.target.checked);
                if (e.target.checked) onSettingsAutoApply({ autoEnhance: true, hdr: true, whiteBalance: false });
              }}
              className="rounded border-border accent-primary"
            />
            Auto-apply Airbnb best practices
          </label>
        </div>
      );

    case 'vrbo':
      return (
        <div className="space-y-4">
          <RadioGroup label="Photo Type" options={PHOTO_TYPES} value={sub.photoType} onChange={(v) => updateSub('photoType', v)} />
          <div className="bg-info/10 border border-info/20 rounded-lg px-3 py-2 text-xs text-info">
            💡 VRBO tip: Exterior photos get 40% more clicks — lead with your best outdoor shot.
          </div>
        </div>
      );

    case 'instagram':
      return (
        <div className="space-y-4">
          <ChipRow label="Platform" options={['Instagram', 'Facebook', 'Pinterest', 'TikTok', 'LinkedIn']} value={sub.socialPlatform} onChange={(v) => updateSub('socialPlatform', v)} />
          <RadioGroup
            label="Format"
            options={[
              { value: 'square', label: 'Feed Square 1:1 (1080×1080)' },
              { value: 'portrait', label: 'Feed Portrait 4:5 (1080×1350)' },
              { value: 'story', label: 'Story/Reel 9:16 (1080×1920)' },
              { value: 'carousel', label: 'Carousel (1080×1080)' },
            ]}
            value={sub.format}
            onChange={(v) => {
              updateSub('format', v);
              const dims = { square: [1080, 1080, '1:1'], portrait: [1080, 1350, '4:5'], story: [1080, 1920, '9:16'], carousel: [1080, 1080, '1:1'] };
              const d = dims[v];
              if (d) onChange({ ...config, outputWidth: d[0], outputHeight: d[1], aspectRatio: d[2], subOptions: { ...sub, format: v } });
            }}
          />
          <RadioGroup
            label="Filter Style"
            options={[
              { value: 'clean', label: 'Clean & Real' },
              { value: 'vibrant', label: 'Vibrant & Lifestyle' },
              { value: 'moody', label: 'Moody Dark' },
            ]}
            value={sub.filterStyle}
            onChange={(v) => updateSub('filterStyle', v)}
          />
        </div>
      );

    case 'paid_ads':
      return (
        <div className="space-y-4">
          <ChipRow label="Ad Platform" options={['Facebook/IG', 'Google Display', 'Pinterest', 'Nextdoor']} value={sub.adPlatform} onChange={(v) => updateSub('adPlatform', v)} />
          <RadioGroup
            label="Ad Type"
            options={[
              { value: 'single', label: 'Single image ad' },
              { value: 'story', label: 'Story/Reel ad' },
              { value: 'banner', label: 'Display banner' },
            ]}
            value={sub.adType}
            onChange={(v) => updateSub('adType', v)}
          />
        </div>
      );

    case 'email':
      return (
        <div className="space-y-4">
          <RadioGroup
            label="Email Width"
            options={[
              { value: '600', label: '600px standard' },
              { value: '800', label: '800px' },
              { value: 'full', label: 'Full width' },
            ]}
            value={sub.emailWidth}
            onChange={(v) => updateSub('emailWidth', v)}
          />
          <div className="space-y-2">
            {['Compress to under 1MB', 'Strip metadata', 'Convert to sRGB'].map((opt) => (
              <label key={opt} className="flex items-center gap-2 text-xs text-foreground cursor-pointer">
                <input type="checkbox" checked={sub[opt] || false} onChange={(e) => updateSub(opt, e.target.checked)} className="rounded border-border accent-primary" />
                {opt}
              </label>
            ))}
          </div>
          <p className="text-[11px] text-muted-foreground">📧 JPEG at 72dpi (auto, optimal for email)</p>
        </div>
      );

    case 'print':
      return (
        <div className="space-y-4">
          <RadioGroup
            label="Print Size"
            options={[
              { value: '4x6', label: '4×6 photo' },
              { value: '5x7', label: '5×7 photo' },
              { value: '8x10', label: '8×10 photo' },
              { value: 'a4', label: 'A4 brochure' },
              { value: '8.5x11', label: '8.5×11 flyer' },
              { value: '11x17', label: '11×17 poster' },
            ]}
            value={sub.printSize}
            onChange={(v) => updateSub('printSize', v)}
          />
          <RadioGroup
            label="Print Quality"
            options={[
              { value: '300', label: '300 DPI standard' },
              { value: '150', label: '150 DPI proofing' },
              { value: '600', label: '600 DPI fine art' },
            ]}
            value={sub.printDpi}
            onChange={(v) => {
              updateSub('printDpi', v);
              onChange({ ...config, dpi: Number(v), subOptions: { ...sub, printDpi: v } });
            }}
          />
          <RadioGroup
            label="Format"
            options={['JPEG', 'TIFF', 'PDF']}
            value={sub.printFormat}
            onChange={(v) => updateSub('printFormat', v)}
          />
        </div>
      );

    case 'website':
      return (
        <div className="space-y-4">
          <RadioGroup
            label="Usage"
            options={[
              { value: 'hero', label: 'Hero banner' },
              { value: 'gallery', label: 'Gallery thumbnail' },
              { value: 'card', label: 'Property card' },
              { value: 'bg', label: 'Background image' },
              { value: 'og', label: 'OG/Social preview (1200×630)' },
            ]}
            value={sub.webUsage}
            onChange={(v) => {
              updateSub('webUsage', v);
              if (v === 'og') onChange({ ...config, outputWidth: 1200, outputHeight: 630, aspectRatio: '1.91:1', subOptions: { ...sub, webUsage: v } });
            }}
          />
          <RadioGroup
            label="Export Format"
            options={[
              { value: 'webp', label: 'WebP (best compression)' },
              { value: 'jpeg', label: 'JPEG (max compatibility)' },
              { value: 'png', label: 'PNG (transparency)' },
            ]}
            value={sub.webFormat}
            onChange={(v) => {
              updateSub('webFormat', v);
              onChange({ ...config, format: v, subOptions: { ...sub, webFormat: v } });
            }}
          />
        </div>
      );

    case 'video_thumb':
      return (
        <div className="space-y-4">
          <ChipRow label="Platform" options={['YouTube', 'Instagram Reels', 'TikTok', 'Vimeo']} value={sub.videoPlatform} onChange={(v) => updateSub('videoPlatform', v)} />
          <RadioGroup
            label="Thumbnail Style"
            options={[
              { value: 'clean', label: 'Clean photo (no text)' },
              { value: 'text', label: 'Photo + title text' },
              { value: 'play', label: 'Photo + play button' },
            ]}
            value={sub.thumbStyle}
            onChange={(v) => updateSub('thumbStyle', v)}
          />
          <div className="space-y-2">
            {['Boost saturation +30%', 'Increase contrast', 'Add slight vignette'].map((opt) => (
              <label key={opt} className="flex items-center gap-2 text-xs text-foreground cursor-pointer">
                <input type="checkbox" checked={sub[opt] || false} onChange={(e) => updateSub(opt, e.target.checked)} className="rounded border-border accent-primary" />
                {opt}
              </label>
            ))}
          </div>
        </div>
      );

    case 'custom':
      return (
        <p className="text-xs text-muted-foreground py-2">Configure all settings manually below.</p>
      );

    default:
      return null;
  }
}
