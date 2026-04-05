
# SDR — Iteração 2: Detalhe e Operações

## 1. Detalhe de Campanha inline
O tab Pipeline mostra apenas uma tabela básica. Adicionar:
- KPIs da campanha seleccionada (reply rate, meeting rate, conversion rate) como cards no topo
- Indicador de progresso da campanha (enrolled vs converted)
- Botão para editar nome/descrição inline

## 2. Acções em Prospects
Na tabela de prospects, adicionar:
- Dropdown de acção por linha: mover para outra fase, marcar como opt-out, abrir detalhe
- Bulk actions: seleccionar múltiplos e mover de fase em lote
- Pesquisa por nome/email na tabela

## 3. Configurações de Campanha
Criar drawer/modal de configurações por campanha:
- Auto-enroll toggle + score mínimo
- Seleccionar sequência (multichannel_sequences)
- Seleccionar AI Employee
- A/B testing config básico (variantes)

## 4. Melhorias UX gerais
- Tabs Pipeline e Funil acessíveis sem seleccionar campanha (mostram dados globais)
- Pesquisa de campanhas no tab Campanhas
- Contagem de prospects no tab Pipeline
- Badge de campanha activa/pausada mais visível

## Ficheiros a modificar

| Ficheiro | Acção |
|---|---|
| `src/pages/SDRDashboardPage.tsx` | KPIs de campanha, pesquisa, tabs sem disabled |
| `src/components/sdr/SDRPipelineView.tsx` | Melhorias visuais menores |
| `src/components/sdr/SDRProspectActions.tsx` | **Novo** — dropdown + bulk actions |
| `src/components/sdr/SDRCampaignSettings.tsx` | **Novo** — drawer de configurações |
