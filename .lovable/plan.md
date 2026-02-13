

## Predictive Persuasion Engine -- Dynamic Structure Router

### Resumo

Adicionar uma camada de aprendizagem por **estrutura de persuasao** (AIDA, PAS, BAB, 4P, etc.) que funciona em paralelo ao sistema de variantes existente. O sistema aprende qual estrutura converte melhor por canal, fase do pipeline e intencao, e compoe mensagens bloco-a-bloco usando IA com restricoes de marca.

---

### 1. Migracao DB

**1.1 Novos campos em `communication_templates`:**

```text
structure_families TEXT[] DEFAULT '{AIDA}'
schema_blocks JSONB DEFAULT '{}'
brand_constraints JSONB DEFAULT '{}'
max_length_by_channel JSONB DEFAULT '{"whatsapp": 350, "email": 1600, "sms": 160, "inbox": 800}'
```

**1.2 Nova tabela: `persuasion_structures`**

Armazena definicoes reutilizaveis de estruturas de persuasao.

| Campo | Tipo |
|---|---|
| id | UUID PK |
| key | TEXT UNIQUE (AIDA, PAS, BAB, 4P, AIDAShort, ObjectionHandling, DemoInvite) |
| label | TEXT |
| channel | TEXT |
| blocks | JSONB (lista ordenada de blocos com nome, descricao, obrigatoriedade) |
| constraints | JSONB (limites de comprimento, estilo CTA, limites de tom) |
| created_at, updated_at | TIMESTAMP |

RLS: leitura publica (estruturas sao globais/seed), sem escrita pelo cliente.

**1.3 Nova tabela: `structure_usage_events`**

Telemetria especifica por estrutura.

| Campo | Tipo |
|---|---|
| id | UUID PK |
| workspace_id | UUID |
| template_id | UUID |
| conversation_id | UUID |
| message_id | UUID NULL |
| channel | TEXT |
| pipeline_stage | TEXT NULL |
| intent_label | TEXT NULL |
| sentiment_label | TEXT NULL |
| lead_score | INTEGER NULL |
| potential_value | NUMERIC NULL |
| structure_key | TEXT |
| event_type | TEXT (inserted, sent, replied, opportunity_created, deal_won) |
| event_at | TIMESTAMP DEFAULT now() |

RLS: workspace_id = user workspace.

**1.4 Nova tabela: `workspace_structure_stats`**

Agregados de performance por estrutura.

| Campo | Tipo |
|---|---|
| id | UUID PK |
| workspace_id | UUID |
| channel | TEXT |
| pipeline_stage | TEXT NULL |
| intent_label | TEXT NULL |
| structure_key | TEXT |
| samples | INTEGER DEFAULT 0 |
| opportunity_rate | NUMERIC DEFAULT 0 |
| win_rate | NUMERIC DEFAULT 0 |
| reply_rate | NUMERIC DEFAULT 0 |
| avg_time_to_reply_minutes | NUMERIC DEFAULT 0 |
| score | NUMERIC DEFAULT 0 |
| updated_at | TIMESTAMP DEFAULT now() |

RLS: workspace_id = user workspace.

**1.5 Seed: Estruturas de persuasao**

Inserir 7 estruturas:

| Key | Blocos |
|---|---|
| AIDA | Attention, Interest, Desire, Action |
| PAS | Problem, Agitation, Solution |
| BAB | Before, After, Bridge |
| 4P | Promise, Picture, Proof, Push |
| AIDAShort | Hook, Insight, CTA (versao curta WhatsApp) |
| ObjectionHandling | Acknowledge, Reframe, Evidence, CTA |
| DemoInvite | Personalized Hook, Value Prop, Simple CTA |

**1.6 Seed: Brand constraints METODOPARE**

Inserir defaults para todos os templates do workspace METODOPARE:

```text
{
  "tone": ["professional", "direct", "consultative"],
  "forbidden_claims": ["garantido", "100%", "sem risco"],
  "mandatory_mentions": ["Metodo PARE"],
  "channel_rules": {
    "whatsapp": { "max_paragraphs": 3, "cta_style": "question" },
    "email": { "require_subject": true, "cta_style": "single_clear" }
  }
}
```

### 2. Edge Functions

**2.1 `structure-log-event` (Nova)**

Input: workspace_id, template_id, conversation_id, channel, pipeline_stage, intent_label, sentiment_label, lead_score, potential_value, structure_key, event_type

Insere em `structure_usage_events`.

**2.2 `structure-recompute-stats` (Nova)**

Agrega `structure_usage_events` em `workspace_structure_stats`:
- Agrupa por workspace_id + structure_key + channel + pipeline_stage + intent_label
- Calcula opportunity_rate, win_rate, reply_rate, avg_time_to_reply
- Score com pesos adaptativos:
  - Base: win_rate 0.55, opportunity_rate 0.35, reply_rate 0.10, time_penalty -0.05
  - Stage "Lead/Qualificacao": opportunity_rate +0.10, win_rate -0.10
  - Stage "Proposta/Negociacao": win_rate +0.10, opportunity_rate -0.10
  - Revenue multiplier: `1 + min(0.15, potential_value/100000)`
- Delete + insert (mesma estrategia do template-recompute-stats existente)

**2.3 `structure-predict-best` (Nova)**

Input: workspace_id, channel, pipeline_stage, intent_label, sentiment_label, lead_score, potential_value, allowed_structures (optional TEXT[])

