# Personalização de menus por workspace (Super Admin)

Permitir que o Super Admin escolha, workspace a workspace (ex.: Ajax Systems), o que aparece na barra lateral, com três estados por item:

- **Visível** — comportamento normal.
- **Visível com cadeado** — aparece na lista mas bloqueado (ícone de cadeado, clique mostra aviso/CTA em vez de navegar).
- **Oculto** — não aparece na sidebar nem na pesquisa global.

## Como vai funcionar

1. Nova secção no backoffice Super Admin: **Menus por Workspace**.
2. Escolher a workspace numa lista pesquisável (topo do ecrã).
3. Ver a árvore completa dos menus: 9 grupos principais → subsecções → itens, tal como aparecem na sidebar.
4. Cada linha tem um seletor de 3 estados. Definir o estado num grupo aplica-se por herança a todos os itens desse grupo (o item pode continuar a ter estado próprio, que prevalece).
5. Ações rápidas: "Ocultar tudo neste grupo", "Repor predefinições" (limpa overrides da workspace), pesquisa por nome de menu e badge com o número de overrides ativos.
6. Guardar grava só as diferenças face ao predefinido; a sidebar da workspace reflete a alteração no próximo carregamento (cache curta).

Notas de comportamento:
- Estes overrides são cumulativos com as regras já existentes (plano/departamentos, módulos instalados, permissões por role). Um menu oculto pelo plano continua oculto; o override serve para restringir ou destacar como bloqueado, e para reabrir itens que o Super Admin queira mostrar.
- O bloqueio com cadeado é apenas de navegação/UI. Não substitui RLS: os dados continuam protegidos pelas políticas atuais.

## Detalhes técnicos

**Base de dados** — nova tabela `public.workspace_menu_overrides`:
- `workspace_id` (FK workspaces), `item_type` ('top_group' | 'nav_group' | 'route'), `item_key` (chave do `routeManifest`), `visibility` (enum `menu_visibility`: 'visible' | 'locked' | 'hidden'), `note` opcional, `created_at`/`updated_at` + trigger.
- Único por (`workspace_id`, `item_type`, `item_key`).
- GRANTs: `SELECT, INSERT, UPDATE, DELETE` a `authenticated`, `ALL` a `service_role`.
- RLS: leitura para membros da workspace; escrita apenas para super admin (`public.is_super_admin(auth.uid())`).

**Frontend**:
- `src/hooks/useWorkspaceMenuOverrides.ts` — leitura por workspace ativa (para a sidebar) e leitura/escrita por workspace escolhida (para o Super Admin).
- `src/config/menuOverrides.ts` — resolução de estado com herança grupo → subgrupo → item, e helper `resolveMenuVisibility(key, ...)`.
- `src/config/routeManifest.ts` — `buildSidebarSections` / `buildTopLevelSections` passam a aceitar um resolvedor opcional de overrides: 'hidden' remove o item, 'locked' marca-o como bloqueado.
- `src/components/layout/AdaptiveSidebar.tsx`, `WatidySidebar.tsx`, `InvoiceXpressSidebar.tsx`, `MobileBottomNav.tsx` — aplicam o resolvedor; itens 'locked' renderizam com cadeado, sem link, com tooltip.
- `src/components/layout/GlobalSearch.tsx` — exclui itens ocultos.
- `src/components/super-admin/WorkspaceMenusSection.tsx` (novo) + entrada em `SuperAdminSidebar.tsx`, `index.ts` e no `switch` de `src/pages/SuperAdmin.tsx` (secção `workspace-menus`).

**Estados a cobrir**: loading (skeleton da árvore), erro de leitura/gravação com toast, workspace sem overrides (estado limpo), pesquisa sem resultados, e responsivo em mobile.

## Critérios de aceitação

- Super Admin consegue, para Ajax Systems, ocultar um grupo inteiro e itens individuais, e marcar itens como bloqueados.
- Utilizador dessa workspace deixa de ver os ocultos (sidebar, mobile nav e pesquisa) e vê cadeado nos bloqueados, sem conseguir navegar.
- Outras workspaces mantêm-se inalteradas.
- Não-super-admin não consegue gravar overrides (bloqueado pela base de dados).
- "Repor predefinições" devolve a sidebar ao estado original.
