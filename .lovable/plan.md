

# Daily Revenue Brief — Resumo Executivo 24h

## Abordagem

Criar uma nova tabela `daily_briefs`, uma edge function dedicada (dados de 24h vs 7 dias do weekly), um hook `useDailyBriefs`, uma página dedicada e um widget compacto no dashboard.

## 1. Database — Nova tabela `daily_briefs`

```sql
CREATE TABLE public.daily_briefs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  summary TEXT,
  hot_leads TEXT,
  stuck_deals TEXT,
  revenue_highlight TEXT,
  action_suggestions TEXT[],
  key_metrics JSONB DEFAULT '{}',
  UNIQUE(workspace_id, (created_at::date))
);

ALTER TABLE public.daily_briefs ENABLE ROW LEVEL SECURITY;
-- RLS: members can view, admins can manage (same pattern as weekly_briefs)
```

`key_metrics` inclui: `leads_today`, `revenue_today`, `new_opportunities`, `tasks_completed`, `tasks_pending`, `deals_stalled`, `messages_today`.

## 2. Edge Function — `daily-revenue-brief`

Pipeline semelhante à `strategic-intelligence-brief` mas com janela de 24h:
- 10 queries paralelas: leads criados hoje, deals ganhos/perdidos hoje, deals estagnados (>5 dias sem atividade), tasks completed/pending, messages hoje, oportunidades abertas com health score baixo
- Prompt AI focado em "diário operacional" (vs "semanal estratégico")
- Tool calling com campos: `summary`, `hot_leads`, `stuck_deals`, `revenue_highlight`, `action_suggestions`
- Insert em `daily_briefs`

## 3. Hook — `src/hooks/useDailyBrief.ts`

- Query para último `daily_brief` do workspace
- Função `generateDailyBrief()` que invoca a edge function
- `isConfigured` / `todaysBrief` / `isGenerating`

## 4. Página — `/dashboard/daily-brief`

Layout premium com:
- Header com data de hoje e botão "Gerar Brief"
- 4 KPI cards (Leads Hoje, Receita Hoje, Deals Travados, Tarefas)
- Secções: Resumo, Leads Quentes, Deals Travados, Sugestões de Ação
- Timeline dos últimos 7 daily briefs

## 5. Dashboard Widget — `DailyBriefWidget.tsx`

Card compacto (substitui ou complementa o `ExecutiveBriefWidget`):
- Resumo de 2 linhas + 3 mini-KPIs (leads, receita, stalled)
- Botão "Gerar" / "Ver completo"

## 6. Navegação

- Adicionar "Daily Brief" na sidebar grupo "Estratégia" com ícone `Newspaper` e rota `/dashboard/daily-brief`
- Rota em `App.tsx`

## Ficheiros

| Ficheiro | Acção |
|----------|-------|
| Migration SQL | Criar tabela `daily_briefs` + RLS |
| `supabase/functions/daily-revenue-brief/index.ts` | Edge function (24h data + AI) |
| `src/hooks/useDailyBrief.ts` | Hook CRUD + react-query |
| `src/pages/DailyBriefPage.tsx` | Página dedicada com KPIs + secções |
| `src/components/dashboard/DailyBriefWidget.tsx` | Widget compacto para dashboard |
| `src/config/nav.v1.ts` | Adicionar item Daily Brief |
| `src/App.tsx` | Adicionar rota |
| `src/pages/Dashboard.tsx` | Adicionar widget |

