-- Fix remaining function search path issues
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data->>'full_name');
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.send_task_notification()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  INSERT INTO public.notifications (user_id, message, type)
  VALUES (NEW.user_id, 'New task created: ' || NEW.title, 'info');
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.handle_file_deletion()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  INSERT INTO public.notifications (user_id, message, type)
  VALUES (OLD.user_id, 'File deleted: ' || OLD.original_name, 'info');
  RETURN OLD;
END;
$function$;