
-- Academy videos catalog
CREATE TABLE public.academy_videos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL DEFAULT 'getting_started',
  thumbnail_url TEXT,
  video_url TEXT NOT NULL,
  video_type TEXT NOT NULL DEFAULT 'youtube',
  duration_seconds INTEGER DEFAULT 0,
  instructor_name TEXT DEFAULT 'HostlyAI Team',
  is_free BOOLEAN DEFAULT false,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.academy_videos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone authenticated can view academy videos"
  ON public.academy_videos FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Super admins can manage academy videos"
  ON public.academy_videos FOR ALL
  USING (is_super_admin(auth.uid()));

-- User progress tracking
CREATE TABLE public.academy_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  video_id UUID NOT NULL REFERENCES public.academy_videos(id) ON DELETE CASCADE,
  watched_seconds INTEGER DEFAULT 0,
  completed BOOLEAN DEFAULT false,
  completed_at TIMESTAMPTZ,
  last_watched_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, video_id)
);

ALTER TABLE public.academy_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own progress"
  ON public.academy_progress FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own progress"
  ON public.academy_progress FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own progress"
  ON public.academy_progress FOR UPDATE
  USING (auth.uid() = user_id);

-- Seed some sample videos
INSERT INTO public.academy_videos (title, description, category, video_url, video_type, duration_seconds, instructor_name, is_free, sort_order) VALUES
  ('Welcome to HostlyAI', 'Get started with the HostlyAI platform and learn the basics.', 'getting_started', 'https://www.youtube.com/embed/dQw4w9WgXcQ', 'youtube', 480, 'Sarah Chen', true, 1),
  ('Setting Up Your First Property', 'Step-by-step guide to adding and configuring your first property.', 'getting_started', 'https://www.youtube.com/embed/dQw4w9WgXcQ', 'youtube', 720, 'Sarah Chen', true, 2),
  ('AI Concierge Basics', 'Learn how the AI concierge handles guest messages automatically.', 'getting_started', 'https://www.youtube.com/embed/dQw4w9WgXcQ', 'youtube', 600, 'Marcus Johnson', true, 3),
  ('Crafting Perfect Guest Messages', 'Templates and strategies for guest communication.', 'guest_communication', 'https://www.youtube.com/embed/dQw4w9WgXcQ', 'youtube', 540, 'Emily Rodriguez', false, 4),
  ('Handling Difficult Guests', 'De-escalation techniques and professional responses.', 'guest_communication', 'https://www.youtube.com/embed/dQw4w9WgXcQ', 'youtube', 900, 'Emily Rodriguez', false, 5),
  ('Automating Check-in Messages', 'Set up automated pre-arrival and check-in communications.', 'guest_communication', 'https://www.youtube.com/embed/dQw4w9WgXcQ', 'youtube', 660, 'Marcus Johnson', false, 6),
  ('Property Photo Essentials', 'Lighting, angles, and staging for stunning listing photos.', 'photography', 'https://www.youtube.com/embed/dQw4w9WgXcQ', 'youtube', 1200, 'Alex Park', false, 7),
  ('Using SnapPro for Photo Enhancement', 'AI-powered photo optimization walkthrough.', 'photography', 'https://www.youtube.com/embed/dQw4w9WgXcQ', 'youtube', 780, 'Alex Park', false, 8),
  ('Dynamic Pricing Strategies', 'Maximize revenue with smart pricing approaches.', 'pricing_strategy', 'https://www.youtube.com/embed/dQw4w9WgXcQ', 'youtube', 1080, 'David Kim', false, 9),
  ('Seasonal Pricing Optimization', 'Adjust rates for holidays, events, and seasons.', 'pricing_strategy', 'https://www.youtube.com/embed/dQw4w9WgXcQ', 'youtube', 840, 'David Kim', false, 10),
  ('STR Tax Basics', 'Essential tax knowledge for short-term rental hosts.', 'legal_taxes', 'https://www.youtube.com/embed/dQw4w9WgXcQ', 'youtube', 1500, 'Lisa Thompson', false, 11),
  ('Insurance & Liability', 'Protecting your property and business.', 'legal_taxes', 'https://www.youtube.com/embed/dQw4w9WgXcQ', 'youtube', 960, 'Lisa Thompson', false, 12),
  ('Scaling to Multiple Properties', 'Systems and strategies for growing your portfolio.', 'advanced_tips', 'https://www.youtube.com/embed/dQw4w9WgXcQ', 'youtube', 1320, 'Sarah Chen', false, 13),
  ('Analytics Deep Dive', 'Using data to optimize your hosting business.', 'advanced_tips', 'https://www.youtube.com/embed/dQw4w9WgXcQ', 'youtube', 1140, 'Marcus Johnson', false, 14);
