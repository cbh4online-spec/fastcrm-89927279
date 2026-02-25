

# Customer Lifecycle — Diagrama Visual + Campo lifecycle_stage

## Contexto

A imagem de referência mostra o ciclo de vida do cliente ao estilo Attio: Website Visitors → (Signups / Lead Forms / Chats) → Sales → Onboarding → Customer Success, com divisão visual entre "Prospect" e "Customer".

O projecto já tem:
- `@xyflow/react` instalado e usado em FlowBuilder e DataModel
- Tabela `contacts` com `lead_status` e `client_status` mas sem `lifecycle_stage`
- Tabela `leads` com `status`
- Tipos em `src/types/customerJourney.ts` com stages (novo, em_onboarding, etc.)

## Alterações

### 1. Migração de Base de Dados

Adicionar coluna `lifecycle_stage` à tabela `contacts`:

```sql
ALTER TABLE public.contacts 
ADD COLUMN lifecycle_stage text NOT NULL DEFAULT 'visitor';

-- Index para queries de contagem por stage
CREATE INDEX idx_contacts_lifecycle_stage 
ON public.contacts(workspace_id, lifecycle_stage);
```

Valores válidos: `visitor`, `lead`, `prospect`, `sales`, `onboarding`, `customer`, `churned`.

### 2. Nova Página — `/dashboard/lifecycle`

Criar `src/pages/CustomerLifecyclePage.tsx` com `DashboardLayout`.

### 3. Componente Visual — `CustomerLifecycleFlow.tsx`

Usar `@xyflow/react` (ReactFlow) para renderizar o diagrama:

```text
┌──────────────┐     ┌──────────────────┐     ┌────────┐     ┌────────────┐     ┌──────────────────┐
│   Visitantes │ ──► │  Leads           │ ──► │ Vendas │ ──► │ Onboarding │ ──► │ Customer Success │
│   (website)  │     │  (form/chat/...) │     │        │     │            │     │                  │
│     ###      │     │       ###        │     │  ###   │     │    ###     │     │       ###        │
└──────────────┘     └──────────────────┘     └────────┘     └────────────┘     └──────────────────┘
                     ◄── Prospect ──────────── ┆ ─────────── Customer ─────────────────────────────►
```

- Cada nó mostra o **nome do estágio** e a **contagem de contactos** nesse stage
- Divisão visual (linha pontilhada) entre Prospect e Customer
- Nós customizados com cores e ícones
- Dados reais via query `contacts` agrupados por `lifecycle_stage`

### 4. Hook — `useCustomerLifecycle.ts`

```typescript
// Conta contactos por lifecycle_stage no workspace actual
// Retorna: { stage: string, count: number }[]
// + funções para actualizar o stage de um contacto
```

### 5. Painel de KPIs no topo

- Total de contactos
- Taxa de conversão Lead → Customer
- Contactos em cada fase
- Tempo médio por fase (futuro)

### 6. Navegação

Adicionar ao sidebar (`nav.v1.ts`) no grupo CRM:

```typescript
{ name: "Ciclo de Vida", href: "/dashboard/lifecycle", icon: GitBranch, group: "CRM" }
```

Adicionar rota no `App.tsx`.

### 7. Edição de Lifecycle Stage

No detalhe do contacto, permitir alterar o `lifecycle_stage` via select dropdown. O diagrama actualiza-se automaticamente via react-query.

## Ficheiros

| Ficheiro | Acção |
|----------|-------|
| Migração SQL | Adicionar coluna `lifecycle_stage` a `contacts` |
| `src/pages/CustomerLifecyclePage.tsx` | Nova página |
| `src/components/lifecycle/CustomerLifecycleFlow.tsx` | Diagrama ReactFlow |
| `src/components/lifecycle/LifecycleStageNode.tsx` | Nó customizado |
| `src/components/lifecycle/LifecycleKPIs.tsx` | KPIs no topo |
| `src/hooks/useCustomerLifecycle.ts` | Hook de dados |
| `src/config/nav.v1.ts` | Adicionar item "Ciclo de Vida" |
| `src/App.tsx` | Adicionar rota `/dashboard/lifecycle` |

