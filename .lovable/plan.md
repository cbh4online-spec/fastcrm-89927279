

## P2 — Otimização, A/B Testing, IA e Lifecycle Avançado

### Diagnóstico do Estado Actual

| Área | Existe | Limitação |
|------|--------|-----------|
| A/B Testing | ✅ `campaign_ab_tests` + `AbTestPanel` + `useCampaignAbTest` | Apenas subject A vs B, sem multi-variante, sem conversion/revenue metric |
| AI Copilot | ✅ `marketing-ai-copilot` (subjects + body gen) + `AISubjectLineGenerator` + `CampaignInsightsPanel` | Sem dados históricos, sem send time, sem benchmarks |
| Send Time | ✅ `SmartSendTimeCard` (hourly engagement) | Sem segmento, sem dia da semana, sem recomendação aplicável |
| Lifecycle | ✅ `LifecycleAutomations` (templates estáticos) + `TriggerBuilder` (event→action) | Templates decorativos, sem activação real de jornadas |
| Benchmarking | ❌ Inexistente | Sem scorecards, sem comparação histórica |
| Template/CTA ranking | ❌ Inexistente | Sem performance tracking por template ou CTA |

### Plano de Execução — 6 Batches

---

**B1 — Schema: Experiments, AI Recommendations, Benchmarks**

Migração SQL:
- Criar `campaign_experiments` (id, workspace_id, base_campaign_id, experiment_type, status, winning_variant_id, evaluation_metric, min_sample_size, created_by, created_at, updated_at)
- Criar `campaign_variants` (id, experiment_id, campaign_id, variant_label, traffic_split, open_rate, click_rate, conversion_rate, revenue_attributed, sample_size, created_at)
- Criar `ai_campaign_recommendations` (id, workspace_id, campaign_id nullable, recommendation_type, recommendation_data JSONB, reasoning TEXT, status, accepted_at, dismissed_at, created_at)
- Criar `campaign_benchmarks` (id, workspace_id, entity_type, entity_id, period_days, metrics JSONB, calculated_at)
- RLS por workspace_members em todas

Código:
- Adicionar tipos em `src/types/marketing.ts`: `CampaignExperiment`, `CampaignVariant`, `AICampaignRecommendation`, `CampaignBenchmark`

---

**B2 — A/B Testing Expandido**

Criar `src/hooks/useCampaignExperiments.ts`:
- CRUD para experiments + variants
- Lógica de determinação de vencedor com amostra mínima
- Suporte a métricas: open_rate, click_rate, conversion_rate, revenue_attributed

Criar `src/components/marketing/ExperimentPanel.tsx`:
- Substituir/complementar `AbTestPanel` com suporte multi-variante
- Tipos: subject, preview_text, from_name, cta, content, template, send_time
- Split configurável por variante (default 50/50)
- Visualização de resultados com barras comparativas
- Botão "Declarar vencedora" (manual) + auto-declare quando amostra atingida
- Validação: mínimo 100 recipients por variante

Integrar no `CampaignDetailDialog.tsx`:
- Tab "Testes" com `ExperimentPanel`

---

**B3 — IA de Otimização com Dados Históricos**

Expandir `supabase/functions/marketing-ai-copilot/index.ts`:
- Novo action `optimize_campaign`: recebe dados históricos (top 10 campanhas por open_rate, click_rate) + campanha actual → sugere melhorias de subject, preview, CTA, send time
- Novo action `analyze_risk`: analisa body_html para risco de spam (link ratio, image ratio, keywords)
- Novo action `recommend_segment`: com base em engagement por segmento, sugere melhor segmento

Criar `src/components/marketing/AIOptimizationPanel.tsx`:
- Painel com 3 secções: Sugestões de Copy, Risco de Spam, Melhor Segmento
- Cada sugestão com reasoning + botão Aceitar/Ignorar
- Grava em `ai_campaign_recommendations`

Criar `src/hooks/useAIRecommendations.ts`:
- Query + accept/dismiss mutations para `ai_campaign_recommendations`

---

**B4 — Send Time Optimization + Template/CTA Intelligence**

Expandir `SmartSendTimeCard` → Criar `src/components/marketing/SendTimeOptimizer.tsx`:
- Análise por dia da semana + hora (heatmap 7×24)
- Análise por segmento (qual segmento responde melhor a que hora)
- Recomendação de janela óptima aplicável (botão "Aplicar como horário de envio")

