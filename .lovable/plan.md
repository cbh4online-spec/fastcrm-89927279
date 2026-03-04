

# Auditoria Técnica Completa — Portal de Compras FastCRM

---

## 1) MENU & NAVEGAÇÃO

### Rotas registadas em App.tsx (14 rotas):

| Rota | Sidebar V1 | Sidebar V2 | Status |
|------|-----------|-----------|--------|
| `/dashboard/procurement` | Sim (Dashboard Compras) | Não | **OK** |
| `/dashboard/procurement/needs` | Sim (Necessidades) | Não | **OK** |
| `/dashboard/procurement/suppliers` | Sim (Fornecedores) | Não | **OK** |
| `/dashboard/procurement/requests` | Sim (Requisições) | Não | **OK** |
| `/dashboard/procurement/orders` | Sim (Ordens de Compra) | Não | **OK** |
| `/dashboard/procurement/receipts` | Sim (Receção) | Não | **OK** |
| `/dashboard/procurement/invoices` | Sim (Faturas Fornecedor) | Não | **OK** |
| `/dashboard/procurement/catalog` | Sim (Catálogo Fornecedores) | Não | **OK** |
| `/dashboard/procurement/price-import` | Sim (Importar Preços) | Não | **OK** |
| `/dashboard/procurement/projects` | Sim (Projetos Compras) | Não | **OK** |
| `/dashboard/procurement/projects/:id` | Não (detalhe) | Não | **OK** |
| `/dashboard/procurement/rfqs` | Sim (RFQs) | Não | **OK** |
| `/dashboard/procurement/rfqs/:id` | Não (detalhe) | Não | **OK** |
| `/dashboard/procurement/rfqs-dashboard` | Sim (Dashboard RFQs) | Não | **OK** |
| `/supplier-portal/:token` | N/A (público) | N/A | **OK** |

**Visibilidade:** Controlada por `moduleSlug: "procurement"` no nav.v1.ts. Itens só aparecem se o módulo `procurement` estiver instalado em `workspace_modules` + `marketplace_modules`.

**Problema detetado:** O nav.v2.ts **NÃO contém nenhuma entrada** do módulo Compras. Se o flag `ui.shell_v2_enabled` for ativado, o menu Compras desaparece completamente. Atualmente o flag está `false`, logo sem impacto imediato.

**Veredicto navegação: OK** (V1) / **Não Implementado** (V2)

---

## 2) TABELAS BASE DE DADOS

