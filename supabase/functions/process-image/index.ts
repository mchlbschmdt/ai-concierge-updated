import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const supabaseAdmin = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);

// ═══════════════════════════════════════════════════════
// STABILITY AI HELPERS
// ═══════════════════════════════════════════════════════

async function fetchImageBytes(url: string): Promise<Uint8Array> {
  const res = await fetch(url);
  return new Uint8Array(await res.arrayBuffer());
}

async function uploadToStorage(
  bytes: Uint8Array,
  userId: string,
  label: string,
  contentType = 'image/jpeg'
): Promise<string | null> {
  const ext = contentType === 'image/png' ? 'png' : 'jpg';
  const path = `${userId}/${Date.now()}_${label}.${ext}`;
  const { error } = await supabaseAdmin.storage
    .from('snappro-photos')
    .upload(path, bytes, { contentType, upsert: false });
  if (error) {
    console.warn(`Upload failed for ${label}:`, error);
    return null;
  }
  const { data: { publicUrl } } = supabaseAdmin.storage
    .from('snappro-photos')
    .getPublicUrl(path);
  return publicUrl;
}

async function callStability(
  endpoint: string,
  formData: FormData,
  apiKey: string
): Promise<Uint8Array | null> {
  const res = await fetch(`https://api.stability.ai/v2beta/stable-image/${endpoint}`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Accept': 'image/*',
    },
    body: formData,
  });
  if (!res.ok) {
    const err = await res.text();
    console.warn(`Stability ${endpoint} failed ${res.status}:`, err);
    return null;
  }
  return new Uint8Array(await res.arrayBuffer());
}

function isSkyPrompt(prompt: string): boolean {
  const lower = prompt.toLowerCase();
  return ['sky', 'sunset', 'sunrise', 'twilight', 'clouds', 'dusk', 'dawn', 'cotton candy'].some(k => lower.includes(k));
}

function buildSkyPromptFromStyle(style: string, settings: any, customPrompt: string): string {
  const prompt = customPrompt?.toLowerCase() || '';
  const enhancements = settings?.enhancements || {};

  const styleMap: Record<string, string> = {
    'sunset':          'Dramatic warm golden sunset sky, deep orange and amber clouds, rich warm light casting across the scene, photorealistic, professional real estate photography, 8k',
    'sunrise':         'Soft sunrise sky, gentle pink orange lavender clouds, peaceful morning light, photorealistic, professional real estate photography, 8k',
    'cotton_candy':    'Dreamy cotton candy sky with soft pastel pink, lavender, and soft purple clouds, magical golden hour, photorealistic, professional photography, 8k',
    'blue_sky':        'Perfect clear vibrant blue sky, a few light wispy clouds on the horizon, bright sunny day, photorealistic, professional real estate photography, 8k',
    'dramatic_clouds': 'Dramatic sky with large majestic cumulus clouds, dynamic light breaking through, deep rich blues, photorealistic, professional photography, 8k',
    'twilight':        'Virtual twilight sky, deep indigo and navy blue gradient, warm amber glow near the horizon, professional real estate virtual dusk photography, 8k',
    'stormy':          'Dramatic moody stormy sky, dark clouds with light breaking through, cinematic atmosphere, photorealistic, professional photography, 8k',
    'overcast':        'Soft even overcast sky, diffused light, no harsh shadows, clean professional look, photorealistic, real estate photography, 8k',
  };

  if (style && styleMap[style]) return styleMap[style];
  if (prompt.includes('cotton candy')) return styleMap['cotton_candy'];
  if (prompt.includes('sunset') || enhancements.sunsetSky) return styleMap['sunset'];
  if (prompt.includes('sunrise') || enhancements.sunriseSky) return styleMap['sunrise'];
  if (prompt.includes('twilight') || enhancements.virtualTwilight) return styleMap['twilight'];
  if (prompt.includes('dramatic cloud') || enhancements.dramaticClouds) return styleMap['dramatic_clouds'];
  if (prompt.includes('blue sky') || enhancements.perfectBlueSky) return styleMap['blue_sky'];
  if (prompt.includes('storm')) return styleMap['stormy'];
  return styleMap['sunset'];
}

function buildGeneralPrompt(settings: any, customPrompt: string): string {
  const parts: string[] = [];
  if (customPrompt) parts.push(customPrompt.trim());

  const vibePrompts: Record<string, string> = {
    'Luxury & High-End': 'luxury high-end professional photography, premium quality',
    'Tropical & Resort': 'tropical resort atmosphere, lush vibrant colors, paradise feel',
    'Bright & Airy': 'bright airy photography, natural light, clean and fresh',
    'Dark & Moody': 'dramatic moody photography, rich shadows, atmospheric',
    'Cinematic': 'cinematic photography, film-like quality, professional color grade',
  };
  if (settings.vibe && vibePrompts[settings.vibe]) parts.push(vibePrompts[settings.vibe]);

  const timePrompts: Record<string, string> = {
    'Golden Hour Sunset': 'golden hour lighting, warm sunset tones',
    'Blue Hour Dusk': 'blue hour twilight, cool tones, dusk atmosphere',
    'Soft Morning Light': 'soft morning light, gentle sunrise tones',
    'Night Ambiance': 'night photography, warm artificial lighting',
  };
  if (settings.timeOfDay && timePrompts[settings.timeOfDay]) parts.push(timePrompts[settings.timeOfDay]);

  parts.push('photorealistic, professional photography, high quality, 8k, sharp, detailed');
  return parts.join(', ');
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { imageUrl, settings, userId, imageId } = await req.json();

    const CLOUDINARY_CLOUD_NAME = Deno.env.get("CLOUDINARY_CLOUD_NAME");
    const CLOUDINARY_API_KEY = Deno.env.get("CLOUDINARY_API_KEY");
    const CLOUDINARY_API_SECRET = Deno.env.get("CLOUDINARY_API_SECRET");

    if (!CLOUDINARY_CLOUD_NAME || !CLOUDINARY_API_KEY || !CLOUDINARY_API_SECRET) {
      console.warn("Cloudinary credentials not configured — returning fallback signal");
      return new Response(JSON.stringify({
        error: "Cloudinary credentials not configured. Add CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET to Supabase secrets.",
        fallback: true,
      }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Build Cloudinary transformation array based on settings
    const transformations: string[] = [];

    const aspectRatio = settings?.aspectRatio || "original";

    const dimensionMap: Record<string, string> = {
      "3:2": "w_1920,h_1280,c_fill,g_auto",
      "16:9": "w_1920,h_1080,c_fill,g_auto",
      "1:1": "w_1080,h_1080,c_fill,g_auto",
      "4:3": "w_1600,h_1200,c_fill,g_auto",
      "9:16": "w_1080,h_1920,c_fill,g_auto",
    };

    if (aspectRatio !== "original" && dimensionMap[aspectRatio]) {
      transformations.push(dimensionMap[aspectRatio]);
    }

    // Enhancement transformations
    const enhancements = settings?.enhancements || {};
    const adjustments = settings?.adjustments || {};

    if (enhancements.autoEnhance || settings?.autoEnhance) {
      transformations.push("e_improve:outdoor:50");
    }

    if (enhancements.hdr || settings?.hdr) {
      transformations.push("e_improve:indoor:70");
      transformations.push("e_brightness_hsb:10");
    }

    if (enhancements.colorEnhancement) {
      transformations.push("e_vibrance:40");
      transformations.push("e_saturation:20");
    }

    if (enhancements.warmInviting || settings?.virtualTwilight) {
      transformations.push("e_art:aurora");
    }

    if (enhancements.cinematic) {
      transformations.push("e_art:film");
    }

    if (enhancements.blackAndWhite) {
      transformations.push("e_grayscale");
      transformations.push("e_contrast:30");
    }

    if (enhancements.sharpen || enhancements.sharpnessClarity) {
      transformations.push("e_sharpen:80");
    }

    if (enhancements.noiseReduction) {
      transformations.push("e_noise:10");
    }

    if (enhancements.natureBoost) {
      transformations.push("e_vibrance:30");
      transformations.push("e_saturation:20");
    }

    // Manual adjustment sliders
    const brightness = adjustments.brightness || settings?.brightness || 0;
    const contrast = adjustments.contrast || 0;
    const saturation = adjustments.saturation || 0;
    const warmth = adjustments.warmth || 0;
    const sharpness = adjustments.sharpness || 0;

    if (brightness !== 0) transformations.push(`e_brightness:${brightness}`);
    if (contrast !== 0) transformations.push(`e_contrast:${contrast}`);
    if (saturation !== 0) transformations.push(`e_saturation:${saturation}`);
    if (warmth > 0) transformations.push(`e_tint:${Math.round(warmth * 0.6)}:orange`);
    if (warmth < 0) transformations.push(`e_tint:${Math.round(Math.abs(warmth) * 0.6)}:blue`);
    if (sharpness > 50) transformations.push(`e_sharpen:${Math.round((sharpness - 50) * 1.6)}`);

    // Quality
    const outputSize = settings?.outputSize || "high_quality";
    const quality = outputSize === "print_ready" ? 95 : outputSize === "high_quality" ? 85 : 75;
    transformations.push(`q_${quality}`);
    transformations.push("f_jpg");

    // Build the Cloudinary transformation string
    const transformationString = transformations.join("/");

    // Upload to Cloudinary and apply transformations in one step
    const timestamp = Math.round(Date.now() / 1000);
    const publicId = `snappro/${userId}/${imageId || timestamp}_optimized`;

    // Create signature for authenticated upload
    const sigString = `public_id=${publicId}&timestamp=${timestamp}&transformation=${transformationString}${CLOUDINARY_API_SECRET}`;
    const encoder = new TextEncoder();
    const data = encoder.encode(sigString);
    const hashBuffer = await crypto.subtle.digest("SHA-1", data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const signature = hashArray.map(b => b.toString(16).padStart(2, "0")).join("");

    const formData = new FormData();
    formData.append("file", imageUrl);
    formData.append("api_key", CLOUDINARY_API_KEY);
    formData.append("timestamp", timestamp.toString());
    formData.append("public_id", publicId);
    formData.append("transformation", transformationString);
    formData.append("signature", signature);

    console.log("Uploading to Cloudinary with transformations:", transformationString);

    const uploadResponse = await fetch(
      `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`,
      { method: "POST", body: formData }
    );

    if (!uploadResponse.ok) {
      const errorText = await uploadResponse.text();
      console.error("Cloudinary error:", errorText);
      throw new Error(`Cloudinary upload failed: ${errorText}`);
    }

    const uploadResult = await uploadResponse.json();
    const processedUrl = uploadResult.secure_url;

    // ═══════════════════════════════════════════════════════
    // STABILITY AI PIPELINE — runs after Cloudinary
    // Processes in order: cleanup → sky → creative → expand → style → upscale
    // Each step feeds its output into the next step
    // ═══════════════════════════════════════════════════════

    const STABILITY_API_KEY = Deno.env.get('STABILITY_API_KEY');
    let currentUrl = processedUrl;
    const stabilityStepsApplied: string[] = [];

    if (STABILITY_API_KEY) {
      const aiTools = settings?.aiTools || {};
      const customPrompt = settings?.customPrompt?.trim() || '';

      // ── STEP 1: Background Removal ────────────────────────────────────────
      if (aiTools.backgroundRemove?.enabled) {
        try {
          console.log('Stability: remove-background');
          const imgBytes = await fetchImageBytes(currentUrl);
          const form = new FormData();
          form.append('image', new Blob([imgBytes], { type: 'image/jpeg' }), 'image.jpg');
          form.append('output_format', 'png');
          const result = await callStability('edit/remove-background', form, STABILITY_API_KEY);
          if (result) {
            const uploaded = await uploadToStorage(result, userId, 'bg_removed', 'image/png');
            if (uploaded) {
              currentUrl = uploaded;
              stabilityStepsApplied.push('background_removed');
              console.log('Background removed:', currentUrl);
            }
          }
        } catch (e) { console.warn('Background removal failed:', e); }
      }

      // ── STEP 2: Object Erase ──────────────────────────────────────────────
      if (aiTools.objectRemove?.enabled && aiTools.objectRemove?.description) {
        try {
          console.log('Stability: erase object:', aiTools.objectRemove.description);
          const imgBytes = await fetchImageBytes(currentUrl);
          const form = new FormData();
          form.append('image', new Blob([imgBytes], { type: 'image/jpeg' }), 'image.jpg');
          form.append('prompt', `${aiTools.objectRemove.description} removed, clean background matching surroundings, photorealistic, seamless`);
          form.append('search_prompt', aiTools.objectRemove.description);
          form.append('negative_prompt', 'visible seam, artifact, blur, distortion');
          form.append('output_format', 'jpeg');
          const result = await callStability('edit/search-and-replace', form, STABILITY_API_KEY);
          if (result) {
            const uploaded = await uploadToStorage(result, userId, 'object_erased');
            if (uploaded) {
              currentUrl = uploaded;
              stabilityStepsApplied.push('object_erased');
            }
          }
        } catch (e) { console.warn('Object erase failed:', e); }
      }

      // ── STEP 3: Object Replace ────────────────────────────────────────────
      if (aiTools.objectReplace?.enabled && aiTools.objectReplace?.searchFor && aiTools.objectReplace?.replaceWith) {
        try {
          console.log('Stability: search-and-replace:', aiTools.objectReplace.searchFor, '->', aiTools.objectReplace.replaceWith);
          const imgBytes = await fetchImageBytes(currentUrl);
          const form = new FormData();
          form.append('image', new Blob([imgBytes], { type: 'image/jpeg' }), 'image.jpg');
          form.append('prompt', `${aiTools.objectReplace.replaceWith}, photorealistic, professional real estate photography, high quality, matching lighting`);
          form.append('search_prompt', aiTools.objectReplace.searchFor);
          form.append('negative_prompt', 'blurry, fake, cartoon, artifact, distorted');
          form.append('output_format', 'jpeg');
          const result = await callStability('edit/search-and-replace', form, STABILITY_API_KEY);
          if (result) {
            const uploaded = await uploadToStorage(result, userId, 'object_replaced');
            if (uploaded) {
              currentUrl = uploaded;
              stabilityStepsApplied.push('object_replaced');
            }
          }
        } catch (e) { console.warn('Object replace failed:', e); }
      }

      // ── STEP 4: Object Recolor ────────────────────────────────────────────
      if (aiTools.objectRecolor?.enabled && aiTools.objectRecolor?.searchFor && aiTools.objectRecolor?.color) {
        try {
          console.log('Stability: search-and-recolor:', aiTools.objectRecolor.searchFor, '->', aiTools.objectRecolor.color);
          const imgBytes = await fetchImageBytes(currentUrl);
          const form = new FormData();
          form.append('image', new Blob([imgBytes], { type: 'image/jpeg' }), 'image.jpg');
          form.append('prompt', `${aiTools.objectRecolor.searchFor} recolored to ${aiTools.objectRecolor.color}, photorealistic, natural lighting, professional photography`);
          form.append('select_prompt', aiTools.objectRecolor.searchFor);
          form.append('negative_prompt', 'blurry, artifact, unnatural color, distorted');
          form.append('output_format', 'jpeg');
          const result = await callStability('edit/search-and-recolor', form, STABILITY_API_KEY);
          if (result) {
            const uploaded = await uploadToStorage(result, userId, 'object_recolored');
            if (uploaded) {
              currentUrl = uploaded;
              stabilityStepsApplied.push('object_recolored');
            }
          }
        } catch (e) { console.warn('Object recolor failed:', e); }
      }

      // ── STEP 5: Sky Replacement ───────────────────────────────────────────
      const skyStyle = aiTools.skyReplacement?.style || '';
      const needsSky = (aiTools.skyReplacement?.enabled) ||
                       enhancements.sunsetSky || enhancements.sunriseSky ||
                       enhancements.dramaticClouds || enhancements.perfectBlueSky ||
                       enhancements.virtualTwilight || settings?.virtualTwilight ||
                       (customPrompt && isSkyPrompt(customPrompt));

      if (needsSky) {
        try {
          const skyPromptText = aiTools.skyReplacement?.customSkyDescription
            ? `${aiTools.skyReplacement.customSkyDescription}, photorealistic sky, professional real estate photography, 8k`
            : buildSkyPromptFromStyle(skyStyle || '', settings, customPrompt);

          console.log('Stability: sky search-and-replace, prompt:', skyPromptText);
          const imgBytes = await fetchImageBytes(currentUrl);
          const form = new FormData();
          form.append('image', new Blob([imgBytes], { type: 'image/jpeg' }), 'image.jpg');
          form.append('prompt', skyPromptText);
          form.append('search_prompt', 'sky, clouds');
          form.append('negative_prompt', 'blurry, fake, cartoon, nuclear, neon, oversaturated sky, watermark, text, artifacts, changed buildings, altered architecture, modified structures');
          form.append('output_format', 'jpeg');
          form.append('grow_mask', '1');
          const result = await callStability('edit/search-and-replace', form, STABILITY_API_KEY);
          if (result) {
            const uploaded = await uploadToStorage(result, userId, 'sky_replaced');
            if (uploaded) {
              currentUrl = uploaded;
              stabilityStepsApplied.push('sky_replaced');
            }
          }
        } catch (e) { console.warn('Sky replacement failed:', e); }
      }

      // ── STEP 6: General Creative Edit (SD3.5 img2img) ────────────────────
      const needsGeneralEdit = customPrompt && !isSkyPrompt(customPrompt) && customPrompt.length > 10;
      if (needsGeneralEdit) {
        try {
          console.log('Stability: SD3.5 img2img creative edit');
          const imgBytes = await fetchImageBytes(currentUrl);
          const form = new FormData();
          form.append('image', new Blob([imgBytes], { type: 'image/jpeg' }), 'image.jpg');
          form.append('prompt', buildGeneralPrompt(settings, customPrompt));
          form.append('negative_prompt', settings?.negativePrompt || 'blurry, cartoon, illustration, watermark, text, artifacts, distorted, unrealistic, painting');
          form.append('output_format', 'jpeg');
          form.append('strength', '0.28');
          form.append('model', 'sd3.5-large-turbo');
          const result = await callStability('generate/sd3', form, STABILITY_API_KEY);
          if (result) {
            const uploaded = await uploadToStorage(result, userId, 'creative_edit');
            if (uploaded) {
              currentUrl = uploaded;
              stabilityStepsApplied.push('creative_edit');
            }
          }
        } catch (e) { console.warn('Creative edit failed:', e); }
      }

      // ── STEP 7: Outpaint / Expand ─────────────────────────────────────────
      if (aiTools.outpaint?.enabled) {
        try {
          const direction = aiTools.outpaint.direction || 'all';
          const amount = aiTools.outpaint.amount || 200;
          console.log('Stability: outpaint direction:', direction, 'amount:', amount);
          const imgBytes = await fetchImageBytes(currentUrl);
          const form = new FormData();
          form.append('image', new Blob([imgBytes], { type: 'image/jpeg' }), 'image.jpg');
          const left   = (direction === 'all' || direction === 'left'  || direction === 'left+right') ? amount : 0;
          const right  = (direction === 'all' || direction === 'right' || direction === 'left+right') ? amount : 0;
          const up     = (direction === 'all' || direction === 'top'   || direction === 'top+bottom') ? amount : 0;
          const down   = (direction === 'all' || direction === 'bottom'|| direction === 'top+bottom') ? amount : 0;
          if (left  > 0) form.append('left',   left.toString());
          if (right > 0) form.append('right',  right.toString());
          if (up    > 0) form.append('up',     up.toString());
          if (down  > 0) form.append('down',   down.toString());
          form.append('prompt', 'natural continuation of the real estate property photo, matching architectural style, seamless extension, photorealistic');
          form.append('output_format', 'jpeg');
          const result = await callStability('edit/outpaint', form, STABILITY_API_KEY);
          if (result) {
            const uploaded = await uploadToStorage(result, userId, 'outpainted');
            if (uploaded) {
              currentUrl = uploaded;
              stabilityStepsApplied.push('outpainted');
            }
          }
        } catch (e) { console.warn('Outpaint failed:', e); }
      }

      // ── STEP 8: Style Transfer ────────────────────────────────────────────
      if (aiTools.styleTransfer?.enabled && aiTools.styleTransfer?.referenceImageUrl) {
        try {
          console.log('Stability: style transfer');
          const imgBytes = await fetchImageBytes(currentUrl);
          const refBytes = await fetchImageBytes(aiTools.styleTransfer.referenceImageUrl);
          const strength = aiTools.styleTransfer.strength || 0.5;
          const form = new FormData();
          form.append('image', new Blob([imgBytes], { type: 'image/jpeg' }), 'image.jpg');
          form.append('style_image', new Blob([refBytes], { type: 'image/jpeg' }), 'style.jpg');
          form.append('fidelity', strength.toString());
          form.append('output_format', 'jpeg');
          const result = await callStability('control/style', form, STABILITY_API_KEY);
          if (result) {
            const uploaded = await uploadToStorage(result, userId, 'style_transferred');
            if (uploaded) {
              currentUrl = uploaded;
              stabilityStepsApplied.push('style_transferred');
            }
          }
        } catch (e) { console.warn('Style transfer failed:', e); }
      }

      // ── STEP 9: AI Upscale (ALWAYS LAST) ─────────────────────────────────
      if (aiTools.upscale?.enabled) {
        try {
          const mode = aiTools.upscale.mode || 'conservative';
          const endpoint = mode === 'fast' ? 'upscale/fast' :
                           mode === 'creative' ? 'upscale/creative' : 'upscale/conservative';
          console.log('Stability: upscale mode:', mode);
          const imgBytes = await fetchImageBytes(currentUrl);
          const form = new FormData();
          form.append('image', new Blob([imgBytes], { type: 'image/jpeg' }), 'image.jpg');
          form.append('output_format', 'jpeg');
          if (mode === 'creative') {
            form.append('prompt', 'professional real estate photography, sharp architectural details, natural textures, photorealistic, high quality');
            form.append('negative_prompt', 'blurry, artifact, noise, distorted');
            form.append('creativity', '0.35');
          }
          const result = await callStability(endpoint, form, STABILITY_API_KEY);
          if (result) {
            const uploaded = await uploadToStorage(result, userId, `upscaled_${mode}`);
            if (uploaded) {
              currentUrl = uploaded;
              stabilityStepsApplied.push(`upscaled_${mode}`);
            }
          }
        } catch (e) { console.warn('Upscale failed:', e); }
      }
    } // end if STABILITY_API_KEY

    const finalUrl = currentUrl;

    const cloudinarySteps = transformations.filter(t => !t.startsWith("q_") && !t.startsWith("f_") && !t.startsWith("w_"));

    return new Response(JSON.stringify({
      success: true,
      originalUrl: imageUrl,
      optimizedUrl: finalUrl,
      cloudinaryUrl: processedUrl,
      stabilityAiApplied: stabilityStepsApplied.length > 0,
      processingSteps: [
        ...cloudinarySteps,
        ...stabilityStepsApplied,
      ],
      outputWidth: uploadResult.width,
      outputHeight: uploadResult.height,
      fileSizeMB: Math.round(uploadResult.bytes / 1024 / 1024 * 10) / 10,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (e) {
    console.error("process-image error:", e);
    return new Response(JSON.stringify({ 
      error: e instanceof Error ? e.message : "Unknown error",
      fallback: true 
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
