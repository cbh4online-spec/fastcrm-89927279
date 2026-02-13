

## Otimizacao do Learning Engine -- Revenue-First Scoring

### Resumo

Recalibrar a formula de score preditivo para priorizar receita real (win_rate + opportunity_rate) em vez de reply_rate. Adicionar logica adaptativa por contexto (pipeline stage, potential value) e nova metrica `stage_progression_rate`.

---

### 1. Migracao DB -- Novos Campos em `workspace_template_stats`

Adicionar 2 colunas:

```text
stage_progression_rate NUMERIC DEFAULT 0
weighted_score NUMERIC DEFAULT 0
```

`stage_progression_rate` = proporcao de conversas onde o lead avancou de fase apos envio do template.
`weighted_score` = score final com pesos adaptativos (distinto do `score` atual que fica como legado).

### 2. Atualizar Edge Function `template-recompute-stats`

Alteracoes na logica de calculo:

**Novos pesos base (METODOPARE calibration):**
```text
win_rate:              0.45
opportunity_rate:      0.35
reply_rate:            0.10
stage_progression:     0.10
time_penalty:          0.05 (normalizado)
```

**Calculo de `stage_progression_rate`:**
- Contar eventos onde o lead associado avancou de pipeline stage dentro de 7 dias apos o `sent`
- Requer lookup: para cada `sent` event com `lead_id`, verificar se existe mudanca de stage na tabela `opportunities` ou `leads` no periodo
- Simplificacao pratica: usar evento `opportunity_created` como proxy de progressao quando nao ha dados de stage change

**Pesos adaptativos por `pipeline_stage`:**
- Se stage = "Lead" ou inicio do funil: `opportunity_rate = 0.45, win_rate = 0.35`
- Se stage = "Proposta" ou final do funil: `win_rate = 0.60, opportunity_rate = 0.25, reply_rate = 0.05, stage_progression = 0.05`
- Default: pesos base

**Revenue multiplier:**
- Se `potential_value` medio do grupo > 0: `multiplier = 1 + (avg_potential_value / 10000 * 0.05)`, capped at 1.25
- Aplicar ao `weighted_score` final

**Persistir ambos:** `score` (formula antiga para retrocompatibilidade) e `weighted_score` (nova formula).

### 3. Atualizar Edge Function `template-predict-best-variant`

**Usar `weighted_score` em vez de `score`** para ordenar variantes.

**Pesos adaptativos no momento da predicao:**
- Receber `pipeline_stage` e `potential_value` do request
- Ajustar pesos conforme contexto (mesma logica do recompute)
- Se stats tem dados por `pipeline_stage`, filtrar stats relevantes

**Ajustar thresholds de confianca:**
- `low`: < 50 amostras (era 30)
- `medium`: 50-100 amostras
- `high`: > 100 amostras

**Exploration rate:**
- Se samples < 50: exploration 30% (era 20% com threshold 30)
- Se samples >= 50: exploration 20%

**Adicionar ao response:**
- `revenue_impact_estimate`: `weighted_score * avg_potential_value * samples` (estimativa)
- `opportunity_rate` e `win_rate` na lista de alternatives

### 4. Atualizar Hook `usePredictiveTemplates`

**`useWorkspaceTemplateStats`:** Adicionar `stage_progression_rate` e `weighted_score` ao tipo de retorno.

**`usePredictBestVariant`:** Adicionar `revenue_impact_estimate`, `opportunity_rate`, `win_rate` ao tipo de response e alternatives.

### 5. Atualizar UI -- TemplatesListPage

**Nos cards de template:**
- Mostrar `weighted_score` em vez de `score` no badge
- Tooltip com breakdown: Win Rate, Opp Rate, Stage Progression, Reply Rate

**Na tab Performance:**
- Adicionar colunas `Stage Progression %` e `Weighted Score`
- Ordenar por `weighted_score DESC` por defeito
- Mostrar indicador "Revenue Contribution" estimado: soma de `potential_value` dos deals ganhos atribuidos

### 6. Atualizar UI -- InboxTemplatePanel

- Mostrar `weighted_score` no card de recomendacao (em vez de `score`)
- Mostrar `revenue_impact_estimate` quando disponivel

---

### Ficheiros Afetados

| Ficheiro | Alteracao |
|---|---|
| Migracao SQL | `stage_progression_rate`, `weighted_score` em `workspace_template_stats` |
| `supabase/functions/template-recompute-stats/index.ts` | Nova formula, pesos adaptativos, revenue multiplier |
| `supabase/functions/template-predict-best-variant/index.ts` | Usar `weighted_score`, thresholds ajustados, `revenue_impact_estimate` |
| `src/hooks/usePredictiveTemplates.ts` | Novos campos nos tipos |
| `src/components/communication/TemplatesListPage.tsx` | Mostrar `weighted_score`, breakdown, revenue contribution |
| `src/components/inbox/InboxTemplatePanel.tsx` | Usar `weighted_score` e revenue estimate |

### Ordem de Implementacao

1. Migracao DB (2 novos campos)
2. `template-recompute-stats` (nova formula + pesos adaptativos)
3. `template-predict-best-variant` (weighted_score + revenue estimate)
4. Hook types update
5. UI: TemplatesListPage + InboxTemplatePanel
