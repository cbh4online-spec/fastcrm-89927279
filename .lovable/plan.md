

## P0 — Consolidação Estrutural do Módulo de Vendas

### Diagnóstico Actual

| Área | Estado | Problema |
|------|--------|----------|
| **SalesCRMRoutes.tsx** | 140 linhas, 55+ rotas | Ficheiro monolítico que mistura CRM, prospeção, comunicação, marketing, scheduling e eventos no mesmo route group |
| **OpportunitiesModule.tsx** | 547 linhas | Monolítico: KPIs, filtros, kanban, list, dialogs, won→invoice tudo inline |
| **OpportunityDetailPage.tsx** | 422 linhas | Razoável mas mistura tabs dinâmicos, AI, memory e layout config |
| **OpportunityDetailSidebar.tsx** | 415 linhas | Monolítico: comunicação, deal info, associations, intelligence tudo junto |
| **UnifiedCrmView.tsx** | 322 linhas | CRM genérico — não tem "commercial summary" nem visão comercial unificada |
| **Ciclo Lead→Opp→Proposal→Invoice** | Parcial | Won→Invoice prompt existe mas é básico (AlertDialog). Proposal↔Opportunity ligação existe mas sem governance. Sem next step obrigatório, sem lost reason obrigatório, sem aging/SLA |
| **Governance** | Mínima | Sem papéis comerciais explícitos, sem stage progression rules, sem stuck deal detection UI |

### Plano de Execução — 5 Batches

---

**B1 — Separar SalesCRMRoutes por domínio**

Refatorar `src/routes/SalesCRMRoutes.tsx` em sub-route files sem alterar paths:

- `src/routes/sales/SalesCoreRoutes.tsx` — leads, contacts, companies, crm, objects, imports
- `src/routes/sales/PipelineRoutes.tsx` — opportunities
- `src/routes/sales/SalesAssetsRoutes.tsx` — proposals, products, packages, bundles
- `src/routes/sales/ProspectingRoutes.tsx` — prospecting hub, google local, web search, professionals, competitors, lead enricher, fastmatch
- `src/routes/sales/CommunicationRoutes.tsx` — inbox, groups, telegram, templates, sequences, email-campaigns, suppressions
- `src/routes/sales/RevenueOpsRoutes.tsx` — invoices, payments, renewals
- `src/routes/sales/MarketingRoutes.tsx` — automations, funnels, nurture, ebooks, bio, form-studio, marketing, lifecycle
- `src/routes/sales/MiscRoutes.tsx` — scheduling, events, feed, productivity, member, profile

Refatorar `SalesCRMRoutes.tsx` para ~20 linhas: importa e compõe os sub-route groups.

---

**B2 — Refatorar OpportunitiesModule em submódulos**

Criar `src/components/opportunities/module/`:
- `OpportunitiesHeader.tsx` — view selector, import/export, settings, create button
- `OpportunitiesFiltersBar.tsx` — search, status filter, score sort, hot deals, active view pills
- `OpportunitiesKanbanView.tsx` — kanban layout com columns
- `OpportunitiesListView.tsx` — table wrapper
- `OpportunitiesDialogs.tsx` — create, settings, invoice prompt, invoice dialog, create view
- `useOpportunitiesModule.ts` — hook com todo o state e handlers (move, won, lost, delete, select, filter)

Refatorar `OpportunitiesModule.tsx` para ~80 linhas: compõe submódulos.

---

**B3 — Governance comercial: stage rules, stuck deals, next step, lost reason**

Adicionar à tabela `pipeline_stages` (se não existir já na coluna `config` JSONB):
- `sla_days` — SLA máximo por stage
- `requires_next_step` — boolean
- `requires_expected_close` — boolean

Criar `src/components/opportunities/governance/`:
- `StuckDealsAlert.tsx` — lista deals parados acima do SLA por stage, com badge no header do pipeline
- `StageTransitionValidator.ts` — utility que valida: next_step preenchido quando exigido, expected_close_date quando exigido, lost_reason obrigatório ao fechar como lost
- `LostReasonDialog.tsx` — dialog obrigatório com reason ao marcar como lost (substituir o close direto)
- `WonValidationDialog.tsx` — validação mínima ao marcar como won (owner, value > 0, contact/company associado)

Integrar no `useOpportunitiesModule.ts`:
- `handleMarkAsLost` abre `LostReasonDialog` em vez de fechar direto
- `handleMarkAsWon` valida via `WonValidationDialog` antes de fechar + prompt invoice

Adicionar `stuck_since` computed field (days since last stage change) no `OpportunityCard.tsx` e `OpportunityTableView.tsx`.

---

**B4 — Contexto comercial unificado: Commercial Summary**

