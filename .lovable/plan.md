

# Add STABILITY_API_KEY Secret

## What's needed

Add a single Supabase secret so the `process-image` edge function can call the Stability AI API for generative editing (sky replacement, custom prompts).

## Steps

1. **Get your API key** from [platform.stability.ai](https://platform.stability.ai):
   - Create an account (or log in)
   - Go to your API Keys page
   - Copy the key (starts with `sk-`)
   - Note: SD3 image-to-image requires paid credits on your Stability account

2. **Add the secret** via the Lovable secrets tool — when this plan is approved, you'll be prompted to paste your key

## How it works after setup

- The `process-image` edge function checks `Deno.env.get("STABILITY_API_KEY")` at runtime
- If present + a sky/generative edit is requested: calls Stability AI SD3 image-to-image
- If missing: gracefully skips Stability and returns the Cloudinary-only result (no errors)

## No code changes required

The edge function code already handles the `STABILITY_API_KEY` — this is purely a secret configuration step.

