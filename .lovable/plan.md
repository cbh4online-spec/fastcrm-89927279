
# Plano: Fase 5 - Integração Final & Polimento

## Estado Actual (Fases 1-4 Concluídas)

**Fase 1 (Base):** Base de dados, Portal do Cliente, Hooks do cliente
**Fase 2 (Core):** Edge Functions, Dashboard Admin, Workflow de estados
**Fase 3 (Polish):** ProductDetailModal, PDF, Dialogs de cliente, OrderCard
**Fase 4 (Integração):** OrderNoteEvent, CompanyOrderNoteEvent, CreateDealFromOrder, ClientUserStats

### Componentes Criados mas NÃO Integrados

Os seguintes componentes foram criados na Fase 4 mas ainda não estão a ser usados:

| Componente | Estado | Problema |
|------------|--------|----------|
| `OrderNoteEvent` | Criado | Não integrado na timeline de contactos |
| `CompanyOrderNoteEvent` | Criado | Não integrado na timeline de empresas |
| `useContactOrderNotes` | Criado | Hook não utilizado em nenhum componente |
| `useCompanyOrderNotes` | Criado | Hook não utilizado em nenhum componente |

---

## Fase 5: Integração Final

### 1. Criar Secção de Encomendas para Contactos

Integrar os Order Notes na página de detalhe do Contacto, adicionando uma nova secção no menu lateral.

| Ficheiro | Tipo | Descrição |
|----------|------|-----------|
| `src/components/contacts/sections/ContactOrderNotesSection.tsx` | Novo | Secção que lista encomendas do contacto |

**Funcionalidades:**
- Mostrar lista de encomendas associadas ao contacto (via client_user.contact_id)
- Usar o hook `useContactOrderNotes`
- Usar o componente `OrderNoteEvent` para cada encomenda
- Estado vazio se não houver cliente B2B associado

### 2. Criar Secção de Encomendas para Empresas

Integrar os Order Notes na página de detalhe da Empresa.

| Ficheiro | Tipo | Descrição |
|----------|------|-----------|
| `src/components/companies/sections/CompanyOrderNotesSection.tsx` | Novo | Secção que lista encomendas da empresa |

**Funcionalidades:**
- Mostrar lista de encomendas de todos os clientes B2B da empresa
- Usar o hook `useCompanyOrderNotes`
- Usar o componente `CompanyOrderNoteEvent` para cada encomenda
- Mostrar estatísticas agregadas

### 3. Adicionar Item "Encomendas" ao Menu de Entidade

Adicionar nova opção ao menu lateral das páginas de Contacto e Empresa.

| Ficheiro | Tipo | Descrição |
|----------|------|-----------|
| `src/types/entity.ts` | Editar | Adicionar 'orders' ao MenuSection type |
| `src/components/entity/EntitySidebarMenu.tsx` | Editar | Adicionar item "Encomendas B2B" |
| `src/components/contacts/eni/ENIContactDetailWithSidebar.tsx` | Editar | Renderizar ContactOrderNotesSection |
| `src/components/companies/CompanyDetailWithSidebar.tsx` | Editar | Renderizar CompanyOrderNotesSection |

### 4. Adicionar Contagem de Encomendas aos Counts

| Ficheiro | Tipo | Descrição |
|----------|------|-----------|
| `src/hooks/useEntityCounts.ts` | Editar | Adicionar contagem de encomendas |

### 5. Integrar com EntityTimelineSection (Opcional)

Adicionar eventos de encomenda à timeline unificada.

| Ficheiro | Tipo | Descrição |
|----------|------|-----------|
| `src/components/timeline/EntityTimelineSection.tsx` | Editar | Buscar e mostrar order_notes na timeline |

---

## Estrutura de Ficheiros

### Novos Ficheiros (2)
```text
src/components/contacts/sections/ContactOrderNotesSection.tsx
src/components/companies/sections/CompanyOrderNotesSection.tsx
```

### Ficheiros a Editar (5)
```text
src/types/entity.ts                                    # MenuSection type
src/components/entity/EntitySidebarMenu.tsx           # Novo item menu
src/components/contacts/eni/ENIContactDetailWithSidebar.tsx  # Case 'orders'
src/components/companies/CompanyDetailWithSidebar.tsx  # Case 'orders'
src/hooks/useEntityCounts.ts                          # Contagem
```

---

## Detalhe Técnico: ContactOrderNotesSection

```text
+------------------------------------------+
| ENCOMENDAS B2B                           |
+------------------------------------------+
| [Card] Sem cliente B2B associado         |
| ou                                       |
| [OrderNoteEvent] NE-2026-00001 ✓ Aprovado|
| [OrderNoteEvent] NE-2026-00002 ⏳ Submet.|
| [OrderNoteEvent] NE-2026-00003 ✗ Cancelado|
+------------------------------------------+
```

---

## Detalhe Técnico: Menu Lateral

Adicionar ao `EntitySidebarMenu.tsx`:

```text
Secções existentes:
- Visão Geral
- Insights
- Detalhes
- Histórico
- Timeline
- Mensagens
- Tarefas
- Automatizações
- Oportunidades
- Notas
- Pagamentos

Nova secção:
- Encomendas B2B (icon: ShoppingCart ou FileText)
```

---

## Detalhe Técnico: useEntityCounts

Adicionar query para contar encomendas associadas:

```text
// Para contactos
SELECT COUNT(*) FROM order_notes
WHERE client_user_id IN (
  SELECT id FROM client_users WHERE contact_id = :entityId
)
AND status != 'draft'

// Para empresas
SELECT COUNT(*) FROM order_notes
WHERE client_user_id IN (
  SELECT id FROM client_users WHERE company_id = :entityId
)
AND status != 'draft'
```

---

## Ordem de Implementação

1. Editar `src/types/entity.ts` - adicionar 'orders' ao MenuSection
2. Criar `ContactOrderNotesSection.tsx`
3. Criar `CompanyOrderNotesSection.tsx`
4. Editar `EntitySidebarMenu.tsx` - adicionar item de menu
5. Editar `ENIContactDetailWithSidebar.tsx` - case 'orders'
6. Editar `CompanyDetailWithSidebar.tsx` - case 'orders'
7. (Opcional) Editar `useEntityCounts.ts` - adicionar orders_count

---

## Resultado Final

Após esta fase:
- Página de Contacto terá secção "Encomendas B2B" no menu lateral
- Página de Empresa terá secção "Encomendas B2B" no menu lateral
- Cada secção mostrará as encomendas associadas via client_users
- Clique na encomenda abre o detalhe no dashboard admin
- Módulo de Notas de Encomenda totalmente integrado com o CRM
