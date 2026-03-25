
-- FAQ Entries table
CREATE TABLE public.faq_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id uuid NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  category text NOT NULL DEFAULT '',
  subcategory text NOT NULL DEFAULT '',
  question text NOT NULL,
  answer text NOT NULL,
  tags text[] DEFAULT '{}',
  priority integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- FAQ Match Logs table
CREATE TABLE public.faq_match_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id uuid REFERENCES public.properties(id) ON DELETE SET NULL,
  guest_message text NOT NULL,
  matched_faq_id uuid REFERENCES public.faq_entries(id) ON DELETE SET NULL,
  confidence_score numeric NOT NULL DEFAULT 0,
  ai_used boolean NOT NULL DEFAULT false,
  response_source text NOT NULL DEFAULT 'faq',
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_faq_entries_property_id ON public.faq_entries(property_id);
CREATE INDEX idx_faq_entries_category ON public.faq_entries(category);
CREATE INDEX idx_faq_entries_active ON public.faq_entries(property_id, is_active);
CREATE INDEX idx_faq_match_logs_property ON public.faq_match_logs(property_id);

-- RLS
ALTER TABLE public.faq_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.faq_match_logs ENABLE ROW LEVEL SECURITY;

-- FAQ Entries: owners and super admins can manage
CREATE POLICY "Property owners can view FAQ entries"
  ON public.faq_entries FOR SELECT TO authenticated
  USING (
    property_id IN (SELECT id FROM public.properties WHERE user_id = auth.uid())
    OR is_super_admin(auth.uid())
    OR has_property_access(auth.uid(), property_id)
  );

CREATE POLICY "Property owners can insert FAQ entries"
  ON public.faq_entries FOR INSERT TO authenticated
  WITH CHECK (
    property_id IN (SELECT id FROM public.properties WHERE user_id = auth.uid())
    OR is_super_admin(auth.uid())
  );

CREATE POLICY "Property owners can update FAQ entries"
  ON public.faq_entries FOR UPDATE TO authenticated
  USING (
    property_id IN (SELECT id FROM public.properties WHERE user_id = auth.uid())
    OR is_super_admin(auth.uid())
  );

CREATE POLICY "Property owners can delete FAQ entries"
  ON public.faq_entries FOR DELETE TO authenticated
  USING (
    property_id IN (SELECT id FROM public.properties WHERE user_id = auth.uid())
    OR is_super_admin(auth.uid())
  );

-- FAQ Match Logs: owners can view, system can insert
CREATE POLICY "Property owners can view FAQ match logs"
  ON public.faq_match_logs FOR SELECT TO authenticated
  USING (
    property_id IN (SELECT id FROM public.properties WHERE user_id = auth.uid())
    OR is_super_admin(auth.uid())
  );

CREATE POLICY "System can insert FAQ match logs"
  ON public.faq_match_logs FOR INSERT
  WITH CHECK (true);
