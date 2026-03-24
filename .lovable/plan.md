

## Account Brief — Fase Avançada (7 Fases de Implementação)

Evolução do módulo existente com watchlist, alertas, colaboração, PDF, outreach, scoring avançado, comparação, enriquecimento e listas segmentadas.

---

### FASE A — Watchlist, Scheduler e Alertas de Mudança

**Migration**: Criar tabelas `account_brief_watchlists` e `account_brief_change_alerts` com RLS por workspace.

**Edge Functions**:
- `account-brief-watchlist-scheduler` — consulta watchlists activas com `next_run_at <= now()`, invoca `account-brief-refresh-account` para cada, actualiza `next_run_at` baseado na frequência
- `account-brief-detect-site-changes` — chamado após refresh, compara runs actual e anterior via dados de `account_brief_briefs`/`account_brief_scores`/`account_brief_pages`, gera alertas classificados por severidade e relevância comercial em `account_brief_change_alerts`

**Hooks**: `useAccountBriefWatchlist`, `useAccountBriefAlerts`

**Páginas**:
- `/dashboard/account-brief/watchlist` — tabela de contas vigiadas, próxima reanálise, motivo, ações (pausar, remover)
- `/dashboard/account-brief/alerts` — feed de mudanças recentes com badges de tipo e severidade, filtro por is_read

**UI no detalhe da conta**: Botão "Adicionar à Watchlist" com modal (frequência + motivo). Secção "Alertas de mudança" com timeline.

**Nav**: Adicionar "Watchlist" e "Alertas" ao grupo Account Brief em nav.v1.ts/nav.v2.ts.

**Eventos Kernel**: `watchlist_added`, `watchlist_paused`, `watchlist_removed`, `scheduled_reanalysis_completed`, `site_change_detected`, `commercial_change_alert_created`

**Dashboard**: Novos cards "Contas em Watchlist" e "Alertas Recentes".

---

### FASE B — Listas Segmentadas, Comparação e Dashboard Evoluído

**Migration**: Criar tabelas `account_brief_segments`, `account_brief_segment_members`, `account_brief_comparison_runs`.

**Edge Functions**:
- `account-brief-compute-segment-members` — avalia filtros JSON contra `account_brief_accounts` + scores + watchlist, popula membros
- `account-brief-compare-accounts` — recebe 2-5 account_ids, agrega scores/briefs/sinais, gera summary comparativo via Gemini 2.5 Pro

**Hooks**: `useAccountBriefSegments`, `useAccountBriefCompare`

**Páginas**:
- `/dashboard/account-brief/segments` — lista segmentos, contador membros, preview, criar/editar com builder de filtros
- `/dashboard/account-brief/compare` — seleccionar contas, tabela comparativa lado-a-lado, highlights ("melhor aposta", "mais madura", "maior urgência")

**Dashboard evoluído**: Widgets adicionais — contas com maior aumento de score, sinais de hiring, segmentos mais valiosos, reanálises agendadas hoje, contas sem owner.

---

### FASE C — Scoring Avançado

**Migration**: Adicionar colunas a `account_brief_scores` (`confidence_score`, `strategic_fit_score`, `outbound_readiness_score`, `urgency_score`). Criar `account_brief_score_models` para config de pesos por workspace.

**Edge Functions**:
- `account-brief-compute-advanced-score` — substitui `compute-score`, adiciona sub-scores de urgency, strategic fit, outbound readiness, confidence. Usa pesos configuráveis do workspace.
- `account-brief-score-explainer` — gera explicação detalhada via IA dos factores

**Hook**: `useAccountBriefAdvancedScore`

**UI**: Score breakdown visual com barras por sub-score, factores +/-, confiança da análise, comparação de scores entre contas na página de comparação. Painel simples de ajuste de pesos nas definições.

---

### FASE D — Geração de Emails de Outreach

**Migration**: Criar `account_brief_outreach_generations` e `account_brief_outreach_templates`.

