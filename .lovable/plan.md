# SDR — Iteração 6: Analytics Avançado e A/B Testing

## Diagnóstico

O módulo SDR tem KPIs globais (reply/meeting/conversion rates) e métricas por step, mas falta:
- **A/B Testing**: campo `ab_testing_config` existe na tabela mas sem UI nem lógica de distribuição
- **Analytics por período**: sem histórico temporal — impossível ver tendências
- **Comparação entre campanhas**: não há vista comparativa
- **Métricas de email engagement**: open/click rates existem nos logs mas sem agregação visual avançada
- **Heatmap de horários**: sem insight sobre melhores horários de envio

## Implementação

### 1. Migração: tabela `sdr_daily_stats`
Tabela desnormalizada para snapshots diários por campanha — permite gráficos de tendência sem queries pesadas em tempo real.
Campos: campaign_id, workspace_id, stat_date, enrolled, sent, opened, clicked, replied, meetings, converted, opted_out.

### 2. Edge Function `sdr-stats-aggregator`
Cron job (via Trigger.dev) que corre 1x/dia e popula `sdr_daily_stats` com contagens do dia anterior a partir de `sdr_enrollments` e `sdr_sequence_step_logs`.

### 3. A/B Testing UI + Lógica
- **SDRCampaignSettings**: Configurar variantes (A/B/C) com labels, percentagem de alocação, e template/subject alternativo
- **sdr-sequence-executor**: Na hora do envio, sortear variante com base nas percentagens e registar `message_variant` no enrollment
- **SDRABTestResults**: Componente com tabela comparativa de métricas por variante (open rate, reply rate, click rate)

### 4. Analytics Dashboard (novo tab "Analytics")
- Gráfico de linha: tendência diária de sent/opened/replied (últimos 30 dias) — usa `sdr_daily_stats`
- Heatmap de horários: melhor hora/dia para envio baseado em `opened_at` dos step logs
- Comparação entre campanhas: tabela side-by-side

### 5. Componentes

| Ficheiro | Acção |
|---|---|
| `supabase/functions/sdr-stats-aggregator/index.ts` | **Novo** — agrega stats diários |
| `trigger/jobs/sequences.ts` | Adicionar cron job para sdr-stats-aggregator |
| `src/components/sdr/SDRABTestConfig.tsx` | **Novo** — config de variantes A/B |
| `src/components/sdr/SDRABTestResults.tsx` | **Novo** — resultados A/B por variante |
| `src/components/sdr/SDRAnalyticsDashboard.tsx` | **Novo** — analytics com gráficos |
| `src/components/sdr/SDRSendTimeHeatmap.tsx` | **Novo** — heatmap de horários |
| `src/pages/SDRDashboardPage.tsx` | Adicionar tab "Analytics" e "A/B Tests" |
| `src/components/sdr/SDRCampaignSettings.tsx` | Integrar config A/B |
| `supabase/functions/sdr-sequence-executor/index.ts` | Lógica de distribuição de variantes |
