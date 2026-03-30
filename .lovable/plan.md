

## Diagnóstico — 404 em `/dashboard/helpdesk/csat`

### Análise

Todos os ficheiros estão corretos e consistentes:

1. **Rota registada** — `HelpdeskRoutes.tsx` linha 23: `<Route path="/dashboard/helpdesk/csat" element={<HelpdeskCSAT />} />`
2. **Ficheiro existe** — `src/pages/dashboard/helpdesk/HelpdeskCSAT.tsx` (185 linhas, importa corretamente `useCSATDashboard`, `CSATCharts`, `CSATWidget`, `CountUp`, `Skeleton`, `TimeAgo`)
3. **Componentes existem** — `CSATCharts.tsx` (95 linhas) e `CSATWidget.tsx` (47 linhas)
4. **Hook existe** — `useCSATDashboard.ts` com tipo `CSATPeriod` exportado
5. **CRMRoutes inclui HelpdeskRoutes** — linha 71

### Causa

Mesmo problema anterior: o preview foi carregado antes do build terminar. O lazy import não resolveu e o React Router caiu no catch-all `*` → NotFound.

### Resolução

**Fazer refresh da página no preview.** Não são necessárias alterações de código.

Se persistir após refresh, posso investigar os logs de compilação para erros silenciosos.

