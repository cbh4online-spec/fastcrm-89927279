

# Venda Ganha → RFQ → PO — Plano de Implementação

## Resumo

Criar o fluxo completo: proposta aceite gera projeto + necessidades de compra, permite criar RFQs multi-fornecedor, comparar cotações, adjudicar e gerar POs automaticamente. Tudo ligado a produtos existentes e ao módulo de compras.

---

## 1. Migração SQL (7 novas tabelas + extensão a 2 existentes)

### Novas tabelas

**`procurement_projects`** — Projeto/entrega originado de proposta
- `id`, `workspace_id`, `source_type` (proposal), `source_id` (proposal_id), `name`, `status` (active/waiting_procurement/in_progress/delivered/closed), `created_by`, `created_at`

**`procurement_project_items`** — Itens do projeto com snapshot de stock
- `id`, `workspace_id`, `project_id` FK, `product_id` FK, `variant_id` nullable, `qty_sold`, `qty_required`, `qty_in_stock_at_creation`, `qty_to_buy`, `procurement_status` (none/rfq_sent/quoted/ordered/partially_received/received), `created_at`

**`procurement_needs`** — Necessidades de compra calculadas
- `id`, `workspace_id`, `project_id` FK, `project_item_id` FK, `product_id` FK, `variant_id` nullable, `qty_needed`, `qty_available`, `qty_to_buy`, `status` (open/rfq_in_progress/ordered/resolved), `created_at`

**`rfqs`** — Pedidos de cotação
- `id`, `workspace_id`, `project_id` FK nullable, `title`, `status` (draft/sent/receiving_quotes/evaluated/awarded/closed), `due_date`, `created_by`, `created_at`

**`rfq_items`** — Itens do RFQ
- `id`, `workspace_id`, `rfq_id` FK, `product_id` FK, `variant_id` nullable, `qty`, `spec_notes`, `need_id` FK nullable, `preferred_supplier_id` FK nullable

**`rfq_suppliers`** — Fornecedores convidados
- `id`, `workspace_id`, `rfq_id` FK, `supplier_id` FK, `status` (invited/responded/declined), `sent_at` nullable

**`rfq_quotes`** — Respostas por fornecedor e item
- `id`, `workspace_id`, `rfq_id` FK, `rfq_item_id` FK, `supplier_id` FK, `unit_price`, `currency` default EUR, `lead_time_days`, `min_order_qty`, `pack_size`, `notes`, `is_selected` bool default false, `created_at`

### Extensão a tabelas existentes

**`purchase_orders`**: ADD `project_id` uuid nullable, ADD `rfq_id` uuid nullable
**`purchase_order_items`**: ADD `rfq_quote_id` uuid nullable

### RLS + Indexes
- Todas as novas tabelas com `workspace_id` e RLS workspace members
- Indexes em `procurement_project_items(project_id)`, `procurement_needs(project_id, status)`, `rfq_items(rfq_id)`, `rfq_quotes(rfq_id, supplier_id)`

---

## 2. Edge Functions (5)

### `project-from-won-proposal`
- Input: `{ proposal_id, workspace_id }`
- Valida proposal.status = "accepted"
- Busca proposal_items com product_id
- Cria `procurement_projects` + `procurement_project_items` (snapshot stock)
- Calcula `qty_to_buy = max(0, qty_sold - stock_quantity)`
- Cria `procurement_needs` para items com qty_to_buy > 0
- Define project.status = "waiting_procurement" se houver needs

### `rfq-create-from-needs`
- Input: `{ project_id, supplier_ids[], workspace_id }`
- Cria `rfqs` + `rfq_items` (a partir de procurement_needs open)
- Cria `rfq_suppliers` para cada fornecedor
- Status = draft

### `rfq-send`
- Input: `{ rfq_id }`
- Marca `rfq_suppliers.sent_at`, `rfq_suppliers.status = invited`
- Atualiza `rfq.status = sent`
- Atualiza `procurement_needs.status = rfq_in_progress`
- (Email envio futuro — por agora só marca estado)

### `rfq-award-and-create-pos`
- Input: `{ rfq_id, selected_quote_ids[] }`
- Para cada quote selecionada: `is_selected = true`
- Agrupa por supplier_id → cria 1 PO por fornecedor
- PO items com `product_id`, `unit_price`, `qty`, `rfq_quote_id`
- Liga PO a `project_id` e `rfq_id`
- Atualiza `procurement_needs.status = ordered`
- Atualiza `rfq.status = awarded`