| Tabela | Existe | RLS Ativa | Políticas | Índices | Status |
|--------|--------|-----------|-----------|---------|--------|
| `suppliers` | Sim | Sim | SELECT/INSERT/UPDATE/DELETE (workspace_member_procurement + super_admin) | `idx_suppliers_workspace` | **OK** |
| `supplier_products` | Sim | Sim | ALL (workspace_members) | `idx_supplier_products_product`, `idx_supplier_products_supplier`, `uq_supplier_products_combo` | **OK** |
| `purchase_requests` | Sim | Sim | SELECT/INSERT/UPDATE/DELETE (workspace_member_procurement + super_admin) | `idx_purchase_requests_workspace` | **OK** |
| `purchase_request_items` | Sim | Sim | SELECT/INSERT/UPDATE/DELETE (via JOIN a purchase_requests) | PK only | **OK** |
| `purchase_orders` | Sim | Sim | SELECT/INSERT/UPDATE/DELETE (workspace_member_procurement + super_admin) | `idx_purchase_orders_workspace`, `idx_purchase_orders_supplier`, `idx_purchase_orders_ws_status` | **OK** |
| `purchase_order_items` | Sim | Sim | SELECT/INSERT/UPDATE/DELETE (via JOIN a purchase_orders) | `idx_purchase_order_items_order` | **OK** |
| `supplier_invoices` | Sim | Sim | SELECT/INSERT/UPDATE/DELETE (workspace_member_procurement + super_admin) | `idx_supplier_invoices_workspace` | **OK** |
| `rfqs` | Sim | Sim | ALL (workspace_members) | `idx_rfqs_workspace` | **OK** |
| `rfq_items` | Sim | Sim | ALL (workspace_members) | `idx_rfq_items_rfq` | **OK** |
| `rfq_suppliers` | Sim | Sim | ALL (workspace_members) | `idx_rfq_suppliers_portal_token` | **OK** |
| `rfq_quotes` | Sim | Sim | ALL (workspace_members) | `idx_rfq_quotes_rfq_supplier`, `idx_rfq_quotes_supplier_sheet`, `uq_rfq_quotes_item_supplier` | **OK** |
| `rfq_awards` | Sim | Sim | SELECT/INSERT/UPDATE (workspace_members) | PK only | **OK** |
| `rfq_award_items` | Sim | Sim | SELECT/INSERT/UPDATE (workspace_members) | PK only | **OK** |
| `procurement_needs` | Sim | Sim | ALL + SELECT (workspace_members) + super_admin bypass | `idx_procurement_needs_project_status`, `procurement_needs_product_workspace_uniq` | **OK** |
| `inventory_movements` | Sim | Sim | ALL + SELECT (workspace_members) | Sem índice workspace — sem impacto crítico | **OK** |
| `goods_receipts` | Sim | Sim | SELECT/INSERT/UPDATE/DELETE (workspace_member_procurement + super_admin) | `idx_goods_receipts_workspace` | **OK** |
| `goods_receipt_items` | Sim | Sim | SELECT/INSERT/UPDATE/DELETE (via JOIN a goods_receipts) | PK only | **OK** |

**Veredicto BD: OK** — Todas as 17 tabelas existem, RLS ativa, índices adequados.

---

## 3) EDGE FUNCTIONS

| Função | Existe no repo | Status |
|--------|---------------|--------|
| `procurement-needs-recompute` | Sim | **OK** |
| `rfq-analyze` | Sim | **OK** |
| `rfq-recommend-award` | Sim | **OK** |
| `rfq-award-convert-to-pos` | Sim | **OK** |
| `rfq-upsert-quote-sheet` | Sim | **OK** |
| `rfq-quote-ocr-parse` | Sim (nome: `rfq-quote-ocr-parse`) | **OK** |
| `barcode-lookup` | Sim (nome: `barcode-lookup`) | **OK** |
| `procurement-create-po-from-request` | Sim | **OK** |
| `procurement-needs-create-pos` | Sim | **OK** |
| `procurement-receive-items` | Sim | **OK** |
| `procurement-suggest-suppliers` | Sim | **OK** |
| `procurement-sync-on-receive` | Sim | **OK** |
| `rfq-award-and-create-pos` | Sim | **OK** |
| `rfq-award-confirm` | Sim | **OK** |
| `rfq-create-from-needs` | Sim | **OK** |
| `rfq-deadline-reminder` | Sim | **OK** |
| `rfq-generate-pdf` | Sim | **OK** |
| `rfq-get-supplier-quote-sheet` | Sim | **OK** |
| `rfq-quote-apply` | Sim | **OK** |
| `rfq-quote-update-match` | Sim | **OK** |
| `rfq-send` | Sim | **OK** |
| `rfq-submit-quote-sheet` | Sim | **OK** |
| `rfq-submit-quote` | Sim | **OK** |
| `rfq-supplier-portal-token` | Sim | **OK** |
| `supplier-import-commit` | Sim | **OK** |
| `supplier-import-parse` | Sim | **OK** |
| `supplier-import-validate` | Sim | **OK** |

**Veredicto Edge Functions: OK** — 27 funções de procurement presentes. Deploy automático pelo Lovable Cloud.

---

## 4) RLS & PERMISSÕES

