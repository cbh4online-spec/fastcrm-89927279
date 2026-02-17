

# Corrigir Analytics das Bio Pages

## Problemas encontrados

### 1. Nome de coluna errado nas queries
O `BioAnalyticsTab.tsx` usa `.eq("page_id", pageId)` em duas queries, mas a coluna real chama-se `bio_page_id` -- tanto na tabela `bio_events` como em `bio_analytics_daily`. Resultado: nenhuma query devolve dados.

### 2. Tabela `bio_analytics_daily` vazia (sem job de agregacao)
A tabela `bio_analytics_daily` foi criada mas nao existe nenhum mecanismo (cron job ou funcao) para agregar os eventos de `bio_events` em resumos diarios. Existem 8 page_views e 1 click em `bio_events`, mas 0 linhas em `bio_analytics_daily`.

## Solucao

### Parte A: Corrigir nomes de coluna (BioAnalyticsTab.tsx)
- Linha 23: `.eq("page_id", pageId)` -> `.eq("bio_page_id", pageId)`
- Linha 37: `.eq("page_id", pageId)` -> `.eq("bio_page_id", pageId)`

### Parte B: Criar funcao SQL de agregacao + cron
- Criar funcao `aggregate_bio_analytics_daily()` que:
  - Para cada `bio_page_id`, agrega os eventos do dia anterior
  - Calcula: views, uniques (por `visitor_id`), clicks, leads
  - Calcula `top_links` (blocos mais clicados) e `top_sources` (referrers)
  - Faz UPSERT em `bio_analytics_daily` (para ser idempotente)
- Agendar via `pg_cron` para correr 1x por dia
- Correr manualmente uma vez para preencher dados historicos

### Parte C: RLS da tabela `bio_analytics_daily`
- Verificar que a policy "System can manage" permite INSERT pela funcao SQL (usa SECURITY DEFINER)

## Ficheiros a alterar

| Ficheiro | Alteracao |
|----------|-----------|
| `src/components/bio/tabs/BioAnalyticsTab.tsx` | Corrigir `page_id` -> `bio_page_id` (2 locais) |
| Migration SQL | Funcao `aggregate_bio_analytics_daily()` + cron schedule + backfill |

## Detalhe tecnico da funcao de agregacao

```text
aggregate_bio_analytics_daily(target_date DATE DEFAULT CURRENT_DATE - 1):
  FOR each bio_page_id with events on target_date:
    - views = COUNT WHERE event_type = 'page_view'
    - uniques = COUNT DISTINCT visitor_id WHERE event_type = 'page_view'  
    - clicks = COUNT WHERE event_type = 'click'
    - leads = COUNT WHERE event_type = 'lead'
    - top_links = JSON array dos block_ids mais clicados
    - top_sources = JSON array das sources mais frequentes
    UPSERT into bio_analytics_daily
```

