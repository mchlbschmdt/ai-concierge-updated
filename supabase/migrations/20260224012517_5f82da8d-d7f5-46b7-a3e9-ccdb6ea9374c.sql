
ALTER TABLE public.snappro_images
  ADD COLUMN IF NOT EXISTS parent_image_id uuid REFERENCES public.snappro_images(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS version_number integer DEFAULT 1,
  ADD COLUMN IF NOT EXISTS version_label text,
  ADD COLUMN IF NOT EXISTS iteration_prompt text;
