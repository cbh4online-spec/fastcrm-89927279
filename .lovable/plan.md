
## Fix: Autopilot Nao Usa Goals do Agente

### Problema

O autopilot esta a gerar respostas genericas ("Perfeito, Jorge! Estou pronto. No que e que posso ajudar?") porque:

1. A tabela `autopilot_config` (legacy) e encontrada primeiro e tem `persona_id: null` -- nao liga nenhuma persona
2. O agente IG ("Redes Sociais IG") tem persona configurada (`IA de Vendas`) mas tem `autopilot_enabled: false` e `goal_config: {}`
3. Mesmo que o agente fosse usado, o campo `goal_config` nunca e passado ao `ai-inbox-reply`
4. A funcao `buildSystemPrompt` no `ai-inbox-reply` nao tem conceito de "goals" do agente

Resultado: a IA nao sabe qual o objetivo da conversa e da respostas vagas.

---

### Correcao (3 partes)

#### 1. Priorizar `ai_agents` sobre `autopilot_config` legacy

**Ficheiro**: `supabase/functions/ghl-webhook-message/index.ts`

Inverter a ordem de resolucao: primeiro verificar `ai_agents` para o canal, e so usar `autopilot_config` como fallback. Isto garante que o agente com persona e goals configurados e usado quando existe.

Quando o agente e encontrado, extrair `goal_config` e passa-lo na chamada a `ai-inbox-reply`.

#### 2. Passar `goalConfig` na chamada ao `ai-inbox-reply`

**Ficheiro**: `supabase/functions/ghl-webhook-message/index.ts` (linha ~921)

Adicionar campo `goalConfig` no body da chamada fetch a `ai-inbox-reply`:

```
goalConfig: agentSource?.goal_config || undefined
```

#### 3. Injetar Goals no System Prompt

**Ficheiro**: `supabase/functions/ai-inbox-reply/index.ts`

- Receber `goalConfig` no request body
- No `buildSystemPrompt`, adicionar uma nova seccao "Agent Goals" que instrui a IA sobre o objetivo especifico da conversa

Quando `goalConfig` tem campos preenchidos (ex: `handover_max_retries`, `auto_handover_enabled`), injetar instrucoes como:
- "O teu objetivo principal e qualificar o lead e guia-lo para agendar uma reuniao"
- "Apos 2 falhas consecutivas em responder, transfere para atendimento humano"

Se `goal_config` estiver vazio MAS a persona existir, usar o `system_prompt` da persona como guia de objetivo (ja funciona parcialmente mas a persona nao e carregada porque `persona_id` e null no legacy config).

#### 4. Ativar autopilot no agente IG (migracao DB)

O agente IG tem `autopilot_enabled: false`. Para que o novo fluxo funcione, ativar o autopilot no agente e configurar um `goal_config` basico:

```sql
UPDATE ai_agents 
SET autopilot_enabled = true,
    goal_config = '{
      "primary_goal": "qualify_and_convert",
      "qualification_questions": ["Qual o seu interesse principal?", "Ja utiliza alguma ferramenta de CRM?", "Qual o tamanho da sua equipa?"],
      "conversion_action": "schedule_meeting",
      "auto_handover_enabled": true,
      "handover_max_retries": 2
    }'::jsonb
WHERE id = 'b39aca29-a9c4-4a2d-be2b-4ed1fbdc245d';
```

---

### Detalhe Tecnico

| Ficheiro | Alteracao |
|----------|-----------|
| `supabase/functions/ghl-webhook-message/index.ts` | Inverter prioridade: `ai_agents` primeiro, `autopilot_config` como fallback |
| `supabase/functions/ghl-webhook-message/index.ts` | Passar `goalConfig` na chamada ao `ai-inbox-reply` |
| `supabase/functions/ai-inbox-reply/index.ts` | Receber `goalConfig`, injetar no `buildSystemPrompt` como instrucoes de objetivo |
| DB migration | Ativar autopilot e definir goals no agente IG |

### Resultado Esperado

Em vez de "No que posso ajudar?", o bot vai:
1. Reconhecer que o Jorge perguntou sobre "modulo de proposta"
2. Consultar a Knowledge Base para informacao sobre propostas
3. Responder com informacao relevante E guiar para o proximo passo (qualificacao ou agendamento)
4. Seguir o objetivo configurado no `goal_config` do agente
