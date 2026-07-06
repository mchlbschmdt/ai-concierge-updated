
DROP POLICY IF EXISTS "Authenticated users can manage curated links" ON public.curated_links;
CREATE POLICY "Super admins can manage curated links"
  ON public.curated_links FOR ALL TO authenticated
  USING (public.is_super_admin(auth.uid()))
  WITH CHECK (public.is_super_admin(auth.uid()));

DROP POLICY IF EXISTS "Authenticated users can manage locations" ON public.locations;
CREATE POLICY "Super admins can manage locations"
  ON public.locations FOR ALL TO authenticated
  USING (public.is_super_admin(auth.uid()))
  WITH CHECK (public.is_super_admin(auth.uid()));

DROP POLICY IF EXISTS "Authenticated users can manage property codes" ON public.property_codes;
DROP POLICY IF EXISTS "Authenticated users can view property codes" ON public.property_codes;

CREATE POLICY "Owners and super admins can view property codes"
  ON public.property_codes FOR SELECT TO authenticated
  USING (
    public.is_super_admin(auth.uid())
    OR EXISTS (SELECT 1 FROM public.properties p WHERE p.code = property_codes.property_id AND p.user_id = auth.uid())
  );
CREATE POLICY "Owners and super admins can insert property codes"
  ON public.property_codes FOR INSERT TO authenticated
  WITH CHECK (
    public.is_super_admin(auth.uid())
    OR EXISTS (SELECT 1 FROM public.properties p WHERE p.code = property_codes.property_id AND p.user_id = auth.uid())
  );
CREATE POLICY "Owners and super admins can update property codes"
  ON public.property_codes FOR UPDATE TO authenticated
  USING (
    public.is_super_admin(auth.uid())
    OR EXISTS (SELECT 1 FROM public.properties p WHERE p.code = property_codes.property_id AND p.user_id = auth.uid())
  )
  WITH CHECK (
    public.is_super_admin(auth.uid())
    OR EXISTS (SELECT 1 FROM public.properties p WHERE p.code = property_codes.property_id AND p.user_id = auth.uid())
  );
CREATE POLICY "Owners and super admins can delete property codes"
  ON public.property_codes FOR DELETE TO authenticated
  USING (
    public.is_super_admin(auth.uid())
    OR EXISTS (SELECT 1 FROM public.properties p WHERE p.code = property_codes.property_id AND p.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "Users can view rejection analytics" ON public.recommendation_rejections;
CREATE POLICY "Super admins can view rejection analytics"
  ON public.recommendation_rejections FOR SELECT TO authenticated
  USING (public.is_super_admin(auth.uid()));

DROP POLICY IF EXISTS "Authenticated users can manage travel conversations" ON public.travel_conversations;
CREATE POLICY "Super admins can manage travel conversations"
  ON public.travel_conversations FOR ALL TO authenticated
  USING (public.is_super_admin(auth.uid()))
  WITH CHECK (public.is_super_admin(auth.uid()));

DROP POLICY IF EXISTS "Authenticated users can manage travel messages" ON public.travel_messages;
CREATE POLICY "Super admins can manage travel messages"
  ON public.travel_messages FOR ALL TO authenticated
  USING (public.is_super_admin(auth.uid()))
  WITH CHECK (public.is_super_admin(auth.uid()));

DROP POLICY IF EXISTS "Allow public access to property-files bucket" ON storage.objects;
DROP POLICY IF EXISTS "Allow public deletes from property-files bucket" ON storage.objects;
DROP POLICY IF EXISTS "Allow public updates to property-files bucket" ON storage.objects;
DROP POLICY IF EXISTS "Allow public uploads to property-files bucket" ON storage.objects;
DROP POLICY IF EXISTS "Public can view snappro photos" ON storage.objects;

REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_file_deletion() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.send_task_notification() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.hash_security_answer(text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.admin_update_user_password(uuid, text) FROM PUBLIC, anon;