Criar `src/components/crm/commercial/`:
- `CommercialSummaryCard.tsx` — bloco compacto para contact/company detail pages mostrando:
  - Total pipeline aberto (count + value)
  - Win rate
  - Propostas enviadas / aceites
  - Faturas pendentes / pagas
  - Revenue total
  - Última atividade comercial
- `CommercialNextActions.tsx` — próximos passos pendentes das oportunidades abertas desta conta
- `CommercialRiskSignals.tsx` — deals parados, propostas expiradas, faturas em atraso

Integrar estes componentes nas páginas de detalhe existentes:
- `ContactDetail` / `CompanyDetail` — adicionar `CommercialSummaryCard` no painel lateral ou como secção dedicada
- Usar dados já disponíveis via `EntityOpportunitiesSection`, `EntityProposalsSection`, queries de invoices

---

**B5 — Won→Invoice handoff reforçado + Proposal↔Opportunity governance**

Reforçar `OpportunitiesDialogs.tsx`:
- Won→Invoice: pré-preencher items da proposta aceite (se existir) ao criar invoice
- Adicionar link direto para invoice criada na timeline da oportunidade

Reforçar `ProposalDetailContent.tsx`:
- Mostrar status da oportunidade associada
- Impedir envio de proposta se oportunidade já está won/lost
- Mostrar warning se proposta expira antes de expected_close_date

Criar `src/hooks/useCommercialCycle.ts`:
- Query unificada: dado um contact_id ou company_id, retorna opportunities + proposals + invoices + payments agregados
- Alimenta `CommercialSummaryCard`

---

### Ficheiros a Criar

| Ficheiro | Batch |
|----------|-------|
| `src/routes/sales/SalesCoreRoutes.tsx` | B1 |
| `src/routes/sales/PipelineRoutes.tsx` | B1 |
| `src/routes/sales/SalesAssetsRoutes.tsx` | B1 |
| `src/routes/sales/ProspectingRoutes.tsx` | B1 |
| `src/routes/sales/CommunicationRoutes.tsx` | B1 |
| `src/routes/sales/RevenueOpsRoutes.tsx` | B1 |
| `src/routes/sales/MarketingRoutes.tsx` | B1 |
| `src/routes/sales/MiscRoutes.tsx` | B1 |
| `src/components/opportunities/module/OpportunitiesHeader.tsx` | B2 |
| `src/components/opportunities/module/OpportunitiesFiltersBar.tsx` | B2 |
| `src/components/opportunities/module/OpportunitiesKanbanView.tsx` | B2 |
| `src/components/opportunities/module/OpportunitiesListView.tsx` | B2 |
| `src/components/opportunities/module/OpportunitiesDialogs.tsx` | B2 |
| `src/components/opportunities/module/useOpportunitiesModule.ts` | B2 |
| `src/components/opportunities/governance/StuckDealsAlert.tsx` | B3 |
| `src/components/opportunities/governance/StageTransitionValidator.ts` | B3 |
| `src/components/opportunities/governance/LostReasonDialog.tsx` | B3 |
| `src/components/opportunities/governance/WonValidationDialog.tsx` | B3 |
| `src/components/crm/commercial/CommercialSummaryCard.tsx` | B4 |
| `src/components/crm/commercial/CommercialNextActions.tsx` | B4 |
| `src/components/crm/commercial/CommercialRiskSignals.tsx` | B4 |
| `src/hooks/useCommercialCycle.ts` | B5 |

### Ficheiros a Refatorar

| Ficheiro | De | Para |
|----------|----|------|
| `SalesCRMRoutes.tsx` | 140 | ~20 (compositor) |
| `OpportunitiesModule.tsx` | 547 | ~80 |

### Sem alterações a

- Schema de base de dados (excepto potencial migração para `sla_days` em pipeline_stages config se não existir)
- Edge functions
- Rotas existentes (paths mantidos)
- Componentes de detalhe existentes (`OpportunityDetailPage`, `OpportunityDetailSidebar`)

### Critérios de Aceitação P0

- Rotas organizadas por domínio sem quebrar paths
- `OpportunitiesModule` decomposto em < 100 linhas
- Lost reason obrigatório
- Won validation mínima (owner, value, account)
- Stuck deals visíveis no pipeline
- Contexto comercial unificado em contact/company detail
- Proposal↔Opportunity governance básica
- Won→Invoice handoff mais completo

### Fora de Scope (P1/P2)

- Forecast por pipeline/owner/período (P1)
- Proposal versioning e métricas de aceitação (P1)
- Renewals como extensão do ciclo comercial (P1)
- Deal scoring avançado (P2)
- Sales intelligence / benchmarking (P2)
- Next best action automático (P2)

