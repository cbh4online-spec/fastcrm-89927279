

# Gestão de Workspaces: Trial, Auto-downgrade, Alertas e Notificações Admin

## Resumo

Implementar 5 melhorias na gestão de workspaces do Super Admin:

1. **Trial de 14 dias** — novos workspaces iniciam com status `trialing` e `trial_ends_at` preenchido
2. **Auto-downgrade** — quando o trial ou período Pro expira sem renovação, o plano passa automaticamente para Free
3. **Alteração manual de plano** — expandir o diálogo "Alterar Plano" para incluir `trialing` como status e datas de período
4. **Uso atualizado** — corrigir contagens de uso (leads, contactos, empresas) que não estão a ser atualizadas
5. **Notificações admin** — enviar email e alerta in-app ao jorge.cardoso@digita4ads.pt quando há novos utilizadores/workspaces

---

## Alterações

### 1. DB Migration: Trial e Auto-downgrade

- Adicionar coluna `trial_ends_at` ao `workspace_subscriptions` (já existe na schema)
- Criar função RPC `check_and_downgrade_expired_trials()` que:
  - Busca subscriptions com `status = 'trialing'` e `trial_ends_at < now()`
  - Muda `plan` para `free` e `status` para `active`
  - Busca subscriptions com `status = 'active'`, `plan != 'free'`, `current_period_end < now()` e sem `stripe_subscription_id`
  - Muda `plan` para `free`
  - Retorna contagem de downgrades feitos
- Criar tabela `admin_notifications` para alertas in-app:
  ```
  id, type, title, message, data (jsonb), is_read, created_at
  ```
- Criar trigger `notify_admin_new_workspace` que insere em `admin_notifications` quando um workspace é criado
- Criar trigger `notify_admin_new_member` que insere quando um `workspace_member` é adicionado

### 2. Edge Function: `workspace-lifecycle-check`

Cron job (ou chamada manual) que:
- Chama `check_and_downgrade_expired_trials()`
- Para cada downgrade, envia email ao jorge.cardoso@digita4ads.pt via `send-transactional-email`
- Também verifica trials que expiram em 3/7 dias e gera alertas

### 3. CreateWorkspaceDialog — Trial por defeito

**Ficheiro**: `src/components/super-admin/CreateWorkspaceDialog.tsx`

- Adicionar opção de plano "Trial (14 dias)" que cria subscription com:
  - `plan: 'pro'`, `status: 'trialing'`
  - `trial_started_at: now()`
  - `trial_ends_at: now() + 14 days`
  - `current_period_end: now() + 14 days`

### 4. WorkspacesSection — Melhorias na tabela e diálogos

**Ficheiro**: `src/components/super-admin/WorkspacesSection.tsx`

- **Coluna Trial/Renovação**: Mostrar badge com dias restantes do trial ou até renovação
  - Trial: "Trial: 8 dias" (amarelo), "Trial: 2 dias" (vermelho)
  - Pro/Basic: "Renova em 15 dias" ou "Expirado" (vermelho)
- **Alterar Plano dialog**: Expandir para incluir:
  - Select de status: `active`, `trialing`, `past_due`, `canceled`
  - Campos de data: `trial_ends_at`, `current_period_end`
  - Permitir ativar trial manualmente (set 14 dias a partir de hoje)
- **Corrigir uso**: A query já busca leads/contacts/companies por workspace_id com contagem real. O problema é que `workspace_usage` pode estar desatualizado. Mudar para usar contagens diretas (já implementado nas linhas 190-218) e garantir que aparecem correctamente.
- Incluir `trial_ends_at` e `current_period_end` no fetch de subscriptions

### 5. Notificações Admin In-App

**Criar**: `src/components/super-admin/AdminNotificationsBell.tsx`

- Ícone de sino no header do Super Admin com badge de count não lidas
- Dropdown com lista de notificações recentes (novos workspaces, novos utilizadores, trials a expirar)
- Marcar como lida ao clicar

### 6. Email de notificação ao admin

**Criar**: Edge function trigger ou template para enviar email a `jorge.cardoso@digita4ads.pt` quando:
- Novo workspace é criado
- Novo utilizador se regista
- Trial está prestes a expirar (3 dias)

Usar `send-transactional-email` com template dedicado `admin-new-signup`.

---

## Ficheiros Modificados/Criados

- **Migration SQL** — tabela `admin_notifications`, triggers, RPC `check_and_downgrade_expired_trials`
- `src/components/super-admin/WorkspacesSection.tsx` — trial badges, dialog expandido, fix uso
- `src/components/super-admin/CreateWorkspaceDialog.tsx` — opção trial
- `src/components/super-admin/AdminNotificationsBell.tsx` — novo componente
- `supabase/functions/workspace-lifecycle-check/index.ts` — nova edge function
- Template de email `admin-new-signup`

