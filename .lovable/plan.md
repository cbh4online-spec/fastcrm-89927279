## Problema

A função `email-fetch` (sync IMAP) só corre quando o utilizador abre a UI de canais ou clica em "Sincronizar". Não existe nenhum `cron.job` agendado para email — só `process-email-queue` (envio). Resultado: 3 das 5 contas activas estão sem sincronizar há dias (`fernandohenriques@pharliss.pt` há 5 dias, `nfox@blecksen.pt` há 44 dias, `info@blecksen.pt` há 70 dias).

## Solução

Criar um scheduler que percorre todas as contas IMAP activas e dispara o sync a cada 5 minutos via pg_cron.

### 1. Edge function nova: `supabase/functions/email-fetch-scheduler/index.ts`

- `verify_jwt = false`, valida cabeçalho `x-cron-secret` contra `_cron_config.email_fetch_cron_secret` (mesmo padrão já usado por `billing-sync-daily`).
- Cliente com service role.
- Selecciona `email_connections` onde `is_active=true` E (`last_sync_at IS NULL` OU `last_sync_at < now() - interval '5 minutes'`) E `sync_status <> 'syncing'`.
- Para cada conexão, invoca `email-fetch` em série (ou em lotes de 3 para evitar saturação) passando `{ connectionId, workspaceId, source: 'cron' }` e um header `x-cron-secret`.
- Devolve `{ processed, ok, failed }` (200 OK mesmo com falhas parciais, conforme padrão de resiliência do projecto).

### 2. Ajuste em `supabase/functions/email-fetch/index.ts`

- Quando o body contém `source: 'cron'` E o header `x-cron-secret` é válido, ignora a validação JWT e usa `connection.connected_by` como `user.id` no `insert` de leads novos (linha 294) — único sítio onde o user actual é usado.
- Em todos os outros casos mantém o fluxo actual (JWT obrigatório).
- Acrescenta um guard: se `sync_status = 'syncing'` há menos de 2 minutos, devolve `{ skipped: 'in_progress' }` sem reentrar.

### 3. Migração SQL

- Garantir entrada em `public._cron_config` para `email_fetch_cron_secret` (gerar UUID se ainda não existir).
- `cron.schedule('email-fetch-scheduler', '*/5 * * * *', ...)` com `net.http_post` para a edge function, passando `x-cron-secret` no header.
- Sem GRANTs novos (tabela já existe).

### 4. UI (opcional, mínima)

- Em `BillingIntegrationsPage`/canais de email, a coluna "Última sync" já existe — sem alteração visual necessária. A frase "Sincronizado · há menos de um minuto" passará a actualizar sozinha.

## Ficheiros tocados

- Novo: `supabase/functions/email-fetch-scheduler/index.ts`
- Novo: `supabase/migrations/<timestamp>_email_fetch_cron.sql`
- Editado: `supabase/functions/email-fetch/index.ts` (modo cron + guard de reentrância)

## Verificação

- Após deploy: `SELECT jobname, schedule, active FROM cron.job WHERE jobname='email-fetch-scheduler';`
- Após 5 min: `SELECT email_address, last_sync_at, sync_status FROM email_connections WHERE is_active`.
- Logs em `email-fetch-scheduler` e `email-fetch`.
