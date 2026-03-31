

## Fase 6: Navegação & Integração Final — Plano

### Diagnóstico

Comparação do guia `06-navigation-integration-prompt.md` com o estado actual:

| Requisito do guia | Estado |
|---|---|
| Sidebar HR com 8 entradas | ✅ Existe via `routeManifest.ts` (grupo "rh", 15+ entradas) |
| Rotas HR configuradas | ✅ `HRRoutes.tsx` com todas as rotas |
| HR Dashboard com KPIs | ✅ `HRDashboardPage.tsx` com 6 KPIs, calendário, quick actions |
| Página Departamentos dedicada | ❌ Está embutida como tab no `HRSettingsPage` |
| Página Cargos dedicada | ❌ Está embutida como tab no `HRSettingsPage` |
| Breadcrumbs HR | ❌ Não existe |
| Roles hr_admin/manager | ⚠️ A verificar — constraint actual em `workspace_members.role` |
| Label grupo "People Operations" | ❌ Actualmente é "RH" |

**Conclusão**: A maior parte já está implementada. Faltam 3 componentes: breadcrumbs, páginas dedicadas para departamentos/cargos, e label do grupo.

---

### Plano (4 passos)

#### 1. Breadcrumbs HR
- Criar `src/components/hr/HRBreadcrumb.tsx` — componente que mostra `Dashboard > People Operations > [Página actual]`
- Usa `useLocation()` com mapa de rotas HR para labels
- Integrar no topo de todas as páginas HR (via layout wrapper ou import directo)

#### 2. Páginas dedicadas — Departamentos e Cargos
- Criar `src/pages/dashboard/hr/HRDepartmentsPage.tsx` — CRUD de departamentos (extrair lógica existente do `HRSettingsPage`)
- Criar `src/pages/dashboard/hr/HRPositionsPage.tsx` — CRUD de cargos/job titles (extrair lógica existente do `HRSettingsPage`)
- Adicionar rotas no `HRRoutes.tsx`
- Adicionar entradas no `routeManifest.ts`

#### 3. Actualizar Route Manifest
- Renomear label do grupo "RH" → "People Operations"
- Adicionar entradas `hr-departments` e `hr-positions`

#### 4. Integrar Breadcrumbs nas páginas HR
- Importar `HRBreadcrumb` nas páginas HR existentes (dashboard, employees, time-tracking, absences, etc.)

---

### Ficheiros a criar/alterar

| Ficheiro | Acção |
|---|---|
| `src/components/hr/HRBreadcrumb.tsx` | Criar |
| `src/pages/dashboard/hr/HRDepartmentsPage.tsx` | Criar |
| `src/pages/dashboard/hr/HRPositionsPage.tsx` | Criar |
| `src/routes/HRRoutes.tsx` | Adicionar 2 rotas |
| `src/config/routeManifest.ts` | Renomear grupo + 2 entradas novas |
| Páginas HR existentes (~12 ficheiros) | Adicionar `<HRBreadcrumb />` |

### Critérios de Aceitação
1. Breadcrumbs visíveis em todas as páginas HR com navegação funcional
2. Departamentos e Cargos com páginas dedicadas e CRUD completo
3. Grupo "People Operations" na sidebar
4. Todas as rotas HR acessíveis e sem erros

