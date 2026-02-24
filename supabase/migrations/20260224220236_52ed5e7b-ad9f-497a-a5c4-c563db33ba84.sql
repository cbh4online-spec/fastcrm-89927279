
-- Table
CREATE TABLE public.deal_intelligence_cache (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL,
  deal_id uuid NOT NULL,
  payload jsonb NOT NULL,
  computed_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '30 minutes'),
  invalidated_at timestamptz DEFAULT NULL,
  UNIQUE (workspace_id, deal_id)
);

CREATE INDEX idx_dic_workspace_deal ON public.deal_intelligence_cache (workspace_id, deal_id)
  WHERE invalidated_at IS NULL;

ALTER TABLE public.deal_intelligence_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access" ON public.deal_intelligence_cache
  FOR ALL USING (true) WITH CHECK (true);

-- Invalidation function
CREATE OR REPLACE FUNCTION public.invalidate_deal_intelligence_cache()
RETURNS trigger AS $$
DECLARE
  target_deal_id uuid;
  target_workspace_id uuid;
BEGIN
  IF TG_TABLE_NAME = 'crm_activities' THEN
    IF COALESCE(NEW.entity_type, OLD.entity_type) != 'opportunity' THEN
      RETURN COALESCE(NEW, OLD);
    END IF;
    target_deal_id := COALESCE(NEW.entity_id, OLD.entity_id);
    target_workspace_id := COALESCE(NEW.workspace_id, OLD.workspace_id);
  ELSIF TG_TABLE_NAME = 'tasks' THEN
    IF COALESCE(NEW.related_type, OLD.related_type) != 'opportunity' THEN
      RETURN COALESCE(NEW, OLD);
    END IF;
    target_deal_id := COALESCE(NEW.related_id, OLD.related_id);
    target_workspace_id := COALESCE(NEW.workspace_id, OLD.workspace_id);
  ELSIF TG_TABLE_NAME = 'opportunities' THEN
    target_deal_id := COALESCE(NEW.id, OLD.id);
    target_workspace_id := COALESCE(NEW.workspace_id, OLD.workspace_id);
  END IF;

  IF target_deal_id IS NOT NULL THEN
    UPDATE public.deal_intelligence_cache
    SET invalidated_at = now()
    WHERE deal_id = target_deal_id
      AND workspace_id = target_workspace_id
      AND invalidated_at IS NULL;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Triggers
CREATE TRIGGER trg_invalidate_dic_activities
  AFTER INSERT OR UPDATE ON public.crm_activities
  FOR EACH ROW EXECUTE FUNCTION public.invalidate_deal_intelligence_cache();

CREATE TRIGGER trg_invalidate_dic_tasks
  AFTER INSERT OR UPDATE OR DELETE ON public.tasks
  FOR EACH ROW EXECUTE FUNCTION public.invalidate_deal_intelligence_cache();

CREATE TRIGGER trg_invalidate_dic_opportunities
  AFTER UPDATE ON public.opportunities
  FOR EACH ROW EXECUTE FUNCTION public.invalidate_deal_intelligence_cache();
