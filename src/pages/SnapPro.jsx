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

// Maps creative direction selections to numeric processing adjustments
function buildProcessingSettings(baseSettings, directionObj) {
  const s = { ...baseSettings };

  const vibeMap = {
    'Luxury & High-End': { warmth: 15, saturation: 10, contrast: 5 },
    'Cozy & Inviting': { warmth: 20, brightness: 5 },
    'Modern & Minimalist': { contrast: 10, saturation: -10 },
    'Rustic & Charming': { warmth: 18, saturation: 5, brightness: -5 },
    'Tropical & Resort': { warmth: 10, saturation: 20, brightness: 8 },
    'Urban & Sophisticated': { contrast: 12, warmth: -5, saturation: 5 },
    'Bright & Airy': { brightness: 20, warmth: 5, saturation: -5 },
    'Dark & Moody': { brightness: -20, contrast: 15, saturation: -5 },
    'Professional & Clean': { contrast: 8, saturation: 5 },
  };

  const timeMap = {
    'Golden Hour Sunset': { warmth: 25, brightness: 10 },
    'Soft Morning Light': { warmth: 10, brightness: 8 },
    'Midday Bright': { brightness: 15, contrast: 5 },
    'Blue Hour Dusk': { warmth: -15, brightness: -10, saturation: 10 },
    'Night Ambiance': { brightness: -25, warmth: 10, contrast: 10 },
    'Overcast Natural': { saturation: -8, brightness: 5 },
  };

  const chipMap = {
    'Make it brighter': { brightness: 15 },
    'Fix dark corners': { brightness: 8 },
    'Add warm glow': { warmth: 20 },
    'Even out exposure': { contrast: -5, brightness: 5 },
    'Crisp and sharp': { contrast: 10 },
    'Cinematic color grade': { contrast: 12, saturation: 8, warmth: 5 },
    'Magazine quality': { contrast: 8, saturation: 10 },
    '5-star hotel feel': { warmth: 12, saturation: 8, brightness: 5 },
    'Vibrant': { saturation: 20 },
    'Dramatic sunset sky': { warmth: 20 },
    'Lush greenery': { saturation: 15 },
  };

  const addAdjustments = (map) => {
    if (!map) return;
    Object.entries(map).forEach(([k, v]) => {
      s[k] = (s[k] || 0) + v;
    });
  };

  if (directionObj.vibe && vibeMap[directionObj.vibe]) {
    addAdjustments(vibeMap[directionObj.vibe]);
  }
  if (directionObj.timeOfDay && directionObj.timeOfDay !== 'No preference' && timeMap[directionObj.timeOfDay]) {
    addAdjustments(timeMap[directionObj.timeOfDay]);
  }
  if (directionObj.selectedChips?.length) {
    directionObj.selectedChips.forEach(chip => {
      if (chipMap[chip]) addAdjustments(chipMap[chip]);
    });
  }

  return s;
}

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
  const [processedResult, setProcessedResult] = useState(null);
  const [versions, setVersions] = useState([]);
  const [currentVersionId, setCurrentVersionId] = useState(null);
  const [isReprocessing, setIsReprocessing] = useState(false);
  const [uploadedOriginalUrl, setUploadedOriginalUrl] = useState(null);
  const [usingCanvasFallback, setUsingCanvasFallback] = useState(false);

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

  // Process using client-side canvas — accepts optional outputDims { width, height }
  const processImageCanvas = async (sourceUrl, processingSettings, outputDims) => {
    return new Promise((resolve, reject) => {
      const img = new window.Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        // Process at native resolution on a temp canvas
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = img.width;
        tempCanvas.height = img.height;
        const ctx = tempCanvas.getContext('2d');
        ctx.drawImage(img, 0, 0);

        const imageData = ctx.getImageData(0, 0, tempCanvas.width, tempCanvas.height);
        const data = imageData.data;
        const clamp = (v) => Math.max(0, Math.min(255, v));

        // Brightness
        const br = (processingSettings.brightness || 0) * 2;
        if (br !== 0) {
          for (let i = 0; i < data.length; i += 4) {
            data[i] = clamp(data[i] + br);
            data[i + 1] = clamp(data[i + 1] + br);
            data[i + 2] = clamp(data[i + 2] + br);
          }
        }

        // Warmth
        const warmth = (processingSettings.warmth || 0) * 1.5;
        if (warmth !== 0) {
          for (let i = 0; i < data.length; i += 4) {
            data[i] = clamp(data[i] + warmth);
            data[i + 2] = clamp(data[i + 2] - warmth);
          }
        }

        // Contrast
        const contrastVal = (processingSettings.contrast || 0) * 2;
        if (contrastVal !== 0) {
          const factor = (259 * (contrastVal + 255)) / (255 * (259 - contrastVal));
          for (let i = 0; i < data.length; i += 4) {
            data[i] = clamp(factor * (data[i] - 128) + 128);
            data[i + 1] = clamp(factor * (data[i + 1] - 128) + 128);
            data[i + 2] = clamp(factor * (data[i + 2] - 128) + 128);
          }
        }

        // Saturation
        const sat = (processingSettings.saturation || 0) / 50;
        if (sat !== 0) {
          for (let i = 0; i < data.length; i += 4) {
            const gray = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
            data[i] = clamp(gray + (data[i] - gray) * (1 + sat));
            data[i + 1] = clamp(gray + (data[i + 1] - gray) * (1 + sat));
            data[i + 2] = clamp(gray + (data[i + 2] - gray) * (1 + sat));
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
              data[i] = clamp(((data[i] - min) / range) * 255);
              data[i + 1] = clamp(((data[i + 1] - min) / range) * 255);
              data[i + 2] = clamp(((data[i + 2] - min) / range) * 255);
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
          const thirdH = tempCanvas.height / 3;
          for (let y = 0; y < tempCanvas.height; y++) {
            for (let x = 0; x < tempCanvas.width; x++) {
              const idx = (y * tempCanvas.width + x) * 4;
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

        // Sky Swap (color-grade effect on top 35%)
        if (processingSettings.skySwap) {
          const skyColors = {
            sunset: { r: 40, g: 15, b: -20 },
            sunrise: { r: 25, g: 10, b: 15 },
            blue: { r: -15, g: -5, b: 25 },
            dramatic: { r: -10, g: -10, b: 0 },
          };
          const sky = skyColors[processingSettings.skySwap];
          if (sky) {
            const skyH = tempCanvas.height * 0.35;
            for (let y = 0; y < skyH; y++) {
              const blend = 1 - (y / skyH);
              for (let x = 0; x < tempCanvas.width; x++) {
                const idx = (y * tempCanvas.width + x) * 4;
                data[idx] = clamp(data[idx] + sky.r * blend);
                data[idx + 1] = clamp(data[idx + 1] + sky.g * blend);
                data[idx + 2] = clamp(data[idx + 2] + sky.b * blend);
              }
            }
          }
        }

        ctx.putImageData(imageData, 0, 0);

        // Scale to target dimensions if specified
        const outW = outputDims?.width || tempCanvas.width;
        const outH = outputDims?.height || tempCanvas.height;
        if (outW !== tempCanvas.width || outH !== tempCanvas.height) {
          const finalCanvas = document.createElement('canvas');
          finalCanvas.width = outW;
          finalCanvas.height = outH;
          const finalCtx = finalCanvas.getContext('2d');
          finalCtx.drawImage(tempCanvas, 0, 0, outW, outH);
          finalCanvas.toBlob((blob) => resolve(blob), 'image/jpeg', 0.92);
        } else {
          tempCanvas.toBlob((blob) => resolve(blob), 'image/jpeg', 0.92);
        }
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

      // Save DB record with processing status
      const { data: inserted, error: dbError } = await supabase
        .from('snappro_images')
        .insert({
          user_id: currentUser.id,
          original_url: originalUrl,
          file_name: file.name,
          file_size: file.size,
          settings: { ...settings, platform: platformConfig, direction },
          status: 'processing',
          version_number: 1,
          version_label: 'Original',
        })
        .select()
        .single();
      if (dbError) throw dbError;

      // Determine aspect ratio from platform config
      const arMap = { '3:2': '3:2', '16:9': '16:9', '1:1': '1:1', '4:3': '4:3', '9:16': '9:16' };
      const aspectRatio = platformConfig.aspectRatio && arMap[platformConfig.aspectRatio]
        ? platformConfig.aspectRatio : 'original';

      // Merge creative direction into numeric adjustments
      const mergedSettings = buildProcessingSettings(settings, direction);
      const { data: processResult, error: fnError } = await supabase.functions.invoke('process-image', {
        body: {
          imageUrl: originalUrl,
          userId: currentUser.id,
          imageId: inserted.id,
          settings: {
            outputPurpose: platformConfig.platform || 'listing',
            aspectRatio,
            outputSize: 'high_quality',
            enhancements: {
              autoEnhance: settings.autoEnhance || false,
              hdr: settings.hdr || false,
              whiteBalance: settings.whiteBalance || false,
              virtualTwilight: settings.virtualTwilight || false,
              colorEnhancement: true,
              sharpen: true,
              noiseReduction: false,
            },
            adjustments: {
              brightness: mergedSettings.brightness || 0,
              contrast: mergedSettings.contrast || 0,
              saturation: mergedSettings.saturation || 0,
              warmth: mergedSettings.warmth || 0,
              sharpness: mergedSettings.sharpness || 50,
            },
            customPrompt: direction.customPrompt || null,
            vibe: direction.vibe || null,
            timeOfDay: direction.timeOfDay || null,
            selectedChips: direction.selectedChips || [],
          },
        },
      });

      let optimizedUrl;

      if (fnError || processResult?.fallback) {
        const errMsg = fnError?.message || processResult?.error || 'Unknown error';

        // If it's a credentials error, show a clear message instead of degrading to canvas
        if (errMsg.includes('Cloudinary') || errMsg.includes('credentials') || errMsg.includes('not configured')) {
          throw new Error('Cloudinary API credentials are not configured. Please add CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET to your Supabase Edge Function secrets at supabase.com → your project → Settings → Edge Functions → Secrets. Get these from cloudinary.com (free account).');
        }

        // For other errors, still try canvas as last resort but warn clearly
        console.warn('Edge function error, using canvas fallback:', errMsg);
        toast.warning('Using basic processing — AI enhancement unavailable. Check Cloudinary credentials.');
        setUsingCanvasFallback(true);
        const canvasMerged = buildProcessingSettings(settings, direction);
        const outputDims = platformConfig.outputWidth && platformConfig.outputHeight
          ? { width: platformConfig.outputWidth, height: platformConfig.outputHeight }
          : null;
        const processedBlob = await processImageCanvas(originalUrl, canvasMerged, outputDims);
        const optPath = `${currentUser.id}/${Date.now()}_optimized.jpg`;
        const { error: upErr } = await supabase.storage.from('snappro-photos').upload(optPath, processedBlob, { contentType: 'image/jpeg' });
        if (upErr) throw upErr;
        const { data: { publicUrl } } = supabase.storage.from('snappro-photos').getPublicUrl(optPath);
        optimizedUrl = publicUrl;
      } else {
        optimizedUrl = processResult.optimizedUrl;
        setUsingCanvasFallback(false);
        if (processResult.skyNoteForUser) {
          console.log(processResult.skyNoteForUser);
        }
      }

      // Update DB record
      await supabase
        .from('snappro_images')
        .update({ optimized_url: optimizedUrl, status: 'completed' })
        .eq('id', inserted.id);

      const updatedRecord = { ...inserted, optimized_url: optimizedUrl, status: 'completed' };
      setProcessedResult({ originalUrl, optimizedUrl, id: inserted.id });
      setVersions([updatedRecord]);
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
      const arMap = { '3:2': '3:2', '16:9': '16:9', '1:1': '1:1', '4:3': '4:3', '9:16': '9:16' };
      const aspectRatio = platformConfig.aspectRatio && arMap[platformConfig.aspectRatio]
        ? platformConfig.aspectRatio : 'original';

      // Merge creative direction into numeric adjustments
      const mergedSettings = buildProcessingSettings(newSettings, direction);
      const { data: processResult, error: fnError } = await supabase.functions.invoke('process-image', {
        body: {
          imageUrl: processedResult.originalUrl,
          userId: currentUser.id,
          imageId: `${Date.now()}_v${versions.length + 1}`,
          settings: {
            outputPurpose: platformConfig.platform || 'listing',
            aspectRatio,
            outputSize: 'high_quality',
            enhancements: {
              autoEnhance: newSettings.autoEnhance || false,
              hdr: newSettings.hdr || false,
              whiteBalance: newSettings.whiteBalance || false,
              virtualTwilight: newSettings.virtualTwilight || false,
              colorEnhancement: true,
              sharpen: true,
              noiseReduction: false,
            },
            adjustments: {
              brightness: mergedSettings.brightness || 0,
              contrast: mergedSettings.contrast || 0,
              saturation: mergedSettings.saturation || 0,
              warmth: mergedSettings.warmth || 0,
              sharpness: mergedSettings.sharpness || 50,
            },
            customPrompt: direction.customPrompt || null,
            vibe: direction.vibe || null,
            timeOfDay: direction.timeOfDay || null,
            selectedChips: direction.selectedChips || [],
          },
        },
      });

      let optimizedUrl;

      if (fnError || processResult?.fallback) {
        const errMsg = fnError?.message || processResult?.error || 'Unknown error';

        if (errMsg.includes('Cloudinary') || errMsg.includes('credentials') || errMsg.includes('not configured')) {
          throw new Error('Cloudinary API credentials are not configured. Please add CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET to your Supabase Edge Function secrets.');
        }

        console.warn('Edge function error for reprocess, using canvas fallback:', errMsg);
        toast.warning('Using basic processing — AI enhancement unavailable.');
        setUsingCanvasFallback(true);
        const outputDims = platformConfig.outputWidth && platformConfig.outputHeight
          ? { width: platformConfig.outputWidth, height: platformConfig.outputHeight }
          : null;
        const processedBlob = await processImageCanvas(processedResult.originalUrl, mergedSettings, outputDims);
        const optPath = `${currentUser.id}/${Date.now()}_v${versions.length + 1}.jpg`;
        const { error: upErr } = await supabase.storage.from('snappro-photos').upload(optPath, processedBlob, { contentType: 'image/jpeg' });
        if (upErr) throw upErr;
        const { data: { publicUrl } } = supabase.storage.from('snappro-photos').getPublicUrl(optPath);
        optimizedUrl = publicUrl;
      } else {
        optimizedUrl = processResult.optimizedUrl;
        setUsingCanvasFallback(false);
      }

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
      <div className="max-w-6xl mx-auto px-4 py-8 animate-fade-in">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
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

        {/* Fallback warning banner */}
        {usingCanvasFallback && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 flex items-start gap-3 text-sm mb-6">
            <span className="text-amber-500 mt-0.5">⚠️</span>
            <div>
              <p className="font-medium text-amber-800">Basic processing mode — AI enhancement not active</p>
              <p className="text-amber-700 mt-0.5">
                Add your Cloudinary credentials to Supabase Edge Function secrets to enable real AI photo enhancement.
                <a href="https://cloudinary.com" target="_blank" rel="noopener noreferrer" className="underline ml-1">Get free Cloudinary account →</a>
              </p>
            </div>
          </div>
        )}

        {!file ? (
          /* Upload zone — centered when no file */
          <div className="max-w-2xl mx-auto">
            <div
              className={`relative border-2 border-dashed rounded-xl p-8 text-center transition-colors cursor-pointer ${
                dragOver ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/40 hover:bg-muted/30'
              }`}
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={onDrop}
              onClick={() => fileInputRef.current?.click()}
            >
              <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={(e) => e.target.files[0] && handleFile(e.target.files[0])} />
              <div className="space-y-3">
                <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto">
                  <Upload className="w-7 h-7 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">Drop your photo here or click to browse</p>
                  <p className="text-xs text-muted-foreground mt-1">JPG, PNG, WebP · Max 20MB</p>
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* Two-column layout when file is selected */
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
            {/* LEFT COLUMN — Image preview + results */}
            <div className="space-y-4 lg:sticky lg:top-6">
              {/* Upload zone / preview */}
              <div
                className="relative border-2 border-dashed rounded-xl p-8 text-center transition-colors cursor-pointer border-primary/40 bg-primary/5"
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={onDrop}
                onClick={() => !file && fileInputRef.current?.click()}
              >
                <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={(e) => e.target.files[0] && handleFile(e.target.files[0])} />
                <div className="space-y-4">
                  <div className="relative inline-block">
                    <img src={preview} alt="Preview" className="max-h-64 rounded-lg mx-auto shadow-md" />
                    <button onClick={(e) => { e.stopPropagation(); clearFile(); }} className="absolute -top-2 -right-2 w-6 h-6 bg-destructive text-destructive-foreground rounded-full flex items-center justify-center text-xs hover:bg-destructive/90">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <p className="text-sm text-muted-foreground">{file.name} · {(file.size / 1024 / 1024).toFixed(1)}MB</p>
                </div>
              </div>

              {/* Before/After results */}
              {processedResult && (
                <>
                  <div className="bg-card border border-border rounded-xl p-6 space-y-4 animate-scale-in">
                    <div className="flex items-center justify-between">
                      <h2 className="text-base font-semibold text-foreground">Before / After</h2>
                      {displayOptimizedUrl && (
                        <a
                          href={displayOptimizedUrl}
                          download={`snappro_${Date.now()}.jpg`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-2 bg-primary text-primary-foreground text-sm font-medium px-4 py-2 rounded-lg hover:bg-primary/90 transition-colors"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                          Download
                        </a>
                      )}
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <p className="text-xs text-muted-foreground mb-2">Original</p>
                        <img src={processedResult.originalUrl} alt="Original" className="w-full rounded-lg border border-border" />
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground mb-2">
                          Processed {currentVersion?.version_label ? `(${currentVersion.version_label})` : '(Enhanced)'}
                          {processedResult.fileSizeMB && (
                            <span className="ml-2 text-green-600 font-medium">✓ AI Enhanced</span>
                          )}
                        </p>
                        <img src={displayOptimizedUrl} alt="Processed" className="w-full rounded-lg border border-border" />
                      </div>
                    </div>
                    {displayOptimizedUrl && (
                      <div className="flex flex-wrap gap-2 pt-2 border-t border-border">
                        <a href={displayOptimizedUrl} download={`snappro_web_${Date.now()}.jpg`} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline">↓ Download for Web</a>
                        <span className="text-xs text-muted-foreground">·</span>
                        <a href={displayOptimizedUrl} download={`snappro_print_${Date.now()}.jpg`} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline">↓ Download Full Size</a>
                        <span className="text-xs text-muted-foreground">·</span>
                        <button onClick={() => { navigator.clipboard.writeText(displayOptimizedUrl); toast.success('Link copied to clipboard'); }} className="text-xs text-primary hover:underline">Copy Link</button>
                      </div>
                    )}
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
                </>
              )}
            </div>

            {/* RIGHT COLUMN — Settings, scrollable */}
            <div className="space-y-4">
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
              <div className="sticky bottom-4 z-10">
                <Button onClick={handleProcess} disabled={processing} className="w-full shadow-lg" size="lg">
                  {processing ? (
                    <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Processing…</>
                  ) : (
                    <><Sparkles className="w-4 h-4 mr-2" /> Process Photo</>
                  )}
                </Button>
                {status === 'trial' && trialUsesRemaining != null && (
                  <p className="text-xs text-center text-muted-foreground mt-2">
                    {trialUsesRemaining} free edits remaining
                  </p>
                )}
              </div>

              {/* Iteration Panel */}
              {processedResult && (
                <IterationPanel
                  settings={settings}
                  onReprocess={handleReprocess}
                  processedImageUrl={displayOptimizedUrl}
                  originalImageUrl={processedResult.originalUrl}
                  currentUser={currentUser}
                  isReprocessing={isReprocessing}
                />
              )}
            </div>
          </div>
        )}

        {/* Recent Uploads — full width */}
        {recentImages.length > 0 && (
          <div className="space-y-4 mt-6">
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
