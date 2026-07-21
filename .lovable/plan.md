
# Simplificação da Navegação Principal — FastCRM

## 1. Diagnóstico atual

**`src/config/routeManifest.ts` (598 linhas)** é a SSoT declarativa da navegação:
- ~200 entradas `RouteEntry` com `group: NavGroup`, `menuKey`, `moduleSlug`, `visibleInSidebar`, `status`.
- Existem **20 `NavGroup`s** granulares (`inicio`, `comercial-crm`, `comercial-pipeline`, `comercial-prospecting`, `agenda`, `comunicacao`, `marketing`, `vendas`, `compras`, `suporte`, `rh`, `loja-online`, `marketplace-c2c`, `portal-b2b`, `operacoes`, `seguranca`, `performance`, `ai-strategy`, `inteligencia`, `administracao`).
- Existe já um segundo nível **`MEGA_GROUPS`** (12 grupos) via `buildMegaGroupSections()` — mas nenhum consumidor ativo o usa como topo único.
- Helpers `getSidebarItems()`, `buildSidebarSections()`, `getSearchableRoutes()` já respeitam `moduleSlug`, `menuKey`, `canAccess`, `visibleInSidebar` — a serem preservados.

**`src/components/layout/AdaptiveSidebar.tsx` (531 linhas)** consome `buildSidebarSections()` e renderiza cada `NavGroup` como uma secção `Collapsible` — resultando em ~20 secções abertas simultaneamente, causando a sensação de complexidade.

**Situação:** a arquitectura já está pronta para 2 níveis; falta apenas (a) redefinir os mega-grupos para os 9 pedidos e (b) fazer a sidebar renderizar mega-grupos em vez de nav-groups.

## 2. Ficheiros mínimos a alterar

| Ficheiro | Motivo |
|---|---|
| `src/config/routeManifest.ts` | Redefinir `MegaGroup` (9 chaves: `inicio`, `clientes`, `vendas`, `produtos`, `comunicacao`, `operacoes`, `relatorios`, `aplicacoes`, `definicoes`) e o array `MEGA_GROUPS` mapeando os `NavGroup`s existentes. Nenhuma `RouteEntry` é apagada, movida ou renomeada — apenas a agregação muda. Adicionar helper `buildTopLevelSections()` que devolve os 9 grupos com sub-secções internas colapsáveis. |
| `src/components/layout/AdaptiveSidebar.tsx` | Substituir o loop sobre `buildSidebarSections()` por um loop sobre `buildTopLevelSections()`. Cada um dos 9 grupos-topo renderiza como accordion; dentro, sub-secções (as actuais `NavGroup`s) mantêm-se como sub-grupos ou lista lisa. Reutilizar `SidebarNavItem`, badges, `useSidebarBadges`, `useMenuPermissions`, `useWorkspaceModules`. Adicionar o botão global **+ Criar** acima dos grupos, reutilizando o `DropdownMenu` já importado; itens do dropdown filtrados pelas mesmas regras (`canAccess`, `installed`). |

**Só se estritamente necessário** (a decidir na implementação, sem alargar âmbito):
- `src/config/routeManifest.ts` — marcar como `visibleInSidebar: false` um pequeno grupo de rotas técnicas actualmente visíveis mas que pertencem a super-admin (`kernel`, `product-audit`, `super-admin`, `kernel-admin`, `diagnostics` já está oculto). Estas rotas continuam pesquisáveis (`visibleInSearch: true`) e acessíveis por URL. Não altera permissões nem código de páginas.

Ficheiros **não** tocados: rotas (`src/routes/**`), páginas, `App.tsx`, permissões, contexts, i18n, backend, `nav.v2.ts`, layouts.

## 3. Nova estrutura (9 grupos-topo)

```text
+ Criar               ← botão global (dropdown, acima do menu)
────────────────────
Início
Clientes
Vendas
Produtos
Comunicação
Operações
Relatórios
Aplicações
Definições
```

## 4. Mapeamento NavGroup actual → MegaGroup novo

| MegaGroup novo | NavGroup(s) actual(is) agregados |
|---|---|
| **inicio** | `inicio` |
| **clientes** | `comercial-crm`, `comercial-pipeline`, `comercial-prospecting` |
| **vendas** | subset de `vendas` (propostas, encomendas, faturas, pagamentos, cobranças, rentals, checkout) |
| **produtos** | subset de `vendas` (products, bundles, composite, stock-valuation, OCR) + `compras` (fornecedores/catálogo/preços) — via referência partilhada, sem duplicar |
| **comunicacao** | `comunicacao`, `agenda` |
| **operacoes** | `operacoes`, `suporte`, `compras`, `rh`, `performance` |
| **relatorios** | itens de relatórios de `vendas` (`reports`, `reports-financial`, `kpis`), `ai-strategy` (exec-command, revenue-flight-control, daily-brief) |
| **aplicacoes** | `loja-online`, `marketplace-c2c`, `portal-b2b`, `seguranca`, `inteligencia`, verticais (`imo-ai`, `student-journey`, `metodo-vision`, `credit`, `community`), FastClub, portais |
| **definicoes** | `administracao` |

