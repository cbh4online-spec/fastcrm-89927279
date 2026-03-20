

## Linkar Submissões às Leads do Funil

### O que será feito
Tornar o KPI "Submissões" clicável para navegar para a lista de leads filtrada pela fonte do funil, e nas conversões da Timeline adicionar um botão "Ver Lead" que abre o detalhe da lead.

### Alterações

#### 1. `src/components/funnels/stats/StatsOverviewTab.tsx`
- Adicionar prop `onClick` opcional ao `KPICard`
- Quando `onClick` existe, mostrar cursor pointer e efeito hover
- No card "Submissões", passar `onClick` que navega para `/dashboard/leads?source=Landing Vertical: {slug}`
- Receber `templateSlug` como nova prop do componente

#### 2. `src/components/funnels/stats/StatsTimelineTab.tsx`
- Nas linhas de conversão (`form_submit`), adicionar botão "Ver Lead" que navega para `/dashboard/leads?source=Landing Vertical: {slug}`
- Receber `templateSlug` como nova prop

#### 3. `src/components/funnels/vertical-tabs/VerticalStatsTab.tsx`
- Passar `templateSlug` para `StatsOverviewTab` e `StatsTimelineTab`

#### 4. Verificação da lista de Leads
- Confirmar que `LeadsList.tsx` suporta filtro via query param `source` — se não, adicionar leitura de `searchParams` para pré-filtrar por fonte

### Ficheiros a alterar
- `src/components/funnels/stats/StatsOverviewTab.tsx`
- `src/components/funnels/stats/StatsTimelineTab.tsx`
- `src/components/funnels/vertical-tabs/VerticalStatsTab.tsx`
- `src/components/crm/LeadsList.tsx` (se necessário para suportar filtro por query param)

