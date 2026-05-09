# Modo LeadChef-only por Workspace

Permitir criar workspaces que só dão acesso ao módulo LeadChef (mais Inbox, Calendário e Definições), com branding próprio. A detecção é automática com base no módulo instalado, e existe uma flag manual de override para casos especiais.

---

## 1. Diagnóstico

Hoje o `routeManifest.ts` é a SSoT da sidebar e já filtra entradas por `moduleSlug` e `menuKey`. Não existe, no entanto, nenhum mecanismo de "modo restrito" ao nível do shell — qualquer membro de um workspace vê a árvore completa de menus que o seu role permitir, independentemente do produto comprado.

Queremos que, quando um workspace tem apenas o produto **LeadChef** ativo, toda a aplicação se comporte como se fosse um produto autónomo: sidebar minimalista, branding "LeadChef", rota raiz aterra em `/dashboard/leadchef/today`, e tentativas de aceder a outras páginas redirecionam de volta.

## 2. Decisões de produto / UX

- **Atribuição automática**: se o workspace tem o módulo `leadchef` ativo e não tem nenhum outro módulo de produto (ver lista no §4), entra automaticamente em **modo LeadChef-only**. Não requer trabalho do admin.
- **Override manual** (para casos especiais — p.ex. cliente quer LeadChef + algo mais mas mesmo assim com shell minimalista, ou vice-versa): coluna `ui_mode` em `workspaces` com valores `auto | fastcrm | leadchef`. Default `auto`.
- **Branding em modo LeadChef**:
  - Nome do produto: "LeadChef" (substitui "FastCRM" no logo, no `<title>`, no switcher e no rodapé).
  - Cor primária: tom verde-esmeralda já usado no ícone (`emerald-500`), aplicado via tokens `--primary` num scope `[data-app-mode="leadchef"]` no `index.css`.
  - Logo dedicado (ícone `ChefHat` + wordmark "LeadChef").
- **Sidebar em modo LeadChef** mostra apenas:
  - Grupo "LeadChef" completo (todas as páginas do módulo).
  - Item "Caixa de Entrada" (`inbox`).
  - Item "Calendário" (`calendar` / scheduling).
  - Footer fixo: "Definições" (`/settings`) e "Perfil" (`/dashboard/profile`).
- **Rota raiz**: `/` e `/dashboard` redirecionam para `/dashboard/leadchef/today`.
- **Guard de rotas**: qualquer URL fora da whitelist redireciona para `/dashboard/leadchef/today` com toast informativo ("Esta área não está disponível no seu plano").
- **Workspace switcher**: continua a funcionar (um utilizador pode pertencer a vários workspaces, alguns LeadChef, outros FastCRM completo); o modo é recalculado por workspace ativo.
- **Super admin**: ignora o modo restrito (continua a ver tudo) — útil para suporte.

## 3. Estrutura técnica

### Migration (DB)
- `ALTER TABLE public.workspaces ADD COLUMN ui_mode text NOT NULL DEFAULT 'auto' CHECK (ui_mode IN ('auto','fastcrm','leadchef'))`.
- Sem mudanças nas RLS existentes — esta coluna é puramente cosmética/UX.

### Novo hook `useAppMode()`
Localização: `src/hooks/useAppMode.ts`. Retorna:

```ts
type AppMode = "fastcrm" | "leadchef";
{ mode: AppMode; isLeadChefOnly: boolean; isLoading: boolean }
```

Lógica:
1. Lê `currentWorkspace.ui_mode` do `WorkspaceContext` (adicionar campo ao tipo).
2. Se `ui_mode === 'leadchef'` → `mode = 'leadchef'`.
3. Se `ui_mode === 'fastcrm'` → `mode = 'fastcrm'`.
4. Se `ui_mode === 'auto'`: usa `useWorkspaceModules()` →
   - se `installedModuleIds` inclui `'leadchef'` **e** não inclui nenhum dos slugs em `FASTCRM_PRODUCT_MODULES` → `'leadchef'`.
   - caso contrário → `'fastcrm'`.
5. Super admin força sempre `'fastcrm'`.

`FASTCRM_PRODUCT_MODULES` = lista canónica dos módulos que sinalizam "FastCRM completo" (ex.: `crm-core`, `online-store`, `hr-management`, `whatsapp-business`, `partner-center`, etc. — a confirmar pela equipa de produto).

### routeManifest — whitelist por modo
Adicionar campo opcional `availableInModes?: AppMode[]` a `RouteEntry`. Default = ambos. Marcar com `["leadchef"]` apenas:
- todas as entradas do grupo `comercial` cujo `key` começa com `leadchef-*` (já são vários sub-itens).
- `inbox`, `calendar`.
- `settings-main`, `profile`, `settings-team`, `settings-billing`, `settings-workspace` (footer mínimo de conta).

