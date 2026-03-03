
# Renewals Engine — 3 Camadas

## ✅ Estado: COMPLETO

### Camada 1 — Dados Certos (DONE)
- ✅ 4 tabelas DB com RLS + enums + índices
- ✅ Types, hooks (CRUD completo), pages (lista + detalhe com 5 tabs)
- ✅ Trigger `total_mrr` automático (recalcula MRR quando items mudam)
- ✅ Edge functions registadas no `config.toml`
- ✅ Integração "Propostas Ganhas" — CTA "Criar Renovação" em propostas aceites
- ✅ Campos `risk_level` e `reasons_json` adicionados

### Camada 2 — Cron + Alertas (DONE)
- ✅ `renewals-scheduler` melhorado com `admin_notifications` + usage thresholds
- ✅ Alertas para: renovações (30/15/7/1/0 dias), overdue, packs baixos (<20%), packs a expirar (15 dias)
- ✅ Painel "Renewals Alerts" com 4 cards (Overdue, Próx. 7 dias, Pack Baixo, A Expirar) + lista detalhada

### Camada 3 — IA (DONE)
- ✅ `renewals-health-score` melhorado: score + risk_level + top 3 reasons + suggested_action
- ✅ `renewals-ai-suggestions` (Gemini 3 Flash): sugestões acionáveis (upsell, risk_mitigation, downgrade, optimization)
- ✅ UI de Health Score, Risk Level e Sugestões IA no detalhe do contrato
