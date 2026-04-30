-- Arquivar entries demo da knowledge base que mencionam "FastCRM"
-- Estas entries faziam a persona Pharlis falar do produto FastCRM em vez do negócio do utilizador.
-- Mantemos as linhas (auditoria) mas mudamos status para 'archived' para serem ignoradas pela RAG.
UPDATE public.knowledge_entries
SET status = 'archived',
    updated_at = now()
WHERE workspace_id = 'd9e3d0ae-5893-41e9-97f3-7d7ce6a06f0f'
  AND status = 'validated'
  AND (
    lower(coalesce(content, '')) LIKE '%fastcrm%'
    OR lower(coalesce(title, '')) LIKE '%fastcrm%'
    OR lower(coalesce(question, '')) LIKE '%fastcrm%'
  );