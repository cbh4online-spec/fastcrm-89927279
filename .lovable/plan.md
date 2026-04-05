# SDR — Iteração 7: Compliance, Opt-out, Bounces e Throttling

## Diagnóstico

O módulo SDR tem `opted_out_at` nos enrollments e o orchestrator consegue marcar status `opted_out`, mas falta:
- **Suppression check antes do envio**: O `sdr-sequence-executor` não verifica `campaign_suppressions` nem `suppressed_emails` antes de enviar
- **Unsubscribe link nos emails SDR**: Emails de sequência não incluem link de opt-out
- **Bounce handling para SDR**: Bounces do marketing-webhook não propagam para enrollments SDR
- **Throttling de envio**: Sem rate limiting — pode enviar centenas de emails de uma vez
- **UI de gestão de opt-outs**: Sem vista para ver/gerir contactos que fizeram opt-out
- **Compliance footer**: Sem informação GDPR/CAN-SPAM nos emails de sequência

## Implementação

### 1. Migração: tabela `sdr_suppressions`
Tabela dedicada de supressões SDR (bounces, complaints, opt-outs manuais) com workspace scope.
Campos: workspace_id, email, reason (hard_bounce | complaint | manual_optout | unsubscribe), source_enrollment_id, created_at.

### 2. sdr-sequence-executor: Suppression check + Throttling
- Antes de enviar, verificar se o email está em `sdr_suppressions` OU `suppressed_emails`
- Se suprimido: skip step, logar motivo, marcar enrollment como `opted_out`
- Throttling: processar em batches de 20, com delay de 500ms entre envios
- Adicionar unsubscribe link e compliance footer ao corpo do email

### 3. sdr-orchestrator: Bounce propagation
- Ao receber webhook de bounce/complaint, verificar se o email tem enrollment SDR activo
- Se sim: marcar enrollment como `opted_out`, criar registo em `sdr_suppressions`

### 4. UI: SDRSuppressionManager
- Lista de emails suprimidos com filtros (reason, data)
- Acção: remover supressão (com confirmação)
- Acção: adicionar supressão manual
- KPIs: total suprimidos, por motivo, tendência

### 5. UI: Opt-out rate no dashboard
- Adicionar opt-out rate aos KPIs existentes das campanhas
- Coluna opt-out no SDRAnalyticsDashboard

### Ficheiros

| Ficheiro | Acção |
|---|---|
| `supabase/functions/sdr-sequence-executor/index.ts` | Suppression check + throttling + unsubscribe link |
| `supabase/functions/sdr-orchestrator/index.ts` | Bounce propagation para enrollments |
| `src/components/sdr/SDRSuppressionManager.tsx` | **Novo** — gestão de supressões |
| `src/pages/SDRDashboardPage.tsx` | Adicionar tab "Compliance" |
| `src/components/sdr/SDRAnalyticsDashboard.tsx` | Adicionar opt-out rate |
