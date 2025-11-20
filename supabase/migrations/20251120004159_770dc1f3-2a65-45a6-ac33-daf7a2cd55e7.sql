-- Create role enum
CREATE TYPE public.app_role AS ENUM (
  'super_admin',
  'admin',
  'user'
);

-- Create user_roles table
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),
  UNIQUE (user_id, role)
);

-- Enable RLS
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Create indexes
CREATE INDEX idx_user_roles_user_id ON public.user_roles(user_id);
CREATE INDEX idx_user_roles_role ON public.user_roles(role);

-- Create security definer functions
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

CREATE OR REPLACE FUNCTION public.is_super_admin(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.has_role(_user_id, 'super_admin'::app_role)
$$;

-- RLS policies for user_roles table
CREATE POLICY "Super admins can view all roles"
  ON public.user_roles FOR SELECT
  TO authenticated
  USING (public.is_super_admin(auth.uid()));

CREATE POLICY "Users can view their own roles"
  ON public.user_roles FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Super admins can insert roles"
  ON public.user_roles FOR INSERT
  TO authenticated
  WITH CHECK (public.is_super_admin(auth.uid()));

CREATE POLICY "Super admins can update roles"
  ON public.user_roles FOR UPDATE
  TO authenticated
  USING (public.is_super_admin(auth.uid()));

CREATE POLICY "Super admins can delete roles"
  ON public.user_roles FOR DELETE
  TO authenticated
  USING (public.is_super_admin(auth.uid()));

-- Update properties table policies
DROP POLICY IF EXISTS "Users can view their own properties" ON public.properties;
DROP POLICY IF EXISTS "Users can create their own properties" ON public.properties;
DROP POLICY IF EXISTS "Users can update their own properties" ON public.properties;
DROP POLICY IF EXISTS "Users can delete their own properties" ON public.properties;

CREATE POLICY "Users and super admins can view properties"
  ON public.properties FOR SELECT
  TO authenticated
  USING (
    auth.uid() = user_id 
    OR public.is_super_admin(auth.uid())
  );

CREATE POLICY "Users and super admins can create properties"
  ON public.properties FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = user_id 
    OR public.is_super_admin(auth.uid())
  );

CREATE POLICY "Users and super admins can update properties"
  ON public.properties FOR UPDATE
  TO authenticated
  USING (
    auth.uid() = user_id 
    OR public.is_super_admin(auth.uid())
  );

CREATE POLICY "Users and super admins can delete properties"
  ON public.properties FOR DELETE
  TO authenticated
  USING (
    auth.uid() = user_id 
    OR public.is_super_admin(auth.uid())
  );

-- Update profiles policies
CREATE POLICY "Super admins can view all profiles"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (public.is_super_admin(auth.uid()));

CREATE POLICY "Super admins can update any profile"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (public.is_super_admin(auth.uid()));

-- Update guests table policies
DROP POLICY IF EXISTS "Property owners can create guests for their properties" ON public.guests;
DROP POLICY IF EXISTS "Property owners can view their property guests" ON public.guests;
DROP POLICY IF EXISTS "Property owners can update their property guests" ON public.guests;
DROP POLICY IF EXISTS "Property owners can delete their property guests" ON public.guests;

CREATE POLICY "Property owners and super admins can view guests"
  ON public.guests FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM properties
      WHERE properties.code = guests.property_id
      AND properties.user_id = auth.uid()
    )
    OR public.is_super_admin(auth.uid())
  );

CREATE POLICY "Property owners and super admins can create guests"
  ON public.guests FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM properties
      WHERE properties.code = guests.property_id
      AND properties.user_id = auth.uid()
    )
    OR public.is_super_admin(auth.uid())
  );

CREATE POLICY "Property owners and super admins can update guests"
  ON public.guests FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM properties
      WHERE properties.code = guests.property_id
      AND properties.user_id = auth.uid()
    )
    OR public.is_super_admin(auth.uid())
  );

