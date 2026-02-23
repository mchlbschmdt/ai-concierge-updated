
-- Product catalog
CREATE TABLE public.products (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  icon TEXT,
  price_monthly DECIMAL,
  price_annual DECIMAL,
  stripe_price_id_monthly TEXT,
  stripe_price_id_annual TEXT,
  trial_type TEXT,
  trial_limit INTEGER,
  sort_order INTEGER,
  is_active BOOLEAN DEFAULT true
);

ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view products"
  ON public.products FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Super admins can manage products"
  ON public.products FOR ALL
  USING (is_super_admin(auth.uid()));

-- User entitlements
CREATE TABLE public.user_entitlements (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  product_id TEXT NOT NULL REFERENCES public.products(id),
  status TEXT NOT NULL DEFAULT 'trial',
  source TEXT DEFAULT 'trial',
  stripe_subscription_id TEXT,
  trial_started_at TIMESTAMPTZ,
  trial_ends_at TIMESTAMPTZ,
  trial_usage_count INTEGER DEFAULT 0,
  trial_usage_limit INTEGER,
  access_starts_at TIMESTAMPTZ DEFAULT NOW(),
  access_ends_at TIMESTAMPTZ,
  granted_by UUID,
  grant_note TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, product_id)
);

ALTER TABLE public.user_entitlements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own entitlements"
  ON public.user_entitlements FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Super admins can view all entitlements"
  ON public.user_entitlements FOR SELECT
  USING (is_super_admin(auth.uid()));

CREATE POLICY "Super admins can insert entitlements"
  ON public.user_entitlements FOR INSERT
  WITH CHECK (is_super_admin(auth.uid()));

CREATE POLICY "Super admins can update entitlements"
  ON public.user_entitlements FOR UPDATE
  USING (is_super_admin(auth.uid()));

CREATE POLICY "Super admins can delete entitlements"
  ON public.user_entitlements FOR DELETE
  USING (is_super_admin(auth.uid()));

-- System can insert entitlements (for auto-trial on signup)
CREATE POLICY "System can insert entitlements"
  ON public.user_entitlements FOR INSERT
  WITH CHECK (true);

-- Admin actions audit log
CREATE TABLE public.admin_actions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  admin_id UUID NOT NULL,
  action_type TEXT NOT NULL,
  target_user_id UUID,
  product_id TEXT,
  details JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.admin_actions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admins can view admin actions"
  ON public.admin_actions FOR SELECT
  USING (is_super_admin(auth.uid()));

CREATE POLICY "Super admins can insert admin actions"
  ON public.admin_actions FOR INSERT
  WITH CHECK (is_super_admin(auth.uid()));

-- Announcements
CREATE TABLE public.announcements (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT,
  message TEXT,
  type TEXT DEFAULT 'info',
  target TEXT DEFAULT 'all',
  cta_text TEXT,
  cta_url TEXT,
  is_active BOOLEAN DEFAULT true,
  starts_at TIMESTAMPTZ DEFAULT NOW(),
  ends_at TIMESTAMPTZ,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view active announcements"
  ON public.announcements FOR SELECT
  USING (auth.role() = 'authenticated' AND is_active = true);

CREATE POLICY "Super admins can manage announcements"
  ON public.announcements FOR ALL
  USING (is_super_admin(auth.uid()));

-- Seed products
INSERT INTO public.products (id, name, description, icon, price_monthly, price_annual, trial_type, trial_limit, sort_order)
VALUES
  ('ai_concierge', 'AI Concierge', 'SMS-powered AI guest communication bot per property', '🤖', 29.99, 299.00, 'usage', 10, 1),
  ('snappro', 'SnapPro Photos', 'AI photo optimizer for professional listing images', '📸', 9.99, 99.00, 'usage', 10, 2),
  ('analytics', 'Analytics Suite', 'Performance insights, smart reporting, quality analytics', '📊', 19.99, 199.00, 'days', 7, 3),
  ('academy', 'Host Academy', 'Video training library for short-term rental hosts', '🎓', 19.99, 199.00, 'usage', 3, 4),
  ('full_suite', 'Full Suite', 'All products bundled — best value for serious hosts', '🏆', 49.00, 490.00, 'days', 14, 5);

-- Update handle_new_user to also create trial entitlements
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data->>'full_name');

  -- Auto-create trial entitlements for new users
  INSERT INTO public.user_entitlements (user_id, product_id, status, source, trial_started_at, trial_ends_at, trial_usage_count, trial_usage_limit)
  VALUES
    (NEW.id, 'ai_concierge', 'trial', 'trial', NOW(), NULL, 0, 10),
    (NEW.id, 'snappro', 'trial', 'trial', NOW(), NULL, 0, 10),
    (NEW.id, 'analytics', 'trial', 'trial', NOW(), NOW() + INTERVAL '7 days', 0, NULL),
    (NEW.id, 'academy', 'trial', 'trial', NOW(), NULL, 0, 3);

  RETURN NEW;
END;
$$;
