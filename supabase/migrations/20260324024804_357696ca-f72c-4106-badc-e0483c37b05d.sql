
-- Create property_access table
CREATE TABLE public.property_access (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id uuid NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  access_level text NOT NULL DEFAULT 'manager',
  granted_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(property_id, user_id)
);

-- Enable RLS
ALTER TABLE public.property_access ENABLE ROW LEVEL SECURITY;

-- Security definer function to check property access without RLS recursion
CREATE OR REPLACE FUNCTION public.has_property_access(_user_id uuid, _property_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.property_access
    WHERE user_id = _user_id AND property_id = _property_id
  )
$$;

-- RLS policies for property_access table
CREATE POLICY "Super admins can manage property_access"
  ON public.property_access FOR ALL TO authenticated
  USING (is_super_admin(auth.uid()));

CREATE POLICY "Users can view their own property_access"
  ON public.property_access FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

-- Update properties RLS policies to include shared access
DROP POLICY IF EXISTS "Users and super admins can view properties" ON public.properties;
CREATE POLICY "Users and super admins can view properties"
  ON public.properties FOR SELECT TO authenticated
  USING (
    auth.uid() = user_id
    OR is_super_admin(auth.uid())
    OR has_property_access(auth.uid(), id)
  );

DROP POLICY IF EXISTS "Users and super admins can update properties" ON public.properties;
CREATE POLICY "Users and super admins can update properties"
  ON public.properties FOR UPDATE TO authenticated
  USING (
    auth.uid() = user_id
    OR is_super_admin(auth.uid())
    OR has_property_access(auth.uid(), id)
  );

-- Update sms_conversations RLS to include shared access
DROP POLICY IF EXISTS "Property owners and super admins can view SMS conversations" ON public.sms_conversations;
CREATE POLICY "Property owners and super admins can view SMS conversations"
  ON public.sms_conversations FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM properties p
      WHERE p.code = sms_conversations.property_id
      AND (
        p.user_id = auth.uid()
        OR is_super_admin(auth.uid())
        OR has_property_access(auth.uid(), p.id)
      )
    )
  );

-- Update sms_conversation_messages RLS to include shared access
DROP POLICY IF EXISTS "Property owners and super admins can view SMS messages" ON public.sms_conversation_messages;
CREATE POLICY "Property owners and super admins can view SMS messages"
  ON public.sms_conversation_messages FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM sms_conversations sc
      JOIN properties p ON p.code = sc.property_id
      WHERE sc.id = sms_conversation_messages.sms_conversation_id
      AND (
        p.user_id = auth.uid()
        OR is_super_admin(auth.uid())
        OR has_property_access(auth.uid(), p.id)
      )
    )
  );

-- Update guests RLS to include shared access
DROP POLICY IF EXISTS "Property owners and super admins can view guests" ON public.guests;
CREATE POLICY "Property owners and super admins can view guests"
  ON public.guests FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM properties
      WHERE properties.code = guests.property_id
      AND (
        properties.user_id = auth.uid()
        OR is_super_admin(auth.uid())
        OR has_property_access(auth.uid(), properties.id)
      )
    )
  );
