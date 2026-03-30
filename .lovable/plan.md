

## Fase 2B — Melhorias na Lista de Tickets e Dashboard

### Diagnóstico

**TicketsList.tsx** já tem `react-timeago`, `fuse.js` e `useDebounce` — mas:
- Filtros usam `useState` em vez de `nuqs` (não persistem na URL)
- Sem coluna "Agente" com avatar
- Sem coluna "Última atualização"
- Sem coluna "Atualizado" na tabela

**TicketsDashboard.tsx** já tem `react-countup` e `recharts` — está bastante completo. Faltam apenas refinamentos menores (tickets recentes com timeago, total de tickets no header).

**TicketDetailSidebar.tsx** não tem dropdown de atribuição de agente (usa-se `useWorkspaceMembers` noutros módulos).

---

### Alterações

#### 1. `TicketsList.tsx` — URL Sync + Agent Avatar + Updated Column

- Substituir `useState<TicketFilters>` e `useState(search)` por `useURLFilters` de `@/hooks/useURLFilters` com defaults `{ status: "", priority: "", type: "", assigned_to: "", search: "" }`
- Adicionar coluna **"Agente"** na tabela com avatar (initiais + nome) usando `useWorkspaceMembers` para resolver `assigned_to` → profile
- Adicionar coluna **"Atualizado"** com `<TimeAgo date={ticket.updated_at} />`
- Adicionar filtro **"Agente"** (dropdown com membros do workspace)
- Ajustar `fuse.js` para usar o `debouncedSearch` do `useURLFilters` (já synced com URL)

#### 2. `TicketsDashboard.tsx` — Tickets Recentes + Refinamentos

- Adicionar secção **"Tickets Recentes"** (últimos 5 tickets com `react-timeago`, badge de status, prioridade)
- Adicionar **total de tickets** e **resolvidos hoje** no header como contexto
- KPI "Tickets Abertos" já usa `CountUp` — manter

#### 3. `TicketDetailSidebar.tsx` — Dropdown Agente

- Adicionar secção **"Atribuído a"** com dropdown que lista membros do workspace via `useWorkspaceMembers`
- Mostrar avatar + nome do agente selecionado
- `onUpdate({ assigned_to: memberId })` ao selecionar

#### 4. `useClientTicketsAdmin.ts` — Join Profiles (opcional)

- Manter query simples (`select("*")`), resolver nomes de agentes client-side via `useWorkspaceMembers` (mesmo padrão usado em Opportunities)

---

### Ficheiros Modificados

```text
src/pages/dashboard/tickets/TicketsList.tsx         — nuqs, agent column, updated column
src/pages/dashboard/tickets/TicketsDashboard.tsx    — tickets recentes section
src/components/tickets/TicketDetailSidebar.tsx       — agent assign dropdown
```

### Critérios de Aceitação
- Filtros persistidos na URL (recarregar página mantém filtros)
- Coluna "Agente" com avatar e initiais
- Coluna "Atualizado" com tempo relativo
- Dropdown de agente na sidebar do detalhe
- Secção de tickets recentes no dashboard
- 0 erros TypeScript, responsivo, dark mode

