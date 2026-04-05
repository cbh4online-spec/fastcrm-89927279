
# SDR — Iteração 3: Sequências e Templates

## 1. Integrar sequências no SDR Dashboard
Adicionar tab "Sequências" no `SDRDashboardPage` que reutiliza/embeds o `MultichannelSequenceBuilder` existente, filtrado pelo contexto SDR. Permitir associar sequência a uma campanha via `SDRCampaignSettings`.

## 2. Selector de templates nos passos de sequência
No `MultichannelSequenceBuilder`, ao criar um passo de email, mostrar picker de `communication_templates` existentes para preencher subject/body automaticamente. Inclui preview inline.

## 3. A/B Testing por campanha
Na tabela de prospects (`SDRProspectActions`), mostrar coluna de variante (A/B/C). No `SDRCampaignSettings`, adicionar config básica de variantes (nome da variante + peso %). Na criação de enrollment, atribuir variante aleatoriamente.

## 4. Métricas por sequência
Criar `SDRSequenceMetrics.tsx` — card com métricas da sequência associada à campanha (enrolled, em progresso, completos, taxa de conclusão). Mostrar no Pipeline tab quando há sequência.

## Ficheiros

| Ficheiro | Acção |
|---|---|
| `src/pages/SDRDashboardPage.tsx` | Tab "Sequências", integração métricas |
| `src/components/sdr/SDRCampaignSettings.tsx` | Selector de sequência + A/B config |
| `src/components/sdr/SDRSequenceMetrics.tsx` | **Novo** — métricas da sequência |
| `src/components/marketing/MultichannelSequenceBuilder.tsx` | Template picker nos steps |
| `src/hooks/useSDRCampaigns.ts` | Hook para associar sequence_id |
