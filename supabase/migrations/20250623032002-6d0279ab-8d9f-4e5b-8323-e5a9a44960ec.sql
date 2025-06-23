
-- Create table for host AI conversations
CREATE TABLE public.host_ai_conversations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users NOT NULL,
  message TEXT NOT NULL,
  response TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  conversation_context JSONB DEFAULT '{}'::jsonb
);

-- Enable RLS for host AI conversations
ALTER TABLE public.host_ai_conversations ENABLE ROW LEVEL SECURITY;

-- Create policy for host AI conversations
CREATE POLICY "Users can view their own host conversations" 
  ON public.host_ai_conversations 
  FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own host conversations" 
  ON public.host_ai_conversations 
  FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

-- Create view for common recommendations analytics
CREATE OR REPLACE VIEW public.common_recommendations_analytics AS
SELECT 
  split_part(unnest(string_to_array(last_recommendations, '.')), '(', 1) as recommendation_name,
  COUNT(*) as frequency,
  array_agg(DISTINCT property_id) as properties_mentioned,
  MAX(updated_at) as last_mentioned
FROM public.sms_conversations 
WHERE last_recommendations IS NOT NULL 
  AND last_recommendations != ''
GROUP BY split_part(unnest(string_to_array(last_recommendations, '.')), '(', 1)
HAVING COUNT(*) > 1
ORDER BY frequency DESC;

-- Create view for common questions analytics
CREATE OR REPLACE VIEW public.common_questions_analytics AS
SELECT 
  CASE 
    WHEN content ILIKE '%wifi%' OR content ILIKE '%wi-fi%' OR content ILIKE '%internet%' THEN 'WiFi/Internet'
    WHEN content ILIKE '%parking%' OR content ILIKE '%park%' THEN 'Parking'
    WHEN content ILIKE '%check%in%' OR content ILIKE '%checkin%' THEN 'Check-in'
    WHEN content ILIKE '%check%out%' OR content ILIKE '%checkout%' THEN 'Check-out'
    WHEN content ILIKE '%restaurant%' OR content ILIKE '%food%' OR content ILIKE '%eat%' THEN 'Restaurants/Food'
    WHEN content ILIKE '%beach%' OR content ILIKE '%ocean%' THEN 'Beach/Ocean'
    WHEN content ILIKE '%directions%' OR content ILIKE '%location%' THEN 'Directions/Location'
    WHEN content ILIKE '%activities%' OR content ILIKE '%things to do%' THEN 'Activities'
    ELSE 'Other'
  END as question_category,
  COUNT(*) as frequency,
  array_agg(DISTINCT sc.property_id) as properties_asked,
  MAX(scm.created_at) as last_asked
FROM public.sms_conversation_messages scm
JOIN public.sms_conversations sc ON scm.sms_conversation_id = sc.id
WHERE scm.role = 'user' 
  AND LENGTH(scm.content) > 3
GROUP BY question_category
ORDER BY frequency DESC;
