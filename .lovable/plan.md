

# Plano: Corrigir AI Sales Coach — Dados Vazios

## Diagnóstico

O ecrã mostra dados na barra de overview (Score 33/100, €37,5 em risco, 1 crítico, 2 parados) porque o `pipeline_risk_reports` tem 4 registos válidos. **O problema principal é a tab "Deal Intelligence" que mostra 0 deals.**

| Tabela | Registos | Estado |
|---|---|---|
| `pipeline_risk_reports` | 4 (1 válido) | ✅ Funciona |
| `multi_pipeline_intel_reports` | 4 (1 válido) | ✅ Funciona |
| `deal_intelligence_reports` | **0** | ❌ Vazio |
| `opportunities` (activas) | 10+ | Existem deals para analisar |

**Causa raiz**: Os relatórios de Deal Intelligence só são gerados individualmente — o utilizador tem de ir ao detalhe de cada oportunidade e clicar "Analisar". Não existe nenhum mecanismo de geração em massa a partir do Sales Coach. Isto torna a tab inútil até que alguém visite cada deal individualmente.

## Solução

Adicionar **geração em massa** de Deal Intelligence directamente na tab, e melhorar o botão "Analisar Pipeline" para também gerar relatórios por deal.

### Passo 1 — Botão "Analisar Todos os Deals" na tab Deal Intelligence

Na `DealIntelligenceTab`, adicionar um botão que itera sobre as oportunidades activas e chama `deal-intelligence-ai` para cada uma (em paralelo controlado, max 3 simultâneos para respeitar rate limits).

### Passo 2 — Hook `useBulkDealIntelligence`

Criar hook que:
1. Busca oportunidades activas do workspace (`status = 'open'`)
2. Para cada uma sem relatório válido, chama `deal-intelligence-ai`
3. Reporta progresso (X de Y analisados)
4. Invalida queries ao completar

### Passo 3 — Melhorar a lista de deals

- Mostrar o nome da oportunidade (fazer join com `opportunities.title`) em vez de `coaching_summary?.slice(0,40)` ou UUID truncado
- Adicionar o stage e valor ao card de cada deal

### Passo 4 — Integrar no "Analisar Pipeline"

Quando o utilizador clica "Analisar Pipeline" na overview bar, além de `pipeline_risk` e `multi_pipeline`, também disparar a geração em massa dos deals (com indicador de progresso).

## Ficheiros

| Ficheiro | Acção |
|---|---|
| `src/hooks/useBulkDealIntelligence.ts` | **Criar** — hook de geração em massa com progresso |
| `src/pages/AISalesCoachPage.tsx` | **Modificar** — adicionar botão bulk na tab Deal Intelligence + melhorar lista de deals + integrar no "Analisar Pipeline" |
| `src/hooks/useDealIntelligenceCoach.ts` | **Modificar** — adicionar query de oportunidades activas |

## Critérios de Aceitação

- Botão "Analisar Todos" gera relatórios para todas as oportunidades activas
- Indicador de progresso visível durante geração (ex: "3/10 analisados")
- Tab Deal Intelligence populada após análise
- Lista de deals mostra nome, stage, valor e health score
- Rate limiting respeitado (max 3 chamadas simultâneas)
- Estado de erro tratado por deal individual (não bloqueia os restantes)

