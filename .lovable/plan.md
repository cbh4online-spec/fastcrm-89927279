

# SDR — Iteração 5: Personalização e IA

## Diagnóstico

A infraestrutura de IA para SDR já existe parcialmente no `ai-employee-executor` (função `runSDROutbound`), que gera mensagens personalizadas usando business context, knowledge base e persona. No entanto, este motor **não está ligado** ao `sdr-sequence-executor` — os steps são executados com conteúdo estático do template. Problemas identificados:

- **Bug**: `triggerSequenceStep` invoca `auto-followup-scheduler` em vez de `sdr-sequence-executor`
- **EnrollmentTimeline** usa dados placeholder (hardcoded) em vez de `sdr_sequence_step_logs`
- Templates não suportam variáveis de merge (`{{nome}}`, `{{empresa}}`)
- Sem geração dinâmica de conteúdo por IA no momento do envio

## Implementação

### 1. Fix bug triggerSequenceStep
Alterar `trigger/jobs/sequences.ts` linha 35: `auto-followup-scheduler` → `sdr-sequence-executor`.

### 2. Nova Edge Function `sdr-message-generator`
Motor de personalização que:
- Resolve merge variables (`{{prospect_name}}`, `{{company}}`, `{{campaign_name}}`, `{{step_number}}`, etc.) a partir de dados do enrollment e enrichment_data
- Se campanha tem `settings.ai_personalization` activo + `ai_employee_id`: carrega business context e persona, invoca Lovable AI (gemini-2.5-flash) para reescrever/personalizar
- Inclui `aiGate` + `logAIUsage` para governação de custos
- Modo `preview` (não envia, só retorna conteúdo gerado)
- Fallback gracioso: se IA falhar (402/429), retorna template com merge vars aplicados

### 3. Integrar no sdr-sequence-executor
Antes de cada step, chamar `sdr-message-generator` para obter conteúdo personalizado. Usa o resultado no `executeEmailStep`/`executeWhatsAppStep`.

### 4. Configuração na UI (SDRCampaignSettings)
- Toggle "Personalização por IA" → `settings.ai_personalization`
- Nível: "Leve" (merge vars), "Médio" (reescrita parcial), "Total" (geração completa)
- Selector de AI Employee já existe (`ai_employee_id`)
- Lista de merge variables disponíveis

### 5. EnrollmentTimeline com dados reais
Substituir placeholder por query a `sdr_sequence_step_logs`, incluindo estado "waiting" para o próximo step agendado.

### 6. Preview de mensagem (SDRProspectActions)
Acção "Pré-visualizar mensagem" que chama `sdr-message-generator` em modo preview e mostra modal com resultado.

## Ficheiros

| Ficheiro | Acção |
|---|---|
| `supabase/functions/sdr-message-generator/index.ts` | **Novo** |
| `supabase/functions/sdr-sequence-executor/index.ts` | Integrar message-generator |
| `trigger/jobs/sequences.ts` | Fix bug (linha 35) |
| `src/components/sdr/SDRCampaignSettings.tsx` | Toggle IA + nível |
| `src/components/sequences/EnrollmentTimeline.tsx` | Dados reais |
| `src/components/sdr/SDRProspectActions.tsx` | Preview de mensagem |

