

# Backoffice de Gestão de Preços, Planos e Módulos com IA

## Contexto actual

O sistema já tem:
- **PlansSection** no Super Admin — edita limites e features de planos (free/basic/pro/agency) via tabela `plan_features`, mas **sem preços** e sem IA
- **SaasPricingTab** — tabelas de preço SaaS genéricas (`saas_pricing_tables`)
- **LandingPricingSection** — preços hardcoded no componente (€0, €49, €149) e bundles do `extensionPacks.ts`
- **marketplace_modules** + **module_pricing** — tabelas de módulos e preços no DB, mas sem UI de admin para editar preços
- **EXTENSION_PACKS** / **ONBOARDING_BUNDLES** — dados hardcoded em `extensionPacks.ts`

## Problema

Os preços e características estão dispersos entre código hardcoded e tabelas DB, sem um painel central para os gerir. O admin não consegue actualizar preços da landing page, planos ou módulos sem editar código.

## Plano de implementação

### 1. Migração DB: Tabela `platform_pricing_config`

Criar tabela centralizada para armazenar preços e características dos planos e módulos, eliminando a dependência do hardcoded:

```sql
CREATE TABLE public.platform_pricing_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  config_type text NOT NULL, -- 'plan' | 'module' | 'bundle'
  config_key text NOT NULL UNIQUE, -- 'starter' | 'growth' | 'scale' | 'b2b-revenue' etc.
  name text NOT NULL,
  description text,
  price_monthly numeric DEFAULT 0,
  price_yearly numeric DEFAULT 0,
  currency text DEFAULT 'EUR',
  features jsonb DEFAULT '[]', -- array de feature strings
  highlights jsonb DEFAULT '[]',
  metadata jsonb DEFAULT '{}', -- icon, color, badge, etc.
  display_order int DEFAULT 0,
  is_active boolean DEFAULT true,
  is_highlighted boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
```

Inserir dados iniciais para os 3 planos (starter/growth/scale) e os módulos/bundles existentes.

### 2. Nova secção Super Admin: "Pricing & Modules"

Adicionar entrada **"Pricing & Módulos"** na sidebar do Super Admin (secção "Produto") com 3 tabs:

**Tab 1 — Planos FastCRM**
- Cards editáveis para cada plano (Starter, Growth, Scale)
- Editar: nome, preço mensal/anual, features (lista dinâmica add/remove), cor, badge, highlighted
- Botão "IA: Sugerir preços" — chama edge function que analisa mercado e sugere ajustes
- Botão "IA: Gerar features" — gera descrições de features baseadas no plano

**Tab 2 — Módulos Marketplace**
- Lista de módulos do `marketplace_modules` + `module_pricing`
- Editar preço mensal/anual, trial days, pricing model de cada módulo
- Botão "IA: Optimizar preços" — sugere preços baseados em categoria e concorrência

**Tab 3 — Bundles & Promoções**
- Gerir bundles (nome, módulos incluídos, preço bundle, % desconto)
- Criar condições promocionais (cupões, períodos, segmentos)
- Botão "IA: Criar promoção" — gera promoção baseada em objectivos

### 3. Edge function `pricing-ai-assistant`

Nova edge function que usa Lovable AI (Gemini 3 Flash) para:
- Sugerir preços competitivos baseados no tipo de produto/módulo
- Gerar listas de features para planos
- Criar descrições de bundles e promoções
- Analisar pricing actual e recomendar ajustes

### 4. Actualizar Landing Page para ler do DB

Modificar `LandingPricingSection.tsx` para carregar preços e features da tabela `platform_pricing_config` em vez dos valores hardcoded, com fallback para os valores actuais.

### 5. Actualizar Marketplace para ler preços do DB

Garantir que os preços de módulos exibidos no marketplace vêm de `module_pricing` e são editáveis via backoffice.

## Ficheiros a criar/modificar

1. **Migração SQL** — criar `platform_pricing_config` + seed data
2. **`src/hooks/usePlatformPricing.ts`** — CRUD hooks para a nova tabela
3. **`src/components/super-admin/PricingManagementSection.tsx`** — painel principal com 3 tabs
4. **`supabase/functions/pricing-ai-assistant/index.ts`** — edge function IA
5. **`src/components/super-admin/SuperAdminSidebar.tsx`** — adicionar entrada "Pricing & Módulos"
6. **`src/pages/SuperAdmin.tsx`** — registar nova secção
7. **`src/components/landing-fastcrm/LandingPricingSection.tsx`** — ler do DB com fallback