| Critério | Status | Detalhe |
|----------|--------|---------|
| `workspace_id` em todas as tabelas parent | **OK** | Todas filtram por workspace_id |
| Tabelas child (items) via JOIN | **OK** | Usam EXISTS com JOIN à tabela parent |
| Admin/Owner acesso total | **OK** | `is_workspace_member_procurement()` verifica membership, super_admin bypass em SELECT/DELETE |
| Agent pode criar RFQ | **OK** | RFQs usam policy `ALL` para workspace_members (sem restrição de role) |
| Portal fornecedor | **OK** | Rota pública `/supplier-portal/:token`, edge functions usam service_role_key |
| Função `is_workspace_member_procurement` | **OK** | Existe, verifica `workspace_members.user_id = auth.uid()` |

**Nota de inconsistência RLS:** As tabelas RFQ (`rfqs`, `rfq_items`, `rfq_suppliers`, `rfq_quotes`) usam políticas baseadas em `workspace_members` genérico, enquanto as tabelas PO/PR/Suppliers usam `is_workspace_member_procurement`. Ambas verificam membership — **sem risco de segurança**, mas padrão inconsistente.

**Anomalia:** `rfq_awards` e `rfq_award_items` não têm policy DELETE. Um membro do workspace **não consegue apagar** awards. Impacto: baixo (awards raramente são apagados), mas é uma lacuna.

**Veredicto RLS: OK** (funcional, sem falhas de segurança)

---

## 5) FEATURE FLAGS

| Flag | Existe na BD | Estado | Impacto |
|------|-------------|--------|---------|
| `procurement` | Sim | `true` (workspace 96037...) | Módulo visível quando instalado |
| `ui.shell_v2_enabled` | Sim | `false` | V1 ativo — Compras visível |
| `ui.marketplace_enabled` | Sim | `false` (workspace d9e3d...) | Marketplace desativado |
| `c2c_marketplace` | Não existe | — | Sem flag específica |
| `renewals_module` | Não existe | — | Sem flag (visibilidade por moduleSlug) |
| `online_store` | Não existe | — | Sem flag (visibilidade por moduleSlug) |
| `advanced_procurement` | Não existe | — | **Não Implementado** |

**Nota:** A visibilidade dos módulos não é controlada por feature flags — é controlada pela tabela `workspace_modules` + `marketplace_modules`. Feature flags são usados apenas para toggles de UI (shell V2, marketplace).

**Veredicto Flags: OK** (sistema funciona por módulos instalados, não por flags)

---

## 6) DIAGNÓSTICO CONSOLIDADO

| Área | Veredicto | Detalhe |
|------|-----------|---------|
| Menu V1 | **OK** | 12 itens visíveis quando módulo instalado |
| Menu V2 | **Não Implementado** | nav.v2.ts não tem entradas de Compras |
| Rotas | **OK** | 14 rotas + 1 pública, todas com componentes importados |
| Tabelas BD | **OK** | 17 tabelas, todas com RLS ativa e índices |
| Edge Functions | **OK** | 27 funções presentes |
| RLS | **OK** | workspace_id enforced, super_admin bypass |
| RLS Awards DELETE | **Parcial** | `rfq_awards` e `rfq_award_items` sem policy DELETE |
| Feature Flags | **OK** | Visibilidade por módulo, não por flag |
| Deploy | **OK** | Automático via Lovable Cloud |

### Problemas a corrigir:

1. **nav.v2.ts sem Compras** — Se V2 for ativado, o módulo desaparece do menu. Necessário adicionar entradas de Compras ao nav.v2.ts. Prioridade: média (V2 está desativado).

2. **rfq_awards / rfq_award_items sem DELETE policy** — Membros não conseguem apagar awards. Prioridade: baixa.

3. **Inconsistência de padrão RLS** — Tabelas RFQ usam `workspace_members` direto vs tabelas PO/Suppliers usam `is_workspace_member_procurement()`. Sem risco, mas deveria ser normalizado. Prioridade: baixa.

