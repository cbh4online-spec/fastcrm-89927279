
# Criar página pública /pricing

## Diagnóstico
A rota `/pricing` não existe — retorna 404. O footer SEO já linka para `/pricing`. Já existe o componente `LandingPricingSection` usado na landing page principal, que mostra planos (Starter, Growth, Scale) e bundles, com dados da DB ou fallback.

## Plano

### 1. Criar página `src/pages/PricingPage.tsx`
- Página pública standalone com SEO (Helmet)
- Reutilizar `LandingStickyHeader` + `SEOFooter` para manter consistência visual
- Reutilizar `LandingPricingSection` como secção principal
- Adicionar secção de FAQ específica de preços
- Adicionar CTA final

### 2. Registar rota em `DashboardCoreRoutes.tsx`
- Adicionar `<Route path="/pricing" element={<PricingPage />} />` junto das rotas públicas

### Ficheiros alterados
- **Novo**: `src/pages/PricingPage.tsx`
- **Editado**: `src/routes/crm/DashboardCoreRoutes.tsx` (adicionar rota)
