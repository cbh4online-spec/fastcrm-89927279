

# Página de erro amigável para OAuth do Meta

## Problema
Quando o OAuth falha, o callback redireciona para `/dashboard/meta/connections?error=<code>` mas a página ignora esse parâmetro — o utilizador não recebe feedback.

## Alterações

### 1. `src/components/meta/MetaConnectionsPage.tsx` — Mostrar banner de erro contextual

- Ler `error` dos query params (`useSearchParams`)
- Mapear códigos de erro para mensagens em português com instruções:
  - `token_exchange_failed` → "Falha na troca de token. Tente ligar novamente."
  - `db_error` → "Erro ao guardar a ligação. Tente novamente."
  - `unexpected` → "Ocorreu um erro inesperado."
  - Erro genérico do Facebook (ex: `OAuthException`) → "O Facebook recusou o acesso. Verifique as permissões da app."
- Mostrar um `Alert` com ícone, mensagem descritiva, e botão "Tentar novamente" + botão "Dispensar" (que limpa o query param)
- Incluir bloco colapsável "Detalhes técnicos" com o código de erro e instruções para admins (verificar redirect URI, permissões da app Meta, etc.)

### 2. Nenhuma alteração no edge function
Os redirects com `?error=` já estão implementados correctamente no callback.

