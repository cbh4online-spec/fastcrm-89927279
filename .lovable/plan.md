

# Configurar Instagram Business Login

## Contexto
O utilizador tem uma app Instagram API separada (FastCRM-IG, ID: 2652446668464417) no Meta Developers Portal. O Instagram Business Login usa um fluxo OAuth distinto do Facebook Login, com endpoints e scopes diferentes.

## Alterações necessárias

### 1. Adicionar secrets para a app Instagram
- `INSTAGRAM_APP_ID` → 2652446668464417
- `INSTAGRAM_APP_SECRET` → (o valor visível no portal)

Nota: já existe `INSTAGRAM_WEBHOOK_VERIFY_TOKEN` configurado.

### 2. Nova Edge Function: `instagram-oauth-start`
- Gera URL de autorização para `https://www.instagram.com/oauth/authorize`
- Scopes: `instagram_business_basic`, `instagram_business_manage_messages`, `instagram_business_manage_comments`
- Redirect URI: `{SUPABASE_URL}/functions/v1/instagram-oauth-callback`
- State: workspace_id, user_id (mesmo padrão do meta-oauth-start)

### 3. Nova Edge Function: `instagram-oauth-callback`
- Recebe `code` do Instagram
- Troca por short-lived token via `https://api.instagram.com/oauth/access_token`
- Troca por long-lived token via `https://graph.instagram.com/access_token?grant_type=ig_exchange_token`
- Obtém info do utilizador via `https://graph.instagram.com/v22.0/me?fields=user_id,username,account_type,profile_picture_url`
- Cria registo em `meta_connections` com provider=`instagram`
- Insere asset do tipo `instagram_account` em `meta_assets`
- Redirect para `/dashboard/meta/connections?connected=true`

### 4. Atualizar UI: `MetaConnectionsPage.tsx`
- Adicionar segundo botão "Ligar Conta Instagram" com ícone Instagram
- Novo hook `useInstagramOAuthStart` que invoca `instagram-oauth-start`
- Ambos os botões coexistem no header da página

### 5. Novo hook: `useInstagramOAuthStart` em `useMetaConnections.ts`
- Mutation que invoca a edge function `instagram-oauth-start`

## Configuração no Meta Developers Portal (manual)
O utilizador precisa adicionar o Redirect URI nas definições da Instagram API:
`https://eumnfkccyvlyoyjchiwe.supabase.co/functions/v1/instagram-oauth-callback`

## Fluxo resumido

```text
[Botão "Ligar Instagram"]
  → instagram-oauth-start (gera URL)
  → Redirect para instagram.com/oauth/authorize
  → Utilizador autoriza
  → Callback → instagram-oauth-callback
  → Troca code → short-lived → long-lived token
  → Guarda em meta_connections + meta_assets
  → Redirect para /dashboard/meta/connections?connected=true
```

