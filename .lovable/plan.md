
# Plano: Modulo de Nota de Encomenda Profissional

## Visao Geral

Este modulo cria um sistema completo de pre-compra B2B onde clientes profissionais autenticados podem consultar um catalogo tecnico, montar encomendas com calculo automatico de IVA, e submeter pedidos para aprovacao administrativa (incluindo opcao de pagamento em prestacoes).

---

## Arquitectura do Sistema

```text
+-------------------+     +------------------+     +------------------+
| Portal Cliente    |     | Dashboard Admin  |     | CRM Integration  |
| (Public Routes)   |     | (Internal)       |     |                  |
+-------------------+     +------------------+     +------------------+
         |                        |                       |
         v                        v                       v
+----------------------------------------------------------------+
|                    API Layer (Supabase)                        |
|  - order_notes table                                           |
|  - order_note_items table                                      |
|  - client_users (extended auth)                                |
+----------------------------------------------------------------+
         |                        |
         v                        v
+------------------+     +------------------------+
| Email Service    |     | Admin Notifications    |
| (Resend)         |     | (Real-time)            |
+------------------+     +------------------------+
```

---

## 1. Modelo de Dados (Base de Dados)

### 1.1 Tabela: `client_users`
Perfis de clientes B2B autenticados.

| Coluna | Tipo | Descricao |
|--------|------|-----------|
| id | uuid PK | ID unico |
| auth_user_id | uuid FK | Referencia a auth.users |
| workspace_id | uuid FK | Workspace associado |
| contact_id | uuid FK | Link opcional a contacts |
| company_id | uuid FK | Link opcional a companies |
| name | text | Nome do cliente |
| email | text | Email |
| phone | text | Telefone |
| tax_id | text | NIF/NIPC |
| billing_address | jsonb | Endereco de faturacao |
| credit_limit | numeric | Limite de credito (opcional) |
| payment_terms | text | Condicoes de pagamento |
| status | text | active/suspended/pending |
| created_at | timestamptz | Data criacao |
| updated_at | timestamptz | Ultima atualizacao |

### 1.2 Tabela: `order_notes`
Notas de encomenda (pedidos).

| Coluna | Tipo | Descricao |
|--------|------|-----------|
| id | uuid PK | ID unico |
| workspace_id | uuid FK | Workspace |
| client_user_id | uuid FK | Cliente que fez o pedido |
| order_number | text | Numero sequencial (NE-2026-0001) |
| status | text | draft/submitted/approved/in_preparation/invoiced/cancelled |
| total_net | numeric | Total sem IVA |
| total_vat | numeric | Valor do IVA |
| total_gross | numeric | Total com IVA |
| currency | text | Moeda (EUR) |
| installment_requested | boolean | Pediu prestacoes? |
| installment_count | integer | Numero de prestacoes |
| installment_notes | text | Justificacao/observacoes |
| client_notes | text | Notas do cliente |
| admin_notes | text | Notas internas (backoffice) |
| billing_address | jsonb | Endereco faturacao |
| shipping_address | jsonb | Endereco entrega |
| submitted_at | timestamptz | Data submissao |
| approved_at | timestamptz | Data aprovacao |
| approved_by | uuid FK | Quem aprovou |
| created_at | timestamptz | Data criacao |
| updated_at | timestamptz | Ultima atualizacao |

### 1.3 Tabela: `order_note_items`
Itens de cada encomenda.

| Coluna | Tipo | Descricao |
|--------|------|-----------|
| id | uuid PK | ID unico |
| order_note_id | uuid FK | Encomenda |
| workspace_id | uuid FK | Workspace |
| product_id | uuid FK | Produto do catalogo |
| product_name | text | Nome (snapshot) |
| product_sku | text | SKU (snapshot) |
| quantity | integer | Quantidade |
| unit_price_net | numeric | Preco unitario sem IVA |
| vat_rate | numeric | Taxa IVA (%) |
| vat_amount | numeric | Valor IVA da linha |
| line_total_net | numeric | Subtotal sem IVA |
| line_total_gross | numeric | Subtotal com IVA |
| position | integer | Ordem na lista |
| created_at | timestamptz | Data criacao |

### 1.4 Tabela: `product_attributes`
Atributos tecnicos/clinicos dos produtos (indexadores).

| Coluna | Tipo | Descricao |
|--------|------|-----------|
| id | uuid PK | ID unico |
| workspace_id | uuid FK | Workspace |
| product_id | uuid FK | Produto |
| attribute_type | text | function/pathology/indication/protocol |
| attribute_value | text | Valor do atributo |
| created_at | timestamptz | Data criacao |

---

## 2. Rotas e Paginas

### 2.1 Rotas Publicas (Portal Cliente)

