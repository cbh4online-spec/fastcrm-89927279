-- Índice único primeiro (necessário para o ON CONFLICT da função)
CREATE UNIQUE INDEX IF NOT EXISTS workspace_activation_snapshots_unique_day
  ON public.workspace_activation_snapshots (workspace_id, snapshot_date);

-- Função que faz snapshot diário do score de ativação de todos os workspaces
CREATE OR REPLACE FUNCTION public.snapshot_all_workspace_activations()
RETURNS TABLE (workspaces_processed integer, snapshots_created integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_workspace RECORD;
  v_score RECORD;
  v_today date := CURRENT_DATE;
  v_processed integer := 0;
  v_created integer := 0;
BEGIN
  FOR v_workspace IN SELECT id FROM public.workspaces LOOP
    v_processed := v_processed + 1;

    SELECT * INTO v_score
    FROM public.compute_workspace_activation_score(v_workspace.id);

    IF v_score IS NULL THEN
      CONTINUE;
    END IF;

    INSERT INTO public.workspace_activation_snapshots (
      workspace_id, snapshot_date, score, goals_completed, goals_total, category_breakdown
    ) VALUES (
      v_workspace.id,
      v_today,
      COALESCE(v_score.score, 0),
      COALESCE(v_score.goals_completed, 0),
      COALESCE(v_score.goals_total, 0),
      COALESCE(v_score.category_breakdown, '{}'::jsonb)
    )
    ON CONFLICT (workspace_id, snapshot_date)
    DO UPDATE SET
      score = EXCLUDED.score,
      goals_completed = EXCLUDED.goals_completed,
      goals_total = EXCLUDED.goals_total,
      category_breakdown = EXCLUDED.category_breakdown;

    v_created := v_created + 1;
  END LOOP;

  RETURN QUERY SELECT v_processed, v_created;
END;
$$;