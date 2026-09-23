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
| B05 | Corrigido / via autónoma bloqueada | contrato `workspaceId/messageType` corrigido, mas `whatsapp-pro-sequence-dispatch` fica **bloqueado explicitamente** na Fase 1 (`PHASE1_WA_SEQUENCE_AUTONOMOUS_BLOCKED`): não reserva a quota partilhada nem tem opt-in por espaço/sequência; a flag SDR não o activa |
| B06 | Corrigido (código) | `reply_detected_at`; trigger `trg_sdr_stop_on_inbound` (migração pendente) + verificação antes da reserva, depois da reserva e em `sdr_begin_dispatch`. `stop_wa_sequences_on_reply` **não** foi ligado |
| B07 | Corrigido | link `/unsubscribe?token=`; `email_process_unsubscribe` atómico (supressão antes de consumir o token; falha parcial mantém o token válido — testado em SQL) |
| B08 | Corrigido (comprovado) | revalidação em três pontos: (1) antes do claim; (2) `preflight` depois da reserva — flag global relida, inscrição/etapa, campanha activa+autónoma, sequência activa e etapa igual, resposta, exclusão, elegibilidade; (3) `sdr_begin_dispatch` na mesma transacção que bloqueia a inscrição e consome a reserva. Sequência pausada não executa nem termina a inscrição. Regressões: `sdr-review-regressions.test.ts` §1–2 e `assertions_review.sql` |
| B09 | Corrigido (comprovado) | claim atómico + lease (8 → 1 em Postgres real); recibo único por (tentativa, despacho, transporte) — 8 consumos paralelos do mesmo pedido → 1 ok / 7 `replay` |
| B10 | Corrigido | acessos por ID filtram `workspace_id`; RPCs e recibos validam workspace, canal, campanha, destinatário; lead/contacto/conversa verificados contra o workspace |

## Controlos revistos (revisão independente de 4f7e6b6)

- **Janela de envio**: `parseWindow` valida `HH:mm` (00–23/00–59), dias 0–6 não vazios, fuso IANA e início < fim. Configuração ausente → janela por defeito explícita; configuração presente inválida → `config_invalid` sem envio e sem alterar a inscrição. `nextAllowedAt` devolve `null` em vez de um instante fora da janela. Testado: `25:00`, `09:99`, `9:00`, fuso inválido, mudanças de hora de 29/03 e 25/10/2026.
- **Logs**: nunca se insere `sequence_step_id = null` (bloqueios sem etapa ficam só em `failure_reason`). Erros de insert lançam; o executor reporta-os em `warnings` em vez de os ignorar. `finishAttempt` usa `sdr_finish_attempt` com transição verificada e lança se não aplicar; `releaseAttempt` idem. A aceitação tem de ser persistida **antes** de avançar; se falhar, a tentativa fica `dispatching` → ambígua → nunca reenviada.
- **Quota**: reserva por (tentativa, número de despacho). Reserva de outro dia não consumida é libertada e revalidada contra a quota de hoje; despacho consumido nunca é reutilizado; `sdr_begin_dispatch` exige reserva de hoje. Envios rejeitados continuam a contar (nunca aumenta limites). Relógio real após o lock (`clock_timestamp`) — corrigido um defeito real encontrado pelo teste de concorrência (com `now()` o intervalo mínimo recusava reservas legítimas). WhatsApp: limite efectivo = mín(`max_per_day`, aquecimento); pausa respeitada; limites nulos → `quota_not_configured`.
- **Fronteira de envio**: a assinatura HMAC só prova origem (120 s, replayable por si só). `email-send`, `whatsapp-pro-send` e `whatsapp-zapi-send` em modo worker exigem `sdr {attemptId, dispatchNo}` e chamam `sdr_consume_transport_token`, que verifica workspace, canal, destinatário, estado `dispatching`, número do despacho e elegibilidade, e grava recibo único por transporte. Modo worker só texto 1:1 (sem media/botões/grupos). Envio manual inalterado.
- **WhatsApp SDR**: consentimento `granted`, não revogado, categoria `marketing`/`all` (`whatsapp_consents`); lead/contacto `is_blocked`, `archived_at`, `deleted_at`, `automation_active=false`; guardas antigas reutilizadas (`_shared/whatsapp-stop-guards.ts`: opt-out, resposta, `stop_contact`, snooze, reunião, lead perdida) — no adaptador e de novo em SQL no ponto transaccional.
- **Esquema**: colunas de `leads`, `contacts`, `professional_prospecting_profiles`, `multichannel_sequences`, `whatsapp_consents`, `whatsapp_throttle_settings` confirmadas por SELECT a `information_schema` e fixadas num teste de contrato.

## Limitações conhecidas