| Rota | Pagina | Descricao |
|------|--------|-----------|
| `/client/login` | ClientLoginPage | Login de clientes B2B |
| `/client/dashboard` | ClientDashboardPage | Dashboard do cliente |
| `/client/catalog` | ClientCatalogPage | Catalogo de produtos |
| `/client/cart` | ClientCartPage | Carrinho/Nota de Encomenda |
| `/client/checkout` | ClientCheckoutPage | Finalizacao do pedido |
| `/client/orders` | ClientOrdersPage | Historico de encomendas |
| `/client/orders/:id` | ClientOrderDetailPage | Detalhe de encomenda |

### 2.2 Rotas Internas (Dashboard Admin)

| Rota | Pagina | Descricao |
|------|--------|-----------|
| `/dashboard/order-notes` | OrderNotesPage | Lista de encomendas |
| `/dashboard/order-notes/:id` | OrderNoteDetailPage | Detalhe/gestao |
| `/dashboard/client-users` | ClientUsersPage | Gestao de clientes B2B |

---

## 3. Componentes UI

### 3.1 Portal Cliente

```text
src/components/client-portal/
  ClientLayout.tsx           # Layout com navegacao cliente
  ClientSidebar.tsx          # Menu lateral simplificado
  ClientDashboard.tsx        # Dashboard com resumo
  
  catalog/
    ProductCatalog.tsx       # Grid de produtos com filtros
    ProductCard.tsx          # Card de produto
    ProductDetailModal.tsx   # Modal com ficha tecnica completa
    CatalogFilters.tsx       # Filtros (linha, categoria, funcao, patologia)
  
  cart/
    CartContext.tsx          # Context para estado do carrinho
    CartSummary.tsx          # Resumo do carrinho (sidebar)
    CartItemList.tsx         # Lista de itens editavel
    CartTotals.tsx           # Totais (sem IVA, IVA, com IVA)
  
  checkout/
    CheckoutForm.tsx         # Formulario de finalizacao
    InstallmentRequest.tsx   # Pedido de prestacoes
    OrderConfirmation.tsx    # Confirmacao pos-envio
  
  orders/
    OrderList.tsx            # Lista de encomendas
    OrderCard.tsx            # Card de encomenda
    OrderDetail.tsx          # Detalhe completo
    OrderStatusBadge.tsx     # Badge com estado
```

### 3.2 Admin/Backoffice

```text
src/components/order-notes/
  OrderNotesList.tsx         # Lista com filtros/pesquisa
  OrderNoteDetail.tsx        # Detalhe administrativo
  OrderNoteStatusFlow.tsx    # Workflow de estados
  InstallmentApproval.tsx    # Aprovar/rejeitar prestacoes
  OrderNotesPDF.tsx          # Exportar PDF da nota
```

---

## 4. Hooks e Logica

### 4.1 Hooks Cliente

```text
src/hooks/client-portal/
  useClientAuth.ts           # Auth especifica para clientes
  useClientProducts.ts       # Catalogo filtrado
  useCart.ts                 # Gestao do carrinho
  useClientOrders.ts         # Historico de encomendas
  useSubmitOrder.ts          # Submeter encomenda
```

### 4.2 Hooks Admin

```text
src/hooks/
  useOrderNotes.ts           # CRUD de encomendas
  useOrderNoteStatus.ts      # Alteracao de estados
  useClientUsers.ts          # Gestao de clientes B2B
```

---

## 5. Edge Functions

### 5.1 `order-note-submit`
Processa submissao de encomenda:
- Valida dados
- Gera numero sequencial
- Envia email para escritorio
- Cria notificacao admin

### 5.2 `order-note-notify`
Envia notificacoes de estado:
- Aprovado
- Em preparacao
- Faturado

### 5.3 `client-user-invite`
Convida novo cliente B2B:
- Cria user em auth.users
- Envia email de boas-vindas
- Configura perfil client_users

---

## 6. Ficha de Produto Detalhada

A modal de produto tera as seguintes seccoes:

### 6.1 Galeria de Imagens
- Imagem principal grande
- Miniaturas (frente, verso, rotulo)
- Navegacao por setas

### 6.2 Informacao Tecnica
Usando campos existentes + novos atributos:

```text
+----------------------------------+
| Nome do Produto                  |
| SKU: ABC-123                     |
+----------------------------------+
| DESCRICAO TECNICA                |
| commercial_description           |
| short_description                |
+----------------------------------+
| COMPOSICAO / ATIVOS              |
| specifications["composition"]     |
| specifications["active_ingredients"]|
+----------------------------------+
| MODO DE USO                      |
| specifications["usage_instructions"]|
+----------------------------------+
| FUNCOES                          |
| product_attributes (type=function)|
+----------------------------------+
| PATOLOGIAS / SITUACOES           |
| product_attributes (type=pathology)|
+----------------------------------+
| RESULTADOS ESPERADOS             |
| specifications["expected_results"]|
+----------------------------------+
```

