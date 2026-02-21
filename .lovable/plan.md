
# Fix: Analiticas Bio OS nao aparecem para Super Admins

## Problema

As analiticas mostram tudo a zero porque as politicas de seguranca (RLS) das tabelas `bio_events` e `bio_analytics_daily` so permitem leitura a membros do workspace (via `workspace_members`). O utilizador actual e um **super_admin** que acede ao workspace "Be a leader" mas nao esta registado como membro desse workspace na tabela `workspace_members`.

Os dados existem na base de dados (23 page_views, dados agregados para varios dias), mas as politicas de acesso filtram tudo.

## Solucao

Actualizar as politicas RLS de SELECT nas duas tabelas para tambem permitir acesso a super admins, usando a funcao `is_super_admin()` que ja existe no sistema.

## Alteracoes

Uma unica migracao SQL que:

1. **Remove** a politica SELECT actual de `bio_events` ("Workspace members can read bio_events")
2. **Cria** nova politica SELECT em `bio_events` que permite acesso a membros do workspace OU super admins
3. **Remove** a politica SELECT actual de `bio_analytics_daily` ("Workspace members can read bio_analytics_daily")
4. **Cria** nova politica SELECT em `bio_analytics_daily` que permite acesso a membros do workspace OU super admins

### Detalhe Tecnico

```sql
-- bio_events: actualizar politica de leitura
DROP POLICY IF EXISTS "Workspace members can read bio_events" ON public.bio_events;
CREATE POLICY "Workspace members or super admins can read bio_events"
ON public.bio_events FOR SELECT
USING (
  is_super_admin(auth.uid())
  OR workspace_id IN (
    SELECT workspace_id FROM workspace_members
    WHERE user_id = auth.uid()
  )
);

-- bio_analytics_daily: actualizar politica de leitura
DROP POLICY IF EXISTS "Workspace members can read bio_analytics_daily" ON public.bio_analytics_daily;
CREATE POLICY "Workspace members or super admins can read bio_analytics_daily"
ON public.bio_analytics_daily FOR SELECT
USING (
  is_super_admin(auth.uid())
  OR bio_page_id IN (
    SELECT id FROM bio_pages
    WHERE workspace_id IN (
      SELECT workspace_id FROM workspace_members
      WHERE user_id = auth.uid()
    )
  )
);
```

### Resultado

As analiticas passam a mostrar os dados correctos (Views, Unicos, Clicks, Leads, graficos e tabelas) para super admins que acedem a qualquer workspace, alem dos membros normais do workspace.
