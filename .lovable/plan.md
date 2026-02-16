
# FastCRM Funnel OS Multi-Vertical

## Resumo

Transformar o modulo actual de Funis num sistema operacional completo multi-vertical, adicionando a camada hierarquica de **Verticais** (agrupadores de funis), variantes A/B por step, produtos associados a funis, e um painel de AI Insights -- tudo dentro da arquitectura existente.

## Arquitectura Actual vs. Proposta

Actualmente o sistema tem:
- **Funis multi-step** (tabelas `funnels`, `funnel_steps`, `funnel_step_stats`, `funnel_tracking_events`, `funnel_sales`)
- **Templates AIDA verticais** (tabelas `vertical_templates`, `vertical_template_settings`, `vertical_tracking_events`, `vertical_template_sales`, `vertical_landing_events`)

A proposta unifica tudo sob uma hierarquia clara:

```text
Workspace
  -> Verticais (NOVO - agrupador)
       -> Funis (ja existem, passam a ter vertical_id)
            -> Steps (ja existem)
                 -> Variations (NOVO - A/B testing)
       -> Templates AIDA (ja existem, passam a ter vertical_id)
```

---

## Fase 1: Base de Dados (Migracao SQL)

### 1.1 Nova tabela `verticals`

| Coluna | Tipo | Nota |
|--------|------|------|
| id | uuid PK | |
| workspace_id | uuid FK | |
| name | text | |
| slug | text | |
| description | text | nullable |
| color_theme | text | nullable |
| status | text | default 'active' |
| created_at | timestamptz | |

RLS: workspace members only.

### 1.2 Adicionar `vertical_id` as tabelas existentes

- `funnels`: ADD COLUMN `vertical_id uuid REFERENCES verticals(id) ON DELETE SET NULL` (nullable para retrocompatibilidade)
- `vertical_templates`: ADD COLUMN `vertical_id uuid REFERENCES verticals(id) ON DELETE SET NULL` (nullable)
- `funnels`: ADD COLUMN `type text DEFAULT 'leadgen'` (leadgen / upsell / remarketing / event / checkout)

### 1.3 Nova tabela `funnel_variations`

| Coluna | Tipo | Nota |
|--------|------|------|
| id | uuid PK | |
| step_id | uuid FK -> funnel_steps | |
| workspace_id | uuid | |
| name | text | |
| traffic_percentage | integer | default 50 |
| is_control | boolean | default false |
| content | jsonb | |
| conversion_rate | numeric | nullable |
| created_at | timestamptz | |

RLS: workspace members only.

### 1.4 Nova tabela `funnel_products`

| Coluna | Tipo | Nota |
|--------|------|------|
| id | uuid PK | |
| funnel_id | uuid FK -> funnels | |
| product_id | uuid FK -> products | |
| workspace_id | uuid | |
| position | text | 'main' / 'upsell' / 'bump' |
| order_index | integer | default 0 |
| created_at | timestamptz | |

RLS: workspace members only.

---

## Fase 2: Hooks de Dados

### 2.1 `src/hooks/useVerticals.ts` (NOVO)

- `useVerticals()` -- lista verticais do workspace
- `useCreateVertical()` -- cria vertical
- `useUpdateVertical()` -- actualiza
- `useDeleteVertical()` -- elimina

### 2.2 `src/hooks/useFunnelVariations.ts` (NOVO)

- `useFunnelVariations(stepId)` -- lista variantes de um step
- `useCreateVariation()` -- cria variante
- `useUpdateVariation()` -- actualiza (% trafego, conteudo)
- `useDeleteVariation()` -- elimina

### 2.3 `src/hooks/useFunnelProducts.ts` (NOVO)

- `useFunnelProducts(funnelId)` -- lista produtos de um funil
- `useAddFunnelProduct()` -- associa produto
- `useRemoveFunnelProduct()` -- remove

### 2.4 Actualizar `src/hooks/useFunnels.ts`

- `useCreateFunnel()`: aceitar `vertical_id` e `type` opcionais
- `useFunnels()`: aceitar filtro por `vertical_id`

---

## Fase 3: Interface (Componentes)

### 3.1 Pagina principal reorganizada (`FunnelsList.tsx`)

A lista passa a ter 3 seccoes:
1. **Verticais** -- cards com nome, cor, contagem de funis, botao "Abrir"
2. **Templates AIDA** -- manter como esta (ja funciona)
3. **Funis sem vertical** -- funis nao atribuidos

