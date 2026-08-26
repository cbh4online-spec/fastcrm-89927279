# Alterar palavra-passe: super admin e self-service

## Diagnóstico (verificado no código)

- O backend já suporta tudo: a edge function `admin-user-management` tem `set_password` (definir password diretamente, com auditoria) e `send_password_reset` (enviar email de recuperação). O backoffice clássico (`UsersSection`) já usa estas ações.
- No **super admin v2** (`BackofficeUsersV2.tsx`), o drawer do utilizador só tem "Suspender/Reativar acesso" e um texto "Reset de password... serão adicionados em fases seguintes" — as ações de password estão em falta (caso do utilizador Movéis Baratos com email por confirmar, que não consegue recuperar a password sozinho).
- Self-service: `ProfileSettings.tsx` já tem "Alterar palavra-passe" funcional, e existe `ChangePasswordDialog.tsx` (não usado).
- **Falha real no fluxo de recuperação da app principal:** `ForgotPassword.tsx` envia o email com `redirectTo: /login` e não existe página `/reset-password` na app principal (só existe no portal de cliente). Quem clica no link de recuperação entra na app sem ser obrigado a definir nova password. O `send_password_reset` do admin também redireciona para `/dashboard/profile` em vez de um ecrã de definição de password.

## Decisões

- No super admin v2, oferecer duas vias: **definir password manualmente** (útil para contas com email pendente, como Movéis Baratos) e **enviar email de recuperação** (via normal).
- Criar a página pública `/reset-password` na app principal e fazer todos os emails de recuperação apontarem para ela.
- Manter o self-service existente em Definições → Perfil (já funcional); não duplicar.

## Plano de implementação

### 1. Página `/reset-password` (app principal)
- Nova `src/pages/ResetPassword.tsx`: deteta `type=recovery` no hash da sessão, valida a nova password (mesmas regras zod do `ChangePasswordDialog`: 8+ caracteres, maiúscula, minúscula, número), chama `supabase.auth.updateUser({ password })` e redireciona para `/login` com toast de sucesso. Estados de link inválido/expirado e loading.
- Registar a rota pública (fora de auth guard) no manifesto de rotas.
- `src/pages/ForgotPassword.tsx`: corrigir `redirectTo` para `${window.location.origin}/reset-password`.
- `supabase/functions/admin-user-management/index.ts` (`send_password_reset`): corrigir `redirectTo` de `/dashboard/profile` para `/reset-password`.

### 2. Super admin v2 — ações de password no drawer
- Em `AdminActionsPanel` (`BackofficeUsersV2.tsx`), adicionar:
  - **"Definir palavra-passe"**: dialog com campo de nova password (+ gerador de password aleatória e botão copiar), que invoca `admin-user-management` com `set_password`. Mostrar a password definida uma única vez para o admin comunicar ao utilizador.
  - **"Enviar email de recuperação"**: invoca `send_password_reset` com o email do utilizador; toast de confirmação.
- Regras: bloquear sobre a própria conta e sobre outros super admins (mesma lógica `blocked` existente). Aviso extra quando o utilizador tem email por confirmar ("o email de recuperação pode não chegar — preferir definir manualmente").
- Substituir o texto de "fases seguintes" por nota sobre revogação de sessões e remoção de conta.

### 3. Validação
- Fluxo completo: admin define password ao Movéis Baratos → login funciona; admin envia reset → email → `/reset-password` → nova password → login.
- Registo em `admin_audit_logs` das duas ações.
- Self-service em Definições → Perfil continua a funcionar.

## Notas técnicas

- A edge function já regista auditoria (`admin_audit_logs`) e valida que o autor é super admin — só se reutiliza.
- Não expor a password em logs nem em toasts persistentes; apenas no dialog one-time.
- Rota `/reset-password` pública, seguindo o padrão já usado em `/client/reset-password`.

## Riscos por validar

- A rota `/reset-password` tem de estar fora de qualquer guard de autenticação, mas a sessão de recovery é válida — garantir que o router não a trata como utilizador autenticado normal.
