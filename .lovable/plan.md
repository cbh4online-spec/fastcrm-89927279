
# Plano: Fase 2 - Modulo de Nota de Encomenda Profissional

## Estado Actual (Fase 1 Concluida)

A Fase 1 implementou com sucesso:
- Base de dados (tabelas client_users, order_notes, order_note_items, product_attributes com RLS)
- Portal do Cliente completo (7 paginas: login, dashboard, catalogo, carrinho, checkout, historico, detalhe)
- Hooks do cliente (useClientAuth, useClientProducts, useClientOrders)
- CartContext para gestao do carrinho
- Tipos TypeScript (order-note.ts, client-user.ts, product-attributes.ts)

---

## Fase 2: Core (A Implementar)

### 1. Edge Function: order-note-submit

Processa submissao de encomenda com:
- Validacao completa dos dados
- Recalculo de totais (proteccao contra manipulacao)
- Actualizacao da encomenda na base de dados
- Envio de email para o escritorio via Resend

| Ficheiro | Tipo |
|----------|------|
| `supabase/functions/order-note-submit/index.ts` | Novo |

**Funcionalidades:**
- Validar que a encomenda pertence ao cliente autenticado
- Recalcular total_net, total_vat, total_gross a partir dos itens
- Actualizar status para "submitted" ou "awaiting_approval"
- Gerar numero sequencial definitivo (se necessario)
- Enviar email HTML profissional para admin do workspace

### 2. Edge Function: order-note-notify

Envia notificacoes de mudanca de estado:
- Email para cliente quando estado muda
- Templates diferentes por tipo de transicao

| Ficheiro | Tipo |
|----------|------|
| `supabase/functions/order-note-notify/index.ts` | Novo |

**Estados notificados:**
- approved (Encomenda aprovada)
- rejected (Encomenda rejeitada - com motivo)
- in_preparation (Em preparacao)
- invoiced (Faturada)

### 3. Dashboard Admin: Lista de Encomendas

| Ficheiro | Tipo |
|----------|------|
| `src/pages/OrderNotesPage.tsx` | Novo |
| `src/components/order-notes/OrderNotesList.tsx` | Novo |
| `src/components/order-notes/OrderNoteFilters.tsx` | Novo |
| `src/components/order-notes/OrderNoteStatusBadge.tsx` | Novo |

**Funcionalidades:**
- Tabela com todas as encomendas do workspace
- Filtros por estado, cliente, data
- Pesquisa por numero de encomenda
- Indicador visual para pedidos de prestacoes
- Link para detalhe

### 4. Dashboard Admin: Detalhe de Encomenda

| Ficheiro | Tipo |
|----------|------|
| `src/pages/OrderNoteDetailPage.tsx` | Novo |
| `src/components/order-notes/OrderNoteDetail.tsx` | Novo |
| `src/components/order-notes/OrderNoteStatusFlow.tsx` | Novo |
| `src/components/order-notes/InstallmentApproval.tsx` | Novo |
| `src/components/order-notes/OrderNoteActions.tsx` | Novo |

**Funcionalidades:**
- Visualizacao completa da encomenda
- Dados do cliente
- Lista de itens com imagens
- Totais detalhados
- Notas do cliente
- Secao de prestacoes (se solicitado)
- Workflow de aprovacao

### 5. Workflow de Estados

| Ficheiro | Tipo |
|----------|------|
| `src/hooks/useOrderNotes.ts` | Novo |
| `src/hooks/useOrderNoteStatus.ts` | Novo |

**Transicoes permitidas:**
```text
draft -> submitted
draft -> cancelled

submitted -> approved
submitted -> in_preparation
submitted -> cancelled

awaiting_approval -> approved (prestacoes aceites)
awaiting_approval -> rejected (prestacoes rejeitadas)
awaiting_approval -> cancelled

approved -> in_preparation
in_preparation -> invoiced
```

**Accoes administrativas:**
- Aprovar encomenda
- Rejeitar (com motivo obrigatorio)
- Marcar como "Em Preparacao"
- Marcar como "Faturada"
- Cancelar (com motivo opcional)
- Adicionar notas internas

### 6. Gestao de Clientes B2B

