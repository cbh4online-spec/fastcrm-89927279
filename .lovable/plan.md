
# Adicionar Titulos/Descricoes com IA + Tab de Analiticas Bio

## 1. Gerar Titulos e Descricoes com IA (BioSettingsTab)

Adicionar botao "Gerar com IA" nos campos SEO Title e SEO Description do `BioSettingsTab`, reutilizando a mesma logica da edge function existente mas com uma nova edge function dedicada.

### Nova Edge Function: `supabase/functions/bio-seo-copy/index.ts`
- Recebe: `pageName`, `vertical` (descricao da pagina)
- Usa Gemini 3 Flash com tool calling para gerar structured output:
  - `seo_title`: titulo SEO optimizado (max 60 chars)
  - `seo_description`: meta description persuasiva (max 155 chars)
- Trata erros 429/402

### Registar no `supabase/config.toml`
- Adicionar `[functions.bio-seo-copy]` com `verify_jwt = false`

### Actualizar `src/components/bio/tabs/BioSettingsTab.tsx`
- Importar `Sparkles`, `Loader2` de lucide-react
- Adicionar botao "Gerar com IA" no card SEO que chama a edge function
- Preenche automaticamente os campos `seo_title` e `seo_description`
- Loading state com spinner

## 2. Tab de Analiticas

As tabelas `bio_analytics_daily` e `bio_events` ja existem na base de dados com colunas para views, uniques, clicks, leads, purchases, revenue, top_links e top_sources -- mas nao ha nenhum componente que as consuma.

### Novo ficheiro: `src/components/bio/tabs/BioAnalyticsTab.tsx`
- Recebe `pageId` como prop
- Busca dados de `bio_analytics_daily` dos ultimos 30 dias
- Busca contagem de eventos de `bio_events` agrupados por `event_type`
- Exibe:
  - 4 KPI cards no topo: Total Views, Uniques, Clicks, Leads
  - Grafico de linha (recharts) com views/uniques por dia
  - Tabela de top links (do campo `top_links` JSONB)
  - Tabela de top sources/referrers (do campo `top_sources` JSONB)

### Actualizar `src/components/bio/BioPageBuilder.tsx`
- Adicionar nova tab "Analiticas" com icone `BarChart3`
- Renderizar `BioAnalyticsTab` no `TabsContent`

## Ficheiros alterados/criados

| Ficheiro | Accao |
|----------|-------|
| `supabase/functions/bio-seo-copy/index.ts` | Criar |
| `supabase/config.toml` | Editar (registar funcao) |
| `src/components/bio/tabs/BioSettingsTab.tsx` | Editar (botao IA) |
| `src/components/bio/tabs/BioAnalyticsTab.tsx` | Criar |
| `src/components/bio/BioPageBuilder.tsx` | Editar (nova tab) |
