
# Plano: Página de Detalhes de Oportunidades (Full-Page Layout)

## Objetivo
Transformar a visualização de detalhes de oportunidades de um **Sheet lateral** para uma **página completa dedicada**, seguindo exatamente o design de referência.

## Análise do Design de Referência

O design mostra uma estrutura de página completa com:

```text
┌─────────────────────────────────────────────────────────────────────────────────┐
│  < Opportunity Details                                    🔔  ?  (+)            │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                          │ Contacts        +    │
│  SaaS Collaboration Tool Deal                            │ ┌─Primary Contact──┐ │
│  Overview  Tasks  Notes                                  │ │ Jane Doe         │ │
│                                                          │ │ Product Manager  │ │
│  ┌──────────────────────────────────────────┐           │ └──────────────────┘ │
│  │ Stages                    [Move to Next] │           │ ┌─Key Influencer───┐ │
│  │ ✓ Prospecting ✓ Qualified ✓ Discovery    │           │ │ John Smith       │ │
│  │   ○ Proposal Sent  Negotiation  Closed   │           │ │ IT Director      │ │
│  └──────────────────────────────────────────┘           │ └──────────────────┘ │
│                                                          │ ┌─Final Approver──┐  │
│  Opportunity Details                                     │ │ John Smith       │ │
│  ┌─────────────┬───────────────┬────────────┐           │ │ CTO              │ │
│  │ ID: OP-001  │ Industry      │ Close Date │           │ └──────────────────┘ │
│  │             │ Technology    │ 2024-12-05 │           │                      │
│  └─────────────┴───────────────┴────────────┘           │ Company              │
│                                                          │ ┌──────────────────┐ │
│  Financials                                              │ │ Code Sphere      │ │
│  ┌───────────┬──────────┬──────────┬──────────┐         │ │ Technology       │ │
│  │ Revenue   │ Discount │ MRR      │ Competitor│        │ │ Indonesia  100K+ │ │
│  │ $8,000    │ 10%      │ $80/user │ $85/user  │        │ └──────────────────┘ │
│  └───────────┴──────────┴──────────┴──────────┘         │                      │
│                                                          │                      │
│  Activity                                                │                      │
│  [📅 Date Range] [All Activity ▼] [🔍 Search]            │                      │
│  ▼ This Week                                             │                      │
│  ▼ Last Week                                             │                      │
│  ▼ Mar 14                                                │                      │
│     📞 John schedule a call  Apr 18, 2023 4:05PM        │                      │
│     ⊕ Opportunity created...  Apr 18, 2023 4:05PM       │                      │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

## Alterações Necessárias

### 1. Nova Rota para Detalhes de Oportunidade

**Ficheiro:** `src/App.tsx`

Adicionar rota dedicada:
```
/dashboard/opportunities/:id → OpportunityDetailPage
```

---

### 2. Nova Página de Detalhes

**Ficheiro a criar:** `src/pages/OpportunityDetail.tsx`

Página wrapper que utiliza o `DashboardLayout` e renderiza o novo componente de detalhes.

---

### 3. Componente Principal de Detalhes (Full-Page)

**Ficheiro a criar:** `src/components/opportunities/OpportunityDetailPage.tsx`

Layout em 2 colunas:
- **Coluna Principal (flex-1):** Header, Tabs, Stepper, Details Grid, Activity
- **Sidebar Direita (w-80):** Contactos e Empresa

---

### 4. Redesign do Stepper de Estágios

**Ficheiro a editar:** `src/components/opportunities/detail/OpportunityStagesStepper.tsx`

Alterar de "cards empilhados" para **pills horizontais com checkmarks** no estilo da imagem:

- Estágios concluídos: fundo verde claro + checkmark
- Estágio atual: indicador circular preenchido
- Estágios futuros: texto cinza, sem background

---

### 5. Grid de Detalhes Melhorada

**Ficheiro a editar:** `src/components/opportunities/detail/OpportunityDetailsGrid.tsx`

Reorganizar para mostrar:
- **Secção 1 - Opportunity Details:** ID, Industry, Close Date, Probability
- **Secção 2 - Financials:** Expected Revenue, Discount, Subscription Details, Competitor Pricing

---

### 6. Sidebar de Contactos com Roles

**Ficheiro a editar:** `src/components/opportunities/detail/OpportunityContactsSidebar.tsx`

- Adicionar badges coloridos por tipo: "Primary Contact" (verde), "Key Influencer" (azul), "Final Approver" (roxo)
- Cards individuais para cada contacto com email/telefone
- Secção de Company separada no fundo

---

### 7. Navegação no Kanban

**Ficheiro a editar:** `src/components/opportunities/OpportunitiesModule.tsx`

Ao clicar num card de oportunidade, navegar para `/dashboard/opportunities/:id` em vez de abrir o Sheet.

---

## Detalhes Técnicos

### Estrutura de Ficheiros Final

```
src/
├── pages/
│   └── OpportunityDetail.tsx (CRIAR)
├── components/opportunities/
│   ├── OpportunityDetailPage.tsx (CRIAR)
│   └── detail/
│       ├── OpportunityStagesStepper.tsx (EDITAR)
│       ├── OpportunityDetailsGrid.tsx (EDITAR)
│       ├── OpportunityContactsSidebar.tsx (EDITAR)
│       └── OpportunityActivityTimeline.tsx (manter)
```

### Hooks Reutilizados
- `useOpportunityDetail` - já existe
- `usePipelineStagesEnhanced` - já existe
- `useUpdateOpportunityEnhanced` - já existe
- `useActivities` - já existe

### Compatibilidade
- O `OpportunityDetailDialog` (Sheet) pode ser mantido para uso em contextos de quick-view, mas a navegação principal usará a página dedicada.

---

## Resumo das Alterações

| Acção | Ficheiro |
|-------|----------|
| Criar | `src/pages/OpportunityDetail.tsx` |
| Criar | `src/components/opportunities/OpportunityDetailPage.tsx` |
| Editar | `src/App.tsx` (adicionar rota) |
| Editar | `src/components/opportunities/OpportunitiesModule.tsx` (navegação) |
| Editar | `src/components/opportunities/detail/OpportunityStagesStepper.tsx` |
| Editar | `src/components/opportunities/detail/OpportunityDetailsGrid.tsx` |
| Editar | `src/components/opportunities/detail/OpportunityContactsSidebar.tsx` |

O resultado será uma página de detalhes de oportunidade idêntica ao design de referência, com navegação por URL e layout responsivo.
