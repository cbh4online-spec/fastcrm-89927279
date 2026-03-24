

## Fase B — Segmentos, Comparação e Dashboard Evoluído

### 1. Migration — Novas tabelas

```sql
-- account_brief_segments
CREATE TABLE account_brief_segments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id),
  name TEXT NOT NULL,
  segment_type TEXT DEFAULT 'dynamic', -- dynamic | static
  filter_json JSONB DEFAULT '{}',
  is_dynamic BOOLEAN DEFAULT true,
  member_count INT DEFAULT 0,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- account_brief_segment_members
CREATE TABLE account_brief_segment_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id),
  segment_id UUID NOT NULL REFERENCES account_brief_segments(id) ON DELETE CASCADE,
  account_id UUID NOT NULL REFERENCES account_brief_accounts(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(segment_id, account_id)
);

-- account_brief_comparison_runs
CREATE TABLE account_brief_comparison_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id),
  account_ids JSONB NOT NULL, -- array of account UUIDs
  summary_json JSONB,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now()
);
```

RLS por `workspace_id` em todas (padrão existente). Índices em `workspace_id`.

### 2. Edge Function — `account-brief-compare-accounts`

Recebe `account_ids` (2-5), busca briefs/scores de cada, envia a **Gemini 2.5 Pro** com tool calling para gerar summary comparativo estruturado:
- Ranking geral
- "Melhor aposta", "Mais madura", "Maior urgência", "Maior personalização"
- Comparação por sub-score, setor, sinais
- Persiste em `account_brief_comparison_runs`

### 3. Hook — `useAccountBriefSegments`

- CRUD de segmentos
- `computeMembers` mutation: para segmentos dinâmicos, avalia `filter_json` contra `account_brief_accounts` usando filtros client-side (score, setor, geografia, status, watchlist, favorito)
- Para segmentos estáticos: add/remove manual de membros
- Actualiza `member_count`

### 4. Hook — `useAccountBriefCompare`

- `compareAccounts` mutation → invoca edge function
- Query de runs de comparação anteriores
- Estado de loading

### 5. Página — `AccountBriefSegmentsPage`

- Lista de segmentos com nome, tipo (dinâmico/estático), nº membros, data
- Criar segmento: modal com nome + builder de filtros (reutiliza `AdvancedFilterBuilder` existente com campos adaptados: score, setor, geografia, status, favorito, watchlist)
- Preview dos membros ao guardar
- Acções: editar, eliminar, ver membros
- Empty state premium

### 6. Página — `AccountBriefComparePage`

- Selector de contas (search/select, 2-5 contas)
- Botão "Comparar" → invoca edge function
- Resultado: tabela lado-a-lado com score, sub-scores, setor, geografia, sinais, outreach
- Highlights com badges ("Melhor Aposta", "Mais Madura", etc.)
- Histórico de comparações anteriores
- Empty state

### 7. Dashboard Evoluído

Adicionar ao `AccountBriefDashboardPage`:
- Card "Segmentos" com count e link
- Card "Contas com maior aumento de score" (comparar score actual vs anterior via `account_brief_diff_events`)
- Card "Contas sem análise" (last_analysis_at IS NULL)
- Card "Reanálises agendadas hoje" (watchlist com next_run_at hoje)
- Secção "Recentes" com últimas 5 contas analisadas

### 8. Rotas e Navegação

**App.tsx**: Adicionar:
- `/dashboard/account-brief/segments` → `AccountBriefSegmentsPage`
- `/dashboard/account-brief/compare` → `AccountBriefComparePage`

**nav.v1.ts / nav.v2.ts**: Adicionar "Segmentos" (icon: `Layers`) e "Comparar" (icon: `GitCompare`) ao grupo Account Brief.

### Ficheiros

| Ação | Ficheiro |
|------|----------|
| Criar | `src/hooks/useAccountBriefSegments.ts` |
| Criar | `src/hooks/useAccountBriefCompare.ts` |
| Criar | `src/pages/AccountBriefSegmentsPage.tsx` |
| Criar | `src/pages/AccountBriefComparePage.tsx` |
| Criar | `supabase/functions/account-brief-compare-accounts/index.ts` |
| Criar | Migration (3 tabelas + RLS) |
| Editar | `src/pages/AccountBriefDashboardPage.tsx` (novos widgets) |
| Editar | `src/App.tsx` (2 rotas) |
| Editar | `src/config/nav.v1.ts` (2 items) |
| Editar | `src/config/nav.v2.ts` (2 items) |

