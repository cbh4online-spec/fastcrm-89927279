

## Limpeza de Informação Repetida no Módulo RH

### Diagnóstico

Existem duplicações em dois níveis:

**1. Páginas legacy vs. novas (funcionalidade sobreposta):**

| Legacy (oculta no sidebar) | Nova | Sobreposição |
|---|---|---|
| `LeavePage` (`/hr/leave`) | `HRAbsencesPage` (`/hr/absences`) | Mesma funcionalidade — férias e ausências |
| `TimeClockPage` (`/hr/time-clock`) | `HRTimeTrackingPage` (`/hr/time-tracking`) | Controlo de ponto |
| `MyTimePage` (`/hr/my-time`) | Dados espalhados nas novas páginas | Mistura ponto + férias + sessão |
| `SessionTimePage` (`/hr/session-time`) | Integrado no time-tracking novo | Tempo no sistema |

As legacy estão ocultas (`visibleInSidebar: false`) mas continuam a existir como código morto — hooks legacy (`useTimeEntries`, `useLeaveRequests`, `useLeaveBalances`, `useSessionTimeLogs`) também ficam activos sem necessidade.

**2. Rotas de Performance & OKRs sem entrada no `routeManifest.ts`:**
- `/dashboard/hr/okrs`, `/dashboard/hr/feedback`, `/dashboard/hr/checkins` existem no `HRRoutes.tsx` mas **não estão registadas** no `routeManifest.ts`, logo não aparecem na sidebar.

**3. Ficheiro `plan.md` com secções desactualizadas** — ainda documenta o plano de Time-Off como "a fazer" quando já está implementado.

---

### Plano de Implementação

#### 1. Remover páginas e rotas legacy
- Apagar `LeavePage.tsx`, `MyTimePage.tsx`, `SessionTimePage.tsx`, `TimeClockPage.tsx`
- Remover as 4 rotas legacy de `HRRoutes.tsx`
- Remover os 4 imports lazy correspondentes
- Remover as 4 entradas legacy do `routeManifest.ts` (linhas 277-280)
- Remover entrada legacy do `moduleNavRegistry.ts` (linha 78)

#### 2. Remover hooks legacy (se não usados noutro lado)
- Verificar referências a `useTimeEntries`, `useLeaveRequests`, `useLeaveBalances`, `useSessionTimeLogs`
- Remover os ficheiros de hooks que já não sejam importados
- Remover componentes legacy associados (`ClockInOutButton`, `LeaveCalendar`, `LeaveRequestDialog`, `SessionTimeChart`) se exclusivos das páginas removidas

#### 3. Adicionar OKRs/Feedback/Checkins ao routeManifest
- Registar 3 entradas novas no `routeManifest.ts` na secção RH:
  - `hr-okrs` → "OKRs" → `/dashboard/hr/okrs`
  - `hr-feedback` → "Feedback" → `/dashboard/hr/feedback`
  - `hr-checkins` → "Check-ins" → `/dashboard/hr/checkins`

#### 4. Actualizar `plan.md`
- Marcar Time-Off como implementado (✅)
- Remover secções de diagnóstico/plano já executadas
- Manter apenas resumo do que foi feito + o que falta

---

### Critérios de Aceitação
1. Sidebar RH mostra apenas as páginas novas (sem duplicação)
2. OKRs, Feedback e Check-ins visíveis na sidebar
3. Zero imports de hooks/componentes legacy não usados
4. Aplicação compila sem erros
5. `plan.md` reflecte o estado actual do projecto

