
# OMS Completo para Store Orders

## Contexto Atual

A tabela `store_orders` ja existe com estados basicos (pending, paid, processing, shipped, delivered, cancelled, refunded) e um dialog simples de detalhes. Faltam:

1. **Tabela de eventos/timeline** - nao existe nenhum registo de historico para store orders (o `order_audit_log` existente e exclusivo das `order_notes` B2B)
2. **Colunas de associacao CRM** - a tabela tem `contact_id` mas falta `company_id`, `opportunity_id` e `campaign_id`
3. **Pagina de detalhe completa** - atualmente so existe um Dialog basico, sem timeline nem associacoes
4. **Estados completos e configuracao visual** - os estados ja existem no codigo frontend mas faltam "concluida" (delivered) esta ok, e "reembolso" (refunded) esta ok

---

## Alteracoes na Base de Dados

### 1. Nova tabela `store_order_events`
Regista cada evento/mudanca de estado com timestamp, utilizador e notas:

- `id` (uuid, PK)
- `order_id` (uuid, FK store_orders)
- `workspace_id` (uuid, FK workspaces)
- `event_type` (text) - ex: "status_change", "note_added", "payment_received", "shipment_created", "refund_issued"
- `from_status` (text, nullable)
- `to_status` (text, nullable)
- `description` (text)
- `metadata` (jsonb, nullable) - dados extra como tracking number, refund amount
- `created_by` (uuid, nullable) - quem fez a acao
- `created_at` (timestamptz)
- RLS: workspace members only

### 2. Novas colunas em `store_orders`
- `company_id` (uuid, FK companies, nullable)
- `opportunity_id` (uuid, FK opportunities, nullable)
- `campaign_id` (uuid, FK marketing_campaigns, nullable)
- `completed_at` (timestamptz, nullable)
- `shipped_at` (timestamptz, nullable)
- `refunded_at` (timestamptz, nullable)

### 3. Trigger automatico
Criar trigger em `store_orders` que, ao alterar o `status`, insere automaticamente um registo em `store_order_events`.

---

## Alteracoes no Frontend

### 1. Novo tipo `StoreOrderEvent` (`src/types/store-order.ts`)
Definicao TypeScript dos tipos de evento e configuracao visual (icones, cores, labels PT).

### 2. Hook `useStoreOrderEvents` (`src/hooks/useStoreOrderEvents.ts`)
- Query dos eventos por order_id
- Mutation para adicionar eventos manuais (notas)

### 3. Hook `useStoreOrderDetail` (`src/hooks/useStoreOrderDetail.ts`)
- Fetch de uma store order com joins para contacto, empresa, oportunidade e campanha

### 4. Componente `StoreOrderTimeline` (`src/components/store-orders/StoreOrderTimeline.tsx`)
Timeline visual vertical dos eventos (semelhante ao `OrderAuditTrail` das order_notes), mostrando:
- Icone e cor por tipo de evento
- Data/hora
- Utilizador
- Notas/descricao

### 5. Componente `StoreOrderAssociations` (`src/components/store-orders/StoreOrderAssociations.tsx`)
Painel lateral com:
- Link para o Contacto (ja existe)
- Seletor/link para Empresa
- Seletor/link para Oportunidade
- Seletor/link para Campanha
- Botao para associar/desassociar

### 6. Pagina `StoreOrderDetailPage` (`src/pages/StoreOrderDetailPage.tsx`)
Pagina completa de detalhe com:
- Cabecalho com numero, estado e acoes de mudanca de estado
- Secao de dados do cliente
- Lista de itens
- Resumo financeiro (subtotal, IVA, desconto, total)
- Timeline de eventos (coluna lateral ou tab)
- Associacoes CRM
- Moradas de faturacao e envio

### 7. Atualizar `StoreOrdersPage.tsx`
- Linhas da tabela clicaveis para navegar para a pagina de detalhe (em vez do Dialog)
- Manter Dialog como opcao de "quick view"

### 8. Atualizar `useStoreOrders.ts`
- Incluir joins para company e opportunity no select
- Atualizar o `useUpdateStoreOrderStatus` para tambem registar timestamp (shipped_at, completed_at, refunded_at)

### 9. Rota nova
Adicionar rota `/dashboard/store-orders/:id` no router.

---

## Detalhe Tecnico

### Migracoes SQL

```text
1. ALTER TABLE store_orders ADD COLUMN company_id uuid REFERENCES companies(id)
2. ALTER TABLE store_orders ADD COLUMN opportunity_id uuid REFERENCES opportunities(id)
3. ALTER TABLE store_orders ADD COLUMN campaign_id uuid REFERENCES marketing_campaigns(id)
4. ALTER TABLE store_orders ADD COLUMN shipped_at timestamptz
5. ALTER TABLE store_orders ADD COLUMN completed_at timestamptz
6. ALTER TABLE store_orders ADD COLUMN refunded_at timestamptz
7. CREATE TABLE store_order_events (...)
8. CREATE TRIGGER on store_orders status change -> insert event
9. RLS policies for store_order_events
```

### Ficheiros novos
- `src/types/store-order.ts`
- `src/hooks/useStoreOrderEvents.ts`
- `src/hooks/useStoreOrderDetail.ts`
- `src/components/store-orders/StoreOrderTimeline.tsx`
- `src/components/store-orders/StoreOrderAssociations.tsx`
- `src/pages/StoreOrderDetailPage.tsx`

### Ficheiros a modificar
- `src/hooks/useStoreOrders.ts` - adicionar timestamps e joins
- `src/pages/StoreOrdersPage.tsx` - navegacao para detalhe
- Router principal - nova rota