**Edge Functions**:
- `account-brief-generate-outreach-email` — recebe account_id + tone + length + tipo (inicial/follow-up), usa briefing + ICP + sinais para gerar subject + body + CTA via Gemini 2.5 Pro. Gera 2-3 variações.
- `account-brief-save-outreach-template` — persiste geração como template reutilizável

**Hook**: `useAccountBriefOutreach`

**UI no detalhe da conta**: Botão "Gerar Email" → drawer/modal lateral com opções (tom: consultivo/direto/executivo/friendly, comprimento: curto/médio/longo). Preview das variações, botões copiar, guardar como template. Preparar link para Sequências (disabled com tooltip "Em breve").

**Eventos Kernel**: `outreach_generated`, `outreach_template_saved`

---

### FASE E — Colaboração em Equipa

**Migration**: Adicionar `owner_user_id` e `assigned_user_id` a `account_brief_accounts`. Criar `account_brief_comments` e `account_brief_activity_log`.

**Hook**: `useAccountBriefCollaboration`

**UI no detalhe**: Selector de owner/assigned_to, secção de comentários com menções (@user), feed de actividade (quem alterou status, score, notas, etc.).

**Lista de contas**: Colunas/filtros por owner e assigned_to. Badge "Sem owner" no dashboard.

**Eventos Kernel**: `account_assigned`, `comment_added`, `owner_changed`

---

### FASE F — Exportação PDF

**Migration**: Criar `account_brief_exports` (log de exports).

**Edge Function**: `account-brief-export-pdf` — gera PDF server-side via edge function, guarda em Supabase Storage, retorna URL. Templates: executivo (resumido), completo, comparativo.

**Hook**: `useAccountBriefExports`

**UI**: Botão "Exportar PDF" no detalhe da conta com dropdown (Executivo / Completo). Na comparação: "Exportar Comparação". Página `/dashboard/account-brief/exports` com histórico.

---

### FASE G — Enriquecimento Externo

**Migration**: Criar `account_brief_enrichment_runs` e `account_brief_data_sources`.

**Edge Functions**:
- `account-brief-enrich-account` — cruza com CRM Empresas/Contactos existentes, pesquisa pública via Firecrawl, marca origem de cada dado
- `account-brief-match-company-record` — sugere empresa CRM existente por domínio/nome
- `account-brief-suggest-contacts` — sugere contactos públicos relevantes

**Hook**: `useAccountBriefEnrichment`

**UI no detalhe**: Secção "Fontes de dados" com badges (site / inferido / CRM / externo). Toggle de enriquecimento externo nas definições.

**Eventos Kernel**: `external_enrichment_completed`, `company_match_suggested`

---

### Ficheiros (resumo)

| Tipo | Criar | Editar |
|------|-------|--------|
| **Migrations** | ~4 (agrupadas por fase) | — |
| **Edge Functions** | ~12 novas | `account-brief-refresh-account` (trigger alertas) |
| **Hooks** | ~10 novos | — |
| **Páginas** | 5 novas (watchlist, alerts, segments, compare, exports) | Dashboard, Detail, Accounts, Admin |
| **Nav** | — | nav.v1.ts, nav.v2.ts (5 novos items) |
| **Rotas** | — | App.tsx (5 novas rotas) |

### Decisões técnicas

| Aspecto | Decisão |
|---------|---------|
| Scheduler watchlist | pg_cron a cada 15min invocando edge function |
| Alertas | Classificação por IA (Gemini) com severidade + relevância comercial |
| PDF | Server-side via edge function com HTML→PDF (puppeteer-like ou html template) |
| Outreach | Gemini 2.5 Pro com contexto do briefing + ICP |
| Segmentos dinâmicos | Filtros JSON avaliados server-side contra tabelas existentes |
| Comparação | Max 5 contas, summary gerado por IA |
| Enriquecimento | CRM interno first, Firecrawl search opcional, sempre com source tracking |

### Implementação

Implementarei **Fase A** primeiro (watchlist + alertas), seguida das fases restantes em sequência. Cada fase é auto-contida e funcional.

