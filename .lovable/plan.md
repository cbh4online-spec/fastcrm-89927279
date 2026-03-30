

## Optimization Engine — Plano de Execução

### Diagnóstico

**O que já existe:**
- `workspace_template_stats` — score, weighted_score, reply_rate, opportunity_rate, win_rate, samples, stage_progression_rate por template/variant
- `communication_template_variants` — variantes com is_active, tone, variant_key
- `template-predict-best-variant` — bandit algorithm com exploit/explore, confidence, revenue_impact_estimate
- `template-generate-predictive-copy` — rewrite de copy por IA
- `communication_attributions` — revenue atribuída por template/sequence/step/canal
- `useCommunicationAttribution` — hooks de revenue agregada
- `email_sequences` + `email_sequence_steps` + `email_sequence_enrollments` — infra completa

**O que falta:**
1. `optimization_recommendations` — tabela de recomendações
2. `optimization_action_logs` — auditoria de ações aplicadas
3. `optimization_settings` — config por workspace
4. Decision engine que analisa stats e gera recomendações
5. Executor que aplica ações (promote/pause variant, switch default)
6. UI de Optimization Center

---

### Migration SQL (1 migration)

**`optimization_recommendations`:**
- `id` UUID PK, `workspace_id`, `entity_type` TEXT (template, variant, sequence, step), `entity_id` UUID
- `recommendation_type` TEXT (promote_variant, pause_variant, switch_default_variant, increase_delay, decrease_delay, switch_channel, suggest_predictive_copy_refresh, disable_low_performing_step, highlight_top_revenue_template)
- `title` TEXT, `rationale` TEXT, `suggested_action_json` JSONB
- `confidence` TEXT (low, medium, high), `impact_estimate` NUMERIC(12,2)
- `status` TEXT DEFAULT 'open' (open, applied, dismissed, expired)
- `auto_applicable` BOOLEAN DEFAULT false, `auto_applied` BOOLEAN DEFAULT false
- `applied_at` TIMESTAMPTZ, `dismissed_at` TIMESTAMPTZ, `created_at`, `updated_at`
- UNIQUE `(workspace_id, entity_type, entity_id, recommendation_type, status)` para evitar duplicados abertos

**`optimization_action_logs`:**
- `id` UUID PK, `workspace_id`, `recommendation_id` FK, `action_type` TEXT
- `target_entity_type` TEXT, `target_entity_id` UUID
- `before_json` JSONB, `after_json` JSONB
- `applied_by` TEXT (system, user_id), `applied_mode` TEXT (manual, auto), `reverted_at` TIMESTAMPTZ
- `created_at`

**`optimization_settings`:**
- `id` UUID PK, `workspace_id` UNIQUE
- `is_enabled` BOOLEAN DEFAULT false, `auto_optimize_enabled` BOOLEAN DEFAULT false
- `min_samples_threshold` INT DEFAULT 50, `min_score_delta` NUMERIC DEFAULT 0.1
- `min_revenue_delta` NUMERIC DEFAULT 50, `optimization_window_days` INT DEFAULT 30
- `allow_auto_pause` BOOLEAN DEFAULT false, `allow_auto_promote` BOOLEAN DEFAULT false
- `allow_auto_switch_variant` BOOLEAN DEFAULT false
- `created_at`, `updated_at`

RLS: workspace members SELECT; service_role para INSERT/UPDATE.

---

### Ficheiros a criar (4)

#### 1. `supabase/functions/process-optimization-recommendations/index.ts`
Edge function que:
1. Recebe `{ workspace_id }` ou processa todos os workspaces com `is_enabled = true`
2. Lê `optimization_settings` para thresholds
3. Lê `workspace_template_stats` agrupados por template_id
4. Para cada template com variantes: compara scores, amostras e deltas
5. Gera recomendações:
   - **promote_variant**: variante com weighted_score > melhor alternativa por `min_score_delta` + amostras >= threshold
   - **pause_variant**: variante com score < 50% da melhor + amostras suficientes
   - **switch_default_variant**: quando variante não-default supera a default consistentemente
   - **highlight_top_revenue_template**: lê `communication_attributions` para encontrar top revenue templates
   - **disable_low_performing_step**: lê stats por step de sequência e identifica steps com baixa conversão
