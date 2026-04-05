

# SDR — Iteração 4: Automação e Execução de Sequências

## Contexto

A iteração 3 criou a UI para associar sequências a campanhas e configurar A/B testing, mas a execução real dos passos ainda não está ligada. A `sdr_enrollments` já tem `sequence_enrollment_id` e a `email_sequence_enrollments` já gere estado por contacto (current_step, next_send_at, status). O objectivo é fechar o ciclo: enrollment automático → execução de steps → tracking → pause/resume.

---

## Plano de Implementação

### 1. Tabela de bridge: `sdr_sequence_step_logs`
Migração para criar tabela que regista cada execução de step para um enrollment SDR:
- `id`, `sdr_enrollment_id`, `sequence_step_id`, `channel`, `status` (sent/failed/skipped/opened/clicked/replied), `sent_at`, `opened_at`, `clicked_at`, `replied_at`, `error_message`, `metadata` (jsonb)
- RLS: workspace_id scoped

### 2. Actualizar `sdr-orchestrator` — nova action `enroll_in_sequence`
Quando um prospect é inscrito numa campanha com `sequence_id`:
- Criar `email_sequence_enrollment` (ou multichannel equivalente)
- Ligar via `sdr_enrollments.sequence_enrollment_id`
- Atribuir variante A/B se configurado
- Calcular `next_send_at` do primeiro step

### 3. Nova Edge Function `sdr-sequence-executor`
Processador periódico (invocado pelo Trigger.dev job existente `sequence-step-processor`):
- Busca `sdr_enrollments` com status `sequenced` e `next_send_at <= now()`
- Para cada: busca o step actual da sequência
- Executa a acção conforme canal (email → `email-send`, WhatsApp → `ghl-send-message`)
- Regista em `sdr_sequence_step_logs`
- Avança `current_step`, calcula próximo `next_send_at`
- Se último step → marca enrollment como `completed`
- Verifica condições de saída (reply detectada → pausa automática)

### 4. Tracking de opens/clicks/replies
- Actualizar `email-webhook` para detectar opens/clicks em emails SDR e actualizar `sdr_sequence_step_logs`
- Quando reply detectada: actualizar `sdr_enrollments.status` → `replied` e pausar sequência

### 5. UI: Pause/Resume por prospect
Em `SDRProspectActions.tsx`:
- Botão "Pausar sequência" / "Retomar sequência" para enrollments com status `sequenced`
- Mostra step actual e próximo envio agendado
- Timeline visual dos steps executados (usando `sdr_sequence_step_logs`)

### 6. UI: Métricas de execução no dashboard
Actualizar `SDRSequenceMetrics.tsx`:
- Adicionar métricas por step (enviados, abertos, clicados, respondidos)
- Taxa de drop-off entre steps (mini-funnel)
- Tempo médio entre steps

### 7. Actualizar Trigger.dev job
Modificar `trigger/jobs/sequences.ts` para invocar `sdr-sequence-executor` em vez de `auto-followup-scheduler`.

---

## Estrutura Técnica

```text
┌─────────────────┐     ┌──────────────────────┐
│  SDR Campaign    │────▶│ Multichannel Sequence │
│  (sequence_id)   │     │ (steps + templates)   │
└────────┬────────┘     └──────────┬───────────┘
         │                         │
    enrollment                step config
         │                         │
┌────────▼────────┐     ┌──────────▼───────────┐
│ sdr_enrollments  │────▶│ sdr_sequence_step_logs│
│ (prospect state) │     │ (execution history)   │
└────────┬────────┘     └──────────────────────┘
         │
    next_send_at
         │
┌────────▼────────┐
│ sdr-sequence-   │──▶ email-send / ghl-send
│ executor (EF)   │
└─────────────────┘
```

---

## Ficheiros

| Ficheiro | Acção |
|---|---|
| Migração SQL | Criar `sdr_sequence_step_logs`, adicionar `current_step`/`next_send_at` a `sdr_enrollments` |
| `supabase/functions/sdr-sequence-executor/index.ts` | **Novo** — processador de steps |
| `supabase/functions/sdr-orchestrator/index.ts` | Nova action `enroll_in_sequence` |
| `trigger/jobs/sequences.ts` | Apontar para `sdr-sequence-executor` |
| `src/components/sdr/SDRProspectActions.tsx` | Pause/resume + timeline de steps |
| `src/components/sdr/SDRSequenceMetrics.tsx` | Métricas por step + mini-funnel |
| `src/hooks/useSDRSequenceExecution.ts` | **Novo** — hook para step logs e pause/resume |

## Critérios de Aceitação
- Prospect inscrito em campanha com sequência → enrollment criado + primeiro step agendado
- Steps executados automaticamente conforme delay configurado
- Reply detectada → sequência pausada automaticamente
- Operador pode pausar/retomar manualmente
- Timeline de execução visível por prospect
- Métricas de step-level no dashboard

