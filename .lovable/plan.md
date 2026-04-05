
# SDR — Iteração 4: Automação e Execução de Sequências ✅

## 1. ✅ Tabela `sdr_sequence_step_logs`
- Registos de execução por step: status, timestamps (sent/opened/clicked/replied), erros
- Colunas `current_step` e `next_send_at` adicionadas a `sdr_enrollments`
- RLS: SELECT para membros, INSERT/UPDATE para service_role

## 2. ✅ Edge Function `sdr-sequence-executor`
- Processador batch: busca enrollments com `next_send_at <= now()` e status `sequenced`
- Executa steps por canal (email → `email-send`, WhatsApp → `ghl-send-message`)
- Regista logs, avança step, calcula próximo envio
- Modo single_step para execução imediata

## 3. ✅ `sdr-orchestrator` — action `enroll_in_sequence`
- Cria enrollment em sequência quando prospect inscrito em campanha com sequence_id
- Calcula next_send_at baseado no delay do primeiro step
- Actions `pause_sequence` / `resume_sequence` adicionadas

## 4. ✅ Hook `useSDRSequenceExecution`
- `useSDRStepLogs` — logs de execução por enrollment
- `useSDRSequenceMetricsData` — métricas agregadas por step
- `usePauseResumeSequence` — pause/resume com invalidation de cache

## 5. ✅ UI: Pause/Resume + Step info em SDRProspectActions
- Botões "Pausar sequência" / "Retomar sequência" no dropdown
- Coluna "Step" com step actual e próximo envio agendado
- Status "paused" e "completed" adicionados

## 6. ✅ SDRSequenceMetrics com funnel por step
- Mini-funnel: enviados, abertos, clicados, respondidos por step
- Taxa de abertura por step

## 7. ✅ Trigger.dev job actualizado
- `sequence-step-processor` agora invoca `sdr-sequence-executor` em vez de `auto-followup-scheduler`

## Ficheiros modificados/criados

| Ficheiro | Acção |
|---|---|
| Migração SQL | `sdr_sequence_step_logs` + colunas em `sdr_enrollments` |
| `supabase/functions/sdr-sequence-executor/index.ts` | **Novo** |
| `supabase/functions/sdr-orchestrator/index.ts` | Actions enroll/pause/resume |
| `trigger/jobs/sequences.ts` | Aponta para `sdr-sequence-executor` |
| `src/hooks/useSDRSequenceExecution.ts` | **Novo** |
| `src/components/sdr/SDRProspectActions.tsx` | Pause/resume + step info |
| `src/components/sdr/SDRSequenceMetrics.tsx` | Funnel por step |
