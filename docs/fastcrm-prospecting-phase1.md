# FastCRM Prospecção — Fase 1 (motor SDR)

Estado: **código pronto a rever. Nada foi activado.** A migração não foi aplicada em produção, não houve deploy manual de funções, não se enviaram mensagens, não se criaram destinatários/inscrições e nenhum cron foi ligado.

Base analisada: `8ebc365a…` · head confirmado `375709376c2e574bf4cd423e6d7ad355463c47e6`.

## Cadeia implementada

```text
elegibilidade → inscrição → agendamento 1.ª etapa → claim atómico → quota → transporte existente → registo → avanço / paragem
```

| Etapa | Onde |
|---|---|
| Elegibilidade (fontes reais, target_filters, exclusões) | `_shared/sdr-engine/eligibility.ts`, `sdr-orchestrator` `auto_enroll_scan` |
| Inscrição unificada (manual = automática) + dedupe por campanha+identidade | `sdr-orchestrator` `createEnrollment` / `scheduleEnrollment` |
| Janela Europe/Lisbon (default seg–sex 09:00–19:00, configurável em `settings.send_window`) | `_shared/sdr-engine/schedule.ts` |
| Executor (revalidação, claim, quota, envio, retry, ambíguo, bloqueio) | `_shared/sdr-engine/executor.ts` (puro) + `supabasePorts.ts` (real) |
| Contrato worker HMAC para transportes | `_shared/sdr-engine/workerAuth.ts` |
| Paragem por resposta (trigger em `messages` inbound + verificação pré-envio) | migração §8, `supabasePorts.hasInboundReply` |
| Cancelamento por token (GET valida, POST cancela, propaga ao SDR) | `handle-email-unsubscribe`, página `/unsubscribe` existente |

## Interruptores (todos DESLIGADOS por defeito)

| Interruptor | Efeito |
|---|---|
| Secret `SDR_AUTONOMOUS_SEND_ENABLED=true` **e** `SDR_WORKER_SECRET` (≥32 chars) | sem ambos: executor devolve `disabled`, transportes recusam cabeçalhos de worker, `whatsapp-pro-sequence-dispatch` não envia |
| Migração `supabase/pending-migrations/20260923180000_sdr_prospecting_phase1.sql` | sem ela: executor e auto-inscrição devolvem `schema_not_ready`; inscrição manual usa dedupe compatível com o esquema actual |
| `sdr_campaigns.autonomous_send_enabled` (default false) | por campanha |
| `sdr_campaigns.email_connection_id`, `email_daily_limit`, `email_min_interval_seconds` | email sem remetente ou sem limite explícito → bloqueado |
| `sdr_campaigns.whatsapp_instance_id` + linha em `whatsapp_throttle_settings` | WA sem conta/limite → bloqueado; usa os limites existentes (myMYA Hub 20/dia, 45–120 s) |
| Secret `SDR_AUTO_ENROLL_ENABLED=true` | sem ele `auto_enroll_scan` devolve `disabled` |
| Secret `SDR_PUBLIC_APP_URL` (https) | sem ele os emails SDR ficam bloqueados (sem link de cancelamento não se envia) |

O envio manual (Inbox) continua com `getUser` + pertença ao workspace. Sem cabeçalho de worker nada muda; cabeçalho presente mas inválido → 401.

## Estados

- Inscrição: `sequenced` → `completed` | `replied` | `opted_out` | `failed` | `blocked` (novo) | `paused`.
- Tentativa (`sdr_step_attempts`, chave `inscrição:ordem:etapa`): `reserved` → `dispatching` → `accepted` | `failed_retryable` | `failed_final` | `ambiguous` | `blocked` | `cancelled`. `delivered` fica reservado para callbacks futuros.
- `sdr_sequence_step_logs.status='sent'` significa **aceite pelo fornecedor** (`metadata.delivery_state='provider_accepted'`), não entrega confirmada.
- Falha retry-able: máx. 3 tentativas, backoff 15/30/60 min, sem avançar etapa. 400/401/403 → falha final.
- Timeout, sem resposta ou 5xx → `ambiguous`: inscrição `blocked` para revisão; nunca reenviado automaticamente, mesmo que reactivada.
- Canal não suportado (tudo excepto email/WhatsApp Pro) ou WhatsApp via GHL → `blocked` explícito.

## Compatibilização confirmada no esquema real (Fase 1, ainda não aplicada)

- **`sdr_enrollments_status_check`**: em produção admite apenas `enrolled, enriching, sequenced, replied, positive_reply, meeting_set, converted, opted_out, failed`. `paused`, `completed` e `blocked` — usados pelo motor — **são hoje inválidos**. A migração pendente substitui o CHECK por um superconjunto estrito (bloco `DO` que só actua se faltarem estados e aborta se existir algum estado fora do superconjunto). Até ser aplicada, `detectPhase1Schema` devolve `schema_not_ready` e o executor não escreve nenhum destes estados.
- **`sdr_sequence_step_logs.sequence_step_id` é NOT NULL**: nunca são inseridos registos sem etapa válida. Bloqueios e supressões anteriores à resolução da etapa ficam apenas no estado/`failure_reason` da inscrição e num aviso de log estruturado (`supabasePorts.log` ignora `stepId` nulo). A coluna **não** é tornada anulável.
- **`email_unsubscribe_tokens` só tem `id, token, email, created_at, used_at`** — sem `workspace_id`. O workspace é derivado das inscrições SDR com esse email. Como a tabela não tem unicidade por email, a geração do link usa sempre o token mais recente ainda não usado.
- **Atomicidade da exclusão**: nova RPC `email_process_unsubscribe(p_token)` (service_role) faz tudo numa transação e **grava a supressão antes de consumir o token**; qualquer falha parcial faz rollback e o token continua válido. `handle-email-unsubscribe` chama a RPC; enquanto a migração não estiver aplicada usa o caminho alternativo com a mesma ordem (suprimir → propagar → marcar token usado), pelo que nunca se consome o token sem excluir o endereço.