Como uma mesma `RouteEntry` só tem um `group`, a agregação para “Vendas/Produtos” e “Relatórios” é feita no **novo mapeamento** através de um pequeno override declarativo (lista de keys por mega-grupo) — sem alterar o campo `group` de cada entrada, preservando total compatibilidade com os consumidores actuais (`buildSidebarSections`, `getSearchableRoutes`, testes).

## 5. Preservação (nada é removido)

- Todas as `RouteEntry` mantêm `href`, `menuKey`, `moduleSlug`, `status`, `visibleInSearch`.
- `getSidebarItems`, `getSearchableRoutes`, `getAllSearchablePages`, `buildSidebarSections` continuam a existir e a devolver o mesmo output — o novo helper vive ao lado.
- Filtros aplicados na nova sidebar: `installedModuleSlugs`, `canAccess(menuKey)`, `canAccess(key)`, `status === "active"`, `visibleInSidebar`, `passesModeFilter` — todos preservados.
- Pesquisa global, command palette, `MEGA_GROUPS` legado (mantido caso alguém consuma), rotas de detalhe (`:id`) continuam ocultas do sidebar como já estão.
- Nenhum ficheiro de rotas, backend, migração, i18n, permissões, tema ou página é tocado.

## 6. Riscos identificados

1. **Consumidores de `MEGA_GROUPS`/`MegaGroup` legado** — o tipo actual tem 12 chaves; se algum componente já os importa, mudança de shape parte typecheck. **Mitigação:** manter `MEGA_GROUPS` intacto e introduzir um novo símbolo (`TOP_LEVEL_GROUPS` / `TopLevelGroup`) em vez de reescrever o existente.
2. **Testes de navegação** (`src/test/navigation*.test.ts`) podem assumir a lista actual de grupos. **Mitigação:** verificar e ajustar apenas assertions relativas a *contagem/ordem* de grupos; não mexer em assertions de rotas ou permissões.
3. **Menu adaptativo por idade/perfil** (`useAdaptiveDashboard`) — actualmente afecta densidade, não estrutura; mantido.
4. **Agrupar `suporte`/`compras`/`rh` dentro de "Operações"** cria uma secção potencialmente grande. **Mitigação:** dentro de "Operações", manter sub-secções colapsáveis usando as `NavGroupMeta` como labels internas.
5. **Botão + Criar** — se algum item apontar para rota inexistente, aparece opção morta. **Mitigação:** cada acção do dropdown declara `key` do manifest; se `getSearchableRoutes` não devolver, a opção não é renderizada.
6. **Rotas administrativas** (`kernel`, `product-audit`) ficarão dentro de Definições → só visíveis a quem já tem permissão actual (nenhuma alteração de RLS/permissão).

## 7. Plano de implementação (após aprovação)

1. Em `routeManifest.ts`:
   - Adicionar `TopLevelGroup` (`"inicio" | "clientes" | ... | "definicoes"`) e `TOP_LEVEL_GROUPS: Array<{ key, label, icon, order, navGroups: NavGroup[], extraRouteKeys?: string[], excludeRouteKeys?: string[] }>`.
   - Adicionar `buildTopLevelSections(installed, canAccess, mode)` que agrega `buildSidebarSections()` + `extraRouteKeys` (para partilhar rotas entre "Vendas" e "Produtos"/"Relatórios") e aplica `excludeRouteKeys`.
2. Em `AdaptiveSidebar.tsx`:
   - Substituir o loop actual por `buildTopLevelSections(...)`; cada grupo-topo = accordion com label e ícone; conteúdo interno = sub-secções (`NavGroupMeta.label`) ou lista lisa quando só houver uma sub-secção.
   - Adicionar componente `CreateMenu` acima da navegação (reutiliza `DropdownMenu` shadcn já importado); acções declaradas como `{ label, routeKey, group }` e filtradas por `getSearchableRoutes`.
   - Preservar tudo o resto: badges, tema, workspace switcher, colapso, mobile drawer.
3. Verificar `src/test/navigation*.test.ts` — ajustar apenas se referirem estrutura de grupos-topo.

## 8. Validação

- `tsgo` (typecheck) sobre os 2 ficheiros alterados.
- Inspecção manual em desktop (`/dashboard`) confirmando 9 grupos-topo e presença de `+ Criar`.
- Inspecção manual em mobile (drawer) confirmando comportamento.
- Sanity check via `rg` que nenhum outro ficheiro importa `MegaGroup`/`MEGA_GROUPS` de forma incompatível.
- Verificar que `getSearchableRoutes` continua a devolver o mesmo conjunto (não é chamado o novo helper).
- Testes `src/test/navigation*.test.ts` e `useMenuPermissions.test.ts` a passar.
- Preview: abrir `/dashboard` com utilizador `agent` para confirmar filtragem por permissões; abrir com super admin para confirmar acesso completo.