6. Insere em `optimization_recommendations` com ON CONFLICT DO NOTHING (evita duplicados abertos)
7. Expira recomendações `open` com mais de `optimization_window_days`
8. Se `auto_optimize_enabled` + condições satisfeitas → aplica diretamente:
   - `promote_variant` → update `is_active = true` na variante
   - `pause_variant` → update `is_active = false`
   - Regista em `optimization_action_logs` com `applied_mode = 'auto'`

#### 2. `src/hooks/useOptimizationEngine.ts`
Hooks:
- `useOptimizationRecommendations(filters?)` — lista recomendações com status/type filters
- `useOptimizationSettings()` — read/upsert settings
- `useApplyRecommendation()` — mutation que atualiza status para 'applied', executa ação, regista log
- `useDismissRecommendation()` — mutation status → 'dismissed'
- `useRevertAction(logId)` — reverte ação (reativa variante, etc.) e marca `reverted_at`
- `useOptimizationActionLogs()` — lista de ações aplicadas
- `useOptimizationStats()` — KPIs: open count, applied count, estimated uplift, auto-applied count

#### 3. `src/pages/OptimizationCenterPage.tsx`
Dashboard com:
- KPIs: recomendações abertas, impacto estimado total, ações aplicadas, auto-aplicadas
- Cards resumo: top winner, worst underperformer, estimated uplift available
- Tabela de recomendações abertas com: título, tipo, confiança, impacto, botões aplicar/ignorar/detalhe
- Histórico de ações aplicadas com botão reverter
- Toggle auto-optimize on/off (upsert settings)
- Filtros: entity_type, recommendation_type, confidence

#### 4. `src/components/optimization/OptimizationSettingsPanel.tsx`
Formulário de settings:
- Toggles: is_enabled, auto_optimize_enabled, allow_auto_pause, allow_auto_promote, allow_auto_switch_variant
- Numéricos: min_samples_threshold, min_score_delta, min_revenue_delta, optimization_window_days
- Upsert em `optimization_settings`

---

### Ficheiros a alterar (2)

#### 5. `src/routes/AIRoutes.tsx`
- Importar `OptimizationCenterPage`
- Adicionar rota: `<Route path="/dashboard/optimization" element={<OptimizationCenterPage />} />`

#### 6. `src/components/communication/TemplatesListPage.tsx`
- Na tab de cada template (ou no card), mostrar badge se existir recomendação aberta (ex: "Otimização disponível")
- Link rápido para OptimizationCenter filtrado por template

---

### Fluxo final

```text
process-optimization-recommendations (cron/manual)
  │
  ├─ Lê optimization_settings (thresholds)
  ├─ Lê workspace_template_stats (scores por variant)
  ├─ Lê communication_attributions (revenue por template)
  │
  ├─ Compara variantes por template:
  │   ├─ Score delta > threshold → promote_variant / pause_variant
  │   ├─ Default inferior → switch_default_variant
  │   └─ Top revenue → highlight_top_revenue_template
  │
  ├─ Insere optimization_recommendations (idempotente)
  ├─ Expira recomendações antigas
  │
  └─ Se auto_optimize_enabled:
      ├─ Aplica ações seguras (promote/pause/switch)
      └─ Regista optimization_action_logs

OptimizationCenterPage (UI)
  │
  ├─ Lista recomendações abertas
  ├─ Aplicar / Ignorar / Reverter
  ├─ Settings panel
  └─ KPIs de impacto
```

### Compatibilidade
- `workspace_template_stats` e `communication_attributions` são fontes read-only — sem alterações
- `template-predict-best-variant` mantido intacto (serve predição em runtime)
- Ações sobre variantes usam apenas update em `communication_template_variants.is_active`
- Reversibilidade garantida via `optimization_action_logs.before_json`
- Sem sistema paralelo — reutiliza scoring e atribuição existentes

