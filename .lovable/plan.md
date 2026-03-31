## Módulo RH — Estado Actual

### Time-Off Management — Implementado ✅

- Tabelas: `hr_absence_types`, `hr_absences`, `hr_leave_balances`, `hr_public_holidays`
- Edge functions: `hr-leave-request-create`, `hr-leave-request-approve`, `hr-absence-approve`, `hr-seed-defaults`
- Hooks: `useHRAbsences`, `useHRLeaveBalances`, `useHRPublicHolidays`
- Página: `/dashboard/hr/absences`

### Performance & OKRs — Implementado ✅

- Tabelas: `hr_okrs`, `hr_key_results`, `hr_feedback`, `hr_checkins`
- RLS: workspace isolation + permissões granulares
- Hooks: `useOKRs`, `useFeedback`, `useCheckins`, `useCurrentHREmployee`
- Páginas: `/dashboard/hr/okrs`, `/dashboard/hr/feedback`, `/dashboard/hr/checkins`

### Limpeza Legacy — Concluída ✅

- Removidas páginas legacy: `LeavePage`, `MyTimePage`, `SessionTimePage`, `TimeClockPage`
- Removidos hooks legacy: `useLeaveRequests`, `useLeaveBalances`, `useSessionTimeLogs`
- Removidos componentes legacy: `LeaveCalendar`, `LeaveRequestDialog`, `SessionTimeChart`
- Mantidos: `ClockInOutButton` + `useTimeEntries` (usados no MemberPanel e WeeklyDashboard)
- OKRs/Feedback/Check-ins registados no `routeManifest.ts`
- Entrada legacy `hr-time-tracking` removida do `moduleNavRegistry.ts`
