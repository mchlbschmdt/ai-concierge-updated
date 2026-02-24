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

function buildSkyPrompt(settings: any): string {
  const enhancements = settings.enhancements || {};
  
  if (enhancements.sunsetSky || (settings.customPrompt?.toLowerCase().includes('sunset'))) {
    return 'Same scene with photorealistic dramatic golden sunset sky, warm orange and pink clouds, professional real estate photography, golden hour lighting, photorealistic, high quality, 8k';
  }
  if (enhancements.sunriseSky || (settings.customPrompt?.toLowerCase().includes('sunrise'))) {
    return 'Same scene with photorealistic soft sunrise sky, gentle pink and lavender clouds, soft morning light, professional real estate photography, high quality, 8k';
  }
  if (enhancements.dramaticClouds) {
    return 'Same scene with photorealistic dramatic sky with beautiful cumulus clouds, dynamic cloud formations, bright sunny day, professional real estate photography, high quality, 8k';
  }
  if (enhancements.perfectBlueSky) {
    return 'Same scene with photorealistic perfect clear blue sky, bright sunny day, no clouds, vibrant blue, professional real estate photography, high quality, 8k';
  }
  if (settings.virtualTwilight || settings.customPrompt?.toLowerCase().includes('twilight')) {
    return 'Same scene at twilight with photorealistic deep blue and purple sky, warm artificial lighting glowing from windows and pools, professional real estate virtual twilight photography, high quality, 8k';
  }
  return 'Same scene with photorealistic beautiful dramatic sky, professional real estate photography, high quality, 8k';
}

