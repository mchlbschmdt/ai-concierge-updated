
-- Add new columns to sms_conversations table for enhanced features
ALTER TABLE public.sms_conversations 
ADD COLUMN IF NOT EXISTS last_interaction_timestamp TIMESTAMP WITH TIME ZONE DEFAULT now(),
ADD COLUMN IF NOT EXISTS conversation_context JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS timezone TEXT DEFAULT 'UTC',
ADD COLUMN IF NOT EXISTS preferences JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS last_message_type TEXT,
ADD COLUMN IF NOT EXISTS last_recommendations TEXT;

-- Add index for better performance on timestamp queries
CREATE INDEX IF NOT EXISTS idx_sms_conversations_last_interaction 
ON public.sms_conversations(last_interaction_timestamp);

-- Add index for phone number lookups
CREATE INDEX IF NOT EXISTS idx_sms_conversations_phone_number 
ON public.sms_conversations(phone_number);
