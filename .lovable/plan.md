## Objetivo

Alinhar mobile bottom nav, pesquisa global, command palette e placeholder do filtro da sidebar com a nova taxonomia de 9 grupos (Início, Clientes, Vendas, Produtos, Comunicação, Operações, Relatórios, Aplicações, Definições) — sem tocar em páginas, rotas nem backend.

## Ficheiros a alterar (5)

### 1. `src/config/routeManifest.ts` — helper mínimo
Adicionar um único helper reutilizável, sem alterar dados existentes:

- `getTopLevelGroupForRoute(route: RouteEntry): TopLevelGroup | null` — devolve o grupo top-level de uma rota, respeitando `navGroups`, `includeRouteKeys` e `excludeRouteKeys` (a ordem `includeRouteKeys` tem prioridade sobre `navGroups`, e `excludeRouteKeys` invalida). Iterar `TOP_LEVEL_GROUPS` e devolver o primeiro match.

Usado por `MobileBottomNav` (ativo por grupo) e `GlobalSearch` (agrupar resultados).

### 2. `src/components/layout/MobileBottomNav.tsx` — reescrito
- Substituir a lista fixa `TABS` pela derivação a partir de `buildTopLevelSections(installedModuleSlugs, canAccess, mode)`.
- Fontes: `useWorkspaceModules().installedModuleIds`, `useMenuPermissions().canAccessMenu`, `useAppMode().mode`.
- Ordem prioritária de tabs: `inicio`, `clientes`, `vendas`, `comunicacao`. Fallback (se algum estiver vazio): `produtos`, `operacoes`, `relatorios`, `aplicacoes`. Máximo 4 tabs + "Mais".
- Cada tab navega para `items[0].href` do respetivo grupo (a primeira rota permitida real).
- Ícones e labels do próprio `TopLevelGroupMeta` (Início, Clientes, Vendas, Comunicação).
- Estado ativo: uma rota está ativa se `getTopLevelGroupForRoute(rota-atual) === tab.key`. Isto elimina os prefixos manuais — Pipeline/Oportunidades passam automaticamente a marcar Clientes, Faturas/Propostas marcam Vendas, WhatsApp/Marketing marcam Comunicação.
- Match por `location.pathname`: procurar no `ROUTE_MANIFEST` a rota cujo `href` seja igual ou seja o prefixo mais longo do pathname, e obter o grupo desse route.
- Grelha `grid-cols-{n+1}` dinâmica (n = número de tabs visíveis, +1 do "Mais").
- Botão "Mais" preservado: chama `onMenuClick()` (abre `AdaptiveSidebar`).

### 3. `src/components/layout/GlobalSearch.tsx` — pesquisa alinhada
- Remover `import { getAllSearchablePages }` e o snapshot module-level `ALL_PAGES`.
- Passar a usar `getSearchableRoutes(installedModuleIds, canAccessMenu, mode)` via hooks `useWorkspaceModules`, `useMenuPermissions`, `useAppMode` — memoizado.
- Filtrar rotas com parâmetros: excluir `href` que contém `:` (ex.: `:id`, `:slug`).
- Agrupar `filteredPages` por `getTopLevelGroupForRoute(...)`, respeitando a ordem `TOP_LEVEL_GROUPS`. Renderizar um `CommandGroup` por grupo top-level com `heading = tg.label`. Nunca usar títulos legados (MEGA_GROUPS/NAV_GROUPS).
- Matching mantém `label` + também o `label` do grupo top-level (contém, case-insensitive). Sem fuzzy novo.
- Estado vazio (`!search`): mostrar no máximo 8 rotas totais, escolhidas do topo dos grupos `inicio`, `clientes`, `vendas`, `comunicacao` (2 por grupo, ignorando duplicados). Evita "20 páginas técnicas".
- Adicionar listener `Cmd/Ctrl + K` (além do `Cmd/Ctrl + /` já existente). Guardar contra input focado: se `document.activeElement` for `input/textarea/select/contenteditable` e o diálogo ainda não estiver aberto, ignorar. Se `open === true`, permitir toggle.
- Preservar integralmente as pesquisas de Leads, Contactos, Empresas, Oportunidades e todos os `CommandGroup`/`CommandSeparator` associados.

### 4. `src/components/layout/TopBar.tsx` — libertar Cmd/Ctrl+K
- Remover o `useEffect` (linhas 38–48) que captura `Cmd/Ctrl + K` e navega para `/dashboard/ask`.
- Remover o `<kbd>⌘K</kbd>` (linha 90) do botão Ask FastCRM.
- Manter o botão Ask FastCRM (click continua a navegar para `/dashboard/ask`) e o tooltip.

### 5. `src/components/layout/AdaptiveSidebar.tsx` — placeholder
- Alterar `placeholder="Pesquisar menu... (⌘K)"` para `placeholder="Filtrar menu..."` (linha 566). Nenhuma outra alteração.

## Lógica de seleção da tab mobile (resumo)

```text
tabs = buildTopLevelSections(...)
priority = ["inicio","clientes","vendas","comunicacao"]
fallback = ["produtos","operacoes","relatorios","aplicacoes"]
visible = priority.filter(tg exists & tg.items.length>0)
while visible.length < 4 and fallback tem candidatos:
  adicionar próximo fallback disponível
render min(visible.length, 4) tabs + botão "Mais"
```

## Validação

- `bunx tsgo --noEmit`.
- Smoke visual (mental): `/dashboard/pipeline` marca Clientes; `/dashboard/proposals` marca Vendas; `/dashboard/whatsapp` marca Comunicação.

## Fora de âmbito

- Alterações a páginas, rotas, backend, autenticação, migrations, styling global, feature flags e à estrutura dos 9 grupos.
- Novo atalho dedicado para Ask FastCRM (fase posterior).
- Remoção dos flags legados `ui.adaptive_sidebar_enabled` / `ui.watidy_sidebar_enabled`.
