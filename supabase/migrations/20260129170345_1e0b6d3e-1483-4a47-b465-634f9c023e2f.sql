-- Add mandatory metadata fields for Knowledge Base factual layer separation
-- These fields ensure proper content governance and priority-based retrieval

-- Add metadata fields to knowledge_sources
ALTER TABLE public.knowledge_sources
ADD COLUMN IF NOT EXISTS allowed_topics TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS forbidden_topics TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS source_priority INTEGER DEFAULT 50;

-- Add metadata fields to knowledge_entries  
ALTER TABLE public.knowledge_entries
ADD COLUMN IF NOT EXISTS allowed_topics TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS forbidden_topics TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS source_priority INTEGER DEFAULT 50,
ADD COLUMN IF NOT EXISTS is_factual_only BOOLEAN DEFAULT true;

-- Create enum-like reference for source priorities
COMMENT ON COLUMN public.knowledge_sources.source_priority IS 'Priority order: FAQ=100, RichText=75, Crawl=50, Upload=25. Higher = more authoritative.';
COMMENT ON COLUMN public.knowledge_entries.source_priority IS 'Inherited from source. FAQ=100, RichText=75, Crawl=50, Upload=25.';
COMMENT ON COLUMN public.knowledge_entries.is_factual_only IS 'When true, AI must respond with facts only, no strategic decisions.';
COMMENT ON COLUMN public.knowledge_sources.allowed_topics IS 'Topics this source is authorized to answer about.';
COMMENT ON COLUMN public.knowledge_sources.forbidden_topics IS 'Topics this source must NOT be used for.';

-- Create index for priority-based retrieval
CREATE INDEX IF NOT EXISTS idx_knowledge_entries_priority 
ON public.knowledge_entries(knowledge_base_id, source_priority DESC, status)
WHERE status = 'active';

-- Create index for topic filtering
CREATE INDEX IF NOT EXISTS idx_knowledge_entries_topics
ON public.knowledge_entries USING GIN(allowed_topics);

CREATE INDEX IF NOT EXISTS idx_knowledge_entries_forbidden
ON public.knowledge_entries USING GIN(forbidden_topics);

-- Function to get priority value based on source type
CREATE OR REPLACE FUNCTION public.get_source_priority(source_type TEXT)
RETURNS INTEGER
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  RETURN CASE source_type
    WHEN 'faq' THEN 100
    WHEN 'manual' THEN 100
    WHEN 'rich_text' THEN 75
    WHEN 'url' THEN 50
    WHEN 'crawl' THEN 50
    WHEN 'file' THEN 25
    WHEN 'upload' THEN 25
    ELSE 50
  END;
END;
$$;

-- Trigger to auto-set priority on knowledge_sources insert/update
CREATE OR REPLACE FUNCTION public.set_source_priority()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.source_priority IS NULL OR NEW.source_priority = 50 THEN
    NEW.source_priority := public.get_source_priority(NEW.source_type);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_set_source_priority ON public.knowledge_sources;
CREATE TRIGGER trigger_set_source_priority
  BEFORE INSERT OR UPDATE ON public.knowledge_sources
  FOR EACH ROW
  EXECUTE FUNCTION public.set_source_priority();

-- Update existing sources with correct priorities
UPDATE public.knowledge_sources
SET source_priority = public.get_source_priority(source_type)
WHERE source_priority = 50 OR source_priority IS NULL;