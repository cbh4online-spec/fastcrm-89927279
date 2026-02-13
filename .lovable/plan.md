

## Formula Final — Length Predictive Score (Equilibrado)

### Resumo

Atualizar a formula de scoring em 3 edge functions para usar os novos pesos equilibrados (opp 40%, win 40%, reply 10%, stage_progression 10%, time penalty -5%) com ajustes dinamicos por fase do pipeline, multiplicador de valor potencial, e hard caps de seguranca.

---

### 1. Atualizar `structure-recompute-stats`

**Ficheiro:** `supabase/functions/structure-recompute-stats/index.ts`

Alterar `getWeights()` para os novos pesos equilibrados:

```text
Base:       opp: 0.40, win: 0.40, reply: 0.10, stageProgression: 0.10, timePenalty: 0.05
Lead:       opp: 0.45, win: 0.35, reply: 0.10, stageProgression: 0.10, timePenalty: 0.05
Proposta:   opp: 0.30, win: 0.50, reply: 0.10, stageProgression: 0.10, timePenalty: 0.05
```

Adicionar calculo de `stage_progression_rate` (usar `opportunity_created / sent` como proxy, consistente com `template-recompute-stats`).

Formula final:
```text
score = (opp_rate * w.opp) + (win_rate * w.win) + (reply_rate * w.reply) + (stage_progression * w.stageProgression) - (normalized_time * w.timePenalty)
```

Multiplicador de valor: `score *= 1 + min(0.15, potential_value / 100000)` (ja existe, manter).

### 2. Atualizar `predict-optimal-length`

**Ficheiro:** `supabase/functions/predict-optimal-length/index.ts`

**2.1 Scoring por length com formula equilibrada:**

Atualmente calcula `avgScore` diretamente do campo `score` da tabela. Isto ja funciona porque o score na tabela sera recalculado com a nova formula pelo `structure-recompute-stats`.

Nenhuma alteracao necessaria na formula de scoring aqui — usa o score pre-computado.

**2.2 Adicionar hard caps de seguranca:**

Antes de retornar `chosenLength`, validar regras de seguranca:

- WhatsApp + Proposta/Negociacao: nunca `long` (forcar `medium`)
- Email + Proposta complexa: nunca `short` (forcar `medium`)
- Lead com `response_latency_avg_minutes > 300`: nunca `long` (forcar `short` ou `medium`)

**2.3 Ajustar heuristica base para METODOPARE:**

- WhatsApp default: `short` (em vez de `medium`)
  - Se engagement_depth_score alto: `medium`
- Email default: `medium`
  - Se reading_proxy_score alto: `long`
  - Se reply_latency alta: `short`

### 3. Atualizar `template-compose-message`

**Ficheiro:** `supabase/functions/template-compose-message/index.ts`

**3.1 Atualizar `getStructureWeights()` com formula equilibrada:**

```text
Base:       opp: 0.40, win: 0.40, reply: 0.10
Lead:       opp: 0.45, win: 0.35, reply: 0.10
Proposta:   opp: 0.30, win: 0.50, reply: 0.05
```

**3.2 Atualizar heuristica de length:**

Mesmas alteracoes do ponto 2.3 (WhatsApp default `short`, Email default `medium`).

**3.3 Adicionar hard caps de seguranca:**

Mesmas regras do ponto 2.2 aplicadas inline apos `predictLengthHeuristic()`.

### 4. Atualizar `template-recompute-stats` (Consistencia)

**Ficheiro:** `supabase/functions/template-recompute-stats/index.ts`

Atualizar `getWeights()` para alinhar com a formula equilibrada:

```text
Base:       opp: 0.40, win: 0.40, reply: 0.10, progression: 0.10, timePenalty: 0.05
Lead:       opp: 0.45, win: 0.35, reply: 0.10, progression: 0.10, timePenalty: 0.05
Proposta:   opp: 0.30, win: 0.50, reply: 0.05, progression: 0.05, timePenalty: 0.05
```

---

### Ficheiros Afetados

| Ficheiro | Alteracao |
|---|---|
| `supabase/functions/structure-recompute-stats/index.ts` | Nova formula com stage_progression + pesos equilibrados |
| `supabase/functions/predict-optimal-length/index.ts` | Hard caps seguranca + heuristica METODOPARE (WA default short) |
| `supabase/functions/template-compose-message/index.ts` | Pesos equilibrados + heuristica + hard caps |
| `supabase/functions/template-recompute-stats/index.ts` | Pesos equilibrados para consistencia |

### Ordem de Implementacao

1. `structure-recompute-stats` — nova formula com stage_progression
2. `template-recompute-stats` — alinhar pesos
3. `predict-optimal-length` — hard caps + heuristica METODOPARE
4. `template-compose-message` — pesos + heuristica + hard caps
5. Deploy das 4 funcoes

