

## Predictive Length Optimizer — Behavior-Based Message Sizing

### Resumo

Adicionar uma camada de otimizacao de comprimento (short/medium/long) que se adapta ao comportamento do lead, canal, fase do pipeline e performance historica do workspace. O sistema decide automaticamente o tamanho ideal da mensagem e aloca budget de caracteres por bloco da estrutura de persuasao.

---

### 1. Migracao DB

**1.1 Atualizar `persuasion_structures` — adicionar `length_profiles`**

Nova coluna JSONB com perfis de comprimento por canal:

```text
length_profiles JSONB DEFAULT '{
  "email": { "short": 700, "medium": 1200, "long": 1600 },
  "whatsapp": { "short": 220, "medium": 350, "long": 500 }
}'
```

**1.2 Nova tabela: `lead_behavior_signals`**

| Campo | Tipo |
|---|---|
| id | UUID PK DEFAULT gen_random_uuid() |
| workspace_id | UUID NOT NULL |
| contact_id | UUID NULL |
| lead_id | UUID NULL |
| channel_preference | TEXT NULL |
| response_latency_avg_minutes | NUMERIC DEFAULT 0 |
| reply_rate_last_30d | NUMERIC DEFAULT 0 |
| followup_needed_rate | NUMERIC DEFAULT 0 |
| reading_proxy_score | NUMERIC DEFAULT 0 |
| engagement_depth_score | NUMERIC DEFAULT 0 |
| last_seen_at | TIMESTAMP NULL |
| last_updated_at | TIMESTAMP DEFAULT now() |

RLS: workspace isolation via workspace_id match on workspace_members.

**1.3 Nova tabela: `message_length_events`**

| Campo | Tipo |
|---|---|
| id | UUID PK DEFAULT gen_random_uuid() |
| workspace_id | UUID NOT NULL |
| conversation_id | UUID NULL |
| template_id | UUID NULL |
| structure_key | TEXT |
| channel | TEXT |
| pipeline_stage | TEXT NULL |
| intent_label | TEXT NULL |
| chosen_length | TEXT (short, medium, long) |
| char_count | INT |
| event_type | TEXT (composed, sent, replied, opportunity_created, deal_won) |
| event_at | TIMESTAMP DEFAULT now() |

RLS: workspace isolation.

**1.4 Atualizar `workspace_structure_stats` — adicionar `chosen_length`**

Nova coluna para segmentar performance por comprimento:

```text
chosen_length TEXT NULL
```

**1.5 Seed: Atualizar `length_profiles` nas 6 estruturas existentes**

Cada estrutura recebe perfis calibrados:

| Estrutura | WhatsApp Short/Med/Long | Email Short/Med/Long |
|---|---|---|
| AIDA | 220/350/500 | 700/1200/1600 |
| AIDA_SHORT | 150/250/350 | - |
| PAS | 220/350/500 | 600/1000/1400 |
| BAB | 220/350/500 | 650/1100/1500 |
| 4P | 220/350/500 | 550/950/1300 |
| REENGAGE | 200/300/450 | 500/900/1200 |

### 2. Edge Functions

**2.1 `compute-lead-behavior-signals` (Nova)**

Input: workspace_id, contact_id OR lead_id

Logica:
- Buscar mensagens da conversa mais recente (tabela `messages` + `conversations`)
- Calcular `response_latency_avg_minutes`: media do tempo entre mensagens outbound e inbound
- Calcular `engagement_depth_score`: numero de turnos de conversa * peso + media de palavras inbound
- Calcular `followup_needed_rate`: proporcao de conversas com >1 follow-up antes de resposta
- Calcular `channel_preference`: canal com mais respostas
- Calcular `reading_proxy_score`: baseado em reply_rate + inverse latency normalizados
- Upsert em `lead_behavior_signals`

Output: signals computed

**2.2 `predict-optimal-length` (Nova)**

Input: workspace_id, conversation_id, template_id, structure_key, channel, pipeline_stage, intent_label, lead_score, potential_value, lead_behavior_signals (optional — if not provided, query from DB)

Logica:

Fase 1 — Heuristica base:

Para WhatsApp:
- Se response_latency <= 60 AND engagement_depth high -> medium
- Se response_latency > 180 OR reply_rate low -> short
- Se pipeline_stage in (Proposta, Negociacao) AND intent = objection -> medium
- Default: medium

Para Email:
- Se reading_proxy_score high -> long
- Se latency high AND low engagement -> short
- Se intent = price/objection -> medium
- Default: medium

Fase 2 — Learning (se dados disponiveis):
- Buscar `workspace_structure_stats` filtrados por structure_key + channel + chosen_length
- Usar weighted score (win_rate 0.55, opp_rate 0.35, reply_rate 0.10) para cada comprimento
- Bandit: exploit 80% best length, explore 20% adjacente (short<->medium, medium<->long)
- Nunca exceder caps do canal
- Confidence: low <30 samples, medium 30-99, high >=100