CREATE POLICY "Property owners and super admins can delete guests"
  ON public.guests FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM properties
      WHERE properties.code = guests.property_id
      AND properties.user_id = auth.uid()
    )
    OR public.is_super_admin(auth.uid())
  );

-- Update sms_conversations policies
DROP POLICY IF EXISTS "Property owners can view their property SMS conversations" ON public.sms_conversations;
DROP POLICY IF EXISTS "Property owners can create SMS conversations for their properti" ON public.sms_conversations;
DROP POLICY IF EXISTS "Property owners can update their property SMS conversations" ON public.sms_conversations;
DROP POLICY IF EXISTS "Property owners can delete their property SMS conversations" ON public.sms_conversations;

CREATE POLICY "Property owners and super admins can view SMS conversations"
  ON public.sms_conversations FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM properties
      WHERE properties.code = sms_conversations.property_id
      AND properties.user_id = auth.uid()
    )
    OR public.is_super_admin(auth.uid())
  );

CREATE POLICY "Property owners and super admins can create SMS conversations"
  ON public.sms_conversations FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM properties
      WHERE properties.code = sms_conversations.property_id
      AND properties.user_id = auth.uid()
    )
    OR public.is_super_admin(auth.uid())
  );

CREATE POLICY "Property owners and super admins can update SMS conversations"
  ON public.sms_conversations FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM properties
      WHERE properties.code = sms_conversations.property_id
      AND properties.user_id = auth.uid()
    )
    OR public.is_super_admin(auth.uid())
  );

CREATE POLICY "Property owners and super admins can delete SMS conversations"
  ON public.sms_conversations FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM properties
      WHERE properties.code = sms_conversations.property_id
      AND properties.user_id = auth.uid()
    )
    OR public.is_super_admin(auth.uid())
  );

-- Update sms_conversation_messages policies
DROP POLICY IF EXISTS "Property owners can view their property SMS messages" ON public.sms_conversation_messages;
DROP POLICY IF EXISTS "Property owners can create SMS messages for their properties" ON public.sms_conversation_messages;
DROP POLICY IF EXISTS "Property owners can update their property SMS messages" ON public.sms_conversation_messages;
DROP POLICY IF EXISTS "Property owners can delete their property SMS messages" ON public.sms_conversation_messages;

CREATE POLICY "Property owners and super admins can view SMS messages"
  ON public.sms_conversation_messages FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM sms_conversations sc
      JOIN properties p ON p.code = sc.property_id
      WHERE sc.id = sms_conversation_messages.sms_conversation_id
      AND (p.user_id = auth.uid() OR public.is_super_admin(auth.uid()))
    )
  );

CREATE POLICY "Property owners and super admins can create SMS messages"
  ON public.sms_conversation_messages FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM sms_conversations sc
      JOIN properties p ON p.code = sc.property_id
      WHERE sc.id = sms_conversation_messages.sms_conversation_id
      AND (p.user_id = auth.uid() OR public.is_super_admin(auth.uid()))
    )
  );

CREATE POLICY "Property owners and super admins can update SMS messages"
  ON public.sms_conversation_messages FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM sms_conversations sc
      JOIN properties p ON p.code = sc.property_id
      WHERE sc.id = sms_conversation_messages.sms_conversation_id
      AND (p.user_id = auth.uid() OR public.is_super_admin(auth.uid()))
    )
  );

CREATE POLICY "Property owners and super admins can delete SMS messages"
  ON public.sms_conversation_messages FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM sms_conversations sc
      JOIN properties p ON p.code = sc.property_id
      WHERE sc.id = sms_conversation_messages.sms_conversation_id
      AND (p.user_id = auth.uid() OR public.is_super_admin(auth.uid()))
    )
  );

-- Insert super admin role for michael.schmidt33@gmail.com
INSERT INTO public.user_roles (user_id, role, created_by)
SELECT 
  id,
  'super_admin'::app_role,
  id
FROM auth.users
WHERE email = 'michael.schmidt33@gmail.com'
ON CONFLICT (user_id, role) DO NOTHING;