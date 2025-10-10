-- Add MindGlow, BodyPulse, and Balance scores to check_ins table
ALTER TABLE check_ins 
ADD COLUMN IF NOT EXISTS mental_health_score INTEGER CHECK (mental_health_score >= 1 AND mental_health_score <= 5),
ADD COLUMN IF NOT EXISTS physical_health_score INTEGER CHECK (physical_health_score >= 1 AND physical_health_score <= 5),
ADD COLUMN IF NOT EXISTS overall_score NUMERIC,
ADD COLUMN IF NOT EXISTS mental_indicators JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS physical_indicators JSONB DEFAULT '[]'::jsonb;

-- Add comments for documentation
COMMENT ON COLUMN check_ins.mental_health_score IS 'MindGlow: Mental health score (1-5) reflecting mood, emotional tone, positivity, engagement';
COMMENT ON COLUMN check_ins.physical_health_score IS 'BodyPulse: Physical health score (1-5) reflecting energy, comfort, sleep, pain, activity';
COMMENT ON COLUMN check_ins.overall_score IS 'Balance: Overall well-being score calculated from mental and physical scores';
COMMENT ON COLUMN check_ins.mental_indicators IS 'Array of mental health indicators detected in conversation';
COMMENT ON COLUMN check_ins.physical_indicators IS 'Array of physical health indicators detected in conversation';