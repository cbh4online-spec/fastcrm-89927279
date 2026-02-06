

# Passo a Passo: Integrar Google Meet no FastCRM

## O Que Vai Mudar

Atualmente, cada workspace precisa inserir manualmente Client ID e Client Secret. Vamos simplificar para que o admin do workspace apenas clique em "Conectar com Google" e autorize a sua conta Google -- as reunioes serao criadas no calendario dessa pessoa.

Para isso, o FastCRM precisa de ter uma unica app OAuth registada no Google, cujas credenciais ficam guardadas como secrets da plataforma.

---

## Passo 1: Criar a App OAuth no Google Cloud Console

1. Acede a [console.cloud.google.com](https://console.cloud.google.com)
2. Cria um projeto novo (ou usa um existente) -- ex: "FastCRM Video"
3. No menu lateral, vai a **APIs e Servicos > Biblioteca**
4. Procura e ativa a **Google Calendar API**
5. Vai a **APIs e Servicos > Tela de consentimento OAuth**
   - Tipo: **Externo**
   - Preenche o nome da app: "FastCRM"
   - Email de suporte: o teu email
   - Dominios autorizados: `supabase.co` e `lovable.app`
   - Scopes: adiciona `https://www.googleapis.com/auth/calendar.events`
6. Vai a **APIs e Servicos > Credenciais**
   - Clica **Criar credenciais > ID do cliente OAuth**
   - Tipo: **Aplicacao Web**
   - Nome: "FastCRM Video"
   - **URIs de redirecionamento autorizados**: adiciona exatamente:
     ```
     https://eumnfkccyvlyoyjchiwe.supabase.co/functions/v1/video-oauth-callback
     ```
   - Clica **Criar**
7. Copia o **Client ID** e o **Client Secret** que aparecem

---

## Passo 2: Guardar os Secrets na Plataforma

Depois de teres o Client ID e Client Secret do Google, vou pedir para os guardares como secrets seguros da plataforma:
- `GOOGLE_OAUTH_CLIENT_ID`
- `GOOGLE_OAUTH_CLIENT_SECRET`

Estes valores ficam acessiveis apenas nas funcoes backend e nunca sao expostos no codigo.

---

## Passo 3: Alteracoes no Codigo

### 3.1 Edge Function `video-auth-url`
Alterar para ler o Client ID do secret da plataforma (`GOOGLE_OAUTH_CLIENT_ID`) em vez de ler da tabela `workspace_video_config`. Mantemos o `state` com o `workspace_id` para saber a que workspace associar os tokens.

### 3.2 Edge Function `video-oauth-callback`
Alterar para usar `GOOGLE_OAUTH_CLIENT_ID` e `GOOGLE_OAUTH_CLIENT_SECRET` dos secrets da plataforma ao trocar o code por tokens. Os tokens resultantes (access_token, refresh_token) continuam a ser guardados na tabela `workspace_video_config` -- associados ao workspace do admin que autorizou.

### 3.3 Edge Function `create-video-meeting`
Alterar o `refreshGoogleToken` para usar os secrets da plataforma em vez de credenciais por workspace.

### 3.4 UI `WorkspaceVideoSettings.tsx`
Simplificar a seccao Google Meet:
- Remover campos de Client ID e Client Secret
- Manter apenas o botao "Conectar com Google"
- Quando conectado, mostrar badge verde + botoes "Testar" e "Desligar"

### 3.5 Hook `useWorkspaceVideoConfig.ts`
Simplificar o `connectOAuth` -- ja nao precisa de verificar se ha credenciais guardadas no workspace, basta chamar a edge function que usa os secrets globais.

---

## Resumo do Fluxo Final

```text
Admin clica "Conectar com Google"
         |
         v
Edge function gera URL OAuth 
(usando GOOGLE_OAUTH_CLIENT_ID da plataforma)
         |
         v
Admin e redirecionado para Google
e autoriza a sua conta pessoal/empresa
         |
         v
Google redireciona para video-oauth-callback
         |
         v
Callback troca code por tokens 
(usando secrets da plataforma)
         |
         v
Tokens (access + refresh) guardados 
na workspace_video_config do workspace
         |
         v
Ao criar reuniao, usa os tokens 
do workspace para criar evento 
no calendario do admin
```

---

## Ficheiros a Modificar

| Ficheiro | Alteracao |
|----------|-----------|
| `supabase/functions/video-auth-url/index.ts` | Usar `GOOGLE_OAUTH_CLIENT_ID` do env em vez da tabela |
| `supabase/functions/video-oauth-callback/index.ts` | Usar secrets da plataforma para trocar code por tokens |
| `supabase/functions/create-video-meeting/index.ts` | Usar secrets da plataforma para refresh de tokens |
| `src/components/settings/sections/WorkspaceVideoSettings.tsx` | Remover campos de credenciais, simplificar para botao "Conectar" |
| `src/hooks/useWorkspaceVideoConfig.ts` | Simplificar logica de conexao |

## Proximo Passo

Depois de aprovares este plano, vou pedir-te os dois secrets (Google Client ID e Secret) e implementar todas as alteracoes.