Fase 3 — Resolucao final:
- Buscar `length_profiles` da estrutura para obter char limit exato
- Se nao encontrado, usar defaults (whatsapp: 350, email: 1200)

Output: chosen_length, target_char_limit, confidence, rationale

**2.3 `length-log-event` (Nova)**

Input: workspace_id, conversation_id, template_id, structure_key, channel, pipeline_stage, intent_label, chosen_length, char_count, event_type

Insere em `message_length_events`.

**2.4 Atualizar `template-compose-message`**

Alteracoes:
1. Apos escolher structure_key, chamar logica de `predict-optimal-length` (inline, nao HTTP)
2. Alocar budget de caracteres por bloco proporcionalmente:
   - WhatsApp short: blocos CTA recebem 40%, restantes dividem 60%
   - Email long: distribuicao uniforme entre todos os blocos
   - Formula generica: cada bloco recebe `target_char_limit / num_blocks` com ajuste para blocos required vs optional
3. Instruir a AI com char budget por bloco no prompt
4. Adicionar ao response: `chosen_length`, `target_char_limit`, `char_count` (contagem real)
5. Registar evento `composed` em `message_length_events`

**2.5 Atualizar `structure-recompute-stats`**

Ao agregar, incluir dimensao `chosen_length`:
- Agrupar por structure_key + channel + pipeline_stage + intent_label + chosen_length
- Persistir `chosen_length` no upsert para `workspace_structure_stats`

### 3. Hooks Frontend

**3.1 `useMessageLength` (Novo)**

- `usePredictLength()`: mutation para `predict-optimal-length`
- `useLogLengthEvent()`: mutation para `length-log-event`
- `useLeadBehaviorSignals(contactId, leadId)`: query para `lead_behavior_signals`
- `useComputeSignals()`: mutation para `compute-lead-behavior-signals`

### 4. UI Updates

**4.1 `InboxTemplatePanel.tsx`**

Apos composicao com IA:
- Mostrar badge com comprimento recomendado: "Curto", "Medio", "Longo" + confidence
- Mostrar char count vs target
- Toggle opcional: "Fixar comprimento para este lead" (armazena preferencia local)
- Botao "Ver alternativas de comprimento": mostra as 2 outras opcoes com scores previstos

**4.2 `TemplatesListPage.tsx`**

Na tab Performance:
- Adicionar sub-seccao "Por Comprimento" mostrando matrix:
  - Linhas: structure_key
  - Colunas: short / medium / long
  - Celulas: samples, opp_rate, win_rate, score
- Filtro por canal (email vs whatsapp)

### 5. Seguranca

- RLS em `lead_behavior_signals`: SELECT/INSERT/UPDATE/DELETE onde workspace_id pertence ao utilizador autenticado (via workspace_members)
- RLS em `message_length_events`: mesma logica de workspace isolation
- `persuasion_structures` length_profiles: sem alteracao RLS (tabela ja tem SELECT publico)
- Edge functions: verify_jwt = false (consistente com as existentes)

---

### Ficheiros Afetados

| Ficheiro | Alteracao |
|---|---|
| Migracao SQL | length_profiles em persuasion_structures + 2 tabelas novas + chosen_length em workspace_structure_stats + seed length_profiles |
| `supabase/functions/compute-lead-behavior-signals/index.ts` | Nova |
| `supabase/functions/predict-optimal-length/index.ts` | Nova |
| `supabase/functions/length-log-event/index.ts` | Nova |
| `supabase/functions/template-compose-message/index.ts` | Integrar length prediction + block budget + log composed |
| `supabase/functions/structure-recompute-stats/index.ts` | Adicionar dimensao chosen_length |
| `supabase/config.toml` | 3 novas funcoes |
| `src/hooks/useMessageLength.ts` | Novo |
| `src/hooks/usePersuasionStructures.ts` | Adicionar length_profiles ao tipo |
| `src/components/inbox/InboxTemplatePanel.tsx` | Badge comprimento + alternativas + toggle |
| `src/components/communication/TemplatesListPage.tsx` | Matrix comprimento x estrutura |

### Ordem de Implementacao

1. Migracao DB (length_profiles + 2 tabelas + chosen_length + seed)
2. Edge functions: compute-lead-behavior-signals, predict-optimal-length, length-log-event
3. Atualizar template-compose-message (length integration + block budgets)
4. Atualizar structure-recompute-stats (chosen_length dimension)
5. config.toml (3 novas funcoes)
6. Hooks: useMessageLength
7. UI: InboxTemplatePanel (badges + alternativas)
8. UI: TemplatesListPage (matrix performance)