| Ficheiro | Tipo |
|----------|------|
| `src/pages/ClientUsersPage.tsx` | Novo |
| `src/components/client-users/ClientUsersList.tsx` | Novo |
| `src/components/client-users/ClientUserDetail.tsx` | Novo |
| `src/components/client-users/InviteClientDialog.tsx` | Novo |
| `src/hooks/useClientUsers.ts` | Novo |

**Funcionalidades:**
- Lista de clientes B2B do workspace
- Criar/Editar cliente
- Activar/Suspender cliente
- Ver historico de encomendas do cliente
- Definir limite de credito
- Associar a contacto/empresa do CRM

---

## Estrutura de Ficheiros a Criar

### Edge Functions (2 ficheiros)
```text
supabase/functions/
  order-note-submit/index.ts
  order-note-notify/index.ts
```

### Paginas Admin (3 ficheiros)
```text
src/pages/
  OrderNotesPage.tsx
  OrderNoteDetailPage.tsx
  ClientUsersPage.tsx
```

### Componentes Admin (10 ficheiros)
```text
src/components/order-notes/
  OrderNotesList.tsx
  OrderNoteFilters.tsx
  OrderNoteDetail.tsx
  OrderNoteStatusFlow.tsx
  OrderNoteStatusBadge.tsx
  OrderNoteActions.tsx
  InstallmentApproval.tsx

src/components/client-users/
  ClientUsersList.tsx
  ClientUserDetail.tsx
  InviteClientDialog.tsx
```

### Hooks Admin (3 ficheiros)
```text
src/hooks/
  useOrderNotes.ts
  useOrderNoteStatus.ts
  useClientUsers.ts
```

### Rotas (App.tsx)
```text
Adicionar:
  /dashboard/order-notes       -> OrderNotesPage
  /dashboard/order-notes/:id   -> OrderNoteDetailPage
  /dashboard/client-users      -> ClientUsersPage
```

---

## Detalhe Tecnico: Email de Nova Encomenda

Template HTML profissional enviado ao escritorio:

```text
Assunto: Nova Encomenda #{order_number} - {client_name}

Corpo:
- Logo do workspace
- Dados do cliente (nome, email, NIF)
- Numero da encomenda
- Data de submissao
- Lista de produtos (nome, quantidade, preco)
- Totais (sem IVA, IVA, com IVA)
- Notas do cliente (se existirem)
- ALERTA: Pedido de prestacoes (se aplicavel)
  - Numero de prestacoes
  - Valor por prestacao
  - Justificacao do cliente
- Link para ver no dashboard
```

---

## Detalhe Tecnico: Workflow de Aprovacao de Prestacoes

Quando `installment_requested = true`:

1. Estado inicial: `awaiting_approval`
2. Admin ve badge amarelo "Aguardando Aprovacao"
3. Secao especial no detalhe:
   - Numero de prestacoes solicitadas
   - Valor por prestacao
   - Justificacao do cliente
   - Limite de credito do cliente
   - Botoes: Aprovar / Rejeitar
4. Ao aprovar:
   - status -> approved
   - approved_at = now()
   - approved_by = user_id
   - Email de confirmacao ao cliente
5. Ao rejeitar:
   - status -> rejected
   - rejected_at = now()
   - rejected_by = user_id
   - rejection_reason obrigatorio
   - Email ao cliente com motivo

---

## Actualizacao do Hook useClientOrders

Modificar para usar edge function na submissao:

```text
// Antes: update directo
const { error } = await supabase
  .from("order_notes")
  .update(...)

// Depois: chamar edge function
const response = await supabase.functions.invoke('order-note-submit', {
  body: { orderId, installmentData }
});
```

---

## Integracao com Navegacao do Dashboard

Adicionar ao menu lateral do dashboard:
- Secao "Encomendas"
  - Item: Notas de Encomenda (icon: FileText)
  - Item: Clientes B2B (icon: Users)

---

## Ordem de Implementacao

1. Edge function `order-note-submit` (envio + email)
2. Hook `useOrderNotes` (lista de encomendas admin)
3. Pagina `OrderNotesPage` com lista
4. Hook `useOrderNoteStatus` (alteracao de estados)
5. Pagina `OrderNoteDetailPage` com workflow
6. Edge function `order-note-notify` (emails de estado)
7. Hook `useClientUsers` (gestao de clientes)
8. Pagina `ClientUsersPage`
9. Rotas no App.tsx
10. Menu de navegacao
