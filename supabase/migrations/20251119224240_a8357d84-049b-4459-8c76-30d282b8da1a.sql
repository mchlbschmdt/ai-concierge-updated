-- Add column to track skipped onboarding steps
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS skipped_onboarding_steps jsonb DEFAULT '[]'::jsonb;

-- Add comment for documentation
COMMENT ON COLUMN public.profiles.skipped_onboarding_steps IS 'Array of step names that user skipped during onboarding (e.g., ["security_questions", "first_property"])';