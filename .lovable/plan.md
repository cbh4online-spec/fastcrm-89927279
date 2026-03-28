

# SEO & Growth — Diagnóstico e Correções

## Problemas Identificados

Após análise detalhada de todo o módulo (hooks, edge functions, páginas públicas, dashboard admin, base de dados), identifiquei **3 problemas críticos** que impedem o módulo de funcionar:

### 1. Pipeline de Tracking Quebrado (Analytics vazios)

A tabela `seo_page_analytics` tem **0 registos**. Causa raiz:

- As páginas públicas SEO (Keywords, Templates, etc.) usam `useTracking()` que apenas faz `pushToDataLayer()` — envia para GTM/GA4 mas **nunca chama a edge function `seo-track`**
- O hook `useSeoUxTracker` que realmente envia dados para `seo-track` → `seo_page_analytics` **não é usado em nenhuma página pública**
- O `useSeoUxTracker` tem um fallback de project ID errado: `xqepxufdrsuxlnubuatz` em vez de `eumnfkccyvlyoyjchiwe` — mesmo que fosse usado, falharia

**Resultado**: Todos os 6 dashboards de Analytics (Ativação, Keywords, Funil, Templates, UX, Growth) mostram "Sem dados de analytics".

### 2. Edge Function `generate-seo-content` com Variável Indefinida

Na linha 76, o código faz:
```typescript
const _gateWsId = typeof workspaceId !== 'undefined' ? workspaceId : (typeof workspace_id !== 'undefined' ? workspace_id : null);
```
As variáveis `workspaceId` e `workspace_id` não existem nesse escopo — o body é parsed na linha 73 mas o `workspace_id` nunca é extraído do body nem do request. A AI gate nunca é chamada (o `_gateWsId` é sempre `null`), e na linha 157 `workspace_id` é usado para `logAIUsage` mas também é undefined.

**Resultado**: A geração de conteúdo pode funcionar, mas sem controlo de créditos e sem logging de uso.

### 3. O hook `useGenerateSEOContent` não envia `workspace_id`

O componente `SEOContentGenerator` chama `generateContent()` que invoca a edge function, mas nunca inclui o `workspace_id` no body. A edge function não pode verificar quotas nem logar uso.

---

## Plano de Correção

### Correção 1: Integrar `useSeoUxTracker` nas Páginas Públicas

| Ficheiro | Mudança |
|---|---|
| `src/hooks/useSeoUxTracker.ts` | **Modificar** — Substituir fallback `xqepxufdrsuxlnubuatz` por usar `import.meta.env.VITE_SUPABASE_URL` diretamente (mais seguro que project ID) |
| `src/modules/growth-seo/components/layout/SEOPublicLayout.tsx` | **Modificar** — Adicionar `useSeoUxTracker` para tracking automático de page_view em todas as páginas públicas |
| `src/modules/growth-seo/components/pages/shared/CTASection.tsx` | **Modificar** — Chamar `trackCtaClick` quando o utilizador clica em CTAs |

### Correção 2: Fix `generate-seo-content` Edge Function

| Ficheiro | Mudança |
|---|---|
| `supabase/functions/generate-seo-content/index.ts` | **Modificar** — Extrair `workspace_id` do body do request. Usar para AI gate e logAIUsage |
| `src/modules/growth-seo/hooks/useGenerateSEOContent.ts` | **Modificar** — Passar `workspace_id` no body do invoke |

### Correção 3: Melhorar Empty States dos Analytics

| Ficheiro | Mudança |
|---|---|
| `src/pages/dashboard/seo/analytics/SEOActivationDashboard.tsx` | **Modificar** — Melhorar mensagem de empty state com instruções claras de como ativar tracking |
| `src/pages/dashboard/seo/analytics/index.tsx` | **Modificar** — Adicionar indicador visual de "tracking ativo/inativo" |

---

## Detalhes Técnicos

**Tracking URL fix**: Substituir a construção manual de URL (`https://${PROJECT_ID}.supabase.co/functions/v1/seo-track`) por `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/seo-track` — que é o padrão correto usado em todo o resto do projeto.

**SEOPublicLayout tracking**: Como todas as páginas públicas já usam o `SEOPublicLayout`, basta adicionar o tracker nesse componente para cobrir automaticamente todas as páginas públicas sem modificar cada página individualmente.

**workspace_id flow**: O `SEOContentGenerator` já tem `currentWorkspace?.id` — basta passá-lo no `generateContent()` call, e na edge function extraí-lo do body.

