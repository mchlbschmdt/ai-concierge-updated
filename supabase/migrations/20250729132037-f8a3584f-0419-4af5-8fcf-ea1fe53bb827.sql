-- Security Fixes Migration (Fixed)
-- 1. Drop the security definer views (we'll recreate them properly)
DROP VIEW IF EXISTS public.common_questions_analytics CASCADE;
DROP VIEW IF EXISTS public.common_recommendations_analytics CASCADE;

-- 2. Add user_id column to properties table for proper ownership
ALTER TABLE public.properties 
ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;

-- 3. Update RLS policies for properties to be user-specific
DROP POLICY IF EXISTS "Authenticated users can manage properties" ON public.properties;
DROP POLICY IF EXISTS "Authenticated users can view properties" ON public.properties;

CREATE POLICY "Users can view their own properties" 
ON public.properties 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own properties" 
ON public.properties 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own properties" 
ON public.properties 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own properties" 
ON public.properties 
FOR DELETE 
USING (auth.uid() = user_id);

-- 4. Update RLS policies for guests to be property-owner specific
DROP POLICY IF EXISTS "Allow all operations for authenticated users" ON public.guests;

CREATE POLICY "Property owners can view their property guests" 
ON public.guests 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.properties 
    WHERE properties.code = guests.property_id 
    AND properties.user_id = auth.uid()
  )
);

CREATE POLICY "Property owners can create guests for their properties" 
ON public.guests 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.properties 
    WHERE properties.code = guests.property_id 
    AND properties.user_id = auth.uid()
  )
);

CREATE POLICY "Property owners can update their property guests" 
ON public.guests 
FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM public.properties 
    WHERE properties.code = guests.property_id 
    AND properties.user_id = auth.uid()
  )
);

CREATE POLICY "Property owners can delete their property guests" 
ON public.guests 
FOR DELETE 
USING (
  EXISTS (
    SELECT 1 FROM public.properties 
    WHERE properties.code = guests.property_id 
    AND properties.user_id = auth.uid()
  )
);

-- 5. Update RLS policies for SMS conversations to be property-owner specific
DROP POLICY IF EXISTS "Authenticated users can manage SMS conversations" ON public.sms_conversations;

CREATE POLICY "Property owners can view their property SMS conversations" 
ON public.sms_conversations 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.properties 
    WHERE properties.code = sms_conversations.property_id 
    AND properties.user_id = auth.uid()
  )
);

CREATE POLICY "Property owners can create SMS conversations for their properties" 
ON public.sms_conversations 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.properties 
    WHERE properties.code = sms_conversations.property_id 
    AND properties.user_id = auth.uid()
  )
);

CREATE POLICY "Property owners can update their property SMS conversations" 
ON public.sms_conversations 
FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM public.properties 
    WHERE properties.code = sms_conversations.property_id 
    AND properties.user_id = auth.uid()
  )
);

CREATE POLICY "Property owners can delete their property SMS conversations" 
ON public.sms_conversations 
FOR DELETE 
USING (
  EXISTS (
    SELECT 1 FROM public.properties 
    WHERE properties.code = sms_conversations.property_id 
    AND properties.user_id = auth.uid()
  )
);

-- 6. Update RLS policies for SMS conversation messages
DROP POLICY IF EXISTS "Authenticated users can manage SMS messages" ON public.sms_conversation_messages;

CREATE POLICY "Property owners can view their property SMS messages" 
ON public.sms_conversation_messages 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.sms_conversations sc
    JOIN public.properties p ON p.code = sc.property_id
    WHERE sc.id = sms_conversation_messages.sms_conversation_id 
    AND p.user_id = auth.uid()
  )
);

CREATE POLICY "Property owners can create SMS messages for their properties" 
ON public.sms_conversation_messages 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.sms_conversations sc
    JOIN public.properties p ON p.code = sc.property_id
    WHERE sc.id = sms_conversation_messages.sms_conversation_id 
    AND p.user_id = auth.uid()
  )
);

CREATE POLICY "Property owners can update their property SMS messages" 
ON public.sms_conversation_messages 
FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM public.sms_conversations sc
    JOIN public.properties p ON p.code = sc.property_id
    WHERE sc.id = sms_conversation_messages.sms_conversation_id 
    AND p.user_id = auth.uid()
  )
);

CREATE POLICY "Property owners can delete their property SMS messages" 
ON public.sms_conversation_messages 
FOR DELETE 
USING (
  EXISTS (
    SELECT 1 FROM public.sms_conversations sc
    JOIN public.properties p ON p.code = sc.property_id
    WHERE sc.id = sms_conversation_messages.sms_conversation_id 
    AND p.user_id = auth.uid()
  )
);

-- 7. Secure storage buckets - make uploads bucket private and add proper policies
UPDATE storage.buckets 
SET public = false 
WHERE id = 'uploads';

-- Drop existing storage policies that might be too permissive
DROP POLICY IF EXISTS "Anyone can upload files" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view files" ON storage.objects;

-- Create secure storage policies
CREATE POLICY "Users can upload their own files to uploads bucket" 
ON storage.objects 
FOR INSERT 
WITH CHECK (
  bucket_id = 'uploads' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can view their own files in uploads bucket" 
ON storage.objects 
FOR SELECT 
USING (
  bucket_id = 'uploads' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can update their own files in uploads bucket" 
ON storage.objects 
FOR UPDATE 
USING (
  bucket_id = 'uploads' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete their own files in uploads bucket" 
ON storage.objects 
FOR DELETE 
USING (
  bucket_id = 'uploads' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Property files bucket policies (already private)
CREATE POLICY "Property owners can upload files to their properties" 
ON storage.objects 
FOR INSERT 
WITH CHECK (
  bucket_id = 'property-files' 
  AND EXISTS (
    SELECT 1 FROM public.properties 
    WHERE properties.user_id = auth.uid()
    AND properties.code = (storage.foldername(name))[1]
  )
);

CREATE POLICY "Property owners can view their property files" 
ON storage.objects 
FOR SELECT 
USING (
  bucket_id = 'property-files' 
  AND EXISTS (
    SELECT 1 FROM public.properties 
    WHERE properties.user_id = auth.uid()
    AND properties.code = (storage.foldername(name))[1]
  )
);

CREATE POLICY "Property owners can update their property files" 
ON storage.objects 
FOR UPDATE 
USING (
  bucket_id = 'property-files' 
  AND EXISTS (
    SELECT 1 FROM public.properties 
    WHERE properties.user_id = auth.uid()
    AND properties.code = (storage.foldername(name))[1]
  )
);

CREATE POLICY "Property owners can delete their property files" 
ON storage.objects 
FOR DELETE 
USING (
  bucket_id = 'property-files' 
  AND EXISTS (
    SELECT 1 FROM public.properties 
    WHERE properties.user_id = auth.uid()
    AND properties.code = (storage.foldername(name))[1]
  )
);

-- 8. Fix the admin function - drop and recreate with proper security
DROP FUNCTION IF EXISTS public.admin_update_user_password(uuid,text);

CREATE OR REPLACE FUNCTION public.admin_update_user_password(target_user_id uuid, new_password text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Check if current user is authenticated
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;
  
  -- For now, only allow users to update their own password
  -- In the future, add proper admin role checking here
  IF auth.uid() != target_user_id THEN
    RAISE EXCEPTION 'Insufficient permissions - can only update own password';
  END IF;
  
  -- This is a placeholder function that requires proper implementation
  RAISE NOTICE 'Password update requested for user: %', target_user_id;
END;
$function$;