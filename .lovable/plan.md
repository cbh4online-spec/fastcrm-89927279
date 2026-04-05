
# SDR — Iteração 3: Sequências e Templates ✅

## 1. ✅ Tab "Sequências" no SDR Dashboard
- Reutiliza `MultichannelSequenceBuilder` com CRUD completo
- Criar, editar, pausar/activar, eliminar sequências multi-canal

## 2. ✅ Template picker nos passos de sequência
- Ao criar passo de email, botão "Usar template" com popover
- Lista `communication_templates` activos filtrados por canal email
- Aplica subject + body automaticamente ao passo

## 3. ✅ Selector de sequência + A/B Testing no SDRCampaignSettings
- Dropdown para associar sequência multi-canal à campanha
- Config de A/B testing: adicionar/remover variantes (A/B/C/D) com pesos %
- Validação de soma de pesos = 100%

## 4. ✅ Métricas de sequência (`SDRSequenceMetrics.tsx`)
- Card com inscritos, em progresso, completos, taxa de conclusão
- Mostrado no Pipeline tab quando campanha tem sequência associada
- Badges de status e canais

## Ficheiros modificados/criados

| Ficheiro | Acção |
|---|---|
| `src/pages/SDRDashboardPage.tsx` | Tab Sequências + métricas inline |
| `src/components/sdr/SDRCampaignSettings.tsx` | Selector sequência + A/B config |
| `src/components/sdr/SDRSequenceMetrics.tsx` | **Novo** |
| `src/components/marketing/MultichannelSequenceBuilder.tsx` | Template picker |
