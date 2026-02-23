import React, { useState, useCallback, useRef, useEffect } from 'react';
import Layout from '@/components/Layout';
import { useAuth } from '@/context/AuthContext';
import { useProductAccess } from '@/hooks/useProductAccess';
import { supabase } from '@/integrations/supabase/client';
import { Upload, Sparkles, Sun, Contrast, Image, Zap, X, CheckCircle, Loader2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_SIZE = 20 * 1024 * 1024; // 20MB

const DEFAULT_SETTINGS = {
  autoEnhance: true,
  hdr: false,
  whiteBalance: false,
  brightness: 0,
  virtualTwilight: false,
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

  // Fetch recent images
  useEffect(() => {
    if (!currentUser?.id) return;
    supabase
      .from('snappro_images')
      .select('*')
      .eq('user_id', currentUser.id)
      .order('created_at', { ascending: false })
      .limit(5)
      .then(({ data }) => { if (data) setRecentImages(data); });
  }, [currentUser?.id, processing]);

  const handleFile = useCallback((f) => {
    if (!ACCEPTED_TYPES.includes(f.type)) {
      toast.error('Please upload a JPG, PNG, or WebP image.');
      return;
    }
    if (f.size > MAX_SIZE) {
      toast.error('File too large. Maximum size is 20MB.');
      return;
    }
    setFile(f);
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
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleProcess = async () => {
    if (!file || !currentUser?.id) return;

    // Check trial
    const result = await incrementUsage();
    if (!result.allowed) return;

    setProcessing(true);
    try {
      const ext = file.name.split('.').pop();
      const path = `${currentUser.id}/${Date.now()}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from('snappro-photos')
        .upload(path, file, { contentType: file.type });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('snappro-photos')
        .getPublicUrl(path);

      const { error: dbError } = await supabase
        .from('snappro_images')
        .insert({
          user_id: currentUser.id,
          original_url: publicUrl,
          optimized_url: publicUrl, // placeholder — real optimization would process here
          file_name: file.name,
          file_size: file.size,
          settings,
          status: 'completed',
        });

      if (dbError) throw dbError;

      toast.success('Photo processed successfully!');
      clearFile();
      setSettings(DEFAULT_SETTINGS);
    } catch (err) {
      console.error(err);
      toast.error('Failed to process photo. Please try again.');
    } finally {
      setProcessing(false);
    }
  };

  const trialLimit = 10;
  const pct = Math.min(100, (usageCount / trialLimit) * 100);

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
            <p className="text-sm text-muted-foreground mt-1">
              AI-powered photo enhancement for professional listing images
            </p>
          </div>

          {status === 'trial' && trialUsesRemaining != null && (
            <div className="flex items-center gap-3 bg-muted/50 border border-border rounded-lg px-4 py-2.5">
              <Zap className="w-4 h-4 text-primary shrink-0" />
              <div className="min-w-0">
                <p className="text-xs font-medium text-foreground">
                  {usageCount} of {trialLimit} free edits used
                </p>
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
            dragOver
              ? 'border-primary bg-primary/5'
              : file
              ? 'border-primary/40 bg-primary/5'
              : 'border-border hover:border-primary/40 hover:bg-muted/30'
          }`}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={onDrop}
          onClick={() => !file && fileInputRef.current?.click()}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={(e) => e.target.files[0] && handleFile(e.target.files[0])}
          />

          {preview ? (
            <div className="space-y-4">
              <div className="relative inline-block">
                <img src={preview} alt="Preview" className="max-h-64 rounded-lg mx-auto shadow-md" />
                <button
                  onClick={(e) => { e.stopPropagation(); clearFile(); }}
                  className="absolute -top-2 -right-2 w-6 h-6 bg-destructive text-destructive-foreground rounded-full flex items-center justify-center text-xs hover:bg-destructive/90"
                >
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

        {/* Enhancement Settings */}
        {file && (
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
              <input
                type="range"
                min="-50"
                max="50"
                value={settings.brightness}
                onChange={(e) => setSettings(s => ({ ...s, brightness: Number(e.target.value) }))}
                className="w-full mt-2 accent-primary"
              />
            </div>

            <Button onClick={handleProcess} disabled={processing} className="w-full" size="lg">
              {processing ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Processing…</>
              ) : (
                <><Sparkles className="w-4 h-4 mr-2" /> Process Photo</>
              )}
            </Button>
          </div>
        )}

        {/* Recent Uploads */}
        {recentImages.length > 0 && (
          <div className="space-y-4">
            <h2 className="text-base font-semibold text-foreground">Recent Uploads</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
              {recentImages.map((img) => (
                <div key={img.id} className="group relative rounded-lg overflow-hidden border border-border bg-card hover-lift">
                  <img
                    src={img.optimized_url || img.original_url}
                    alt={img.file_name}
                    className="w-full aspect-square object-cover"
                  />
                  <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/60 to-transparent p-2">
                    <p className="text-[10px] text-white truncate">{img.file_name}</p>
                    <span className={`inline-flex items-center gap-1 text-[10px] mt-0.5 ${
                      img.status === 'completed' ? 'text-green-300' : 'text-yellow-300'
                    }`}>
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
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative w-10 h-5 rounded-full transition-colors ${checked ? 'bg-primary' : 'bg-muted-foreground/30'}`}
      >
        <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${checked ? 'translate-x-5' : ''}`} />
      </button>
    </label>
  );
}
