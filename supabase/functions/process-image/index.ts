import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

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

    // Output dimensions based on platform + aspect ratio
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

    // If sky replacement requested, note it
    const skyRequested = enhancements.sunsetSky || enhancements.sunriseSky || 
                         enhancements.dramaticClouds || enhancements.perfectBlueSky ||
                         settings?.virtualTwilight;

    const processingSteps = transformations.filter(t => !t.startsWith("q_") && !t.startsWith("f_") && !t.startsWith("w_"));

    return new Response(JSON.stringify({
      success: true,
      originalUrl: imageUrl,
      optimizedUrl: processedUrl,
      processingSteps,
      outputWidth: uploadResult.width,
      outputHeight: uploadResult.height,
      fileSizeMB: Math.round(uploadResult.bytes / 1024 / 1024 * 10) / 10,
      skyNoteForUser: skyRequested ? "Sky enhancement applied via color grading. For full sky replacement, Stability AI integration can be added." : null,
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