- Janela residual inevitável entre o commit de `sdr_begin_dispatch`/recibo e a chamada ao fornecedor (milissegundos); uma pausa nesse intervalo já não impede esse envio.
- Quota WA do SDR não conta envios manuais nem campanhas WA fora do SDR; as sequências WhatsApp Pro autónomas estão bloqueadas até partilharem a mesma reserva.
- `error_pause_threshold` do throttle WA não é avaliado pelo SDR (só `paused`).
- Email: não é exigido consentimento explícito (base legal B2B segue `outreach-guards`); exclusões e bloqueios são respeitados.
- `sdr-message-generator` não é chamado; `delivered` não é alimentado; envio via GHL bloqueado.
- `credit-rpc-isolation` já falhava antes desta fase.

## Validação executada

```text
bunx vitest run src/test/sdr     → 3 ficheiros, 84 testes OK (executor, schedule e supabasePorts reais; sem rede)
setpriv --reuid=65534 bash supabase/pending-migrations/tests/run_local_pg_test.sh (Postgres local descartável)
                                 → assertions OK + review assertions OK; reaplicação idempotente;
                                   10 reservas concorrentes → 3 (máx 3); 8 claims → 1;
                                   8 consumos do mesmo pedido assinado → 1 ok / 7 replay
deno check (sdr-sequence-executor, sdr-orchestrator, email-send, whatsapp-pro-send,
            whatsapp-zapi-send, whatsapp-pro-sequence-dispatch) → sem erros
bunx tsgo --noEmit -p tsconfig.app.json → sem erros
```

## Passos futuros de activação (NÃO executados)

1. Rever e aplicar a migração pendente (copiar o SQL para a ferramenta de migrações, sem alterações).
2. Correr a query de duplicados marcados: `select id, metadata->>'sdr_duplicate_of' from sdr_enrollments where metadata ? 'sdr_duplicate_of';` e decidir manualmente.
3. Definir secrets `SDR_WORKER_SECRET` (aleatório ≥32), `SDR_PUBLIC_APP_URL=https://fastcrm.metodopare.ai`.
4. Por campanha piloto: `email_connection_id`, `email_daily_limit` (conservador), `email_min_interval_seconds`, `whatsapp_instance_id`; confirmar `whatsapp_throttle_settings`.
5. Testar `single_step` numa inscrição interna (endereço próprio) com `SDR_AUTONOMOUS_SEND_ENABLED=true` e `autonomous_send_enabled=true` só nessa campanha.
6. Só depois: activar o job `sequence-step-processor` (Trigger.dev) e, opcionalmente, `SDR_AUTO_ENROLL_ENABLED`.
7. Desligar em emergência: remover `SDR_AUTONOMOUS_SEND_ENABLED` (efeito imediato em todos os envios autónomos).

## Complemento — autenticação do `whatsapp-pro-sequence-dispatch` (B05/B10)
- O handler autentica o chamador **antes** de criar o cliente service_role, antes do bloqueio da Fase 1 e antes de qualquer leitura/mutação (`dispatchAuth.ts`).
- Aceite apenas `Authorization: Bearer <service role>` (comparação em tempo constante) — o caminho do cron interno. Se vier assinatura worker, tem de ser válida.
- Recusas: sem cabeçalho/mal formado/servidor sem chave → 401; JWT de utilizador ou anon key → 403; assinatura inválida, expirada ou com modo worker desligado → 401.
- Testes: `src/test/sdr/sdr-wa-dispatch-auth.test.ts` (11), incluindo verificação da ordem no handler. A via autónoma continua bloqueada (`PHASE1_WA_SEQUENCE_AUTONOMOUS_BLOCKED`). Nenhum deploy, flag, cron ou envio foi feito.

## Interrupções temporárias e retoma (revisão de 5a1b96b)

- Pausa da campanha, da inscrição ou da sequência, flag global desligada, autonomia desligada, automação do contacto desligada, snooze/reunião e pausa em `whatsapp_throttle_settings` são **temporárias**: a tentativa fica `reserved` sem lease (`sdr_suspend_attempt`), a reserva de quota não consumida é libertada e o motivo fica em `last_error` (`suspended:…`). Ao retomar, a mesma etapa é reclamada e enviada uma única vez.
- Resposta, exclusão/opt-out, bloqueio do contacto, falta de consentimento e mudança de etapa continuam a **cancelar** a tentativa; tentativas `accepted`, `ambiguous` ou `cancelled` nunca são reabertas.
- Recusas temporárias de `sdr_begin_dispatch`: `campaign_inactive`, `campaign_autonomous_disabled`, `sequence_inactive`, `step_inactive`, `enrollment_paused`, `automation_paused`, `whatsapp_throttle_paused`, `quota_reservation_missing`.
- WhatsApp: o preflight volta a resolver a rota (pausa/conta do throttle) e `sdr_begin_dispatch` consulta `whatsapp_throttle_settings` na transação final.
- Testes: `src/test/sdr/sdr-pause-resume.test.ts` (pausa → 0 envios → retoma → 1 envio, 8 execuções concorrentes → 1 envio) e `assertions_review.sql` (throttle em pausa, suspensão, retoma). Nada aplicado em produção.
