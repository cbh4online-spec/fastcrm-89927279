
-- 1) Adicionar pipeline_id direto em opportunities (denormalizado para performance e filtros)
ALTER TABLE public.opportunities
  ADD COLUMN IF NOT EXISTS pipeline_id uuid REFERENCES public.pipelines(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_opportunities_pipeline_id ON public.opportunities(pipeline_id);

-- 2) Criar pipeline "Padrão" para cada workspace que ainda não tenha nenhum pipeline
INSERT INTO public.pipelines (workspace_id, name, type, description, is_default, code)
SELECT w.id, 'Padrão', 'sales', 'Pipeline de vendas padrão', true, 'default'
FROM public.workspaces w
WHERE NOT EXISTS (SELECT 1 FROM public.pipelines p WHERE p.workspace_id = w.id);

-- 3) Garantir que cada workspace com pipelines tem pelo menos um marcado como default
UPDATE public.pipelines p
SET is_default = true
WHERE p.id = (
  SELECT p2.id FROM public.pipelines p2
  WHERE p2.workspace_id = p.workspace_id
  ORDER BY p2.created_at ASC LIMIT 1
)
AND NOT EXISTS (
  SELECT 1 FROM public.pipelines p3
  WHERE p3.workspace_id = p.workspace_id AND p3.is_default = true
);

-- 4) Associar todos os pipeline_stages órfãos ao pipeline default do workspace
UPDATE public.pipeline_stages ps
SET pipeline_id = (
  SELECT p.id FROM public.pipelines p
  WHERE p.workspace_id = ps.workspace_id AND p.is_default = true
  LIMIT 1
)
WHERE ps.pipeline_id IS NULL;

-- 5) Migrar oportunidades: pipeline = pipeline do seu stage
UPDATE public.opportunities o
SET pipeline_id = ps.pipeline_id
FROM public.pipeline_stages ps
WHERE o.stage_id = ps.id AND o.pipeline_id IS NULL;

-- 6) Trigger para garantir que ao criar nova oportunidade, pipeline_id é inferido do stage
CREATE OR REPLACE FUNCTION public.opportunities_sync_pipeline_id()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.pipeline_id IS NULL AND NEW.stage_id IS NOT NULL THEN
    SELECT pipeline_id INTO NEW.pipeline_id FROM public.pipeline_stages WHERE id = NEW.stage_id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_opportunities_sync_pipeline_id ON public.opportunities;
CREATE TRIGGER trg_opportunities_sync_pipeline_id
BEFORE INSERT OR UPDATE OF stage_id ON public.opportunities
FOR EACH ROW EXECUTE FUNCTION public.opportunities_sync_pipeline_id();

-- 7) Garantir apenas um is_default por workspace
CREATE OR REPLACE FUNCTION public.pipelines_enforce_single_default()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.is_default = true THEN
    UPDATE public.pipelines
    SET is_default = false
    WHERE workspace_id = NEW.workspace_id AND id <> NEW.id AND is_default = true;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_pipelines_enforce_single_default ON public.pipelines;
CREATE TRIGGER trg_pipelines_enforce_single_default
AFTER INSERT OR UPDATE OF is_default ON public.pipelines
FOR EACH ROW WHEN (NEW.is_default = true)
EXECUTE FUNCTION public.pipelines_enforce_single_default();
