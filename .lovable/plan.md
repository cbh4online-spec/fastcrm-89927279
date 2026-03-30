

# Área de Gestão do Blog — Avançada

## Diagnóstico

Actualmente, os posts de blog são geridos dentro da lista genérica de entidades SEO (`SEOEntitiesList`), filtrados por `entity_type: 'blog'`. Não existe uma página dedicada com funcionalidades específicas de blog como editor rico, calendário editorial, categorias/tags, imagem de destaque, agendamento de publicação, ou dashboard de performance por artigo.

## Plano

### 1. Nova rota `/dashboard/blog` com layout dedicado

Criar `src/pages/dashboard/blog/index.tsx` com tabs:
- **Artigos** — lista filtrada por `entity_type='blog'` com colunas específicas (título, autor, categoria, estado, views, AI score, data publicação)
- **Editor** — formulário completo de criação/edição de artigo
- **Calendário** — vista mensal dos artigos agendados/publicados
- **Analytics** — métricas específicas do blog (top artigos, views/dia, tempo médio leitura)

### 2. Componente `BlogArticlesList` 

Tabela avançada dedicada ao blog com:
- **Filtros**: estado (rascunho/publicado/arquivado), intenção, pesquisa por título
- **Colunas**: thumbnail (og_image), título + slug, estado, intenção, AI score, views, data publicação, acções
- **Acções rápidas**: publicar, despublicar, duplicar, eliminar, ver página pública, editar
- **Selecção bulk**: publicar/arquivar/eliminar em massa
- **Ordenação**: por views, data, AI score
- **Estado vazio**: CTA para criar primeiro artigo

### 3. Componente `BlogArticleEditor`

Formulário completo de criação/edição:
- **SEO**: título, meta description, H1, slug (auto-gerado), canonical URL
- **Conteúdo**: TL;DR, secções (heading + corpo + tipo), FAQs
- **Media**: imagem OG (upload ou URL), preview do card social
- **Configuração**: intenção, idioma, país, prioridade sitemap, frequência de alteração
- **Agendamento**: data/hora de publicação futura (published_at)
- **Geração IA**: botão para gerar conteúdo via `useGenerateSEOContent` pré-configurado para tipo blog
- **Preview**: visualização do artigo como ficará na página pública
- **Guardar**: rascunho ou publicar directamente

### 4. Componente `BlogCalendar`

Vista de calendário mensal:
- Cada dia mostra artigos publicados e agendados
- Cores por estado (rascunho=amarelo, publicado=verde, agendado=azul)
- Clicar num artigo abre o editor
- Arrastar para reagendar (actualiza `published_at`)

### 5. Componente `BlogAnalytics`

Dashboard com KPIs do blog:
- **Cards resumo**: total artigos, publicados, rascunhos, total views, AI score médio
- **Gráfico de views** por período (últimos 30 dias)
- **Top 10 artigos** por views
- **Artigos recentes** sem views (oportunidade de promoção)

### 6. Hooks dedicados

- `useBlogArticles(filters, pagination)` — wrapper de `useAdminSEOEntities` com `entityType: 'blog'` fixo
- `useBlogStats()` — métricas filtradas por blog
- `useSaveBlogArticle()` — mutation para criar/actualizar artigo com validação de campos obrigatórios
- `useDuplicateArticle()` — duplicar artigo existente com slug alterado

### 7. Rota e navegação

- Adicionar rota `/dashboard/blog` em `DashboardCoreRoutes.tsx`
- Proteger com `ModuleGuard` (módulo `seo-growth`)

## Ficheiros a criar/alterar

| Ficheiro | Acção |
|---|---|
| `src/pages/dashboard/blog/index.tsx` | Criar — página principal com tabs |
| `src/pages/dashboard/blog/BlogArticlesList.tsx` | Criar — tabela avançada de artigos |
| `src/pages/dashboard/blog/BlogArticleEditor.tsx` | Criar — editor completo de artigos |
| `src/pages/dashboard/blog/BlogCalendar.tsx` | Criar — calendário editorial |
| `src/pages/dashboard/blog/BlogAnalytics.tsx` | Criar — dashboard de métricas |
| `src/hooks/useBlogAdmin.ts` | Criar — hooks dedicados do blog |
| `src/routes/crm/DashboardCoreRoutes.tsx` | Alterar — adicionar rota `/dashboard/blog` |

## Critérios de Aceitação

- Lista de artigos com filtros, ordenação, paginação e acções bulk
- Editor completo com todos os campos SEO, conteúdo, media e agendamento
- Geração IA integrada no editor
- Calendário editorial funcional com vista mensal
- Dashboard com KPIs reais do blog
- Todos os estados tratados: loading, vazio, erro
- Responsivo e acessível

