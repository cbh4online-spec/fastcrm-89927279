
# Implementar Convites de Workspace (Email Real)

## Problema

O botao "Convidar membro" nas definicoes do workspace e apenas um stub -- mostra um toast "Convite enviado" mas nao envia email nem guarda nada na base de dados. O convite para daniel.silva@metodopare.ai nao foi enviado.

## Solucao

Criar um sistema completo de convites de workspace, seguindo o padrao ja existente no `send-c2c-seller-invite`.

## Alteracoes

### 1. Nova tabela: `workspace_invites`

Migracao SQL para criar a tabela que guarda os convites pendentes:

- `id` (uuid, PK)
- `workspace_id` (uuid, FK workspaces)
- `email` (text)
- `role` (text, default 'agent')
- `invite_token` (uuid, auto-gerado)
- `status` (text: pending, accepted, revoked, expired)
- `invited_by` (uuid)
- `accepted_at`, `expires_at`, `created_at`
- RLS: membros do workspace (owner/admin/agency) + super_admins podem gerir
- Indice unico em (workspace_id, email) para status 'pending'

### 2. Nova Edge Function: `send-workspace-invite`

Baseada no `send-c2c-seller-invite` existente:

- Recebe: `{ email, role, workspaceId }`
- Cria registo em `workspace_invites` com token
- Envia email via Resend com template HTML profissional
- URL do convite: `https://fastcrm.lovable.app/invite/{token}`
- From: `{workspace.name} <noreply@m.fastcrm.metodopare.ai>`

### 3. Nova pagina: `/invite/:token` (aceitar convite)

Pagina publica que:
- Valida o token e mostra detalhes do convite
- Se o utilizador ja tem conta -> login e aceitar
- Se nao tem conta -> registo e aceitar
- Ao aceitar: insere em `workspace_members` e marca convite como accepted

### 4. Actualizar `WorkspaceSettings.tsx`

- `handleInviteMember`: chamar a edge function `send-workspace-invite` em vez do toast stub
- Mostrar lista de convites pendentes (com opcao revogar/reenviar)
- Feedback real sobre sucesso/falha do envio

## Detalhe Tecnico

### Template Email

```text
Header: {workspace.name} - Equipa
Corpo: "Ola, foi convidado(a) a juntar-se a equipa do {workspace.name} como {role}."
CTA: "Aceitar Convite"
Footer: "Este convite expira em 7 dias"
```

### Fluxo

```text
Owner clica "Convidar membro" -> preenche email + role
  -> Frontend chama send-workspace-invite
    -> Edge function cria workspace_invites + envia email
      -> Destinatario recebe email com link
        -> Clica no link -> /invite/{token}
          -> Login/Registo -> workspace_members insert -> redirect dashboard
```

### Ficheiros alterados/criados

1. Migracao SQL (nova tabela `workspace_invites` + RLS)
2. `supabase/functions/send-workspace-invite/index.ts` (nova edge function)
3. `src/pages/AcceptWorkspaceInvite.tsx` (nova pagina)
4. `src/App.tsx` (nova rota `/invite/:token`)
5. `src/components/settings/sections/WorkspaceSettings.tsx` (ligar ao backend real)
