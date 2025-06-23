
-- Add enhanced guest context and memory columns to sms_conversations
ALTER TABLE public.sms_conversations 
ADD COLUMN guest_name TEXT,
ADD COLUMN guest_profile JSONB DEFAULT '{}',
ADD COLUMN location_context JSONB DEFAULT '{}',
ADD COLUMN time_context JSONB DEFAULT '{}',
ADD COLUMN last_activity_type TEXT,
ADD COLUMN check_in_date DATE,
ADD COLUMN check_out_date DATE;

-- Create index for better performance on guest profile queries
CREATE INDEX idx_sms_conversations_guest_profile ON public.sms_conversations USING gin(guest_profile);
CREATE INDEX idx_sms_conversations_location_context ON public.sms_conversations USING gin(location_context);
