
-- Create snappro_images table
CREATE TABLE public.snappro_images (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  original_url text,
  optimized_url text,
  file_name text NOT NULL,
  file_size integer,
  settings jsonb DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.snappro_images ENABLE ROW LEVEL SECURITY;

-- Users can view their own images
CREATE POLICY "Users can view their own snappro images"
  ON public.snappro_images FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own images
CREATE POLICY "Users can insert their own snappro images"
  ON public.snappro_images FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own images
CREATE POLICY "Users can update their own snappro images"
  ON public.snappro_images FOR UPDATE
  USING (auth.uid() = user_id);

-- Users can delete their own images
CREATE POLICY "Users can delete their own snappro images"
  ON public.snappro_images FOR DELETE
  USING (auth.uid() = user_id);

-- Create snappro-photos storage bucket (public for viewing optimized images)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('snappro-photos', 'snappro-photos', true, 20971520, ARRAY['image/jpeg', 'image/png', 'image/webp']);

-- Storage policies: users can upload to their own folder
CREATE POLICY "Users can upload snappro photos"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'snappro-photos' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Users can view their own snappro photos
CREATE POLICY "Users can view own snappro photos"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'snappro-photos' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Public can view snappro photos (for sharing optimized images)
CREATE POLICY "Public can view snappro photos"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'snappro-photos');

-- Users can delete their own snappro photos
CREATE POLICY "Users can delete own snappro photos"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'snappro-photos' AND auth.uid()::text = (storage.foldername(name))[1]);
