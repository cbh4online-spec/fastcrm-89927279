
# Plano: Sistema Completo de Autenticacao para Clientes B2B

## Problema Actual

O fluxo de convite actual tem duas lacunas criticas:

1. **Sem palavra-passe provisoria**: O email de convite apenas envia um link, mas nao cria credenciais de acesso
2. **Sem reset de palavra-passe**: A pagina de login nao oferece opcao para recuperar/alterar a palavra-passe

## Solucao Proposta

### Fluxo de Onboarding do Cliente

```text
1. Admin convida cliente
       |
       v
2. Sistema cria utilizador Auth com password temporaria
       |
       v
3. Email enviado com password temporaria
       |
       v
4. Cliente faz login com password temporaria
       |
       v
5. Sistema detecta primeiro login e redireciona para alteracao de password
       |
       v
6. Cliente define nova password e acede ao portal
```

### Alteracoes Necessarias

#### 1. Nova Edge Function: `create-client-auth-user`

Cria o utilizador no sistema de autenticacao com password temporaria:

- Recebe: email, nome, workspace_id, client_user_id
- Gera password temporaria segura (12 caracteres)
- Cria utilizador Auth via `supabase.auth.admin.createUser`
- Actualiza `client_users.auth_user_id` com o novo user id
- Marca utilizador para exigir alteracao de password (metadata)
- Retorna password temporaria para incluir no email

#### 2. Actualizar Edge Function: `send-client-invitation`

Integrar com a nova funcao de criacao de utilizador:

- Aceitar `temporaryPassword` no payload
- Actualizar template do email para incluir credenciais:
  - Email de acesso
  - Password temporaria
  - Aviso para alterar password no primeiro acesso

#### 3. Actualizar: `InviteClientDialog.tsx`

Modificar o fluxo de criacao:

- Primeiro criar o utilizador Auth (via nova edge function)
- Receber a password temporaria
- Enviar convite com credenciais incluidas

#### 4. Nova Pagina: `ClientSetPasswordPage.tsx`

Pagina para clientes definirem nova password:

- Formulario com: password actual, nova password, confirmar password
- Validacao de forca da password (minimo 8 caracteres)
- Apos sucesso, redireciona para dashboard

#### 5. Actualizar: `ClientLoginPage.tsx`

Adicionar funcionalidades:

- Link "Esqueci-me da palavra-passe"
- Apos login, verificar se e primeiro acesso (via metadata)
- Se primeiro acesso, redirecionar para pagina de alteracao de password

#### 6. Nova Pagina: `ClientForgotPasswordPage.tsx`

Pagina de recuperacao de password:

- Formulario apenas com email
- Envia email de reset via Supabase Auth
- Mensagem de confirmacao

#### 7. Nova Pagina: `ClientResetPasswordPage.tsx`

Pagina para definir nova password apos reset:

- Valida token do URL
- Formulario com nova password e confirmacao
- Apos sucesso, redireciona para login

## Ficheiros a Criar

| Ficheiro | Descricao |
|----------|-----------|
| `supabase/functions/create-client-auth-user/index.ts` | Cria utilizador Auth com password temporaria |
| `src/pages/client/ClientSetPasswordPage.tsx` | Pagina para alterar password (primeiro acesso) |
| `src/pages/client/ClientForgotPasswordPage.tsx` | Pagina "Esqueci-me da palavra-passe" |
| `src/pages/client/ClientResetPasswordPage.tsx` | Pagina para definir nova password via link |

## Ficheiros a Modificar

| Ficheiro | Alteracao |
|----------|-----------|
| `supabase/functions/send-client-invitation/index.ts` | Incluir password temporaria no email |
| `src/components/client-users/InviteClientDialog.tsx` | Chamar nova edge function primeiro |
| `src/components/client-users/ClientUsersList.tsx` | Actualizar reenvio para recriar password |
| `src/pages/client/ClientLoginPage.tsx` | Adicionar link "Esqueci-me da password" + verificar primeiro acesso |
| `src/hooks/client-portal/useClientAuth.ts` | Adicionar funcao de reset password |
| `src/App.tsx` | Adicionar novas rotas do portal |

## Detalhes Tecnicos

### Geracao de Password Temporaria

```typescript
function generateTemporaryPassword(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  let password = '';
  for (let i = 0; i < 12; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
}
```

### Verificacao de Primeiro Acesso

Usar `user_metadata.requires_password_change: true` para identificar utilizadores que precisam alterar password.

### Novas Rotas

```typescript
/client/login              - Login (existente)
/client/set-password       - Alterar password (primeiro acesso)
/client/forgot-password    - Solicitar reset
/client/reset-password     - Definir nova password (via link email)
```

### Template de Email Actualizado

O email incluira:

```
Credenciais de acesso:
- Email: cliente@email.pt
- Palavra-passe temporaria: AbCd1234XyZw

IMPORTANTE: Por razoes de seguranca, sera solicitado que altere a sua palavra-passe no primeiro acesso.
```

## Seguranca

- Password temporaria gerada de forma segura (sem caracteres ambiguos)
- Utilizador obrigado a alterar password no primeiro acesso
- Edge function `create-client-auth-user` usa service role key
- Validacao JWT desactivada para funcoes publicas de reset
