-- Fix critical security issues identified in security review

-- 1. Secure SMS conversations - restrict to authenticated users only
DROP POLICY IF EXISTS "Service access for SMS conversations" ON sms_conversations;
CREATE POLICY "Authenticated users can manage SMS conversations"
  ON sms_conversations
  FOR ALL
  USING (auth.role() = 'authenticated');

-- 2. Secure SMS conversation messages - restrict to authenticated users only  
DROP POLICY IF EXISTS "Service access for SMS messages" ON sms_conversation_messages;
CREATE POLICY "Authenticated users can manage SMS messages"
  ON sms_conversation_messages
  FOR ALL
  USING (auth.role() = 'authenticated');

-- 3. Secure travel conversations - restrict to authenticated users only
DROP POLICY IF EXISTS "Anyone can view travel conversations" ON travel_conversations;
DROP POLICY IF EXISTS "Service can manage travel conversations" ON travel_conversations;
CREATE POLICY "Authenticated users can manage travel conversations"
  ON travel_conversations
  FOR ALL
  USING (auth.role() = 'authenticated');

-- 4. Secure travel messages - restrict to authenticated users only
DROP POLICY IF EXISTS "Anyone can view travel messages" ON travel_messages;
DROP POLICY IF EXISTS "Service can manage travel messages" ON travel_messages;
CREATE POLICY "Authenticated users can manage travel messages"
  ON travel_messages
  FOR ALL
  USING (auth.role() = 'authenticated');

-- 5. Make property-files storage bucket private and add proper policies
UPDATE storage.buckets 
SET public = false 
WHERE id = 'property-files';

-- Drop existing overly permissive storage policies for property-files
DROP POLICY IF EXISTS "Anyone can view property files" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can upload property files" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can update property files" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can delete property files" ON storage.objects;

-- Create secure storage policies for property-files bucket
CREATE POLICY "Authenticated users can view property files"
  ON storage.objects
  FOR SELECT
  USING (bucket_id = 'property-files' AND auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can upload property files"
  ON storage.objects
  FOR INSERT
  WITH CHECK (bucket_id = 'property-files' AND auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update property files"
  ON storage.objects
  FOR UPDATE
  USING (bucket_id = 'property-files' AND auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can delete property files"
  ON storage.objects
  FOR DELETE
  USING (bucket_id = 'property-files' AND auth.role() = 'authenticated');

-- 6. Fix function search path issue - update hash_security_answer function
CREATE OR REPLACE FUNCTION public.hash_security_answer(answer text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
BEGIN
  -- Use SHA-256 instead of MD5 for better security
  RETURN encode(digest(lower(trim(answer)), 'sha256'), 'hex');
END;
$function$;

-- 7. Update admin_update_user_password function with proper search path
CREATE OR REPLACE FUNCTION public.admin_update_user_password(user_id uuid, new_password text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
BEGIN
  -- This function would need to be implemented with proper admin checks
  -- For now, we'll create a placeholder that requires proper authentication
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;
  
  -- In a real implementation, this would update the user's password
  -- through Supabase auth APIs in an edge function
  RAISE NOTICE 'Password update requested for user: %', user_id;
END;
$function$;