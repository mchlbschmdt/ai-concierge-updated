
-- Create storage bucket for property files
INSERT INTO storage.buckets (id, name, public)
VALUES ('property-files', 'property-files', true)
ON CONFLICT (id) DO NOTHING;

-- Add storage policies (correct syntax)
DO $$
BEGIN
    -- Policy for viewing files
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'storage' 
        AND tablename = 'objects' 
        AND policyname = 'Anyone can view property files'
    ) THEN
        CREATE POLICY "Anyone can view property files" ON storage.objects
        FOR SELECT USING (bucket_id = 'property-files');
    END IF;

    -- Policy for uploading files
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'storage' 
        AND tablename = 'objects' 
        AND policyname = 'Anyone can upload property files'
    ) THEN
        CREATE POLICY "Anyone can upload property files" ON storage.objects
        FOR INSERT WITH CHECK (bucket_id = 'property-files');
    END IF;

    -- Policy for updating files
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'storage' 
        AND tablename = 'objects' 
        AND policyname = 'Anyone can update property files'
    ) THEN
        CREATE POLICY "Anyone can update property files" ON storage.objects
        FOR UPDATE USING (bucket_id = 'property-files');
    END IF;

    -- Policy for deleting files
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'storage' 
        AND tablename = 'objects' 
        AND policyname = 'Anyone can delete property files'
    ) THEN
        CREATE POLICY "Anyone can delete property files" ON storage.objects
        FOR DELETE USING (bucket_id = 'property-files');
    END IF;
END $$;
