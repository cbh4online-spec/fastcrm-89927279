

## Adicionar Menu Lateral às Páginas do Helpdesk

### Diagnóstico

As páginas do Helpdesk estão inconsistentes — apenas 2 de 8 usam o `DashboardLayout` (que inclui a sidebar, topbar, auth guard e todos os wrappers do CRM):

| Página | Tem `DashboardLayout`? |
|--------|----------------------|
| HelpdeskAutomations | Sim |
| HelpdeskSLAPolicies | Sim |
| HelpdeskDashboard | **Não** |
| HelpdeskTicketsList | **Não** |
| HelpdeskTicketDetail | **Não** |
| HelpdeskCannedResponses | **Não** |
| HelpdeskKnowledgeBase | **Não** |
| HelpdeskCSAT | **Não** |

### Solução

Envolver as 6 páginas que faltam com `<DashboardLayout>`. Isto é o mesmo padrão já usado em `HelpdeskAutomations` e `HelpdeskSLAPolicies`, e em todas as outras páginas do dashboard (ex: `WeeklyDashboard`).

### Ficheiros a Editar

1. **`src/pages/dashboard/helpdesk/HelpdeskDashboard.tsx`** — importar `DashboardLayout`, envolver o return
2. **`src/pages/dashboard/helpdesk/HelpdeskTicketsList.tsx`** — idem
3. **`src/pages/dashboard/helpdesk/HelpdeskTicketDetail.tsx`** — idem
4. **`src/pages/dashboard/helpdesk/HelpdeskCannedResponses.tsx`** — idem
5. **`src/pages/dashboard/helpdesk/HelpdeskKnowledgeBase.tsx`** — idem
6. **`src/pages/dashboard/helpdesk/HelpdeskCSAT.tsx`** — idem

### Alteração Tipo (repetida em cada ficheiro)

```tsx
// Adicionar import
import { DashboardLayout } from "@/components/layout/DashboardLayout";

// Envolver o return existente
return (
  <DashboardLayout>
    {/* conteúdo existente */}
  </DashboardLayout>
);
```

