
-- Response quality ratings table
CREATE TABLE public.response_quality_ratings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  property_id UUID REFERENCES public.properties(id),
  user_id UUID NOT NULL,
  test_message TEXT NOT NULL,
  ai_response TEXT NOT NULL,
  rating TEXT NOT NULL CHECK (rating IN ('thumbs_up', 'thumbs_down')),
  feedback TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.response_quality_ratings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert their own ratings"
  ON public.response_quality_ratings FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own ratings"
  ON public.response_quality_ratings FOR SELECT
  USING (auth.uid() = user_id);