### `procurement-sync-on-receive`
- Input: `{ purchase_order_id }`
- Verifica se PO tem `project_id`
- Atualiza `procurement_project_items.procurement_status` conforme received_qty
- Atualiza `procurement_needs.status = resolved` quando fully received
- Atualiza `procurement_projects.status` quando tudo received

---

## 3. UI / Componentes

### Hook: `useRFQ.ts`
- CRUD para rfqs, rfq_items, rfq_suppliers, rfq_quotes
- `createFromNeeds`, `send`, `awardAndCreatePOs`
- Query rfq_quotes com join supplier name

### Hook: `useProcurementProjects.ts`
- CRUD para procurement_projects + project_items + needs
- `createFromProposal` (chama edge function)

### Componentes novos

**`ProposalWonProcurementModal`** — Modal que aparece quando proposta = accepted, pergunta se quer criar projeto + necessidades. Botão "Criar Projeto".

**`ProcurementProjectDetail`** — Página/componente com:
- Lista project_items (qty_sold, stock, qty_to_buy, procurement_status)
- Botão "Criar RFQ" para items com needs open
- Separador RFQs associados

**`RFQBuilderForm`** — Formulário:
- Items auto-preenchidos de procurement_needs
- Multi-select de fornecedores (sugestão automática de supplier_products top 3)
- Due date, notas

**`RFQComparisonTable`** — Tabela comparativa:
- Linhas = items, Colunas = fornecedores
- Células = unit_price, lead_time
- Highlight melhor preço (verde)
- Checkbox "Selecionar" por quote
- Botão "Adjudicar e Gerar PO"

**`RFQQuoteEntryForm`** — Formulário para inserir respostas de fornecedores (unit_price, lead_time, MOQ, notes)

### Páginas

**`/dashboard/procurement/projects`** — Lista de procurement projects
**`/dashboard/procurement/projects/:id`** — Detalhe com items + needs + RFQs
**`/dashboard/procurement/rfqs`** — Lista de RFQs
**`/dashboard/procurement/rfqs/:id`** — Detalhe RFQ com comparison table

### Integração na proposta
- No `useProposals.ts` ou `ProposalDetailContent.tsx`: quando status muda para "accepted", mostrar modal `ProposalWonProcurementModal`

### Navegação
- Adicionar "Projetos" e "RFQs" ao grupo Compras no `nav.v1.ts`

---

## 4. i18n

Novas chaves em PT/EN/ES/FR para: `project`, `procurementNeeds`, `rfq`, `createRFQ`, `sendRFQ`, `quotes`, `award`, `comparison`, `qtyToBuy`, `qtyInStock`, `selectWinner`, `generatePO`, etc.

---

## 5. Ficheiros a criar/modificar

| Acção | Ficheiro |
|-------|---------|
| Criar | Migração SQL (7 tabelas + extensões + RLS + indexes) |
| Criar | `supabase/functions/project-from-won-proposal/index.ts` |
| Criar | `supabase/functions/rfq-create-from-needs/index.ts` |
| Criar | `supabase/functions/rfq-send/index.ts` |
| Criar | `supabase/functions/rfq-award-and-create-pos/index.ts` |
| Criar | `supabase/functions/procurement-sync-on-receive/index.ts` |
| Criar | `src/hooks/useRFQ.ts` |
| Criar | `src/hooks/useProcurementProjects.ts` |
| Criar | `src/components/procurement/ProposalWonProcurementModal.tsx` |
| Criar | `src/components/procurement/ProcurementProjectDetail.tsx` |
| Criar | `src/components/procurement/RFQBuilderForm.tsx` |
| Criar | `src/components/procurement/RFQComparisonTable.tsx` |
| Criar | `src/components/procurement/RFQQuoteEntryForm.tsx` |
| Criar | `src/pages/procurement/ProcurementProjectsPage.tsx` |
| Criar | `src/pages/procurement/ProcurementProjectDetailPage.tsx` |
| Criar | `src/pages/procurement/RFQsPage.tsx` |
| Criar | `src/pages/procurement/RFQDetailPage.tsx` |
| Modificar | `src/components/proposals/ProposalDetailContent.tsx` — trigger modal on accepted |
| Modificar | `src/App.tsx` — 4 novas rotas |
| Modificar | `src/config/nav.v1.ts` — 2 novos items nav |
| Modificar | `supabase/config.toml` — 5 novas EFs |
| Modificar | i18n (pt/en/es/fr) procurement namespace |

