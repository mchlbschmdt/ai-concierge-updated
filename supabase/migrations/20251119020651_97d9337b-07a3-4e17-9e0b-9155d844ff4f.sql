-- Add missing columns for conversation tracking
ALTER TABLE public.sms_conversations
  ADD COLUMN IF NOT EXISTS last_intent text,
  ADD COLUMN IF NOT EXISTS last_response text;

-- Add helpful comments
COMMENT ON COLUMN public.sms_conversations.last_intent IS 'Stores the most recent intent detected (e.g., ask_checkin_time, ask_wifi_password)';
COMMENT ON COLUMN public.sms_conversations.last_response IS 'Stores the most recent response sent to the guest';