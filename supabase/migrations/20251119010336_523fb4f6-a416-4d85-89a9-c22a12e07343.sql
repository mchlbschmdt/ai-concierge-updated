-- Create recommendation rejections table for quality tracking
CREATE TABLE public.recommendation_rejections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Context
  conversation_id UUID,
  phone_number TEXT NOT NULL,
  property_id TEXT,
  
  -- Request details
  requested_category TEXT NOT NULL,
  original_message TEXT NOT NULL,
  
  -- Rejection details
  rejection_reason TEXT NOT NULL,
  mismatched_content TEXT NOT NULL,
  validation_keywords_found TEXT[],
  validation_keywords_missing TEXT[],
  
  -- Retry outcome
  retry_attempted BOOLEAN DEFAULT false,
  retry_successful BOOLEAN DEFAULT NULL,
  corrected_content TEXT,
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  session_metadata JSONB
);

-- Indexes for analytics queries
CREATE INDEX idx_rejections_category ON recommendation_rejections(requested_category);
CREATE INDEX idx_rejections_property ON recommendation_rejections(property_id);
CREATE INDEX idx_rejections_created ON recommendation_rejections(created_at DESC);
CREATE INDEX idx_rejections_retry_success ON recommendation_rejections(retry_successful) 
  WHERE retry_attempted = true;

-- Enable RLS
ALTER TABLE public.recommendation_rejections ENABLE ROW LEVEL SECURITY;

-- Policy: Allow system to insert rejection logs
CREATE POLICY "System can log rejections" ON recommendation_rejections
  FOR INSERT WITH CHECK (true);

-- Policy: Authenticated users can view rejection analytics
CREATE POLICY "Users can view rejection analytics" ON recommendation_rejections
  FOR SELECT USING (auth.role() = 'authenticated');