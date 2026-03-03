

# Dashboard de Comparação de Cotações com Scoring e Ranking

## Contexto
A página RFQDetailPage já tem uma tabela de comparação básica (linhas 423-484) que mostra preços por fornecedor/item com destaque do melhor preço. O pedido é transformar isto num dashboard visual completo com scoring multi-critério e ranking.

## Plano

### 1. Novo componente `src/components/procurement/RFQComparisonDashboard.tsx`

Substituir a secção "Comparação de Cotações" atual por um dashboard rico com:

**A. Ranking Card (topo)** — Cards horizontais por fornecedor, ordenados pelo score total:
- Nome do fornecedor, score total (0-100), posição (#1, #2, #3)
- Badge "Recomendado" no melhor
- Barra de progresso visual para o score
- Total geral cotado por fornecedor

**B. Scoring multi-critério** — Score calculado client-side com pesos:
- **Preço (40%)**: normalizado vs melhor preço (menor = melhor)
- **Lead Time (25%)**: normalizado vs menor lead time
- **Desconto (15%)**: maior desconto = melhor score
- **Cobertura (20%)**: % de itens cotados pelo fornecedor vs total de itens

**C. Tabela comparativa melhorada** — Manter a tabela item-por-fornecedor existente mas adicionar:
- Linha de totais no rodapé
- Indicador visual do melhor preço (verde) e pior (vermelho claro)
- Lead time por célula

**D. Gráfico de barras** — Recharts BarChart comparando os totais por fornecedor, com cores diferenciadas

**E. Radar Chart** — Recharts RadarChart mostrando os 4 critérios (Preço, Lead Time, Desconto, Cobertura) sobrepostos por fornecedor

### 2. Integração em `RFQDetailPage.tsx`

- Importar e renderizar `RFQComparisonDashboard` no lugar da Card "Comparação de Cotações" atual (linhas 423-484)
- Passar `quotes`, `items`, `supplierIds`, `supplierNames`, `selectedQuoteIds`, `setSelectedQuoteIds` como props
- Mover a lógica de `bestPriceByItem` para dentro do componente

### Ficheiros
- **Criar**: `src/components/procurement/RFQComparisonDashboard.tsx`
- **Editar**: `src/pages/procurement/RFQDetailPage.tsx` (substituir secção de comparação)

Sem alterações de DB — tudo calculado client-side a partir dos dados já disponíveis.