## Resultado por ponto

| # | Estado | Nota |
|---|---|---|
| B01 | Corrigido | `professional_prospecting_profiles` + `leads`, `target_filters`, exclusões, paginação, erros propagados |
| B02 | Corrigido | inscrição única; 1.ª data calculada; dedupe `uq_sdr_enrollments_campaign_identity` |
| B03 | Corrigido | contrato `workspaceId/connectionId/conversationId/body/isHtml`; remetente explícito da campanha; conversa do mesmo workspace |
| B04 | Parcial | WhatsApp usa `whatsapp_template` como texto via WhatsApp Pro (instância explícita, Inbox via `whatsapp-zapi-send`). **Envio SDR via GHL continua pendente** (bloqueado de forma explícita) |
| B05 | Corrigido | `whatsapp-pro-sequence-dispatch` → `workspaceId/messageType`, worker assinado até `whatsapp-zapi-send`; resposta 200+erro deixa de contar como enviado |
| B06 | Corrigido (código) | `reply_detected_at`; trigger `trg_sdr_stop_on_inbound` (na migração pendente) + verificação pré-envio. `stop_wa_sequences_on_reply` **não** foi ligado |
| B07 | Corrigido | link `/unsubscribe?token=` (sem email/IDs no URL); POST propaga a `sdr_enrollments`, `sdr_suppressions`, tentativas |
| B08 | Corrigido | revalidação antes da tentativa; falhas não avançam; placeholders removidos |
| B09 | Corrigido | claim atómico + lease; backfill não apaga duplicados (marca `metadata.sdr_duplicate_of`) |
| B10 | Corrigido | todos os acessos por ID filtram `workspace_id`; RPCs validam pertença; conversas verificadas em `email-send`/`whatsapp-zapi-send` |

## Limitações conhecidas

- Quota partilhada cobre envios SDR (email e WA). As sequências **WhatsApp Pro** (`whatsapp_sequence_enrollments`) e campanhas WA ainda não reservam na mesma tabela; a janela dessas sequências continua em UTC para não alterar outros clientes.
- Retentativas reutilizam a reserva da primeira tentativa (não consomem quota nova); o backoff ≥15 min é maior que o intervalo mínimo.
- Assinatura worker válida 120 s (sem registo de nonces); a idempotência por tentativa protege contra duplicados.
- `sdr-message-generator` (personalização IA) não é chamado na Fase 1 — o conteúdo configurado é enviado tal como está, com variáveis `{{name}}`, `{{first_name}}`, `{{email}}`, `{{phone}}`; variáveis por resolver bloqueiam.
- Estado `delivered` não é alimentado (sem callbacks de entrega ligados ao SDR).
- A auto-inscrição é disparada pelo utilizador (`auto_enroll_scan`); não existe cron novo.
- O teste `credit-rpc-isolation` já falhava antes desta fase (ficheiro não relacionado).

## Validação executada

```text
bunx vitest run src/test/sdr                       → 2 ficheiros, 36 testes OK (transportes simulados, sem rede)
bash supabase/pending-migrations/tests/run_local_pg_test.sh (Postgres local descartável, utilizador sem privilégios)
                                                   → assertions OK; reaplicação idempotente;
                                                     10 reservas concorrentes → 3 aceites (máx 3);
                                                     8 claims concorrentes → 1 aceite
deno check <7 funções alteradas>                   → sem erros
bunx tsgo --noEmit -p tsconfig.app.json            → sem erros
```

Cobertura: caminho feliz email/WA, 1.ª data (verão/inverno, fim-de-semana), filtros/elegibilidade, duplicação e concorrência, pausa (inscrição e campanha), falha+retry limitado, timeout ambíguo, excepção, canal não suportado, GHL, resposta, exclusão/token, quota partilhada entre campanhas, isolamento de workspace, envios desligados por defeito, contrato worker (assinatura, corpo alterado, expiração, modo desligado). Os testes do executor usam portas em memória; a semântica atómica foi validada à parte em Postgres real.

## Passos futuros de activação (NÃO executados)

1. Rever e aplicar a migração pendente (copiar o SQL para a ferramenta de migrações, sem alterações).
2. Correr a query de duplicados marcados: `select id, metadata->>'sdr_duplicate_of' from sdr_enrollments where metadata ? 'sdr_duplicate_of';` e decidir manualmente.
3. Definir secrets `SDR_WORKER_SECRET` (aleatório ≥32), `SDR_PUBLIC_APP_URL=https://fastcrm.metodopare.ai`.
4. Por campanha piloto: `email_connection_id`, `email_daily_limit` (conservador), `email_min_interval_seconds`, `whatsapp_instance_id`; confirmar `whatsapp_throttle_settings`.
5. Testar `single_step` numa inscrição interna (endereço próprio) com `SDR_AUTONOMOUS_SEND_ENABLED=true` e `autonomous_send_enabled=true` só nessa campanha.
6. Só depois: activar o job `sequence-step-processor` (Trigger.dev) e, opcionalmente, `SDR_AUTO_ENROLL_ENABLED`.
7. Desligar em emergência: remover `SDR_AUTONOMOUS_SEND_ENABLED` (efeito imediato em todos os envios autónomos).