Criar `src/components/marketing/TemplatePerformancePanel.tsx`:
- Ranking de templates por open_rate, click_rate, conversion_rate, revenue
- Filtro por período (30d, 90d, 180d)
- Query: marketing_campaigns agrupadas por template_id → aggregate metrics

Criar `src/components/marketing/CTAPerformancePanel.tsx`:
- Ranking de links/CTAs por click_rate e revenue influence
- Query: campaign_link_clicks agrupadas por URL pattern → aggregate metrics
- Relação CTA × tipo de campanha

---

**B5 — Lifecycle Marketing Avançado**

Reforçar `src/components/marketing/LifecycleAutomations.tsx`:
- Transformar templates estáticos em jornadas activáveis
- Cada jornada cria uma sequência real de triggers/campanhas:
  - Onboarding (novo contacto → welcome series 3 emails)
  - Reengagement (cold_90d → 2 emails + task)
  - Win-back (opp perdida → 3 emails)
  - Upsell (cliente activo → oferta complementar)
  - Churn prevention (sinais de risco → sequência preventiva)
- Botão "Activar jornada" que cria triggers via `useCampaignTriggers`
- Regras de scoring: eventos de campanha actualizam score do contacto via `campaignLifecycleScoring`

Integrar lifecycle no `TriggerBuilder`:
- Nova acção: `start_journey` (inscrever contacto numa jornada)
- Mostrar jornadas activas com contagem de contactos inscritos

---

**B6 — Benchmarking, Scorecards e Dashboard de Otimização**

Criar `src/hooks/useCampaignBenchmarks.ts`:
- Calcula e persiste benchmarks por período (30d, 90d, 180d)
- Entidades: campaign, template, segment, send_hour, campaign_type
- Métricas: avg open_rate, click_rate, conversion_rate, bounce_rate, revenue

Criar `src/components/marketing/BenchmarkScorecard.tsx`:
- Tabela comparativa: melhores/piores campanhas, templates, segmentos
- Filtro por período e tipo de campanha
- Badges: 🏆 melhor, ⚠️ pior, 📈 a melhorar
- Comparação da campanha actual vs benchmark do workspace

Reforçar `MarketingDashboard.tsx`:
- Nova secção "Otimização":
  - Top variantes vencedoras de testes
  - Sugestões IA pendentes (count + link)
  - Melhor send time
  - Templates com melhor ROI
  - Campanhas com potencial de melhoria (abaixo do benchmark)
  - Alerta de fadiga (segmentos enviados > 3x nos últimos 30d)
- Visão executiva: "Repetir / Parar / Testar a seguir"

---

### Ficheiros a Criar/Alterar

| Ficheiro | Acção |
|----------|-------|
| `supabase/migrations/...` | Criar — experiments, variants, recommendations, benchmarks |
| `src/types/marketing.ts` | Alterar — novos tipos |
| `src/hooks/useCampaignExperiments.ts` | Criar |
| `src/hooks/useAIRecommendations.ts` | Criar |
| `src/hooks/useCampaignBenchmarks.ts` | Criar |
| `src/components/marketing/ExperimentPanel.tsx` | Criar |
| `src/components/marketing/AIOptimizationPanel.tsx` | Criar |
| `src/components/marketing/SendTimeOptimizer.tsx` | Criar |
| `src/components/marketing/TemplatePerformancePanel.tsx` | Criar |
| `src/components/marketing/CTAPerformancePanel.tsx` | Criar |
| `src/components/marketing/BenchmarkScorecard.tsx` | Criar |
| `src/components/marketing/LifecycleAutomations.tsx` | Alterar — jornadas activáveis |
| `src/components/marketing/MarketingDashboard.tsx` | Alterar — secção otimização |
| `src/components/marketing/CampaignDetailDialog.tsx` | Alterar — tabs testes + IA |
| `supabase/functions/marketing-ai-copilot/index.ts` | Alterar — optimize, risk, segment |

### V2 (Diferido)

- Auto-optimização sem intervenção humana (full autopilot)
- Permissões granulares por papel no módulo marketing
- Segmentação comportamental cross-module
- Predictive send (ML por contacto individual)
- Multi-variate testing (>2 variáveis simultâneas)

### Critérios de Conclusão P2

- ✅ Experiments multi-tipo com variantes e vencedora
- ✅ IA recomenda subject, copy, segmento e send time com dados reais
- ✅ Send time por dia/hora/segmento com heatmap
- ✅ Ranking de templates e CTAs por performance
- ✅ Jornadas lifecycle activáveis (não decorativas)
- ✅ Benchmarks por período com scorecards comparativos
- ✅ Dashboard com visão executiva de otimização

