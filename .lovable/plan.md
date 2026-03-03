

# Envio Automático de Email 48h Antes do Deadline de RFQ

## Abordagem

Criar uma edge function cron que corre periodicamente, deteta RFQs com deadline a ≤48h, e envia emails de lembrete aos fornecedores via Resend. Usa o template `rfq_reminder` já existente no `rfq-send`.

## Alterações

### 1. Nova edge function `rfq-deadline-reminder/index.ts`
- Consulta RFQs com `status` em (`sent`, `receiving_quotes`) e `due_date` entre agora e agora+48h
- Para cada RFQ, busca fornecedores associados (com email e portal token)
- Envia email de lembrete via Resend usando o template visual já definido em `rfq-send` (reutilizar o HTML do `rfq_reminder`)
- Regista em `admin_notifications` que o lembrete foi enviado
- Marca na `rfq_suppliers` um campo `reminder_sent_at` para evitar envios duplicados (apenas envia se `reminder_sent_at` IS NULL)
- Usa `RESEND_API_KEY` (já configurado) e `SUPABASE_SERVICE_ROLE_KEY`

### 2. Migração DB
- Adicionar coluna `reminder_sent_at timestamptz` à tabela `rfq_suppliers` (nullable, default null) — controlo de idempotência

### 3. Cron job (pg_cron)
- Agendar execução a cada hora: `0 * * * *`
- Chamar a edge function `rfq-deadline-reminder` via `net.http_post`

### 4. Config (`supabase/config.toml`)
- Não editar (auto-gerido), a function será deployed automaticamente

### Ficheiros
- **Criar**: `supabase/functions/rfq-deadline-reminder/index.ts`
- **Migração**: adicionar `reminder_sent_at` a `rfq_suppliers`
- **SQL (insert)**: criar cron job via `pg_cron` + `pg_net`

