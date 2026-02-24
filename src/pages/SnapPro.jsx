import React, { useState, useCallback, useRef, useEffect } from 'react';
import Layout from '@/components/Layout';
import { useAuth } from '@/context/AuthContext';
import { useProductAccess } from '@/hooks/useProductAccess';
import { supabase } from '@/integrations/supabase/client';
import { Upload, Sparkles, Sun, Contrast, Image, Zap, X, CheckCircle, Loader2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import PlatformSelector from '@/components/snappro/PlatformSelector';
import CreativeDirection from '@/components/snappro/CreativeDirection';
import IterationPanel from '@/components/snappro/IterationPanel';
import VersionHistory from '@/components/snappro/VersionHistory';

const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_SIZE = 20 * 1024 * 1024;

const DEFAULT_SETTINGS = {
  autoEnhance: true,
  hdr: false,
  whiteBalance: false,
  brightness: 0,
  virtualTwilight: false,
};

const DEFAULT_PLATFORM_CONFIG = {
  platform: null,
  photoType: null,
  outputWidth: null,
  outputHeight: null,
  aspectRatio: null,
  dpi: 72,
  format: 'jpeg',
  requirementMet: false,
  requirementLabel: '',
  subOptions: {},
};

const DEFAULT_DIRECTION = {
  vibe: '',
  timeOfDay: '',
  selectedChips: [],
  customPrompt: '',
  negativePrompt: '',
  referenceStyle: '',
};

export default function SnapPro() {
  const { currentUser } = useAuth();
  const { trialUsesRemaining, usageCount, incrementUsage, status } = useProductAccess('snappro');
  const fileInputRef = useRef(null);

  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [processing, setProcessing] = useState(false);
  const [recentImages, setRecentImages] = useState([]);
  const [dragOver, setDragOver] = useState(false);

  // New state
  const [platformConfig, setPlatformConfig] = useState(DEFAULT_PLATFORM_CONFIG);
  const [direction, setDirection] = useState(DEFAULT_DIRECTION);
  const [processedResult, setProcessedResult] = useState(null); // { originalUrl, optimizedUrl, id }
  const [versions, setVersions] = useState([]);
  const [currentVersionId, setCurrentVersionId] = useState(null);
  const [isReprocessing, setIsReprocessing] = useState(false);
  const [uploadedOriginalUrl, setUploadedOriginalUrl] = useState(null);

  // Fetch recent images
  useEffect(() => {
    if (!currentUser?.id) return;
    supabase
      .from('snappro_images')
      .select('*')
      .eq('user_id', currentUser.id)
      .is('parent_image_id', null)
      .order('created_at', { ascending: false })
      .limit(5)
      .then(({ data }) => { if (data) setRecentImages(data); });
  }, [currentUser?.id, processing]);

  const handleFile = useCallback((f) => {
    if (!ACCEPTED_TYPES.includes(f.type)) { toast.error('Please upload a JPG, PNG, or WebP image.'); return; }
    if (f.size > MAX_SIZE) { toast.error('File too large. Maximum size is 20MB.'); return; }
    setFile(f);
    setProcessedResult(null);
    setVersions([]);
    setCurrentVersionId(null);
    setUploadedOriginalUrl(null);
    const reader = new FileReader();
    reader.onload = (e) => setPreview(e.target.result);
    reader.readAsDataURL(f);
  }, []);

  const onDrop = useCallback((e) => {
    e.preventDefault();
    setDragOver(false);
    const dropped = e.dataTransfer.files[0];
    if (dropped) handleFile(dropped);
  }, [handleFile]);

  const clearFile = () => {
    setFile(null);
    setPreview(null);
    setProcessedResult(null);
    setVersions([]);
    setCurrentVersionId(null);
    setUploadedOriginalUrl(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Upload original file to storage, return publicUrl
  const uploadOriginal = async () => {
    if (uploadedOriginalUrl) return uploadedOriginalUrl;
    const ext = file.name.split('.').pop();
    const path = `${currentUser.id}/${Date.now()}_original.${ext}`;
    const { error } = await supabase.storage.from('snappro-photos').upload(path, file, { contentType: file.type });
    if (error) throw error;
    const { data: { publicUrl } } = supabase.storage.from('snappro-photos').getPublicUrl(path);
    setUploadedOriginalUrl(publicUrl);
    return publicUrl;
  };

  // Process using client-side canvas
  const processImageCanvas = async (sourceUrl, processingSettings) => {
    return new Promise((resolve, reject) => {
      const img = new window.Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0);

        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;

        // Brightness
        const br = (processingSettings.brightness || 0) * 2;
        if (br !== 0) {
          for (let i = 0; i < data.length; i += 4) {
            data[i] = Math.max(0, Math.min(255, data[i] + br));
            data[i + 1] = Math.max(0, Math.min(255, data[i + 1] + br));
            data[i + 2] = Math.max(0, Math.min(255, data[i + 2] + br));
          }
        }

        // Warmth
        const warmth = (processingSettings.warmth || 0) * 1.5;
        if (warmth !== 0) {
          for (let i = 0; i < data.length; i += 4) {
            data[i] = Math.max(0, Math.min(255, data[i] + warmth));
            data[i + 2] = Math.max(0, Math.min(255, data[i + 2] - warmth));
          }
        }

        // Contrast
        const contrastVal = (processingSettings.contrast || 0) * 2;
        if (contrastVal !== 0) {
          const factor = (259 * (contrastVal + 255)) / (255 * (259 - contrastVal));
          for (let i = 0; i < data.length; i += 4) {
            data[i] = Math.max(0, Math.min(255, factor * (data[i] - 128) + 128));
            data[i + 1] = Math.max(0, Math.min(255, factor * (data[i + 1] - 128) + 128));
            data[i + 2] = Math.max(0, Math.min(255, factor * (data[i + 2] - 128) + 128));
          }
        }

        // Saturation
        const sat = (processingSettings.saturation || 0) / 50;
        if (sat !== 0) {
          for (let i = 0; i < data.length; i += 4) {
            const gray = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
            data[i] = Math.max(0, Math.min(255, gray + (data[i] - gray) * (1 + sat)));
            data[i + 1] = Math.max(0, Math.min(255, gray + (data[i + 1] - gray) * (1 + sat)));
            data[i + 2] = Math.max(0, Math.min(255, gray + (data[i + 2] - gray) * (1 + sat)));
          }
        }

        // Auto Enhance (histogram stretch)
        if (processingSettings.autoEnhance) {
          let min = 255, max = 0;
          for (let i = 0; i < data.length; i += 4) {
            const lum = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
            if (lum < min) min = lum;
            if (lum > max) max = lum;
          }
          if (max - min > 0 && (min > 10 || max < 245)) {
            const range = max - min;
            for (let i = 0; i < data.length; i += 4) {
              data[i] = Math.max(0, Math.min(255, ((data[i] - min) / range) * 255));
              data[i + 1] = Math.max(0, Math.min(255, ((data[i + 1] - min) / range) * 255));
              data[i + 2] = Math.max(0, Math.min(255, ((data[i + 2] - min) / range) * 255));
            }
          }
        }

        // HDR (shadow boost + highlight compress)
        if (processingSettings.hdr) {
          for (let i = 0; i < data.length; i += 4) {
            for (let c = 0; c < 3; c++) {
              const val = data[i + c] / 255;
              data[i + c] = Math.min(255, Math.round(Math.pow(val, 0.8) * 255));
            }
          }
        }

        // Virtual Twilight
        if (processingSettings.virtualTwilight) {
          const thirdH = canvas.height / 3;
          for (let y = 0; y < canvas.height; y++) {
            for (let x = 0; x < canvas.width; x++) {
              const idx = (y * canvas.width + x) * 4;
              if (y < thirdH) {
                const t = 1 - (y / thirdH);
                data[idx] = Math.max(0, data[idx] - t * 40);
                data[idx + 1] = Math.max(0, data[idx + 1] - t * 20);
                data[idx + 2] = Math.min(255, data[idx + 2] + t * 30);
              } else if (y > thirdH * 2) {
                const t = (y - thirdH * 2) / thirdH;
                data[idx] = Math.min(255, data[idx] + t * 20);
                data[idx + 1] = Math.min(255, data[idx + 1] + t * 10);
              }
            }
          }
        }

        ctx.putImageData(imageData, 0, 0);
        canvas.toBlob((blob) => resolve(blob), 'image/jpeg', 0.92);
      };
      img.onerror = reject;
      img.src = sourceUrl;
    });
  };

  const handleProcess = async () => {
    if (!file || !currentUser?.id) return;

    if (status === 'trial') {
      const result = await incrementUsage();
      if (!result.allowed) return;
    }

    setProcessing(true);
    try {
      const originalUrl = await uploadOriginal();
      const processedBlob = await processImageCanvas(originalUrl, settings);

      const optPath = `${currentUser.id}/${Date.now()}_optimized.jpg`;
      const { error: upErr } = await supabase.storage.from('snappro-photos').upload(optPath, processedBlob, { contentType: 'image/jpeg' });
      if (upErr) throw upErr;
      const { data: { publicUrl: optimizedUrl } } = supabase.storage.from('snappro-photos').getPublicUrl(optPath);

      const { data: inserted, error: dbError } = await supabase
        .from('snappro_images')
        .insert({
          user_id: currentUser.id,
          original_url: originalUrl,
          optimized_url: optimizedUrl,
          file_name: file.name,
          file_size: file.size,
          settings: { ...settings, platform: platformConfig, direction },
          status: 'completed',
          version_number: 1,
          version_label: 'Original',
        })
        .select()
        .single();

      if (dbError) throw dbError;

      setProcessedResult({ originalUrl, optimizedUrl, id: inserted.id });
      setVersions([inserted]);
      setCurrentVersionId(inserted.id);
      toast.success('Photo processed successfully!');
    } catch (err) {
      console.error(err);
      toast.error('Failed to process photo. Please try again.');
    } finally {
      setProcessing(false);
    }
  };

  // Re-process from iteration panel
  const handleReprocess = async (newSettings, label, iterationPrompt) => {
    if (!processedResult || !currentUser?.id) return;
    setIsReprocessing(true);
    try {
      const processedBlob = await processImageCanvas(processedResult.originalUrl, newSettings);
      const optPath = `${currentUser.id}/${Date.now()}_v${versions.length + 1}.jpg`;
      const { error: upErr } = await supabase.storage.from('snappro-photos').upload(optPath, processedBlob, { contentType: 'image/jpeg' });
      if (upErr) throw upErr;
      const { data: { publicUrl: optimizedUrl } } = supabase.storage.from('snappro-photos').getPublicUrl(optPath);

      const { data: inserted, error: dbError } = await supabase
        .from('snappro_images')
        .insert({
          user_id: currentUser.id,
          original_url: processedResult.originalUrl,
          optimized_url: optimizedUrl,
          file_name: file?.name || 'reprocessed.jpg',
          file_size: 0,
          settings: newSettings,
          status: 'completed',
          parent_image_id: processedResult.id,
          version_number: versions.length + 1,
          version_label: label || `Version ${versions.length + 1}`,
          iteration_prompt: iterationPrompt || null,
        })
        .select()
        .single();

      if (dbError) throw dbError;

      setSettings(newSettings);
      setVersions(prev => [...prev, inserted]);
      setCurrentVersionId(inserted.id);
      setProcessedResult(prev => ({ ...prev, optimizedUrl }));
      toast.success(`Version ${versions.length + 1} created!`);
    } catch (err) {
      console.error(err);
      toast.error('Re-processing failed.');
    } finally {
      setIsReprocessing(false);
    }
  };

  const handleApplyInspiration = (idea) => {
    if (idea.settings) {
      setSettings(s => ({ ...s, ...idea.settings }));
    }
    setDirection(d => ({
      ...d,
      vibe: idea.vibe || d.vibe,
      timeOfDay: idea.timeOfDay || d.timeOfDay,
      customPrompt: idea.prompt || d.customPrompt,
      negativePrompt: idea.negativePrompt || d.negativePrompt,
    }));
    toast.success(`Applied: ${idea.name}`);
  };

  const handleSettingsAutoApply = (autoSettings) => {
    if (autoSettings) setSettings(s => ({ ...s, ...autoSettings }));
  };

  const trialLimit = 10;
  const pct = Math.min(100, (usageCount / trialLimit) * 100);

  const currentVersion = versions.find(v => v.id === currentVersionId);
  const displayOptimizedUrl = currentVersion?.optimized_url || processedResult?.optimizedUrl;

  return (
    <Layout>
      <div className="max-w-4xl mx-auto px-4 py-8 space-y-8 animate-fade-in">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <Sparkles className="w-6 h-6 text-primary" />
              SnapPro Photo Optimizer
            </h1>
            <p className="text-sm text-muted-foreground mt-1">AI-powered photo enhancement for professional listing images</p>
          </div>
          {status === 'trial' && trialUsesRemaining != null && (
            <div className="flex items-center gap-3 bg-muted/50 border border-border rounded-lg px-4 py-2.5">
              <Zap className="w-4 h-4 text-primary shrink-0" />
              <div className="min-w-0">
                <p className="text-xs font-medium text-foreground">{usageCount} of {trialLimit} free edits used</p>
                <div className="w-32 h-1.5 bg-muted rounded-full mt-1 overflow-hidden">
                  <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${pct}%` }} />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Upload Zone */}
        <div
          className={`relative border-2 border-dashed rounded-xl p-8 text-center transition-colors cursor-pointer ${
            dragOver ? 'border-primary bg-primary/5' : file ? 'border-primary/40 bg-primary/5' : 'border-border hover:border-primary/40 hover:bg-muted/30'
          }`}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={onDrop}
          onClick={() => !file && fileInputRef.current?.click()}
        >
          <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={(e) => e.target.files[0] && handleFile(e.target.files[0])} />
          {preview ? (
            <div className="space-y-4">
              <div className="relative inline-block">
                <img src={preview} alt="Preview" className="max-h-64 rounded-lg mx-auto shadow-md" />
                <button onClick={(e) => { e.stopPropagation(); clearFile(); }} className="absolute -top-2 -right-2 w-6 h-6 bg-destructive text-destructive-foreground rounded-full flex items-center justify-center text-xs hover:bg-destructive/90">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
              <p className="text-sm text-muted-foreground">{file.name} · {(file.size / 1024 / 1024).toFixed(1)}MB</p>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto">
                <Upload className="w-7 h-7 text-primary" />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">Drop your photo here or click to browse</p>
                <p className="text-xs text-muted-foreground mt-1">JPG, PNG, WebP · Max 20MB</p>
              </div>
            </div>
          )}
        </div>

        {/* Settings panels (only shown when file is selected) */}
        {file && (
          <>
            {/* Platform Selector */}
            <PlatformSelector
              platformConfig={platformConfig}
              onPlatformChange={setPlatformConfig}
              onSettingsAutoApply={handleSettingsAutoApply}
            />

            {/* Enhancement Settings */}
            <div className="bg-card border border-border rounded-xl p-6 space-y-5 animate-scale-in">
              <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
                <Contrast className="w-4 h-4 text-primary" />
                Enhancement Settings
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <ToggleSetting label="Auto Enhance" icon={<Sparkles className="w-4 h-4" />} checked={settings.autoEnhance} onChange={(v) => setSettings(s => ({ ...s, autoEnhance: v }))} />
                <ToggleSetting label="HDR" icon={<Sun className="w-4 h-4" />} checked={settings.hdr} onChange={(v) => setSettings(s => ({ ...s, hdr: v }))} />
                <ToggleSetting label="White Balance" icon={<Contrast className="w-4 h-4" />} checked={settings.whiteBalance} onChange={(v) => setSettings(s => ({ ...s, whiteBalance: v }))} />
                <ToggleSetting label="Virtual Twilight" icon={<Image className="w-4 h-4" />} checked={settings.virtualTwilight} onChange={(v) => setSettings(s => ({ ...s, virtualTwilight: v }))} />
              </div>
              <div>
                <label className="text-sm font-medium text-foreground flex items-center justify-between">
                  <span>Brightness</span>
                  <span className="text-xs text-muted-foreground">{settings.brightness > 0 ? '+' : ''}{settings.brightness}</span>
                </label>
                <input type="range" min="-50" max="50" value={settings.brightness} onChange={(e) => setSettings(s => ({ ...s, brightness: Number(e.target.value) }))} className="w-full mt-2 accent-primary" />
              </div>
            </div>

            {/* Creative Direction */}
            <CreativeDirection
              direction={direction}
              onDirectionChange={setDirection}
              imageUrl={uploadedOriginalUrl || preview}
              onApplyInspiration={handleApplyInspiration}
            />

            {/* Process Button */}
            <Button onClick={handleProcess} disabled={processing} className="w-full" size="lg">
              {processing ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Processing…</>
              ) : (
                <><Sparkles className="w-4 h-4 mr-2" /> Process Photo</>
              )}
            </Button>
          </>
        )}

        {/* Before/After + Iteration (shown after processing) */}
        {processedResult && (
          <>
            <div className="bg-card border border-border rounded-xl p-6 space-y-4 animate-scale-in">
              <h2 className="text-base font-semibold text-foreground">Before / After</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-muted-foreground mb-2">Original</p>
                  <img src={processedResult.originalUrl} alt="Original" className="w-full rounded-lg border border-border" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-2">Processed {currentVersion?.version_label ? `(${currentVersion.version_label})` : ''}</p>
                  <img src={displayOptimizedUrl} alt="Processed" className="w-full rounded-lg border border-border" />
                </div>
              </div>
            </div>

            {/* Version History */}
            <VersionHistory
              versions={versions}
              currentVersionId={currentVersionId}
              onSelectVersion={(v) => {
                setCurrentVersionId(v.id);
                setProcessedResult(prev => ({ ...prev, optimizedUrl: v.optimized_url }));
              }}
            />

            {/* Iteration Panel */}
            <IterationPanel
              settings={settings}
              onReprocess={handleReprocess}
              processedImageUrl={displayOptimizedUrl}
              originalImageUrl={processedResult.originalUrl}
              currentUser={currentUser}
              isReprocessing={isReprocessing}
            />
          </>
        )}

        {/* Recent Uploads */}
        {recentImages.length > 0 && (
          <div className="space-y-4">
            <h2 className="text-base font-semibold text-foreground">Recent Uploads</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
              {recentImages.map((img) => (
                <div key={img.id} className="group relative rounded-lg overflow-hidden border border-border bg-card hover-lift">
                  <img src={img.optimized_url || img.original_url} alt={img.file_name} className="w-full aspect-square object-cover" />
                  <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/60 to-transparent p-2">
                    <p className="text-[10px] text-white truncate">{img.file_name}</p>
                    <span className={`inline-flex items-center gap-1 text-[10px] mt-0.5 ${img.status === 'completed' ? 'text-green-300' : 'text-yellow-300'}`}>
                      {img.status === 'completed' ? <CheckCircle className="w-2.5 h-2.5" /> : <AlertCircle className="w-2.5 h-2.5" />}
                      {img.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}

function ToggleSetting({ label, icon, checked, onChange }) {
  return (
    <label className="flex items-center justify-between gap-3 bg-muted/30 border border-border rounded-lg px-4 py-3 cursor-pointer hover:bg-muted/50 transition-colors">
      <span className="flex items-center gap-2 text-sm font-medium text-foreground">
        <span className="text-primary">{icon}</span>
        {label}
      </span>
      <button type="button" role="switch" aria-checked={checked} onClick={() => onChange(!checked)}
        className={`relative w-10 h-5 rounded-full transition-colors ${checked ? 'bg-primary' : 'bg-muted-foreground/30'}`}>
        <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${checked ? 'translate-x-5' : ''}`} />
      </button>
    </label>
  );
}
