

## Fase 4 — Base de Conhecimento (Admin CRUD) e Dashboard CSAT

### Estado Atual

**Base de Conhecimento:**
- Tabelas `kb_categories`, `kb_articles`, `kb_feedback`, `kb_article_views` já existem com RLS, full-text search index (português) e RPC `increment_kb_article_views`
- Hook `useKBHelp` existe (read-only para o help modal)
- `KnowledgeBaseHelpModal` consome artigos publicados — funciona como frontend de leitura
- Rota `helpdesk-kb` em `/dashboard/helpdesk/knowledge-base` existe no manifest com `isBeta: true` mas **não tem página admin** para gerir artigos
- Faltam: CRUD de artigos, CRUD de categorias, editor markdown, gestão de publicação, analytics de artigos

**CSAT:**
- `CSATWidget` e `TicketCSATStars` existem como componentes de estrelas
- Campo `satisfaction_rating` existe em `client_tickets` e `support_tickets`
- `useClientTicketStats` calcula `avgSatisfaction` básico
- **Não existe** dashboard dedicado de CSAT, nem tabela de surveys, nem trending, nem breakdown por agente/tipo

---

### Implementação

#### 1. Migration DB

**Artigos KB — RLS para admins (INSERT/UPDATE/DELETE):**
- Adicionar policies para permitir que utilizadores autenticados com role admin possam criar/editar/eliminar artigos e categorias (atualmente só têm SELECT)

**CSAT — sem novas tabelas:**
- Os dados de satisfação já estão em `client_tickets.satisfaction_rating` e `support_tickets` — o dashboard agrega a partir dessas tabelas existentes

#### 2. Hook `useKBAdmin` — CRUD completo de artigos e categorias

- **Categorias**: listar, criar, editar, eliminar (com validação de artigos associados)
- **Artigos**: listar todos (incluindo não publicados), criar, editar, publicar/despublicar, eliminar
- Pesquisa full-text usando o índice GIN já existente (`to_tsvector('portuguese', ...)`)
- Filtros: categoria, tipo de artigo, estado de publicação
- Estatísticas por artigo: views, feedback positivo/negativo

#### 3. Página Admin KB (`/dashboard/helpdesk/knowledge-base`)

**Layout com 2 tabs:**
- **Tab "Artigos"**: Tabela com colunas (título, categoria, tipo, estado, views, feedback, atualizado). Filtros por categoria e tipo. Pesquisa full-text. Botão "Novo Artigo"
- **Tab "Categorias"**: Lista de categorias com ícone, cor, contagem de artigos. CRUD inline

**Dialog/Sheet de edição de artigo:**
- Campos: título, slug (auto-gerado), resumo, categoria (dropdown), tipo (guide/how-to/reference/faq/video), tags (input múltiplo), artigos relacionados (multi-select)
- Editor de conteúdo markdown (reutilizar padrão com textarea + preview com `MarkdownRenderer`)
- Toggle publicar/rascunho
- Preview lado-a-lado (editor | rendered)

#### 4. Hook `useCSATDashboard` — Agregação de dados CSAT

- Query ambas as tabelas (`client_tickets` + `support_tickets`) para ratings
- Métricas: média global, distribuição (1-5 estrelas), total de avaliações, tendência 30 dias
- Breakdown por: agente, tipo de ticket, prioridade, canal
- Período configurável (7d, 30d, 90d, all)

#### 5. Página CSAT Dashboard (`/dashboard/helpdesk/csat`)

**KPIs (react-countup):**
- Satisfação média (estrelas + número)
- Total de avaliações
- % positivas (4-5 estrelas)
- NPS simplificado (promotores - detratores)

**Gráficos (recharts):**
- Tendência de satisfação ao longo do tempo (line chart)
- Distribuição por estrela (bar chart horizontal)
- Satisfação por agente (bar chart com avatar)
- Satisfação por tipo de ticket (pie chart)

**Tabela de avaliações recentes:**
- Ticket number, cliente, rating (estrelas), comentário, agente, data

---

### Ficheiros

```text
NOVOS:
  src/hooks/useKBAdmin.ts                                   — CRUD artigos + categorias
  src/hooks/useCSATDashboard.ts                              — Agregação CSAT
  src/pages/dashboard/helpdesk/HelpdeskKnowledgeBase.tsx     — Página admin KB
  src/pages/dashboard/helpdesk/HelpdeskCSAT.tsx              — Dashboard CSAT
  src/components/helpdesk/KBArticleEditor.tsx                — Dialog/sheet edição artigo
  src/components/helpdesk/CSATCharts.tsx                     — Gráficos CSAT

EDITADOS:
  supabase/migrations/...                                    — RLS admin para kb_articles/kb_categories
  src/routes/HelpdeskRoutes.tsx                              — 2 novas rotas
  src/config/routeManifest.ts                                — helpdesk-kb (remover isBeta), adicionar helpdesk-csat
```

### Critérios de Aceitação
- CRUD completo de artigos KB com editor markdown e preview
- CRUD de categorias com ícone e cor
- Pesquisa full-text em português nos artigos
- Toggle publicar/despublicar artigos
- Dashboard CSAT com 4+ KPIs e 4 gráficos
- Breakdown de satisfação por agente, tipo e período
- Tabela de avaliações recentes com estrelas
- Tudo em pt-PT, dark mode, responsive

