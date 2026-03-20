

## Corrigir Estatísticas de Visitas nos Funis Verticais

### Problema raiz
Os eventos de tracking são inseridos com `workspace_id: null` porque `VerticalLandingPage.tsx` passa `workspaceId={undefined}` ao tracker. A política RLS de SELECT exige que `workspace_id` pertença ao workspace do utilizador autenticado, logo eventos com `workspace_id: null` nunca são lidos — daí "0 visitantes" mesmo com visitas reais.

### Alterações

#### 1. `src/pages/VerticalLandingPage.tsx`
- Extrair `workspace_id` e `id` do row retornado por `fetchPublishedTemplateBySlug`
- Passar esses valores ao `VerticalLandingTemplate`:
  - `templateId={row.id}`
  - `workspaceId={row.workspace_id}`
- Isto garante que novos eventos são inseridos com `workspace_id` correcto

#### 2. Migração DB — Corrigir eventos existentes com `workspace_id` null
- UPDATE `vertical_landing_events` para preencher `workspace_id` a partir do `template_slug`, cruzando com `vertical_templates`:
```sql
UPDATE public.vertical_landing_events e
SET workspace_id = t.workspace_id
FROM public.vertical_templates t
WHERE e.template_slug = t.slug
  AND e.workspace_id IS NULL
  AND t.workspace_id IS NOT NULL;
```

#### 3. Migração DB — Política RLS alternativa para leitura por slug
- Adicionar política de SELECT que também permita leitura quando o `template_slug` corresponde a um template do workspace do utilizador (para cobrir eventos antigos que possam não ter workspace_id):
```sql
CREATE POLICY "Members read events by template ownership"
  ON public.vertical_landing_events FOR SELECT TO authenticated
  USING (
    template_slug IN (
      SELECT slug FROM public.vertical_templates
      WHERE workspace_id IN (
        SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
      )
    )
  );
```

### Resultado
- Eventos passados são corrigidos via UPDATE
- Novos eventos têm `workspace_id` preenchido
- As stats passam a aparecer correctamente no dashboard

### Ficheiros a alterar
- `src/pages/VerticalLandingPage.tsx`
- Nova migração SQL (update dados + política RLS)

