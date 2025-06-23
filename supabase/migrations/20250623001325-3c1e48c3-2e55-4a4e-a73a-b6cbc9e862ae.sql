
-- Add security questions and answers to the profiles table
ALTER TABLE public.profiles 
ADD COLUMN security_question_1 TEXT,
ADD COLUMN security_answer_1 TEXT,
ADD COLUMN security_question_2 TEXT,
ADD COLUMN security_answer_2 TEXT,
ADD COLUMN security_question_3 TEXT,
ADD COLUMN security_answer_3 TEXT;

-- Create a function to hash security answers (for basic security)
CREATE OR REPLACE FUNCTION public.hash_security_answer(answer TEXT)
RETURNS TEXT
LANGUAGE plpgsql
AS $$
BEGIN
  -- Simple hash using md5 (in production, use a stronger hash)
  RETURN md5(lower(trim(answer)));
END;
$$;
