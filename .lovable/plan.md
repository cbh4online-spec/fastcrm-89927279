

# Finalizar Módulo de Secções — Analytics de Funis

## Diagnóstico

O módulo `StatsSectionsTab` existe mas está incompleto:
1. **Estado vazio genérico** — mostra sempre "Pixel instalado ✓" mesmo sem verificação real; os outros dois indicadores estão sempre ✗
2. **Apenas barras horizontais** — falta visualização de heatmap real (grid colorido)
3. **Sem tempo por secção** — o tracker regista `section_view` mas não captura quanto tempo o visitante ficou em cada secção
4. **Sem recomendações por secção** — identifica "Problema" mas não sugere ações concretas
5. **Sem comparação entre períodos** — não mostra se uma secção melhorou ou piorou
6. **Sem filtro por dispositivo** — mobile vs desktop têm padrões de scroll muito diferentes
7. **SECTION_ORDER hardcoded** — só funciona para templates verticais com as 9 secções predefinidas; landing pages com secções customizadas (via Builder) ficam de fora

## Plano de Implementação

### 1. Adicionar coluna `time_on_section` ao tracker (migração DB)
- Adicionar coluna `time_on_section_ms` (integer, nullable) à tabela `vertical_landing_events`
- No `VerticalLandingTracker`, usar `IntersectionObserver` para medir o tempo que cada secção esteve visível e fazer UPDATE ao registo de `section_view` quando a secção sai do viewport

### 2. Tornar SECTION_ORDER dinâmico
- Em `computeSectionHeatmap`, aceitar um parâmetro opcional `customSections` extraído das secções reais da landing page (via `landing_page_sections`)
- Fallback para o `SECTION_ORDER` hardcoded se não houver secções customizadas
- Incluir secções não previstas no array — qualquer `page_section` presente nos eventos deve aparecer

### 3. Refatorar `StatsSectionsTab` com sub-componentes

**3a. Checklist de prontidão inteligente** (substituir os ✓/✗ estáticos)
- Verificar dinamicamente: (a) se existem eventos `view` para o slug, (b) se existem eventos `section_view`, (c) se as secções têm `data-section` definido (inferir a partir dos eventos existentes vs SECTION_ORDER)
- Mostrar ⚠ amarelo quando há dados parciais (< 10 section_views)

**3b. Heatmap visual (grid)**
- Grid com secções no eixo Y e dias no eixo X (últimos 7/30 dias)
- Cor baseada em intensidade de views (verde escuro → verde claro → cinza)
- Tooltip com valores exatos ao hover

**3c. Tabela detalhada de secções**
- Colunas: Secção | Views | % Alcance | Tempo Médio | Drop-off | Tendência (↑↓→)
- Tempo médio calculado a partir de `time_on_section_ms`
- Tendência: comparar período atual vs período anterior
- Badge "Problema" expandido com tooltip de sugestão contextual

**3d. Filtro por dispositivo**
- Toggle "Todos | Desktop | Mobile" no topo
- Filtrar eventos por `device_type` antes de computar

**3e. Recomendações automáticas por secção**
- Card de insights no fundo: "A secção Testemunhos perde 45% dos visitantes — considera mover para cima" 
- Baseado em drop-off > 30% e posição na página

### 4. Enriquecer o tracker com tempo por secção
- No `VerticalLandingTracker`, ao detectar que uma secção saiu do viewport, calcular `Date.now() - entryTime` e inserir novo evento `section_exit` com `time_on_section_ms`
- Alternativa mais simples: usar um único evento `section_view` e fazer UPDATE com o tempo quando a secção sai (evita duplicar registos)

## Ficheiros a criar/editar

| Ficheiro | Ação |
|---|---|
| **Migração SQL** | Adicionar `time_on_section_ms` à `vertical_landing_events` |
| `src/components/vertical-landing/VerticalLandingTracker.tsx` | Editar — medir tempo por secção |
| `src/components/funnels/stats/StatsSectionsTab.tsx` | Refatorar — heatmap grid, tabela detalhada, filtro dispositivo, recomendações |
| `src/components/funnels/stats/statsHelpers.ts` | Editar — tornar SECTION_ORDER dinâmico, adicionar cálculo de tempo médio e tendências |

## Critérios de Aceitação
- Heatmap grid visual com cor por intensidade (dias × secções)
- Tabela com views, alcance %, tempo médio, drop-off e tendência
- Checklist de prontidão dinâmica (não estática)
- Filtro desktop/mobile funcional
- Recomendações contextuais por secção com drop-off > 30%
- Tracker captura tempo por secção sem duplicar eventos
- Secções customizadas (não hardcoded) aparecem quando disponíveis
- Estado vazio melhorado com instruções claras

