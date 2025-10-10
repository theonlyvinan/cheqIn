-- Add health issues columns to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS physical_health_issues TEXT,
ADD COLUMN IF NOT EXISTS mental_health_issues TEXT;

-- Add comment for clarity
COMMENT ON COLUMN public.profiles.physical_health_issues IS 'Known physical health issues';
COMMENT ON COLUMN public.profiles.mental_health_issues IS 'Known mental health issues';