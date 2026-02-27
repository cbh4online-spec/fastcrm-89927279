

# Base Layer (Context OS) — Memória Permanente do Negócio

## Contexto

O sistema actual tem `workspace_settings` apenas com `ip_restrictions_enabled`. Não existe nenhuma infra para armazenar contexto de negócio (ICP, ofertas, pricing, funil, scripts, metas, SLA, processo comercial). O onboarding actual cria workspace + onboarding conversacional mas não persiste contexto estratégico estruturado.

## Arquitectura

### 1. Nova tabela `business_context`

```sql
CREATE TABLE public.business_context (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  -- Business Identity
  business_model TEXT,           -- 'saas', 'agency', 'infoproduct', 'consulting', 'services', 'ecommerce'
  business_description TEXT,
  -- ICP
  icp_description TEXT,
  icp_industries TEXT[],
  icp_company_size TEXT,
  icp_decision_maker TEXT,
  icp_pain_points TEXT[],
  -- Offers & Pricing
  offers JSONB DEFAULT '[]',     -- [{name, price, type, description}]
  pricing_model TEXT,            -- 'recurring', 'one_time', 'hybrid', 'usage_based'
  average_ticket NUMERIC,
  -- Sales Process
  sales_process_steps TEXT[],
  sales_cycle_days INTEGER,
  objections_common TEXT[],
  scripts JSONB DEFAULT '[]',   -- [{name, content, stage}]
  follow_up_sla_hours INTEGER DEFAULT 24,
  -- Goals
  monthly_revenue_target NUMERIC,
  quarterly_revenue_target NUMERIC,
  annual_revenue_target NUMERIC,
  deals_target_monthly INTEGER,
  -- Team
  team_size INTEGER,
  team_roles TEXT[],
  -- Active Strategies
  active_strategies TEXT[],
  -- Metadata
  onboarding_completed BOOLEAN DEFAULT false,
  last_updated_by UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(workspace_id)
);

ALTER TABLE public.business_context ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view" ON public.business_context
  FOR SELECT TO authenticated
  USING (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()));

CREATE POLICY "Admins can manage" ON public.business_context
  FOR ALL TO authenticated
  USING (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid() AND role IN ('owner','admin')))
  WITH CHECK (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid() AND role IN ('owner','admin')));

CREATE POLICY "Super admin bypass" ON public.business_context
  FOR ALL TO authenticated
  USING (public.is_super_admin(auth.uid()));
```

### 2. Página `/dashboard/context-os` — Setup Estratégico

Wizard multi-step premium (dark+gold) com 7 secções:

| Step | Título | Campos |
|------|--------|--------|
| 1 | Modelo de Negócio | business_model, business_description |
| 2 | ICP | icp_description, industries, company_size, decision_maker, pain_points |
| 3 | Ofertas & Pricing | offers (dinâmico), pricing_model, average_ticket |
| 4 | Processo Comercial | sales_process_steps, sales_cycle_days, follow_up_sla_hours |
| 5 | Objeções & Scripts | objections_common, scripts (dinâmico) |
| 6 | Metas de Receita | monthly/quarterly/annual targets, deals_target_monthly |
| 7 | Equipa | team_size, team_roles, active_strategies |

Cada step com progress bar dourada, auto-save, e botão "AI Assist" para preencher com sugestões.

### 3. Hook `useBusinessContext`

CRUD para `business_context` com cache react-query. Inclui `isConfigured` boolean para saber se o onboarding foi completado.

### 4. Sidebar — Nova entrada "Context OS"

Adicionar item na sidebar V1 (grupo "Estratégia") com ícone `Brain` e cor `text-cyan-500`, rota `/dashboard/context-os`.

### 5. Dashboard — Indicador de setup

Se `!isConfigured`, mostrar um card premium no topo do dashboard: "Configure o seu Revenue OS — O sistema precisa de conhecer o seu negócio para operar com inteligência."

## Ficheiros

| Ficheiro | Acção |
|----------|-------|
| Migration SQL | Criar tabela `business_context` + RLS |
| `src/hooks/useBusinessContext.ts` | Hook CRUD + react-query |
| `src/pages/ContextOSPage.tsx` | Página com wizard multi-step |
| `src/components/context-os/` | ~8 componentes (steps + wizard shell) |
| `src/config/nav.v1.ts` | Adicionar item Context OS |
| `src/App.tsx` | Adicionar rota |
| `src/pages/Dashboard.tsx` | Card de setup incompleto |

