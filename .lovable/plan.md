

# Purchase & Procurement Engine — Módulo Marketplace Completo

## Visão Geral

Módulo instalável via Marketplace (`slug: procurement`) com gestão completa de compras: Fornecedores → Requisições → Aprovação → Ordens de Compra → Receção → Faturas Fornecedor → Dashboard.

---

## 1. Migração SQL (1 ficheiro grande)

### Registar módulo no Marketplace
```sql
INSERT INTO marketplace_modules (slug, name, tagline, category, status, publisher, ...)
VALUES ('procurement', 'Purchase & Procurement', '...', 'operations', 'active', 'FastCRM');
```

### Tabelas a criar (todas com RLS por workspace_id)

**`suppliers`** — Fornecedores
- `id`, `workspace_id`, `name`, `vat_number`, `address`, `payment_terms`, `iban`, `email`, `phone`, `category`, `status` (active/inactive), `notes`, `created_at`, `updated_at`

**`purchase_requests`** — Requisições internas
- `id`, `workspace_id`, `created_by`, `supplier_id` (nullable), `status` (draft/pending/approved/rejected), `total_estimated`, `urgency` (low/medium/high/critical), `cost_center`, `notes`, `approved_by`, `approved_at`, `created_at`

**`purchase_request_items`** — Itens da requisição
- `id`, `request_id` FK, `product_id` FK nullable, `description`, `quantity`, `estimated_unit_price`

**`purchase_orders`** — Ordens de Compra
- `id`, `workspace_id`, `supplier_id` FK, `request_id` FK nullable, `po_number` (auto-gerado), `status` (draft/sent/confirmed/partial/received/closed/cancelled), `total_amount`, `expected_delivery`, `notes`, `created_by`, `created_at`, `updated_at`

**`purchase_order_items`** — Itens da PO
- `id`, `order_id` FK, `product_id` FK nullable, `description`, `quantity`, `unit_price`, `received_quantity` (default 0)

**`goods_receipts`** — Receção de mercadoria
- `id`, `workspace_id`, `purchase_order_id` FK, `received_by`, `notes`, `created_at`

**`goods_receipt_items`** — Itens recebidos
- `id`, `receipt_id` FK, `order_item_id` FK, `quantity_received`

**`supplier_invoices`** — Faturas de fornecedor
- `id`, `workspace_id`, `supplier_id` FK, `purchase_order_id` FK nullable, `invoice_number`, `invoice_date`, `due_date`, `total`, `status` (pending/paid/overdue), `file_url`, `ocr_data_json` JSONB, `created_at`

### Trigger: Auto-incrementar stock na receção
- Ao inserir em `goods_receipt_items`, actualizar `stock_quantity` em `products` (se `track_stock = true`) e criar registo em `inventory_movements` com `type = 'purchase_in'` e `ref_id` = PO id.

### Trigger: Auto-gerar `po_number`
- Formato: `PO-{YYYY}-{sequencial 5 dígitos}` por workspace.

### RLS
- Todas as tabelas: SELECT/INSERT/UPDATE/DELETE para membros do workspace (via `workspace_members`).
- Super Admin bypass em todas.

---

## 2. Sidebar & Rotas

### Nav V1 (`src/config/nav.v1.ts`)
Novo grupo **"Compras"** com cor `text-teal-600`:
- Fornecedores → `/dashboard/procurement/suppliers`
- Requisições → `/dashboard/procurement/requests`
- Ordens de Compra → `/dashboard/procurement/orders`
- Receção → `/dashboard/procurement/receipts`
- Faturas Fornecedor → `/dashboard/procurement/invoices`
- Dashboard Compras → `/dashboard/procurement`

Todos com `moduleSlug: "procurement"`.

### Rotas (`src/App.tsx`)
6 novas rotas + 2 detail routes (supplier/:id, order/:id).

---

## 3. Páginas & Componentes

### `src/pages/procurement/`
- **ProcurementDashboardPage.tsx** — Dashboard com KPIs (total compras mês, top fornecedores, por categoria, margem)
- **SuppliersPage.tsx** — Lista + CRUD de fornecedores
- **PurchaseRequestsPage.tsx** — Lista de requisições + criação + workflow aprovação
- **PurchaseOrdersPage.tsx** — Lista de POs + criação a partir de requisição aprovada
- **GoodsReceiptsPage.tsx** — Receção parcial/total contra PO
- **SupplierInvoicesPage.tsx** — Lista de faturas + upload + validação contra PO

### `src/components/procurement/`
- **SupplierForm.tsx** — Dialog de criação/edição de fornecedor
- **PurchaseRequestForm.tsx** — Formulário de requisição com itens
- **PurchaseOrderForm.tsx** — Formulário PO com itens, geração PDF
- **GoodsReceiptForm.tsx** — Receção com quantidade por item
- **SupplierInvoiceForm.tsx** — Upload + matching com PO
- **ProcurementKPIs.tsx** — Strip de KPIs para o dashboard
- **PurchaseTimeline.tsx** — Timeline visual do ciclo de vida da PO
- **ApprovalWorkflow.tsx** — UI de aprovação/rejeição de requisições

### `src/hooks/`
- **useProcurement.ts** — Hooks para todas as entidades (suppliers, requests, orders, receipts, invoices)

---

## 4. Funcionalidades-chave

### Workflow de Aprovação
- Requisição criada → status `pending` → notificação ao Admin/Owner
- Admin pode aprovar/rejeitar com nota
- Aprovação → botão "Gerar Ordem de Compra" pré-preenchida

### Receção de Mercadoria
- Selecionar PO → registar quantidade recebida por item
- Trigger actualiza `received_quantity` nos itens da PO
- Trigger actualiza stock em `products` e cria `inventory_movements`
- PO passa a `partial` ou `received` automaticamente

### Faturas Fornecedor
- Upload PDF → integração com AI Document OCR existente
- Matching automático com PO (por número ou valor)
- Estado: pending → paid (com data de pagamento)
- Alerta de vencimento

### Dashboard
- KPIs: Total compras mês, compras pendentes, faturas por pagar, margem média
- Gráficos: Compras por fornecedor (bar), por categoria (pie), evolução mensal (line)
- Top 5 fornecedores por volume

---

## 5. i18n

Adicionar ficheiro `src/i18n/locales/pt/procurement.json` e `en/procurement.json` com todas as labels.

---

## 6. Extensão no Marketplace

Registar o módulo com `manifest_json` incluindo os objetos provisionados, para que o `extension-provisioner` possa activar/desactivar correctamente.

---

## Ficheiros a criar/modificar (resumo)

| Acção | Ficheiro |
|-------|---------|
| Criar | Migração SQL (tabelas + triggers + RLS + marketplace insert) |
| Criar | 6 páginas em `src/pages/procurement/` |
| Criar | ~8 componentes em `src/components/procurement/` |
| Criar | `src/hooks/useProcurement.ts` |
| Criar | `src/i18n/locales/pt/procurement.json` + `en/procurement.json` |
| Modificar | `src/config/nav.v1.ts` — grupo "Compras" |
| Modificar | `src/App.tsx` — rotas procurement |

**Nota:** Pela dimensão deste módulo, a implementação será feita de forma completa mas focada na funcionalidade core. Refinamentos visuais e IA avançada (sugestão de fornecedor mais económico, previsão de compras) podem ser adicionados numa iteração seguinte.