function buildStabilityPrompt(settings: any): string {
  const parts: string[] = [];
  
  if (settings.customPrompt) {
    parts.push(settings.customPrompt.trim());
  }
  
  const vibePrompts: Record<string, string> = {
    'Luxury & High-End': 'luxury high-end professional photography, premium quality',
    'Tropical & Resort': 'tropical resort atmosphere, lush vibrant colors, paradise feel',
    'Bright & Airy': 'bright airy photography, natural light, clean and fresh',
    'Dark & Moody': 'dramatic moody photography, rich shadows, atmospheric',
    'Cinematic': 'cinematic photography, film-like quality, professional color grade',
  };
  if (settings.vibe && vibePrompts[settings.vibe]) {
    parts.push(vibePrompts[settings.vibe]);
  }
  
  const timePrompts: Record<string, string> = {
    'Golden Hour Sunset': 'golden hour lighting, warm sunset tones',
    'Blue Hour Dusk': 'blue hour twilight, cool tones, dusk atmosphere',
    'Soft Morning Light': 'soft morning light, gentle sunrise tones',
    'Night Ambiance': 'night photography, warm artificial lighting',
  };
  if (settings.timeOfDay && timePrompts[settings.timeOfDay]) {
    parts.push(timePrompts[settings.timeOfDay]);
  }
  
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

    // ========== Stability AI Generative Editing Stage ==========
    const needsSkyReplacement = 
      enhancements.sunsetSky ||
      enhancements.sunriseSky ||
      enhancements.dramaticClouds ||
      enhancements.perfectBlueSky ||
      settings?.virtualTwilight ||
      (settings?.customPrompt && (
        settings.customPrompt.toLowerCase().includes('sky') ||
        settings.customPrompt.toLowerCase().includes('sunset') ||
        settings.customPrompt.toLowerCase().includes('sunrise') ||
        settings.customPrompt.toLowerCase().includes('twilight') ||
        settings.customPrompt.toLowerCase().includes('clouds')
      ));

    const needsGenerativeEdit = settings?.customPrompt && settings.customPrompt.trim().length > 0;

    let finalUrl = processedUrl;

    const STABILITY_API_KEY = Deno.env.get("STABILITY_API_KEY");

    if (STABILITY_API_KEY && (needsSkyReplacement || needsGenerativeEdit)) {
      try {
        // Fetch the Cloudinary-processed image as a blob
        const imageResponse = await fetch(processedUrl);
        const imageBlob = await imageResponse.blob();
        const imageBuffer = await imageBlob.arrayBuffer();
        const imageBytes = new Uint8Array(imageBuffer);

        if (needsGenerativeEdit && settings.customPrompt) {
          // Use Stability AI image-to-image with the custom prompt
          const stabilityFormData = new FormData();
          stabilityFormData.append('image', new Blob([imageBytes], { type: 'image/jpeg' }), 'image.jpg');
          stabilityFormData.append('prompt', buildStabilityPrompt(settings));
          stabilityFormData.append('negative_prompt', settings.negativePrompt || 'blurry, fake, cartoon, illustration, oversaturated, watermark, text, logo, artifacts, distorted, unrealistic, painting');
          stabilityFormData.append('output_format', 'jpeg');
          stabilityFormData.append('strength', '0.65');
          stabilityFormData.append('seed', '0');

          console.log("Calling Stability AI with custom prompt:", settings.customPrompt);

          const stabilityResponse = await fetch(
            'https://api.stability.ai/v2beta/stable-image/generate/sd3',
            {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${STABILITY_API_KEY}`,
                'Accept': 'image/*',
              },
              body: stabilityFormData,
            }
          );

          if (stabilityResponse.ok) {
            const resultBlob = await stabilityResponse.blob();
            const resultBuffer = await resultBlob.arrayBuffer();
            
            const stabilityPath = `${userId}/${Date.now()}_stability.jpg`;
            const { error: stabUploadError } = await supabaseAdmin.storage
              .from('snappro-photos')
              .upload(stabilityPath, new Uint8Array(resultBuffer), { 
                contentType: 'image/jpeg',
                upsert: false 
              });
            
            if (!stabUploadError) {
              const { data: { publicUrl: stabPublicUrl } } = supabaseAdmin.storage
                .from('snappro-photos')
                .getPublicUrl(stabilityPath);
              finalUrl = stabPublicUrl;
              console.log("Stability AI generative edit applied successfully");
            } else {
              console.warn('Stability upload failed, using Cloudinary result:', stabUploadError);
            }
          } else {
            const errText = await stabilityResponse.text();
            console.warn('Stability AI error, using Cloudinary result:', stabilityResponse.status, errText);
          }
        } else if (needsSkyReplacement) {
          // Sky-only replacement
          const skyPrompt = buildSkyPrompt(settings);
          
          const stabilityFormData = new FormData();
          stabilityFormData.append('image', new Blob([imageBytes], { type: 'image/jpeg' }), 'image.jpg');
          stabilityFormData.append('prompt', skyPrompt);
          stabilityFormData.append('negative_prompt', 'blurry, fake, cartoon, illustration, watermark, artifacts, distorted');
          stabilityFormData.append('output_format', 'jpeg');
          stabilityFormData.append('strength', '0.45');
          stabilityFormData.append('seed', '0');

          console.log("Calling Stability AI for sky replacement");

          const stabilityResponse = await fetch(
            'https://api.stability.ai/v2beta/stable-image/generate/sd3',
            {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${STABILITY_API_KEY}`,
                'Accept': 'image/*',
              },
              body: stabilityFormData,
            }
          );

          if (stabilityResponse.ok) {
            const resultBlob = await stabilityResponse.blob();
            const resultBuffer = await resultBlob.arrayBuffer();
            
            const stabilityPath = `${userId}/${Date.now()}_sky.jpg`;
            const { error: stabUploadError } = await supabaseAdmin.storage
              .from('snappro-photos')
              .upload(stabilityPath, new Uint8Array(resultBuffer), { 
                contentType: 'image/jpeg',
                upsert: false 
              });
            
            if (!stabUploadError) {
              const { data: { publicUrl: stabPublicUrl } } = supabaseAdmin.storage
                .from('snappro-photos')
                .getPublicUrl(stabilityPath);
              finalUrl = stabPublicUrl;
              console.log("Stability AI sky replacement applied successfully");
            }
          } else {
            console.warn('Stability sky replacement failed, using Cloudinary result');
          }
        }
      } catch (stabilityError) {
        console.warn('Stability AI processing failed, using Cloudinary result:', stabilityError);
      }
    }

    const processingSteps = transformations.filter(t => !t.startsWith("q_") && !t.startsWith("f_") && !t.startsWith("w_"));

    return new Response(JSON.stringify({
      success: true,
      originalUrl: imageUrl,
      optimizedUrl: finalUrl,
      cloudinaryUrl: processedUrl,
      stabilityAiApplied: finalUrl !== processedUrl,
      processingSteps: [
        ...processingSteps,
        ...(finalUrl !== processedUrl ? ['stability_ai_generative'] : []),
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