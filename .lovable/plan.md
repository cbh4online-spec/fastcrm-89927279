
# SDR — Iteração 2: Detalhe e Operações ✅

## 1. ✅ Detalhe de Campanha inline
- KPIs da campanha (reply rate, meeting rate, conversion rate, opt-outs) no topo do Pipeline
- Badge de nome e status da campanha seleccionada
- Botão de configurações que abre drawer lateral

## 2. ✅ Acções em Prospects (`SDRProspectActions.tsx`)
- Dropdown de acção por linha: mover para qualquer fase, marcar como convertido/opt-out
- Bulk actions: checkbox para seleccionar múltiplos + mover em lote
- Pesquisa por nome/email integrada no header da tabela
- Filtro por fase (via click no pipeline) com badge + limpar

## 3. ✅ Configurações de Campanha (`SDRCampaignSettings.tsx`)
- Sheet lateral com nome, descrição, auto-enroll toggle + score mínimo
- Resumo de métricas da campanha
- Guardar com feedback visual

## 4. ✅ Melhorias UX gerais
- Tabs Pipeline e Funil acessíveis sem seleccionar campanha (dados globais)
- Pesquisa de campanhas no tab Campanhas
- Contagem de fases no tab Fases
- Badge de campanha no tab Pipeline
- Empty states melhorados em todos os tabs
