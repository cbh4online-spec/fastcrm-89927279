
# SDR — Iteração 5: Personalização e IA

## Diagnóstico

A infraestrutura de IA para SDR já existe parcialmente no `ai-employee-executor` (função `runSDROutbound`), que gera mensagens personalizadas usando business context, knowledge base e persona. No entanto, este motor **não está ligado** ao `sdr-sequence-executor` — os steps são executados com conteúdo estático do template. Além disso:

- **Bug**: `triggerSequenceStep` em `trigger/jobs/sequences.ts` ainda invoca `auto-followup-scheduler` em vez de `sdr-sequence-executor`
- **EnrollmentTimeline** usa dados placeholder em vez de `sdr_sequence_step_logs` reais
- O conteúdo dos steps não suporta variáveis de merge (`{{nome}}`, `{{empresa}}`)
- Não existe geração dinâmica de conteúdo por IA no momento do envio

## Plano de Implementação

### 1. Corrigir bug no triggerSequenceStep
Alterar `trigger/jobs/sequences.ts` para invocar `sdr-sequence-executor` em vez de `auto-followup-scheduler`.

### 2. Nova Edge Function `sdr-message-generator`
Função dedicada que gera/personaliza mensagens para steps de sequência:
- Recebe: `enrollment_id`, `step_id`, `workspace_id`, `channel`, `template_content`
- Resolve merge variables (`{{prospect_name}}`, `{{prospect_email}}`, `{{company}}`, `{{step_number}}`)
- Se `ai_personalization` estiver activo na campanha: invoca Lovable AI (gemini-2.5-flash) com business context e persona do bot associado para reescrever/personalizar a mensagem
- Retorna: `{ subject, body, channel_content }` pronto para envio
- Inclui aiGate + logAIUsage para governação de custos

### 3. Integrar geração no sdr-sequence-executor
Antes de executar cada step, chamar `sdr-message-generator` para obter conteúdo personalizado:
- Se a campanha tem `ai_employee_id` → usar persona e KB do bot
- Se não → aplicar apenas merge variables (substituição simples)
- Fallback: se a IA falhar, enviar template original com merge vars

### 4. Merge Variables Engine
Implementar substituição de variáveis no conteúdo dos templates:
- `{{prospect_name}}` → nome do prospect
- `{{prospect_email}}` → email
- `{{prospect_phone}}` → telefone
- `{{company}}` → empresa (do enrichment_data)
- `{{campaign_name}}` → nome da campanha
- `{{step_number}}` → número do step actual
- `{{sender_name}}` → nome do bot/agente IA associado

### 5. Configuração de personalização IA na campanha
Actualizar `SDRCampaignSettings.tsx`:
- Toggle "Personalização por IA" (guarda em `settings.ai_personalization`)
- Selector de AI Employee/Bot associado (já existe `ai_employee_id`)
- Nível de personalização: "Leve" (merge vars), "Médio" (reescrita parcial), "Total" (geração completa)
- Preview de merge variables disponíveis

### 6. Ligar EnrollmentTimeline a dados reais
Substituir dados placeholder por query a `sdr_sequence_step_logs`:
- Mostrar eventos reais (sent, opened, clicked, replied, failed)
- Incluir nome do step e canal
- Adicionar estado "waiting" para próximo step agendado

### 7. Preview de mensagem gerada
No `SDRProspectActions.tsx`, adicionar acção "Pré-visualizar mensagem" que:
- Chama `sdr-message-generator` em modo preview (sem enviar)
- Mostra modal com a mensagem que seria gerada para aquele prospect
- Permite ao operador editar antes de confirmar envio manual

## Estrutura Técnica

```text
Template com {{vars}}
        │
        ▼
┌───────────────────┐
│sdr-message-generator│
│                     │
│ 1. Resolve {{vars}} │
│ 2. Se AI on:        │
│    → business ctx   │
│    → persona/KB     │
│    → Lovable AI     │
│ 3. Retorna conteúdo │
└────────┬────────────┘
         │
         ▼
┌────────────────────┐
│sdr-sequence-executor│
│ (usa conteúdo final)│
└─────────────────────┘
```

## Ficheiros

| Ficheiro | Acção |
|---|---|
| `supabase/functions/sdr-message-generator/index.ts` | **Novo** — motor de personalização |
| `supabase/functions/sdr-sequence-executor/index.ts` | Integrar chamada ao message-generator |
| `trigger/jobs/sequences.ts` | Fix: apontar para `sdr-sequence-executor` |
| `src/components/sdr/SDRCampaignSettings.tsx` | Toggle IA + nível de personalização |
| `src/components/sequences/EnrollmentTimeline.tsx` | Dados reais de `sdr_sequence_step_logs` |
| `src/components/sdr/SDRProspectActions.tsx` | Acção "Pré-visualizar mensagem" |
| `.lovable/plan.md` | Actualizar |

## Critérios de Aceitação
- Templates com `{{prospect_name}}` substituídos correctamente no envio
- Com IA activa: mensagem gerada é personalizada e profissional
- Sem IA: merge vars aplicados, template enviado como está
- Fallback gracioso se IA falhar (402/429)
- Timeline mostra eventos reais por prospect
- Preview funcional antes do envio
- aiGate aplicado para controlo de custos
