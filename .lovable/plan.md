

# Redesenhar Mapa de Impacto — Compreensível e Funcional

## Problema

O mapa actual é um grafo de nós coloridos sem qualquer explicação do que representam, como interagir, ou o que significam as cores/linhas. Um utilizador novo vê caixas com "Strategy", "Goals", "Offers" ligadas por setas sem legenda, sem instruções, e sem contexto. A funcionalidade de simulação (duplo clique) é completamente invisível.

## Solução

### 1. Header explicativo com guia contextual
- Substituir o header minimalista por um que explica **o que é o mapa**: "Visualize como alterações numa área do negócio propagam impacto para outras"
- Adicionar **3 passos visuais** inline: `1. Clique num bloco para detalhes` → `2. Duplo clique para simular impacto` → `3. Veja propagação a vermelho`
- Manter toggle Context/Kernel mas com tooltips explicativos

### 2. Barra de resumo (stats)
Antes do canvas, mostrar 4-5 métricas:
- **Total de blocos** e quantos estão Completos / Envelhecendo / Desatualizados / Vazios
- **Dependências activas** (total de arestas)
- **Alerta de drift**: quantos blocos com drift severo
- Barra visual de saúde geral (% de blocos healthy vs problematic)

### 3. Nós redesenhados (ImpactMapNode)
- **Texto maior**: label com `text-sm` em vez de `text-xs`, nome do tipo em português
- **Barra de preenchimento mais visível**: altura 2px → 4px
- **Health badge proeminente**: estado escrito por extenso com cor, não apenas ícone de 3px
- **Tooltip no hover**: mostra score, dias desde última actualização, nº dependências
- **Min-width maior**: 180px → 220px para acomodar texto legível
- Traduzir block types para PT: "strategy" → "Estratégia", "business_model" → "Modelo de Negócio", etc.

### 4. Legenda flutuante
Painel fixo no canto inferior esquerdo (colapsável) com:
- **Tipos de relação**: cor da linha + nome (Depende de, Influencia, Bloqueia, Alimenta)
- **Estados de saúde**: ícone + cor + significado
- **Interacções**: ícones de rato para click, double-click, drag
- Colapsa para ícone para não ocupar espaço

### 5. Edges melhorados
- Labels de relação traduzidos para PT
- Linhas mais grossas por defeito (strokeWidth mínimo 2)
- Tooltips nas arestas com força da relação (%)

### 6. Empty state guiado
Quando não há blocos, mostrar diagrama esquemático de exemplo com:
- Explicação do que são blocos de contexto
- Link directo para Context OS
- Exemplos visuais de como o mapa fica quando preenchido

## Ficheiros

| Ficheiro | Alteração |
|----------|-----------|
| `src/pages/ImpactMapPage.tsx` | Header explicativo, stats bar, legenda, empty state |
| `src/components/impact-map/ImpactMapNode.tsx` | Cards maiores, labels PT, health badges, tooltips |
| `src/components/impact-map/ImpactMapSidebar.tsx` | Traduções menores |
| `src/components/impact-map/ImpactMapLegend.tsx` | **Novo** — legenda flutuante colapsável |

