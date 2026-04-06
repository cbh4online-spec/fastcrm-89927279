

## Plano: Melhorar Visitantes Activos e Intenção do Visitante

### Diagnóstico

**Visitantes Activos** (ActiveVisitorsList):
- UI minimalista — mostra apenas first_page, score, páginas e fonte
- Sem indicação visual de AI intent, carrinho activo, ou tempo no site
- Sem filtros ou agrupamento por temperatura
- O painel lateral (VisitorIntelPanel) é funcional mas básico

**Intenção do Visitante (AI)**:
- Apenas blocos simples com contagem e percentagem
- Só mostra `ai_intent` (browsing, comparing, ready_to_buy, returning_customer)
- Não mostra `ai_score`, `ai_recommendation`, nem tendências
- Sem ícones diferenciados por intenção
- Secção invisível quando não há intents (maioria das sessões não classificadas — 4 de 7)

### Melhorias Propostas

#### 1. Visitantes Activos — UI Rica
**Ficheiro**: `src/components/store/ActiveVisitorsList.tsx`

- **Indicadores visuais por linha**: ícone de carrinho activo (com valor €), badge de AI intent com cor, tempo no site formatado
- **Barra de progresso de score** inline (mini bar colorida por temperatura)
- **Agrupamento visual**: separar por temperatura (🔥 Quentes primeiro, depois 🌡️ Mornos, ❄️ Frios)
- **Resumo topo**: 3 mini-KPIs — total online, média de score, visitantes com carrinho
- **Pulsing dot** verde para sessões com actividade < 1 min (realmente activos)
- **Filtro rápido**: chips "Todos | Quentes | Com carrinho" para filtrar a lista

#### 2. Intenção do Visitante — Dashboard Enriquecido
**Ficheiro**: `src/components/store/analytics/StoreVisitsTab.tsx`

- **Cards com ícones e cores diferenciadas** por intenção (Search → browsing, Scale → comparing, ShoppingCart → ready_to_buy, UserCheck → returning_customer)
- **AI Score médio** por intenção mostrado em cada card
- **Barra de progresso** visual da percentagem
- **Secção de recomendações AI**: listar as `ai_recommendation` mais recentes agrupadas por tipo
- **Cobertura de classificação**: indicador de "X% das sessões classificadas" com botão para classificar pendentes
- **Mostrar secção mesmo sem dados**: estado vazio com CTA para activar classificação

#### 3. VisitorIntelPanel — Enriquecer Detalhes
**Ficheiro**: `src/components/store/VisitorIntelPanel.tsx`

- **AI Intent badge** com cor e ícone no topo do painel
- **AI Score** como gauge visual
- **AI Recommendation** como card destacado (se disponível)
- **Produtos vistos com nomes** em vez de apenas contagem

#### 4. Hook de Analytics — Dados Adicionais
**Ficheiro**: `src/hooks/useStoreVisitsAnalytics.ts`

- Calcular `ai_score` médio por intenção
- Agregar `ai_recommendation` das sessões recentes
- Calcular taxa de classificação (sessões com intent / total)

### Detalhe Técnico

**Ficheiros modificados:**
- `src/components/store/ActiveVisitorsList.tsx` — UI rica com agrupamento, filtros, KPIs e indicadores visuais
- `src/components/store/analytics/StoreVisitsTab.tsx` — Secção de intenção enriquecida com ícones, scores, recomendações e cobertura
- `src/components/store/VisitorIntelPanel.tsx` — AI intent, score e recomendação no painel lateral
- `src/hooks/useStoreVisitsAnalytics.ts` — Dados adicionais de AI score médio e recomendações

**Nenhuma migração necessária** — todos os campos já existem na tabela `store_visitor_sessions`.

**Nenhuma edge function nova** — a classificação já funciona via `store-classify-visitor`.

### Critérios de Aceitação
- Visitantes activos agrupados por temperatura com KPIs de resumo
- Filtro funcional (Todos/Quentes/Com carrinho)
- Cards de intenção com ícones, cores e score médio
- Recomendações AI visíveis
- Indicador de cobertura de classificação
- Estado vazio informativo quando não há classificações
- Painel lateral mostra AI intent, score e recomendação

