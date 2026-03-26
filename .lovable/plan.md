

# Completar PDF do CEO Copilot — secções em falta

## Problema

O export PDF do CEO Copilot só inclui Daily Brief, Estratégia Semanal e Pipeline Health parcial. Faltam:
1. **Resumo Semanal** — o `strategy.summary` já está no PDF mas sem destaque; as secções Quick Wins não aparecem claramente separadas
2. **Pipeline Health completa** — faltam os risk buckets (Hot/Likely/Uncertain/Low com contagem e valor) que vêm do hook `usePipelineRiskAnalysis`
3. **Growth Insights** — secção inteira ausente (Top Customers, Top Sellers, Need Matches, Lifecycle Events, AI Analysis summary)

## Alterações

### 1. `CEOCopilotPage.tsx`
- Importar `useGrowthInsights` e passar os dados (`topCustomers`, `topSellers`, `needMatches`, `summary`, `aiAnalysis`) ao componente `CEOCopilotExport`
- Importar `usePipelineRiskAnalysis` e passar `buckets` ao export

### 2. `CEOCopilotExport.tsx` — Props
- Adicionar props: `growthData` (topCustomers, topSellers, needMatches, summary, aiAnalysis) e `pipelineBuckets`

### 3. `CEOCopilotExport.tsx` — Secção Pipeline Health (melhorar)
- Antes dos stalled deals, adicionar tabela de **Risk Buckets**: categoria | deals | valor total
- Categorias: Hot, Likely, Uncertain, Low com cores correspondentes

### 4. `CEOCopilotExport.tsx` — Nova secção "GROWTH INSIGHTS"
- **Summary KPIs**: tabela com topCustomersCount, totalRevenue, pendingNeedMatches, upcomingLifecycleEvents
- **Top Customers** (top 5): tabela com nome, empresa, receita total, LTV, risco de churn
- **Top Sellers** (top 5): tabela com nome, receita, conversão, velocidade de fecho, progresso meta
- **Need Matches** (top 5): tabela com cliente, produto recomendado, confiança, janela ideal
- **AI Analysis**: insights e recomendações em lista se disponível

### Secções finais no PDF
1. Daily Brief (já existe)
2. Estratégia Semanal (já existe — manter)
3. Pipeline Health (expandir com buckets)
4. **Growth Insights** (novo)

## Detalhes técnicos

- Ficheiros alterados: `CEOCopilotPage.tsx`, `CEOCopilotExport.tsx`
- Sem novas dependências — usa jsPDF + autoTable já instalados
- Dados vêm dos hooks existentes `useGrowthInsights` e `usePipelineRiskAnalysis`
- Formatação segue o padrão já definido no export (cores PRIMARY/GREEN/AMBER/RED, sectionHeader, autoTable)