Logica:
1. Buscar stats de `workspace_structure_stats` filtrados por workspace + channel
2. Se pipeline_stage disponivel, preferir stats com esse stage
3. Ordenar por score descendente
4. Bandit: exploit 80% (melhor), explore 20% (aleatorio entre restantes)
5. Se samples < 30: confidence "low"; 30-99: "medium"; >= 100: "high"
6. Se allowed_structures fornecido, filtrar apenas essas

Output: best_structure_key, top3 alternatives com scores, confidence, rationale

**2.4 `template-compose-message` (Nova -- Core)**

Input: template_id, conversation_id, channel, lead_id, contact_id, workspace_id, pipeline_stage, intent_label, sentiment_label, lead_score, potential_value

Flow:
1. Carregar template (structure_families, brand_constraints, max_length_by_channel)
2. Chamar `structure-predict-best` internamente (query direta ao DB, nao HTTP) para escolher structure_key
3. Carregar definicao da estrutura de `persuasion_structures`
4. Carregar dados CRM do lead/contact (nome, empresa, industria, etc.)
5. Chamar Lovable AI (gemini-3-flash-preview) com prompt bloco-a-bloco:
   - System prompt com brand_constraints + channel guidelines + max_length
   - User prompt com: blocos da estrutura, variaveis CRM, smart variables, intent
   - Tool calling para retornar JSON estruturado: `{ subject, body, cta, structure_key, block_map }`
6. Retornar mensagem composta + metadata

Regras IA:
- Nunca inventar factos sobre empresa/lead
- Se dado em falta, usar linguagem neutra
- Respeitar max_length_by_channel
- Mencionar "Metodo PARE" quando brand_constraints o exige

### 3. Hooks Frontend

**3.1 `usePersuasionStructures` (Novo)**

- `useStructures()`: lista todas as estruturas de `persuasion_structures`
- `useStructureStats(workspaceId)`: stats de `workspace_structure_stats`
- `useLogStructureEvent()`: mutation para `structure-log-event`
- `usePredictBestStructure()`: mutation para `structure-predict-best`
- `useComposeMessage()`: mutation para `template-compose-message`

### 4. UI Updates

**4.1 `TemplateFormDialog.tsx`**

- Adicionar campo multi-select "Estruturas Permitidas" (structure_families): checkboxes com AIDA, PAS, BAB, etc.
- Adicionar campo JSON editor simplificado para brand_constraints (ou campos pre-definidos: tom, mencoes obrigatorias, claims proibidos)
- Adicionar campo max_length_by_channel com inputs por canal

**4.2 `TemplatesListPage.tsx`**

- Na tab "Performance": adicionar sub-tab ou seccao "Por Estrutura" mostrando tabela com:
  - structure_key, channel, samples, opportunity_rate, win_rate, score, confidence
- Nos cards de template: mostrar badge com estruturas permitidas

**4.3 `InboxTemplatePanel.tsx`**

- Quando utilizador clica "Templates":
  - Adicionar botao "Compor com IA" que:
    1. Chama `template-compose-message` com o template selecionado + contexto do lead
    2. Mostra resultado com badge "Estrutura: PAS Short (Preditivo)"
    3. Mostra confidence e structure_key
  - Adicionar opcao "Ver Estruturas Alternativas" (top3 do predict)
  - Apos envio: registar evento em `structure-log-event`
- Manter fluxo existente (variantes + predictive copy) intacto, composicao por estrutura e uma opcao adicional

**4.4 `communicationTemplate.ts` (Tipos)**

- Adicionar ao interface `CommunicationTemplate`: `structureFamilies`, `schemaBlocks`, `brandConstraints`, `maxLengthByChannel`
- Expandir `TemplateStructure` com: `BAB`, `FourP`, `AIDAShort`, `ObjectionHandling`, `DemoInvite`
- Adicionar `STRUCTURE_LABELS` para os novos tipos

### 5. Seguranca

- RLS em `structure_usage_events` e `workspace_structure_stats`: filtro por workspace_id do utilizador autenticado
- `persuasion_structures`: SELECT publico (dados seed globais), sem INSERT/UPDATE/DELETE pelo cliente
- Edge functions sem JWT verification (consistente com as existentes)

---

### Ficheiros Afetados

| Ficheiro | Alteracao |
|---|---|
| Migracao SQL | 4 colunas em templates + 3 tabelas novas + seed structures + seed brand constraints |
| `supabase/functions/structure-log-event/index.ts` | Nova |
| `supabase/functions/structure-recompute-stats/index.ts` | Nova |
| `supabase/functions/structure-predict-best/index.ts` | Nova |
| `supabase/functions/template-compose-message/index.ts` | Nova (core) |
| `supabase/config.toml` | 4 novas funcoes |
| `src/hooks/usePersuasionStructures.ts` | Novo |
| `src/types/communicationTemplate.ts` | Novos tipos + labels |
| `src/hooks/useCommunicationTemplates.ts` | Mapear novos campos |
| `src/components/communication/TemplateFormDialog.tsx` | Estruturas permitidas + brand constraints |
| `src/components/communication/TemplatesListPage.tsx` | Tab performance por estrutura |
| `src/components/inbox/InboxTemplatePanel.tsx` | Botao "Compor com IA" + structure badge |

### Ordem de Implementacao

1. Migracao DB (colunas + tabelas + seed)
2. Edge functions: structure-log-event, structure-recompute-stats, structure-predict-best
3. Edge function: template-compose-message (core)
4. config.toml (declarar 4 funcoes)
5. Tipos TypeScript + hooks
6. UI: TemplateFormDialog (estruturas + constraints)
7. UI: TemplatesListPage (performance por estrutura)
8. UI: InboxTemplatePanel (compor + badge + log)
