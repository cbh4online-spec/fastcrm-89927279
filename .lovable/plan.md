

## Fase P1 — Forecast Comercial por Pipeline/Owner/Período + Propostas Integradas no Ciclo de Venda

### Diagnóstico

| Área | Estado Actual | Gap |
|------|---------------|-----|
| **Forecast comercial** | `useSalesPerformance` calcula `dealForecast` apenas por stage (sem filtro por pipeline/owner/período). `useRevenueForecast` é agregado global. `ForecastCenterPage` foca simulação operacional, não forecast comercial | Não existe **vista de forecast comercial filtrável** por pipeline, owner e período — peça fundamental para gestão de vendas |
| **Propostas no deal** | `useProposals(opportunityId)` já suporta filtro por oportunidade. `CreateProposalDialog` já aceita `opportunity_id`. Mas **OpportunityDetailPage não tem tab de propostas** — propostas são geridas apenas em `/proposals` | Falta integração visual: tab "Propostas" no detalhe da oportunidade + CTA "Criar Proposta" contextual |
| **Pipeline/Owner no forecast** | `useSalesPerformance` já faz fetch de `opportunities` com `owner_id` e `pipeline_stages` | Dados existem mas não são segmentáveis — o forecast é calculado em bloco |

---

### Âmbito

**P1 inclui:**
1. **Forecast Comercial Dashboard** — nova página `/dashboard/sales-forecast` com forecast filtrável por pipeline, owner e período
2. **Tab "Propostas" no detalhe da oportunidade** — reutilizando `useProposals(opportunityId)` e componentes existentes
3. **Hook `useSalesForecast`** — forecast segmentado (pipeline × owner × período) com weighted pipeline value

**P1 NÃO inclui:**
- Alterações ao `ForecastCenterPage` (simulação — mantém-se separado)
- Alterações ao `useRevenueForecast` / edge function `compute-revenue-forecast`
- Alterações à base de dados
- Won→Invoice handoff (P2)
- Renewal/expansion logic (P3)

---

### Ficheiros a Criar

| Ficheiro | Conteúdo |
|----------|----------|
| `src/hooks/useSalesForecast.ts` | Hook que reutiliza dados de `opportunities` + `pipeline_stages` + `profiles` para gerar forecast segmentado. Aceita filtros: `pipelineId`, `ownerId`, `period` (month/quarter/year). Retorna: weighted pipeline por stage, forecast por owner, forecast por período, totais |
| `src/pages/SalesForecastPage.tsx` | Página com DashboardLayout. Header + filtros (pipeline selector, owner selector, period selector). Compõe 4 secções: KPI strip, forecast por stage (bar chart horizontal weighted), forecast por owner (tabela com valor ponderado, deals, win rate), forecast temporal (line chart mês a mês) |
| `src/components/sales-forecast/ForecastKPIStrip.tsx` | Strip com: Pipeline Total, Weighted Forecast, Best Case, Deals Ativos, Avg Win Rate |
| `src/components/sales-forecast/ForecastByStageChart.tsx` | Bar chart horizontal (reutiliza padrão do `DealForecastChart`) filtrado por pipeline/owner |
| `src/components/sales-forecast/ForecastByOwnerTable.tsx` | Tabela: Owner, Deals, Pipeline Value, Weighted Value, Win Rate, Avg Cycle |
| `src/components/sales-forecast/ForecastTrendChart.tsx` | Line chart com forecast acumulado por mês (últimos 6 meses) — deals expected_close_date × weighted value |
| `src/components/opportunities/detail/OpportunityProposalsTab.tsx` | Tab que lista propostas da oportunidade via `useProposals(opportunityId)`. Mostra: título, valor, estado, data, CTA "Criar Proposta" que abre `CreateProposalDialog` pré-preenchido |

### Ficheiros a Modificar

| Ficheiro | Alteração |
|----------|-----------|
| `src/components/opportunities/OpportunityDetailPage.tsx` | Adicionar tab "Propostas" com badge de contagem. Importar `OpportunityProposalsTab` e `CreateProposalDialog` |
| `src/routes/` (ficheiro de rotas relevante) | Adicionar rota `/dashboard/sales-forecast` → `SalesForecastPage` |

### Sem alterações a
- Base de dados / migrações
- `useSalesPerformance.ts` (mantém-se para ReportsSales)
- `useRevenueForecast.ts` (mantém-se para Revenue module)
- `ForecastCenterPage.tsx` (simulação — separado)
- `ProposalsList.tsx` (lista global — mantém-se)
- Edge functions

---

### Detalhes Técnicos

**`useSalesForecast` — lógica core:**
- Query `opportunities` com `stage_id, owner_id, value, status, expected_close_date, pipeline_id` + join stages para `probability`
- Filtros: `pipeline_id`, `owner_id`, período (filtra por `expected_close_date` ou `created_at`)
- Weighted value = `value × (stage.probability / 100)` por oportunidade ativa
- Agrupamentos: por stage, por owner, por mês de expected_close_date
- Reutiliza `workspaceClient` do `WorkspaceInstanceContext`

**`OpportunityProposalsTab`:**
- Usa `useProposals(opportunityId)` (já suporta filtro)
- Lista cards compactos: título, badge status, valor, data criação, link para detalhe
- Empty state: "Sem propostas para este negócio" + CTA "Criar Proposta"
- CTA abre `CreateProposalDialog` com `opportunityId` pré-preenchido (já suportado pela prop existente)

**Selectors de filtro na `SalesForecastPage`:**
- Pipeline: `usePipelines()` (já existe em `useOpportunitiesEnhanced`)
- Owner: extraído dos membros via `useWorkspaceMembers()`
- Período: select com "Este mês", "Este trimestre", "Este ano", "Últimos 6 meses"

---

### Riscos

| Risco | Mitigação |
|-------|-----------|
| Performance com muitas oportunidades | `staleTime: 5min`, query limitada ao workspace |
| Tab de propostas no deal detalhe pode sobrecarregar tabs | Usar badge count, só renderizar conteúdo quando tab activa |
| Forecast por owner pode revelar dados sensíveis | Respeitar RLS existente — workspace-scoped |

### Critérios de Aceitação
- `/dashboard/sales-forecast` mostra forecast segmentável por pipeline, owner e período
- KPIs reflectem weighted pipeline, total pipeline, best case, deals, avg win rate
- Chart de forecast por stage mostra valor total vs weighted por stage
- Tabela por owner mostra métricas individuais
- Chart temporal mostra evolução do forecast por mês
- Detalhe de oportunidade tem tab "Propostas" com contagem
- CTA "Criar Proposta" no detalhe da oportunidade abre dialog pré-preenchido
- Nenhuma funcionalidade existente quebrada

