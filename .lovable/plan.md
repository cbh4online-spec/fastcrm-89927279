

## Adicionar Pica Ponto ao Dashboard Principal

### Diagnóstico

O componente `ClockInOutButton` existe e funciona correctamente, mas só aparece em:
- `/dashboard/member` (MemberPanel)
- `/dashboard/hr/time-clock` (TimeClockPage)
- `/dashboard/hr/my-time` (MyTimePage)

**Não está presente** no dashboard principal (`/dashboard` → `WeeklyDashboard.tsx`), que é onde o utilizador passa mais tempo.

### Alteração

| Ficheiro | Alteração |
|----------|-----------|
| `src/pages/WeeklyDashboard.tsx` | Importar e adicionar `ClockInOutButton` logo após o `PremiumDashboardHeader`, antes da secção de IA. Posição estratégica: é a primeira acção do dia. |

### Detalhe

Inserir o componente entre o header executivo (linha 52) e a secção de IA (linha 55):

```tsx
import { ClockInOutButton } from "@/components/hr/ClockInOutButton";

// No JSX, após PremiumDashboardHeader:
<ClockInOutButton />

{/* 2. Assistente de Vendas IA */}
<PremiumAISection />
```

O componente já é autónomo — trata do estado (clock in/out), relógio em tempo real e meteorologia internamente. Não requer props.

### Critérios de aceitação
1. Widget de pica ponto visível no dashboard principal (`/dashboard`)
2. Funcionalidade de clock in/out operacional
3. Sem duplicação — mantém-se nos outros locais existentes
4. Responsivo em mobile

