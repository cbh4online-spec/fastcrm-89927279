
CREATE OR REPLACE FUNCTION get_workspace_usage_counts()
RETURNS TABLE(workspace_id uuid, leads_count bigint, contacts_count bigint, companies_count bigint)
LANGUAGE sql SECURITY DEFINER STABLE AS $$
  SELECT 
    w.id AS workspace_id,
    COALESCE(l.cnt, 0) AS leads_count,
    COALESCE(co.cnt, 0) AS contacts_count,
    COALESCE(cm.cnt, 0) AS companies_count
  FROM workspaces w
  LEFT JOIN (SELECT workspace_id, COUNT(*) AS cnt FROM leads GROUP BY workspace_id) l ON l.workspace_id = w.id
  LEFT JOIN (SELECT workspace_id, COUNT(*) AS cnt FROM contacts GROUP BY workspace_id) co ON co.workspace_id = w.id
  LEFT JOIN (SELECT workspace_id, COUNT(*) AS cnt FROM companies GROUP BY workspace_id) cm ON cm.workspace_id = w.id;
$$;
