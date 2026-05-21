## Onboarding B2B pós-login

### Diagnóstico

Já existe infraestrutura sólida:

- `Onboarding.tsx` em `/onboarding`, com redirect automático no `DashboardLayout` quando o utilizador não tem workspaces.
- RPC `create_workspace_with_owner(p_name, p_slug)` que cria workspace e `workspace_members` com `role='owner'` atomicamente.
- Tabela `workspaces` já tem colunas B2B (`company_name`, `tax_id`, `billing_email`, `cae_codes`, `phone`, `website`, etc.).
- Tabela `workspace_onboarding` cobre `team_size`, `business_type`, `primary_objective`, `revenue_model`, `sales_complexity`.
- Tabela `workspace_invites` com `email`, `role`, `invite_token`, `status`, `expires_at` — existe página `/accept-invite/:token` mas **não há descoberta automática** de convites pendentes pelo email do utilizador.

Lacunas para um fluxo B2B completo:

1. Onboarding atual só cobre "criar workspace" e ignora convites pendentes e workspaces existentes (caso o utilizador tenha sido adicionado por outra via).
2. Não recolhe campos B2B essenciais (NIF, setor, dimensão da equipa) num único passo.
3. Não há seleção quando o utilizador já pertence a múltiplos workspaces (raro mas possível para colaboradores B2B).
4. O papel "owner" é atribuído implicitamente pela RPC — falta confirmação visual ao utilizador.

### Decisões de produto / UX

- **Wizard de 3 passos** com indicador de progresso no topo:
  1. **Acolhimento + escolha de caminho** — mostra convites pendentes (se houver), workspaces existentes do utilizador (se houver) e opção "Criar nova organização".
  2. **Detalhes da organização** (apenas no caminho "criar") — nome, NIF (PT 9 dígitos, opcional), setor, dimensão da equipa, o meu cargo.
  3. **Confirmação** — resumo + badge "Vais ser o **Owner** desta organização" + CTA "Entrar".
- Se o utilizador tiver **convites pendentes** para o seu email, são listados em destaque com botão "Aceitar" inline (sem precisar do link por email).
- Se já tiver **workspaces**, mostrar lista para selecionar — útil quando regressa após ser convidado.
- "Skip" indisponível: B2B exige sempre um workspace ativo para entrar no dashboard.
- Validação de NIF PT (algoritmo módulo 11) usando `src/utils/nif.ts` (já existente).
- Persistência B2B em `workspaces` (company_name, tax_id) + `workspace_onboarding` (team_size, business_type, primary_objective).
- Após criar/selecionar, redirect para `/dashboard` com `?onboarding=complete` (mantém integração com o ConversationalOnboarding existente, que pode disparar depois se desejado).

### Estrutura técnica

**Backend (1 migração)**

- Nova RPC `create_workspace_b2b(p_name, p_slug, p_company_name, p_tax_id, p_team_size, p_business_type, p_primary_objective, p_my_title)`:
  - `SECURITY DEFINER`, `search_path = public`.
  - Insere `workspaces` com campos B2B preenchidos.
  - Insere `workspace_members` com `role='owner'` + `title = p_my_title`.
  - Insere `workspace_onboarding` com os campos opcionais.
  - Devolve `jsonb` com o workspace criado.
  - `GRANT EXECUTE … TO authenticated`.
- Função `get_pending_invites_for_user()` que devolve convites com `email = (auth.jwt() ->> 'email')`, `status='pending'`, `expires_at > now()`, com nome do workspace via join.
- RPC `accept_workspace_invite(p_token)` (caso ainda não exista) que valida token+email, cria `workspace_members`, marca convite `accepted`.

**Frontend**

- Refactor de `src/pages/Onboarding.tsx`:
  - Wizard com `step: "choose" | "details" | "confirm"`.
  - Reutiliza `useWorkspace().refreshWorkspaces`.
  - Mantém compatibilidade: se chegar com `workspaces.length > 0` mas sem `currentWorkspace`, mostra apenas o seletor (sem forçar criação).
- Novos componentes em `src/components/onboarding/b2b/`:
  - `OnboardingHeader.tsx` — stepper visual.
  - `PendingInvitesList.tsx` — lista de convites + ação aceitar.
  - `ExistingWorkspacesList.tsx` — cartões com workspaces já existentes.
  - `B2BDetailsForm.tsx` — formulário passo 2 (com validação NIF).
  - `ConfirmStep.tsx` — resumo + badge de papel.
- Novo hook `usePendingInvites.ts` (React Query).
- Novo hook `useCreateB2BWorkspace.ts` que chama a RPC e refaz `refreshWorkspaces`.

**Routing**

- Mantém `/onboarding` em `DashboardCoreRoutes.tsx`.
- `DashboardLayout` mantém o redirect quando `workspaces.length === 0`.

### Plano de implementação

1. Migração: RPC `create_workspace_b2b`, `get_pending_invites_for_user`, `accept_workspace_invite` (verificar antes se já existe).
2. Hooks: `usePendingInvites`, `useCreateB2BWorkspace`, `useAcceptInvite`.
3. Componentes do wizard em `src/components/onboarding/b2b/`.
4. Refactor `Onboarding.tsx` para orquestrar passos + manter o atalho para `ConversationalOnboarding` opcional no final.
5. Validação NIF (reutilizar `src/utils/nif.ts`).
6. Toasts e estados (loading, erro, vazio).

### Critérios de aceitação

- Utilizador novo sem workspaces e sem convites: vê apenas "Criar organização" → wizard de 3 passos → fica `owner` confirmado.
- Utilizador com convite pendente: vê o convite no topo, aceita com 1 clique e entra no workspace correspondente.
- Utilizador com workspaces existentes: vê seletor e escolhe um → entra no dashboard.
- NIF inválido (PT) bloqueia avanço com mensagem clara; NIF vazio é permitido.
- Após criar, `workspaces` tem `company_name` + `tax_id` preenchidos e `workspace_members` tem `role='owner'`.
- Pressionar voltar entre passos preserva estado do formulário.
- Funciona em mobile (≤375px) e desktop.

### Riscos e pontos por validar

- Confirmar se `accept_workspace_invite` já existe (a página `AcceptWorkspaceInvite.tsx` faz `INSERT` direto via RLS) — se sim, reutilizar; se não, criar.
- Coluna `title` em `workspace_members` existe? Validar antes da migração; se não existir, adicionar.
- Email do utilizador em `auth.jwt()` está sempre populado em B2B (Google + Email/Password): confirmado por construção do AuthContext.
- Não criar duplicação com `ConversationalOnboarding`: este wizard fica antes (estrutura/papel) e o conversacional pode ser convidado opcionalmente depois.
