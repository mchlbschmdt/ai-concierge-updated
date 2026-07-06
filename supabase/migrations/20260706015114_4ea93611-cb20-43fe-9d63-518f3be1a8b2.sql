
CREATE POLICY "Users can update own host conversations"
  ON public.host_ai_conversations FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own host conversations"
  ON public.host_ai_conversations FOR DELETE
  USING (auth.uid() = user_id);

CREATE POLICY "Super admins can manage all host conversations"
  ON public.host_ai_conversations FOR ALL
  USING (public.is_super_admin(auth.uid()))
  WITH CHECK (public.is_super_admin(auth.uid()));