Funções `getSidebarItems`, `buildSidebarSections`, `getSearchableRoutes` recebem novo parâmetro `mode: AppMode` e filtram por `availableInModes`.

### Sidebar e Layout
- `Sidebar.tsx` (já a consumir `routeManifest`): passa `mode` do `useAppMode()` para `buildSidebarSections`.
- Em modo `leadchef`: troca o componente de logo (`<FastCRMLogo />` → `<LeadChefLogo />`) e oculta o `WorkspaceSwitcher` se o utilizador só tem 1 workspace LeadChef (caso contrário mantém).
- `AdaptiveSidebar.tsx`: mesma alteração para paridade.
- `DashboardLayout.tsx`: aplica `data-app-mode={mode}` no wrapper raiz para o CSS scoped funcionar.

### Guard de rotas
Novo componente `<AppModeGuard>` que envolve as rotas dentro do `DashboardLayout`. Recebe `mode` e a lista de paths permitidos (derivados do manifest filtrado). Se `pathname` não bater certo com nenhum permitido → `<Navigate to="/dashboard/leadchef/today" replace />` + toast.

### Rebrand visual
- Em `index.css`, adicionar bloco:
  ```css
  [data-app-mode="leadchef"] {
    --primary: 158 64% 40%;          /* emerald-600 */
    --primary-foreground: 0 0% 100%;
    --ring: 158 64% 40%;
  }
  ```
- Atualizar `<title>` dinamicamente via hook `useDocumentTitle` ("LeadChef" vs "FastCRM").
- Componente `LeadChefLogo` reutiliza `ChefHat` + texto "LeadChef" (sem novo asset).

## 4. Plano de implementação

1. **Migration** `add_workspaces_ui_mode`: adiciona coluna `ui_mode` + CHECK constraint.
2. **Tipos**: estender `Workspace` em `WorkspaceContext.tsx` com `ui_mode`.
3. **Constantes**: criar `src/config/appModes.ts` com `FASTCRM_PRODUCT_MODULES` e tipo `AppMode`.
4. **Hook**: criar `src/hooks/useAppMode.ts`.
5. **Manifest**: adicionar `availableInModes` ao `RouteEntry`, marcar entradas LeadChef-only, atualizar `getSidebarItems`/`buildSidebarSections`/`getSearchableRoutes`.
6. **Sidebar + AdaptiveSidebar**: consumir `useAppMode()`, trocar logo, passar `mode` ao manifest.
7. **CSS**: adicionar tokens no `index.css` sob `[data-app-mode="leadchef"]`.
8. **Layout**: aplicar `data-app-mode` no root do `DashboardLayout`; integrar `<AppModeGuard>`.
9. **Redirect raiz**: ajustar redirect default para considerar o modo (em `App.tsx` ou no índice do dashboard).
10. **Settings → Workspace**: adicionar select "Modo de interface" (Auto / FastCRM / LeadChef) visível só para owner/admin (override manual).
11. **QA** com 3 workspaces de teste: (a) só LeadChef, (b) FastCRM completo, (c) ambos com override `leadchef`.

## 5. Critérios de aceitação

- Workspace com apenas o módulo `leadchef` instalado mostra sidebar reduzida (LeadChef + Inbox + Calendário + Settings/Perfil), branding "LeadChef" e cor verde.
- Tentar abrir `/dashboard/store-settings` nesse workspace redireciona para `/dashboard/leadchef/today` com toast.
- Workspace com FastCRM completo continua exatamente igual ao actual (zero regressão visual).
- Switcher de workspace alterna o modo em tempo real, sem refresh.
- Super admin vê sempre tudo, mesmo em workspaces marcados como `leadchef`.
- Owner/admin pode forçar `ui_mode` em **Settings → Workspace**.
- Pesquisa global (command palette) também respeita o modo.

## 6. Riscos e pontos por validar

- **Lista canónica de "módulos FastCRM"**: precisa de confirmação para a deteção `auto` ser fiável. Se a lista evoluir, é só editar `appModes.ts`.
- **Rotas profundas do LeadChef**: o guard usa whitelist por prefixo (`/dashboard/leadchef/*`); confirmar que não há sub-rotas LeadChef fora desse namespace.
- **Notificações/topbar**: atualmente a topbar mostra contadores cross-módulo (ex. tickets). Em modo LeadChef devemos esconder os que não pertencem ao whitelist — incluir no passo 6.
- **SEO/Meta**: páginas públicas não são afetadas; só o shell autenticado muda de marca.
- **Logos próprios por workspace**: fora de âmbito desta entrega; cliente que queira logo personalizado entra na fase seguinte (white-label).
