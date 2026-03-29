

# Configuração Meta App + Correção de Bug

## Bug a corrigir

O `meta-webhook-hub` usa `INSTAGRAM_WEBHOOK_VERIFY_TOKEN` em vez de `META_VERIFY_TOKEN` (linha 42). Precisa ser corrigido para usar o secret correto.

## Passo a passo de configuração no Meta Developers

### 1. Configurar o produto "Webhooks"

No painel do Meta Developers (que mostraste no screenshot):

1. Ir a **Webhooks** no menu lateral
2. Selecionar objeto **Page**
3. Clicar **Subscribe to this topic**
4. Preencher:
   - **Callback URL**: `https://eumnfkccyvlyoyjchiwe.supabase.co/functions/v1/meta-webhook-hub`
   - **Verify Token**: o valor que definiste no secret `META_VERIFY_TOKEN`
5. Subscrever os campos:
   - `leadgen` (para Lead Ads)
   - `messages` (para Messenger)
   - `feed` (para comentários — Fase 2)

6. Repetir para objeto **Instagram** se quiseres Instagram DM:
   - Mesmo Callback URL e Verify Token
   - Subscrever: `messages`

### 2. Configurar o produto "Facebook Login for Business"

1. Ir a **Facebook Login for Business** no menu lateral
2. Em **Settings**, configurar:
   - **Valid OAuth Redirect URIs**: `https://eumnfkccyvlyoyjchiwe.supabase.co/functions/v1/meta-oauth-callback`
   - **Client OAuth Login**: ON
   - **Web OAuth Login**: ON

### 3. Produtos a ativar na App

Na secção **Add Products**, garantir que estão ativos:
- Facebook Login for Business
- Webhooks
- Messenger (API Setup)
- Instagram Graph API (se quiser IG DM/publishing)

### 4. Permissões a pedir (App Review)

Para modo de desenvolvimento/teste, podes usar sem review. Para produção, precisarás de aprovação para:
- `pages_show_list`, `pages_manage_metadata`
- `pages_read_engagement`, `pages_manage_posts`
- `pages_messaging`
- `instagram_basic`, `instagram_manage_messages`
- `leads_retrieval`
- `business_management`

### 5. Modo da App

- Para testar: manter em **Development** e adicionar test users
- Para produção: mudar para **Live** (requer App Review aprovado e Privacy Policy URL)

## Alteração técnica

| Ficheiro | Alteração |
|---|---|
| `supabase/functions/meta-webhook-hub/index.ts` | Linha 42: trocar `INSTAGRAM_WEBHOOK_VERIFY_TOKEN` por `META_VERIFY_TOKEN` |

