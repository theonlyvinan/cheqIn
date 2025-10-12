-- Create report_settings table for family member report preferences
CREATE TABLE public.report_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  family_member_id UUID NOT NULL REFERENCES public.family_members(id) ON DELETE CASCADE,
  enabled BOOLEAN NOT NULL DEFAULT true,
  delivery_time TIME NOT NULL DEFAULT '09:00:00',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(family_member_id)
);

-- Enable RLS
ALTER TABLE public.report_settings ENABLE ROW LEVEL SECURITY;

-- Family members can manage their own report settings
CREATE POLICY "Family members can manage own report settings"
ON public.report_settings
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.family_members
    WHERE family_members.id = report_settings.family_member_id
    AND family_members.family_user_id = auth.uid()
  )
);

-- Create trigger for updated_at
CREATE TRIGGER update_report_settings_updated_at
BEFORE UPDATE ON public.report_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();