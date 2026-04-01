

## B3 + B4 — Decomposição do StoreAnalyticsPage e StoreSettingsPage

### Diagnóstico

**StoreAnalyticsPage.tsx** — 1073 linhas. Contém 8 tabs inline (overview, sales, products, customers, coupons, carts, inventory, financial) + 6 sub-componentes auxiliares (KPICard, DualTooltip, StatusTooltip, RecentOrdersTable, SalesHeatmap, WeekdayChart). Tudo num ficheiro.

**StoreSettingsPage.tsx** — 629 linhas. Contém 11 tabs, com as tabs general (120+ linhas inline), branding (170+ linhas inline) e notifications inline. As restantes delegam para managers existentes. Inclui lógica de upload, geração IA de banner/cores, validação de slug — tudo inline.

---

### Plano B3 — StoreAnalyticsPage → Tab Components

Criar `src/components/store/analytics/`:

| Ficheiro | Conteúdo extraído |
|----------|------------------|
| `KPICard.tsx` | Componente KPICard reutilizável (linhas 890-923) |
| `AnalyticsChartHelpers.tsx` | DualTooltip, StatusTooltip, constantes (CHART_COLORS, PIE_COLORS, DAY_NAMES, statusLabels, fadeIn) |
| `StoreOverviewTab.tsx` | KPIs grid + Revenue/Orders chart + Top Products + Recent Orders (linhas 178-280) |
| `StoreSalesTab.tsx` | Status breakdown chart + Heatmap + Weekday chart (linhas 282-343). Inclui SalesHeatmap e WeekdayChart como sub-componentes internos |
| `StoreProductsTab.tsx` | Tabela de performance de produtos (linhas 345-428) |
| `StoreCustomersTab.tsx` | Pie novos/recorrentes + Top clientes (linhas 430-525) |
| `StoreCouponsTab.tsx` | Tabela de cupões (linhas 527-580) |
| `StoreInventoryTab.tsx` | Donut stock + Alertas (linhas 582-687) |
| `StoreFinancialTab.tsx` | Funnel + LTV + Bundle revenue (linhas 688-876) |
| `StoreAnalyticsShell.tsx` | Header + period selector + custom date picker + Tabs container que compõe os tab components |

Refatorar `StoreAnalyticsPage.tsx` para ~30 linhas: DashboardLayout + Helmet + StoreAnalyticsShell.

RecentOrdersTable move para dentro de `StoreOverviewTab.tsx` como sub-componente local.

---

### Plano B4 — StoreSettingsPage → Secções Independentes

Criar `src/components/store-settings/sections/`:

| Ficheiro | Conteúdo extraído |
|----------|------------------|
| `StoreIdentitySettings.tsx` | Nome, descrição (com AI assist), slug, domínio, footer, toggles categorias/pesquisa (linhas 267-397). Recebe `form` + `setForm` + handlers como props |
| `StoreBrandingSettings.tsx` | Logo upload, banner upload/AI, cores/AI (linhas 399-568). Recebe `form` + `setForm` + handlers |
| `StoreNotificationSettings.tsx` | Email de notificação (linhas 570-591). Recebe `form` + `setForm` |
| `StoreGrowthSettings.tsx` | Compõe CrmOffersManager, StoreFaqManager, StoreLoyaltyManager, StoreReferralManager, StoreOffersManager, StoreGiftCardsManager em secção unificada com sub-tabs ou accordion |

Refatorar `StoreSettingsPage.tsx` para ~120 linhas: mantém form state, useEffect de sync, handleSave, handleFileUpload, handleGenerateBanner, handleSuggestColors no page (são necessários para o save global), mas delega UI para secções.

As tabs shipping, crm-offers, faq, loyalty, referrals, offers, gift-cards já delegam para managers — serão agrupadas sob "Crescimento" via StoreGrowthSettings. Marketplace mantém StoreC2CSettings direto.

Tabs finais simplificadas: Geral, Branding, Notificações, Envio, Crescimento, Marketplace.

---

### Ficheiros a Criar

**B3:**
- `src/components/store/analytics/KPICard.tsx`
- `src/components/store/analytics/AnalyticsChartHelpers.tsx`
- `src/components/store/analytics/StoreOverviewTab.tsx`
- `src/components/store/analytics/StoreSalesTab.tsx`
- `src/components/store/analytics/StoreProductsTab.tsx`
- `src/components/store/analytics/StoreCustomersTab.tsx`
- `src/components/store/analytics/StoreCouponsTab.tsx`
- `src/components/store/analytics/StoreInventoryTab.tsx`
- `src/components/store/analytics/StoreFinancialTab.tsx`
- `src/components/store/analytics/StoreAnalyticsShell.tsx`

**B4:**
- `src/components/store-settings/sections/StoreIdentitySettings.tsx`
- `src/components/store-settings/sections/StoreBrandingSettings.tsx`
- `src/components/store-settings/sections/StoreNotificationSettings.tsx`
- `src/components/store-settings/sections/StoreGrowthSettings.tsx`

### Ficheiros a Refatorar

| Ficheiro | De | Para |
|----------|----|------|
| `StoreAnalyticsPage.tsx` | 1073 | ~30 |
| `StoreSettingsPage.tsx` | 629 | ~120 |

### Sem alterações a
- Rotas
- `useStoreAnalytics.ts`
- Managers existentes (ShippingMethodsManager, etc.)
- Schema de base de dados

### Riscos
- Props drilling nas settings sections — mitigado passando form+setForm como props (padrão já usado)
- Analytics tabs dependem de queries do hook `useStoreAnalytics` — passadas como props do Shell para cada tab

### Critérios de Aceitação
- Todas as 8 tabs de analytics funcionam como antes
- Todas as 11 tabs de settings funcionam como antes (agrupadas em 6)
- KPICard reutilizável por outros módulos
- Nenhuma rota quebrada
- Nenhuma funcionalidade removida