### 6.3 Seccao de Compra
```text
+----------------------------------+
| Preco unitario (s/ IVA): 45,00€  |
| IVA (23%):               10,35€  |
| Preco unitario (c/ IVA): 55,35€  |
+----------------------------------+
| Quantidade: [- 1 +]              |
| Subtotal:   55,35€               |
+----------------------------------+
| [   ADICIONAR AO CARRINHO   ]    |
+----------------------------------+
```

---

## 7. Fluxo de Estados

```text
+--------+     +----------+     +------------+     +-----------+     +----------+
| draft  | --> | submitted| --> | approved   | --> | in_prep   | --> | invoiced |
+--------+     +----------+     +------------+     +-----------+     +----------+
                    |                                                      
                    v                                                      
              +-----------+                                                
              | cancelled |                                                
              +-----------+                                                
```

Se `installment_requested = true`:
```text
submitted --> awaiting_approval --> approved / rejected
```

---

## 8. Integracao CRM

### 8.1 Associacao Automatica
- Se `client_user.contact_id` existe, encomenda aparece no timeline do contacto
- Se `client_user.company_id` existe, encomenda aparece na empresa

### 8.2 Criacao de Oportunidade (Opcional)
- Ao aprovar encomenda, pode criar oportunidade no pipeline de vendas

---

## 9. Emails Automaticos

### 9.1 Para Escritorio (Admin)
- Nova encomenda recebida
- Pedido de prestacoes (requer aprovacao)

### 9.2 Para Cliente
- Confirmacao de envio
- Encomenda aprovada
- Encomenda em preparacao
- Encomenda faturada

---

## 10. Seguranca (RLS)

### Politicas Principais:

```text
-- client_users: cliente so ve o proprio perfil
CREATE POLICY "client_users_own" ON client_users
  FOR ALL USING (auth_user_id = auth.uid());

-- order_notes: cliente so ve as proprias encomendas
CREATE POLICY "client_orders_own" ON order_notes
  FOR ALL USING (
    client_user_id IN (
      SELECT id FROM client_users WHERE auth_user_id = auth.uid()
    )
  );

-- Admins do workspace veem tudo
CREATE POLICY "admin_full_access" ON order_notes
  FOR ALL USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members 
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin', 'agent')
    )
  );
```

---

## 11. Prioridade de Implementacao

### Fase 1: Base (Semana 1-2)
1. Migracao de base de dados (tabelas + RLS)
2. ClientLayout e autenticacao de clientes
3. Catalogo basico de produtos
4. Carrinho funcional

### Fase 2: Core (Semana 3-4)
5. Checkout com opcao de prestacoes
6. Edge function de submissao + email
7. Dashboard admin de encomendas
8. Workflow de estados

### Fase 3: Polish (Semana 5)
9. Ficha de produto completa (atributos clinicos)
10. Historico de encomendas cliente
11. Exportar PDF da nota
12. Notificacoes real-time

### Fase 4: Integracao (Semana 6)
13. Integracao CRM (timeline)
14. Gestao de clientes B2B
15. Testes e refinamentos

---

## 12. Tipos TypeScript

```text
src/types/
  order-note.ts              # OrderNote, OrderNoteItem, OrderNoteStatus
  client-user.ts             # ClientUser, ClientUserStatus
  product-attributes.ts      # ProductAttribute, AttributeType
```

---

## 13. Ficheiros a Criar

### Migracoes SQL
- `create_client_users_table.sql`
- `create_order_notes_tables.sql`
- `create_product_attributes_table.sql`
- `order_notes_rls_policies.sql`

### Paginas (12 ficheiros)
- 7 paginas portal cliente
- 3 paginas admin
- 2 paginas de gestao

### Componentes (~25 ficheiros)
- 15 componentes portal cliente
- 10 componentes admin

### Hooks (8 ficheiros)
- 5 hooks cliente
- 3 hooks admin

### Edge Functions (3 ficheiros)
- order-note-submit
- order-note-notify
- client-user-invite

### Tipos (3 ficheiros)
- order-note.ts
- client-user.ts
- product-attributes.ts

---

## Estimativa de Esforco

| Fase | Componentes | Tempo Estimado |
|------|-------------|----------------|
| Base | DB + Auth + Catalogo | 2-3 sessoes |
| Core | Checkout + Admin | 2-3 sessoes |
| Polish | Ficha + Historico + PDF | 1-2 sessoes |
| Integracao | CRM + Testes | 1-2 sessoes |

**Total estimado: 6-10 sessoes de desenvolvimento**
