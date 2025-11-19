-- Add external_message_id column to track OpenPhone message IDs for deduplication
ALTER TABLE sms_conversation_messages 
ADD COLUMN IF NOT EXISTS external_message_id TEXT;

-- Add unique constraint to prevent duplicate webhook processing
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_external_messages 
ON sms_conversation_messages(external_message_id) 
WHERE external_message_id IS NOT NULL;

-- Add index on timestamp for ordering validation and performance
CREATE INDEX IF NOT EXISTS idx_messages_conversation_timestamp 
ON sms_conversation_messages(sms_conversation_id, timestamp DESC);

-- Add comment for documentation
COMMENT ON COLUMN sms_conversation_messages.external_message_id IS 'External message ID from OpenPhone webhook for deduplication';