Botoes:
- "Nova Vertical" (dialog com nome, slug, cor, descricao)
- "Novo Funil" (passa a ter campo opcional de vertical)
- "Novo Template AIDA" (manter)

### 3.2 Vista de Vertical (`VerticalView.tsx`, NOVO)

Quando se clica numa vertical:
- Header com nome + cor
- Lista de funis dessa vertical (cards com tipo, status, metricas globais)
- Botao "Criar Funil nesta Vertical"
- Botao "Voltar"

### 3.3 FunnelBuilder -- Novas tabs

Adicionar ao `FunnelBuilder.tsx` existente:

**Tab Products** (`FunnelProductsTab.tsx`):
- Tabela com produtos associados (nome, preco, posicao: main/upsell/bump)
- Botao "Adicionar Produto" (dialog com select do produto existente + posicao)
- Botao "Remover"

**Tab AI Insights** (`FunnelAIInsightsTab.tsx`):
- Painel com score de performance
- Gargalos identificados
- Sugestoes de headline/oferta/melhoria
- Previsao de receita
- Usa Edge Function com AI (modelo Gemini) para analisar `funnel_step_stats`

### 3.4 Steps -- Variantes A/B

Actualizar `FunnelStepsTab.tsx`:
- Na area de "VARIATION", quando se clica "Criar variacao":
  - Cria registo em `funnel_variations`
  - Mostra slider de % trafego
  - Mostra preview da variante ao lado do controlo
  - Badge com taxa de conversao individual
- Botao "Definir winner" que desactiva a variante perdedora

### 3.5 AI Funnel Strategist (dialog ao criar funil)

Ao clicar "Novo Funil", antes de criar:
- Dialog com 5 perguntas (objetivo, ticket medio, publico, canal, produto/lead)
- Botao "Gerar com IA"
- Edge Function analisa respostas e gera: estrutura de steps, copy base, eventos base
- Popula automaticamente o funil criado

---

## Fase 4: Edge Functions

### 4.1 `funnel-ai-insights` (NOVO)

- Recebe `funnel_id`
- Le `funnel_step_stats` e `funnel_sales`
- Envia para AI (Gemini) com prompt de analise
- Retorna: score, gargalo, sugestoes, previsao

### 4.2 `funnel-ai-strategist` (NOVO)

- Recebe respostas do wizard (objetivo, ticket, publico, canal, tipo)
- AI gera estrutura recomendada
- Retorna: array de steps com nomes/tipos, copy sugerida, eventos recomendados

---

## Fase 5: Integracao CRM (futuro imediato)

Quando um formulario de funil e submetido:
- Criar lead na tabela `contacts`
- Atribuir tag com nome do funil
- Inserir no pipeline adequado
- Disparar automacao (se configurada)

Isto sera implementado como logica no tracker existente + Edge Function.

---

## Sequencia de Implementacao

1. Migracao SQL (tabelas + RLS)
2. Hooks de dados (useVerticals, useFunnelVariations, useFunnelProducts)
3. UI: Verticais na FunnelsList + VerticalView
4. UI: Tab Products no FunnelBuilder
5. UI: Variantes A/B nos Steps
6. Edge Function + UI: AI Insights
7. Edge Function + UI: AI Funnel Strategist
8. Integracao CRM (form submit -> lead)

---

## Ficheiros Afectados

| Ficheiro | Accao |
|----------|-------|
| Migracao SQL | Criar tabelas verticals, funnel_variations, funnel_products; alterar funnels e vertical_templates |
| `src/hooks/useVerticals.ts` | Novo |
| `src/hooks/useFunnelVariations.ts` | Novo |
| `src/hooks/useFunnelProducts.ts` | Novo |
| `src/hooks/useFunnels.ts` | Alterar (vertical_id, type) |
| `src/components/funnels/FunnelsList.tsx` | Alterar (seccao de verticais) |
| `src/components/funnels/VerticalView.tsx` | Novo |
| `src/components/funnels/FunnelBuilder.tsx` | Alterar (novas tabs) |
| `src/components/funnels/tabs/FunnelProductsTab.tsx` | Novo |
| `src/components/funnels/tabs/FunnelAIInsightsTab.tsx` | Novo |
| `src/components/funnels/tabs/FunnelStepsTab.tsx` | Alterar (variantes A/B) |
| `supabase/functions/funnel-ai-insights/index.ts` | Novo |
| `supabase/functions/funnel-ai-strategist/index.ts` | Novo |

Devido a dimensao, a implementacao sera feita em fases iterativas, comecando pela base de dados e verticais.
