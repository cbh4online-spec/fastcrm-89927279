

# Plano: Tab "Visitas" no Analytics da Loja

## Diagnóstico

O analytics da loja tem tabs de Vendas, Produtos, Clientes, etc., mas **falta completamente o componente de análise de visitas/tráfego**. Existem duas tabelas com dados relevantes já a ser populadas:

| Tabela | Dados | Registos |
|---|---|---|
| `store_page_views` | Views por produto (product_id, session_id, created_at) | 55 views, 7 sessões, 11 produtos |
| `store_visitor_sessions` | Sessões completas (pages_viewed, time_on_site, device, UTM, referrer, AI intent) | 6 sessões |

Os dados existem mas **não são apresentados em nenhum dashboard**.

## Solução

Criar uma nova tab **"Visitas"** no `StoreAnalyticsShell` com os seguintes módulos:

### KPIs principais
- Total de visitas (page views)
- Sessões únicas
- Páginas por sessão (média)
- Tempo médio no site
- Taxa de bounce (sessões com 1 página)
- Taxa de conversão (sessões com `converted = true`)

### Gráficos e tabelas

1. **Visitas diárias** — Gráfico de área com views e sessões únicas por dia
2. **Dispositivos** — Donut chart (desktop vs mobile vs tablet) via `device_type`
3. **Fontes de tráfego** — Tabela com UTM source/medium, sessões, conversão
4. **Páginas mais vistas** — Ranking de produtos por views, com CTR (views → encomenda)
5. **Referrers** — Top referrers externos
6. **Intenção AI** — Distribuição de `ai_intent` (browsing, buying, comparing, etc.)

## Ficheiros a criar/modificar

| Ficheiro | Acção |
|---|---|
| `src/components/store/analytics/StoreVisitsTab.tsx` | **Criar** — novo componente com todos os módulos de visitas |
| `src/hooks/useStoreVisitsAnalytics.ts` | **Criar** — hook dedicado que agrega dados de `store_page_views` + `store_visitor_sessions` |
| `src/components/store/analytics/StoreAnalyticsShell.tsx` | **Modificar** — adicionar tab "Visitas" com ícone Eye |

## Estrutura técnica do hook

```typescript
// useStoreVisitsAnalytics(days)
// Query 1: store_page_views → views diárias, top produtos
// Query 2: store_visitor_sessions → sessões, dispositivos, UTM, referrers, AI intent
// Retorna: { kpis, dailyVisits, deviceBreakdown, trafficSources, topPages, referrers, aiIntents }
```

## Critérios de aceitação
- Tab "Visitas" visível e funcional no analytics da loja
- KPIs calculados a partir de dados reais das duas tabelas
- Gráfico de visitas diárias com período configurável (usa o selector já existente)
- Breakdown por dispositivo, fonte UTM e referrer
- Ranking de produtos por visualizações
- Estados vazios, loading e erro tratados

