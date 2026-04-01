

# Plano: Juntar Landing Pages com Funis numa Página Combinada

## Resumo

Criar uma nova página unificada "Conversão" (ou "Funis & Landing Pages") que combina ambos os conteúdos via tabs, com um único item na sidebar.

## Alterações

| Ficheiro | Acção |
|---|---|
| `src/pages/ConversionHub.tsx` | **Criar** — nova página com `DashboardLayout` + `Tabs` contendo tab "Funis" (renderiza `FunnelsList`) e tab "Landing Pages" (renderiza `LandingPagesList`) |
| `src/config/routeManifest.ts` | **Editar** — substituir as 2 entradas (`funnels` + `landing-pages`) por 1 entrada `conversion-hub` com label "Funis & Landing Pages", href `/dashboard/conversion`, ícone `Workflow`, grupo `marketing` |
| `src/routes/sales/MarketingRoutes.tsx` | **Editar** — substituir as 2 rotas por 1 rota `/dashboard/conversion` apontando para `ConversionHub`. Manter rotas antigas como redirects para `/dashboard/conversion` (compatibilidade) |

## Detalhe Tecnico

### Nova página `ConversionHub.tsx`
- Tabs com valor controlado via query param `?tab=funnels|landing-pages` (default: `funnels`)
- Tab "Funis" renderiza `<FunnelsList />` directamente
- Tab "Landing Pages" renderiza `<LandingPagesList />` directamente
- Header com titulo "Funis & Landing Pages" e descrição contextual

### Route Manifest
- Remover entradas `funnels` e `landing-pages`
- Adicionar `conversion-hub` com `visibleInSidebar: true`
- Manter as entradas antigas como `visibleInSidebar: false` para que links/bookmarks antigos continuem a funcionar na pesquisa

### Rotas
- Nova rota principal: `/dashboard/conversion`
- Redirects de compatibilidade: `/dashboard/funnels` → `/dashboard/conversion?tab=funnels`, `/dashboard/landing-pages` → `/dashboard/conversion?tab=landing-pages`

## Impacto
- Apenas 3 ficheiros alterados/criados
- Sem alterações de dados ou backend
- Componentes `FunnelsList` e `LandingPagesList` reutilizados sem modificação

