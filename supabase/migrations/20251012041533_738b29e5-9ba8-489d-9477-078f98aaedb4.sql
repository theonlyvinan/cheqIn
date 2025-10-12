-- Add highlights and concerns columns to check_ins table
ALTER TABLE public.check_ins 
ADD COLUMN IF NOT EXISTS highlights jsonb DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS concerns jsonb DEFAULT '[]'::jsonb;