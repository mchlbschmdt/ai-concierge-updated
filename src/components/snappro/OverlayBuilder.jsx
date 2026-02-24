import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Download, Save } from 'lucide-react';

const POSITIONS = ['Top-Left', 'Top-Right', 'Bottom-Left', 'Bottom-Right'];
const FONTS = ['Inter', 'Georgia', 'Playfair Display', 'Montserrat'];
const WEIGHTS = ['Regular', 'Bold', 'Black'];
const SIZES = ['Small', 'Medium', 'Large', 'Extra Large'];
const BG_BANDS = ['None', 'Dark gradient fade', 'Solid dark', 'Blur band'];

const DEFAULT_OVERLAY = {
  logoMode: 'none', // none | upload
  logoFile: null,
  logoUrl: null,
  logoPosition: 'Bottom-Right',
  logoSize: 15,
  logoOpacity: 80,
  textLine1: '',
  textLine2: '',
  textFont: 'Inter',
  textWeight: 'Bold',
  textSize: 'Medium',
  textColor: '#ffffff',
  textShadow: true,
  textBgBand: 'None',
  textPosition: 'Bottom band',
  watermarkMode: 'none', // none | copyright | custom
  watermarkText: '',
  watermarkOpacity: 40,
  watermarkPosition: 'Bottom-Right',
};

