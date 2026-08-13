# Voltar ao menu nas páginas de Checkout

## Diagnóstico
As páginas do módulo Checkout (`/dashboard/checkout` e sub-páginas) são registadas em `src/routes/CheckoutRoutes.tsx` sem qualquer envolvente de layout, e nenhuma delas usa `DashboardLayout` internamente (confirmado por busca). Resultado: renderizam a página "nua", sem barra lateral nem topbar — por isso não há forma de voltar ao menu, tal como no ecrã enviado.

O padrão do projeto (ex. `EquipmentUnitDetailPage`) é a própria página envolver o conteúdo em `DashboardLayout`.

## O que fazer
1. Envolver em `DashboardLayout` as 9 páginas do módulo Checkout:
   - `CheckoutFunnelsPage`, `CheckoutFunnelDetailPage`, `CheckoutOffersPage`, `AbandonedCartsPage`, `CheckoutBundlesPage`, `CheckoutAnalyticsPage`, `ABTestsPage`, `DynamicDiscountsPage`, `RecoveryMetricsPage`.
   - Assim voltam a ter barra lateral, topbar e navegação normal do dashboard.
2. Na página de detalhe do funil, adicionar um botão "Funis de checkout" (ícone `ArrowLeft`, `variant="ghost"`) no topo, a apontar para `/dashboard/checkout` — mesmo padrão visual usado nas fichas de detalhe existentes.

## Notas técnicas
- Alteração puramente de apresentação: nenhuma query, hook ou lógica de negócio é tocada.
- Manter os paddings atuais das páginas para não duplicar espaçamento dentro do layout.

## Critérios de aceitação
- Entrar em `/dashboard/checkout` mostra a barra lateral e permite navegar para qualquer outro menu.
- Todas as sub-páginas de Checkout mostram o layout do dashboard.
- No detalhe de um funil existe um botão claro para regressar à lista de funis.
