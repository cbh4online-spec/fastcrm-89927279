# Backoffice V2: corrigir os 404 do menu lateral e ligar "Menus por Workspace"

## Diagnóstico

O ecrã 404 em `/super-admin-v2/settings` não é um erro de permissões: o menu lateral do backoffice V2 (`src/components/backoffice-v2/BackofficeShellV2.tsx`) lista 20 entradas, mas em `src/routes/crm/VerticalOpsRoutes.tsx` só existem 6 rotas registadas:

- Existem: `/super-admin-v2`, `/workspaces`, `/users`, `/subscriptions`, `/billing`, `/permissions`
- Em falta (todas dão 404): `/pricing`, `/limits`, `/ai`, `/payments`, `/stripe`, `/alerts`, `/incidents`, `/moderation`, `/bugs`, `/logs`, `/activity`, `/features`, `/rollout`, `/settings`

Além disso, a secção "Menus por Workspace" criada no passo anterior só está disponível no backoffice antigo (`/super-admin`), não no V2 — que é o que está a usar.

## O que vai ser feito

1. **Ligar todas as entradas do menu V2 a páginas reais**
   Cada rota em falta passa a existir, reutilizando as secções já construídas do backoffice antigo (Pricing, Limites, Uso de IA, Pagamentos, Stripe Sync, Alertas, Incidentes, Moderação, Bug Reports, Logs, Activity Logs, Feature Registry, Rollout, Configurações), sempre dentro do layout V2 e protegidas por super admin.

2. **Adicionar "Menus por Workspace" ao backoffice V2**
   Nova entrada no grupo Sistema, a seguir a Permissões, em `/super-admin-v2/workspace-menus`, com o mesmo ecrã de personalização (visível / com cadeado / oculto por grupo, sub-grupo e página).

3. **Rede de segurança para rotas desconhecidas**
   Qualquer `/super-admin-v2/*` não reconhecida passa a redirecionar para o Overview do V2 em vez de mostrar o 404 genérico da aplicação.

## Detalhes técnicos

- `src/routes/crm/VerticalOpsRoutes.tsx`: acrescentar as rotas em falta com `RequireSuperAdmin` e `lazy()`, mais um `path="/super-admin-v2/*"` com `Navigate` para `/super-admin-v2`.
- Criar páginas finas em `src/pages/backoffice-v2/` que envolvem `BackofficeShellV2` e renderizam as secções existentes exportadas por `src/components/super-admin/index.ts` (`PricingManagementSection`, `AIUsageSection`, `BillingSection` com `initialTab`, `AlertsSection` com `initialTab`, `ModerationSection`, `BugReportsSection`, `LogsSection`, `ActivityLogsSection`, `FeatureRegistrySection`, `RolloutDashboardSection`, `WorkspaceMenusSection`) — sem duplicar lógica.
- A página de Configurações V2 reutiliza `AdminSettingsPanel`, `UserRolesPanel` e `WorkspaceInstancesTable`, tal como no backoffice antigo.
- `BackofficeShellV2.tsx`: adicionar o item "Menus por Workspace" no grupo Sistema.

## Critérios de aceitação

- Nenhum item do menu lateral do V2 leva a 404.
- "Menus por Workspace" acessível no V2 e a gravar overrides corretamente.
- Estados de carregamento e de acesso negado mantêm-se (guard de super admin em todas as rotas).
- Sem erros de consola ao navegar por todas as entradas do menu.

## Riscos e pontos por validar

- Algumas secções antigas assumem o layout de `SuperAdmin.tsx` (padding próprio); pode ser preciso ajustar espaçamentos dentro do shell V2.
- Não se altera nenhuma lógica de negócio nem RLS — apenas navegação e composição de páginas.