export default function OverlayBuilder({ processedImageUrl, currentUser }) {
  const [overlay, setOverlay] = useState(DEFAULT_OVERLAY);
  const canvasRef = useRef(null);
  const [saving, setSaving] = useState(false);

  const update = (key, val) => setOverlay(o => ({ ...o, [key]: val }));

  const handleLogoUpload = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const url = URL.createObjectURL(f);
    setOverlay(o => ({ ...o, logoFile: f, logoUrl: url, logoMode: 'upload' }));
  };

  // Live preview
  const drawPreview = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !processedImageUrl) return;

    const ctx = canvas.getContext('2d');
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const scale = 200 / img.width;
      canvas.width = 200;
      canvas.height = img.height * scale;
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

      // Draw background band
      if (overlay.textBgBand !== 'None' && (overlay.textLine1 || overlay.textLine2)) {
        const bandH = canvas.height * 0.2;
        const y = overlay.textPosition === 'Top band' ? 0 : overlay.textPosition === 'Center overlay' ? (canvas.height - bandH) / 2 : canvas.height - bandH;
        if (overlay.textBgBand === 'Solid dark') {
          ctx.fillStyle = 'rgba(0,0,0,0.6)';
          ctx.fillRect(0, y, canvas.width, bandH);
        } else if (overlay.textBgBand === 'Dark gradient fade') {
          const grad = ctx.createLinearGradient(0, y, 0, y + bandH);
          grad.addColorStop(0, 'rgba(0,0,0,0)');
          grad.addColorStop(1, 'rgba(0,0,0,0.7)');
          ctx.fillStyle = grad;
          ctx.fillRect(0, y, canvas.width, bandH);
        }
      }

      // Draw text
      if (overlay.textLine1 || overlay.textLine2) {
        const sizeMap = { Small: 10, Medium: 14, Large: 18, 'Extra Large': 22 };
        const fontSize = sizeMap[overlay.textSize] || 14;
        const weightMap = { Regular: '400', Bold: '700', Black: '900' };
        ctx.font = `${weightMap[overlay.textWeight]} ${fontSize}px ${overlay.textFont}`;
        ctx.fillStyle = overlay.textColor;
        ctx.textAlign = 'center';
        if (overlay.textShadow) {
          ctx.shadowColor = 'rgba(0,0,0,0.5)';
          ctx.shadowBlur = 4;
          ctx.shadowOffsetX = 1;
          ctx.shadowOffsetY = 1;
        }
        const yBase = overlay.textPosition === 'Top band' ? 25 : overlay.textPosition === 'Center overlay' ? canvas.height / 2 : canvas.height - 20;
        if (overlay.textLine1) ctx.fillText(overlay.textLine1, canvas.width / 2, yBase - (overlay.textLine2 ? 8 : 0));
        if (overlay.textLine2) ctx.fillText(overlay.textLine2, canvas.width / 2, yBase + fontSize);
        ctx.shadowColor = 'transparent';
      }

      // Draw watermark
      if (overlay.watermarkMode !== 'none') {
        const wmText = overlay.watermarkMode === 'copyright' ? '© Your Company' : overlay.watermarkText;
        if (wmText) {
          ctx.font = '400 8px Inter';
          ctx.fillStyle = `rgba(255,255,255,${overlay.watermarkOpacity / 100})`;
          ctx.textAlign = overlay.watermarkPosition.includes('Right') ? 'right' : overlay.watermarkPosition.includes('Center') ? 'center' : 'left';
          const wx = overlay.watermarkPosition.includes('Right') ? canvas.width - 5 : overlay.watermarkPosition.includes('Center') ? canvas.width / 2 : 5;
          const wy = overlay.watermarkPosition.includes('Bottom') ? canvas.height - 5 : 15;
          ctx.fillText(wmText, wx, wy);
        }
      }
    };
    img.src = processedImageUrl;
  }, [processedImageUrl, overlay]);

  useEffect(() => { drawPreview(); }, [drawPreview]);

  const exportFullSize = useCallback(async (saveToLibrary = false) => {
    if (!processedImageUrl) return;
    setSaving(true);
    try {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      await new Promise((resolve, reject) => { img.onload = resolve; img.onerror = reject; img.src = processedImageUrl; });

      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0);

      // Background band
      if (overlay.textBgBand !== 'None' && (overlay.textLine1 || overlay.textLine2)) {
        const bandH = canvas.height * 0.15;
        const y = overlay.textPosition === 'Top band' ? 0 : overlay.textPosition === 'Center overlay' ? (canvas.height - bandH) / 2 : canvas.height - bandH;
        if (overlay.textBgBand === 'Solid dark') {
          ctx.fillStyle = 'rgba(0,0,0,0.6)';
          ctx.fillRect(0, y, canvas.width, bandH);
        } else if (overlay.textBgBand === 'Dark gradient fade') {
          const grad = ctx.createLinearGradient(0, y, 0, y + bandH);
          grad.addColorStop(0, 'rgba(0,0,0,0)');
          grad.addColorStop(1, 'rgba(0,0,0,0.7)');
          ctx.fillStyle = grad;
          ctx.fillRect(0, y, canvas.width, bandH);
        }
      }

      // Text
      if (overlay.textLine1 || overlay.textLine2) {
        const sizeMap = { Small: 36, Medium: 52, Large: 72, 'Extra Large': 96 };
        const fontSize = sizeMap[overlay.textSize] || 52;
        const weightMap = { Regular: '400', Bold: '700', Black: '900' };
        ctx.font = `${weightMap[overlay.textWeight]} ${fontSize}px ${overlay.textFont}`;
        ctx.fillStyle = overlay.textColor;
        ctx.textAlign = 'center';
        if (overlay.textShadow) { ctx.shadowColor = 'rgba(0,0,0,0.5)'; ctx.shadowBlur = 8; ctx.shadowOffsetX = 2; ctx.shadowOffsetY = 2; }
        const yBase = overlay.textPosition === 'Top band' ? 80 : overlay.textPosition === 'Center overlay' ? canvas.height / 2 : canvas.height - 60;
        if (overlay.textLine1) ctx.fillText(overlay.textLine1, canvas.width / 2, yBase - (overlay.textLine2 ? 20 : 0));
        if (overlay.textLine2) ctx.fillText(overlay.textLine2, canvas.width / 2, yBase + fontSize + 5);
        ctx.shadowColor = 'transparent';
      }

      // Watermark
      if (overlay.watermarkMode !== 'none') {
        const wmText = overlay.watermarkMode === 'copyright' ? '© Your Company' : overlay.watermarkText;
        if (wmText) {
          ctx.font = '400 24px Inter';
          ctx.fillStyle = `rgba(255,255,255,${overlay.watermarkOpacity / 100})`;
          ctx.textAlign = overlay.watermarkPosition.includes('Right') ? 'right' : overlay.watermarkPosition.includes('Center') ? 'center' : 'left';
          const wx = overlay.watermarkPosition.includes('Right') ? canvas.width - 20 : overlay.watermarkPosition.includes('Center') ? canvas.width / 2 : 20;
          const wy = overlay.watermarkPosition.includes('Bottom') ? canvas.height - 15 : 35;
          ctx.fillText(wmText, wx, wy);
        }
      }

      const blob = await new Promise(r => canvas.toBlob(r, 'image/jpeg', 0.92));

      if (saveToLibrary && currentUser?.id) {
        const path = `${currentUser.id}/${Date.now()}_overlay.jpg`;
        const { error: upErr } = await supabase.storage.from('snappro-photos').upload(path, blob, { contentType: 'image/jpeg' });
        if (upErr) throw upErr;
        const { data: { publicUrl } } = supabase.storage.from('snappro-photos').getPublicUrl(path);
        await supabase.from('snappro_images').insert({
          user_id: currentUser.id,
          original_url: processedImageUrl,
          optimized_url: publicUrl,
          file_name: 'overlay_' + Date.now() + '.jpg',
          file_size: blob.size,
          settings: { overlays: overlay },
          status: 'completed',
          version_label: 'With Overlays',
        });
        toast.success('Saved to library!');
      } else {
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = 'snappro_overlay.jpg';
        a.click();
        URL.revokeObjectURL(a.href);
        toast.success('Downloaded!');
      }
    } catch (err) {
      console.error(err);
      toast.error('Failed to export');
    } finally {
      setSaving(false);
    }
  }, [processedImageUrl, overlay, currentUser]);

  return (
    <div className="space-y-5">
      {/* Logo */}
      <div className="space-y-2">
        <p className="text-xs font-semibold text-foreground">Logo</p>
        <div className="flex gap-2">
          {['none', 'upload'].map((m) => (
            <button key={m} type="button" onClick={() => update('logoMode', m)}
              className={`px-3 py-1.5 text-xs rounded-lg border ${overlay.logoMode === m ? 'bg-primary text-primary-foreground border-primary' : 'border-border text-foreground'}`}>
              {m === 'none' ? 'No logo' : 'Upload logo'}
            </button>
          ))}
        </div>
        {overlay.logoMode === 'upload' && (
          <input type="file" accept="image/png,image/svg+xml" onChange={handleLogoUpload} className="text-xs" />
        )}
      </div>

      {/* Text Overlay */}
      <div className="space-y-2">
        <p className="text-xs font-semibold text-foreground">Text Overlay</p>
        <Input placeholder="Line 1" value={overlay.textLine1} onChange={(e) => update('textLine1', e.target.value)} className="text-xs" />
        <Input placeholder="Line 2" value={overlay.textLine2} onChange={(e) => update('textLine2', e.target.value)} className="text-xs" />
        <div className="grid grid-cols-2 gap-2">
          <SelectField label="Font" options={FONTS} value={overlay.textFont} onChange={(v) => update('textFont', v)} />
          <SelectField label="Weight" options={WEIGHTS} value={overlay.textWeight} onChange={(v) => update('textWeight', v)} />
          <SelectField label="Size" options={SIZES} value={overlay.textSize} onChange={(v) => update('textSize', v)} />
          <SelectField label="Background" options={BG_BANDS} value={overlay.textBgBand} onChange={(v) => update('textBgBand', v)} />
        </div>
        <div className="flex items-center gap-3">
          <label className="text-xs text-foreground flex items-center gap-1.5">
            Color: <input type="color" value={overlay.textColor} onChange={(e) => update('textColor', e.target.value)} className="w-6 h-6 rounded border-0 cursor-pointer" />
          </label>
          <label className="text-xs text-foreground flex items-center gap-1.5 cursor-pointer">
            <input type="checkbox" checked={overlay.textShadow} onChange={(e) => update('textShadow', e.target.checked)} className="accent-primary" /> Shadow
          </label>
        </div>
        <div className="flex gap-2">
          {['Top band', 'Bottom band', 'Center overlay'].map((p) => (
            <button key={p} type="button" onClick={() => update('textPosition', p)}
              className={`px-2.5 py-1 text-[11px] rounded-lg border ${overlay.textPosition === p ? 'bg-primary text-primary-foreground border-primary' : 'border-border text-foreground'}`}>
              {p}
            </button>
          ))}
        </div>
      </div>

      {/* Watermark */}
      <div className="space-y-2">
        <p className="text-xs font-semibold text-foreground">Watermark</p>
        <div className="flex gap-2">
          {[{ v: 'none', l: 'None' }, { v: 'copyright', l: '© Company' }, { v: 'custom', l: 'Custom' }].map(({ v, l }) => (
            <button key={v} type="button" onClick={() => update('watermarkMode', v)}
              className={`px-2.5 py-1 text-[11px] rounded-lg border ${overlay.watermarkMode === v ? 'bg-primary text-primary-foreground border-primary' : 'border-border text-foreground'}`}>
              {l}
            </button>
          ))}
        </div>
        {overlay.watermarkMode === 'custom' && (
          <Input placeholder="Watermark text" value={overlay.watermarkText} onChange={(e) => update('watermarkText', e.target.value)} className="text-xs" />
        )}
        {overlay.watermarkMode !== 'none' && (
          <div className="flex items-center gap-3">
            <label className="text-xs text-foreground">Opacity: {overlay.watermarkOpacity}%</label>
            <input type="range" min={10} max={100} value={overlay.watermarkOpacity} onChange={(e) => update('watermarkOpacity', Number(e.target.value))} className="flex-1 accent-primary" />
          </div>
        )}
      </div>

      {/* Preview */}
      <div className="space-y-2">
        <p className="text-xs font-semibold text-foreground">Preview</p>
        <canvas ref={canvasRef} className="rounded-lg border border-border" style={{ maxWidth: 200 }} />
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        <Button onClick={() => exportFullSize(false)} disabled={saving} variant="default" className="flex-1 text-xs">
          <Download className="w-3.5 h-3.5 mr-1.5" /> Apply & Download
        </Button>
        <Button onClick={() => exportFullSize(true)} disabled={saving} variant="outline" className="flex-1 text-xs">
          <Save className="w-3.5 h-3.5 mr-1.5" /> Save to Library
        </Button>
      </div>
    </div>
  );
}

function SelectField({ label, options, value, onChange }) {
  return (
    <div className="space-y-1">
      <label className="text-[11px] text-muted-foreground">{label}</label>
      <select value={value} onChange={(e) => onChange(e.target.value)} className="w-full px-2 py-1.5 text-xs border border-border rounded-lg bg-card text-foreground">
        {options.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
    </div>
  );
}
