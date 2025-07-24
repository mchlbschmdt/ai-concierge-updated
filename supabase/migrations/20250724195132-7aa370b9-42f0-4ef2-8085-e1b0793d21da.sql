-- Add trigger to automatically create profiles for new users
CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Enable INSERT on profiles table for the trigger
CREATE POLICY "System can insert profiles" ON public.profiles
FOR INSERT WITH CHECK (true);