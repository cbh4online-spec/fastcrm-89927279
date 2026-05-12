## Diagnóstico

Hoje o produto **LeadChef** está espalhado por vários sítios:

- **Landing pública** (`/leadchef`, `/leadchef-landing`) — textos, imagens e CTAs vivem hard-coded em `src/pages/LeadChefLanding.tsx`. Não há painel para editar.
- **App mobile / shell** — `src/components/leadchef/LeadChefMobileShell.tsx` + `LEADCHEF_MODE_WHITELIST` em `src/config/appModes.ts`. Os módulos visíveis estão fixos no código.
- **Utilizadores e acessos** — geridos genericamente em `workspace_members` + tabela `user_roles`, sem visão centrada em "quem usa LeadChef".
- **Branding / onboarding** — wizard genérico, sem ponto único de configuração.

O utilizador quer que o **workspace marcado como LeadChef** (`workspaces.ui_mode = 'leadchef'`) seja o **único ponto de controlo** sobre tudo o que diz respeito ao produto LeadChef.

## Decisões de produto / UX

1. Criar uma área **"Centro LeadChef"** (`/dashboard/leadchef/admin`), visível apenas a quem tem `role in ('admin','super_admin')` no workspace LeadChef.
2. A área tem 3 separadores claros:
   - **Conteúdos da Landing** — editar hero, secções, CTAs, imagens, SEO da página `/leadchef`.
   - **Acessos & Utilizadores** — convidar, suspender, alterar role, ver utilização da app LeadChef.
   - **Configuração da App** — branding (logo, cores), módulos/menus visíveis no shell mobile, features ativas, links de onboarding.
3. A landing pública passa a **ler de tabela** (`leadchef_landing_content`) com fallback para os defaults atuais — zero downtime.
4. A whitelist de módulos do shell mobile passa a ser **dinâmica** (lida de `leadchef_app_config` por workspace), com fallback à constante atual.

## Estrutura técnica

### Base de dados (migration)

- `leadchef_landing_content` — singleton por workspace (`workspace_id` PK), JSONB com hero, sections, ctas, seo, images.
- `leadchef_app_config` — singleton por workspace, com branding (logo_url, primary_color, accent_color) e `enabled_modules text[]`.
- RLS:
  - SELECT público em `leadchef_landing_content` (landing é pública).
  - INSERT/UPDATE restrito a admins via `has_role(auth.uid(),'admin')` + workspace membership.
  - `leadchef_app_config` SELECT/UPDATE restrito a membros do workspace.
- Triggers de `updated_at` e `activity_logs`.

### Frontend

- Nova página `src/pages/leadchef/admin/LeadChefAdminPage.tsx` com 3 tabs (`shadcn/ui` Tabs).
- Componentes:
  - `LeadChefLandingEditor.tsx` (form com zod, preview lado a lado).
  - `LeadChefAccessManager.tsx` (lista de membros + convite + role).
  - `LeadChefAppConfigEditor.tsx` (branding + checkboxes de módulos).
- Hooks:
  - `useLeadChefLandingContent(workspaceId)` — read/write.
  - `useLeadChefAppConfig(workspaceId)` — read/write + invalidação de cache do shell.
- `LeadChefLanding.tsx` passa a consumir `useLeadChefLandingContent` (modo público, sem auth).
- `LEADCHEF_MODE_WHITELIST` torna-se função `getLeadChefWhitelist(config)` com fallback aos defaults.
- Routing: registar `/dashboard/leadchef/admin` em `routeManifest.ts` (categoria `leadchef`, role-gated).
- Sidebar: entrada "Centro LeadChef" visível só a admins (via `useUserRole`).

### Edge Functions

- Nenhuma necessária no MVP — operações vão direto via SDK Supabase com RLS.

## Plano de implementação

1. Migration: criar tabelas + RLS + triggers + seed inicial com defaults atuais da landing.
2. Hooks `useLeadChefLandingContent` e `useLeadChefAppConfig`.
3. Refactor `LeadChefLanding.tsx` para consumir conteúdo dinâmico (mantendo defaults).
4. Refactor `appModes.ts` → expor `getLeadChefWhitelist(config?)`.
5. Página `LeadChefAdminPage` com 3 tabs e componentes de cada tab.
6. Registar rota em `routeManifest.ts` + entrada de sidebar role-gated.
7. QA: mobile, estados vazios, permissões (não-admin não vê), erro de rede, landing pública sem sessão.

## Critérios de aceitação

- Admin do workspace LeadChef consegue editar a landing e ver alterações em produção em <30 s (após save).
- Admin consegue convidar/remover utilizadores e alterar o role sem sair do workspace LeadChef.
- Admin consegue ativar/desativar módulos visíveis no shell mobile; alteração reflete-se no próximo load.
- Não-admin não vê o "Centro LeadChef" no sidebar nem consegue aceder por URL direto (404/redirect).
- Landing continua a renderizar mesmo se a tabela estiver vazia (fallback aos defaults).

## Riscos e pontos por validar

- **Imagens da landing**: precisa de bucket de Storage `leadchef-public` com SELECT público — confirmar antes da migration.
- **Cache do shell mobile**: shell precisa de revalidar config sem reload completo — usar React Query com `staleTime: 60s`.
- **Multi-workspace**: a landing pública `/leadchef` é única — assumir um workspace "canónico" (o primeiro com `ui_mode='leadchef'` flag `is_canonical=true`) ou confirmar com o utilizador.
- **i18n**: campos da landing devem suportar PT/EN/ES/FR? Por defeito guardo só PT no MVP — confirmar.
