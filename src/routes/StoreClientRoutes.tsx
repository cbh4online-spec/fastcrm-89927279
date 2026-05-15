import { lazy } from "react";
import { Route, Navigate } from "react-router-dom";
import { CartProvider } from "@/contexts/CartContext";
import { StoreCartProvider } from "@/contexts/StoreCartContext";
import { Routes } from "react-router-dom";

// Store pages (public)
const StorePage = lazy(() => import("@/pages/store/StorePage"));
const StoreProductPage = lazy(() => import("@/pages/store/StoreProductPage"));
const StoreCheckoutPage = lazy(() => import("@/pages/store/StoreCheckoutPage"));
const StoreSuccessPage = lazy(() => import("@/pages/store/StoreSuccessPage"));
const StoreCancelPage = lazy(() => import("@/pages/store/StoreCancelPage"));
const StoreWishlistPage = lazy(() => import("@/pages/store/StoreWishlistPage"));
const StoreOrderHistoryPage = lazy(() => import("@/pages/store/StoreOrderHistoryPage"));
const StoreDigitalAssetsPage = lazy(() => import("@/pages/store/StoreDigitalAssetsPage"));
const StoreLoyaltyPage = lazy(() => import("@/pages/store/StoreLoyaltyPage"));
const StoreReferralPage = lazy(() => import("@/pages/store/StoreReferralPage"));
const StoreGiftCardsPage = lazy(() => import("@/pages/store/StoreGiftCardsPage"));
const StoreOrderTrackingPage = lazy(() => import("@/pages/store/StoreOrderTrackingPage"));

// Store admin pages (dashboard)
const StoreOrdersPage = lazy(() => import("@/pages/StoreOrdersPage"));
const StoreOrderDetailPage = lazy(() => import("@/pages/StoreOrderDetailPage"));
const StoreSettingsPage = lazy(() => import("@/pages/StoreSettingsPage"));
const StoreProductsAdminPage = lazy(() => import("@/pages/StoreProductsAdminPage"));
const StoreCategoriesPage = lazy(() => import("@/pages/StoreCategoriesPage"));
const StoreCouponsPage = lazy(() => import("@/pages/StoreCouponsPage"));
const StoreReviewsPage = lazy(() => import("@/pages/StoreReviewsPage"));
const StoreAnalyticsPage = lazy(() => import("@/pages/StoreAnalyticsPage"));
const StoreReturnsPage = lazy(() => import("@/pages/StoreReturnsPage"));
const ProductCatalogListPage = lazy(() => import("@/pages/ProductCatalogListPage"));
const ProductCatalogEditorPage = lazy(() => import("@/pages/ProductCatalogEditorPage"));

// Client portal pages
const ClientLoginPage = lazy(() => import("@/pages/client/ClientLoginPage"));
const ClientDashboardPage = lazy(() => import("@/pages/client/ClientDashboardPage"));
const ClientCatalogPage = lazy(() => import("@/pages/client/ClientCatalogPage"));
const ClientCartPage = lazy(() => import("@/pages/client/ClientCartPage"));
const ClientCheckoutPage = lazy(() => import("@/pages/client/ClientCheckoutPage"));
const ClientOrdersPage = lazy(() => import("@/pages/client/ClientOrdersPage"));
const ClientOrderDetailPage = lazy(() => import("@/pages/client/ClientOrderDetailPage"));
const ClientFavoritesPage = lazy(() => import("@/pages/client/ClientFavoritesPage"));
const ClientAssistantPage = lazy(() => import("@/pages/client/ClientAssistantPage"));
const ClientSetPasswordPage = lazy(() => import("@/pages/client/ClientSetPasswordPage"));
const ClientForgotPasswordPage = lazy(() => import("@/pages/client/ClientForgotPasswordPage"));
const ClientResetPasswordPage = lazy(() => import("@/pages/client/ClientResetPasswordPage"));
const ClientTeamPage = lazy(() => import("@/pages/client/ClientTeamPage"));
const ClientApprovalsPage = lazy(() => import("@/pages/client/ClientApprovalsPage"));
const ClientInvoicesPage = lazy(() => import("@/pages/client/ClientInvoicesPage"));
const ClientFinancialPage = lazy(() => import("@/pages/client/ClientFinancialPage"));
const ClientContractsPage = lazy(() => import("@/pages/client/ClientContractsPage"));
const ClientSupportPage = lazy(() => import("@/pages/client/ClientSupportPage"));
const ClientTicketDetailPage = lazy(() => import("@/pages/client/ClientTicketDetailPage"));
const ClientInvitePage = lazy(() => import("@/pages/client/ClientInvitePage"));
const ClientDiagnosisPage = lazy(() => import("@/pages/client/ClientDiagnosisPage"));
const ClientDiagnosisDetailPage = lazy(() => import("@/pages/client/ClientDiagnosisDetailPage"));
const ClientProtocolDetailPage = lazy(() => import("@/pages/client/ClientProtocolDetailPage"));
const ClientConsumptionPage = lazy(() => import("@/pages/client/ClientConsumptionPage"));
const ClientRankingsPage = lazy(() => import("@/pages/client/ClientRankingsPage"));
const ClientSecurityPage = lazy(() => import("@/pages/client/ClientSecurityPage"));

// B2B admin pages
const OrderNotesPage = lazy(() => import("@/pages/OrderNotesPage"));
const CreateOrderNotePage = lazy(() => import("@/pages/CreateOrderNotePage"));
const QuickOrderPage = lazy(() => import("@/pages/QuickOrderPage"));
const OrderNoteDetailPage = lazy(() => import("@/pages/OrderNoteDetailPage"));
const OrderApprovalsPage = lazy(() => import("@/pages/OrderApprovalsPage"));
const B2BOrderApprovalsPage = lazy(() => import("@/pages/B2BOrderApprovalsPage"));
const ClientUsersPage = lazy(() => import("@/pages/ClientUsersPage"));
const B2BPortalSettingsPage = lazy(() => import("@/pages/B2BPortalSettingsPage"));
const B2BStockPage = lazy(() => import("@/pages/B2BStockPage"));
const B2BPromotionsPage = lazy(() => import("@/pages/B2BPromotionsPage"));
const B2BFunnelPage = lazy(() => import("@/pages/B2BFunnelPage"));
const IfthenpaySettingsPage = lazy(() => import("@/pages/IfthenpaySettingsPage"));
const PaymentGatewaysPage = lazy(() => import("@/pages/settings/PaymentGatewaysPage"));

export function StoreRoutes() {
  return (
    <StoreCartProvider>
      <Routes>
        <Route path=":workspaceSlug" element={<StorePage />} />
        <Route path=":workspaceSlug/product/:productId" element={<StoreProductPage />} />
        <Route path=":workspaceSlug/checkout" element={<StoreCheckoutPage />} />
        <Route path=":workspaceSlug/success" element={<StoreSuccessPage />} />
        <Route path=":workspaceSlug/cancel" element={<StoreCancelPage />} />
        <Route path=":workspaceSlug/wishlist" element={<StoreWishlistPage />} />
        <Route path=":workspaceSlug/orders" element={<StoreOrderHistoryPage />} />
        <Route path=":workspaceSlug/downloads" element={<StoreDigitalAssetsPage />} />
        <Route path=":workspaceSlug/loyalty" element={<StoreLoyaltyPage />} />
        <Route path=":workspaceSlug/referrals" element={<StoreReferralPage />} />
        <Route path=":workspaceSlug/gift-cards" element={<StoreGiftCardsPage />} />
        <Route path=":workspaceSlug/order/:orderId" element={<StoreOrderTrackingPage />} />
      </Routes>
    </StoreCartProvider>
  );
}

export function ClientPortalRoutes() {
  return (
    <CartProvider>
      <Routes>
        <Route path="login" element={<ClientLoginPage />} />
        <Route path="invite/:token" element={<ClientInvitePage />} />
        <Route path="set-password" element={<ClientSetPasswordPage />} />
        <Route path="forgot-password" element={<ClientForgotPasswordPage />} />
        <Route path="reset-password" element={<ClientResetPasswordPage />} />
        <Route path="dashboard" element={<ClientDashboardPage />} />
        <Route path="catalog" element={<ClientCatalogPage />} />
        <Route path="cart" element={<ClientCartPage />} />
        <Route path="checkout" element={<ClientCheckoutPage />} />
        <Route path="orders" element={<ClientOrdersPage />} />
        <Route path="orders/:id" element={<ClientOrderDetailPage />} />
        <Route path="favorites" element={<ClientFavoritesPage />} />
        <Route path="assistant" element={<ClientAssistantPage />} />
        <Route path="team" element={<ClientTeamPage />} />
        <Route path="approvals" element={<ClientApprovalsPage />} />
        <Route path="invoices" element={<ClientInvoicesPage />} />
        <Route path="financial" element={<ClientFinancialPage />} />
        <Route path="contracts" element={<ClientContractsPage />} />
        <Route path="support" element={<ClientSupportPage />} />
        <Route path="support/:ticketId" element={<ClientTicketDetailPage />} />
        <Route path="diagnosis" element={<ClientDiagnosisPage />} />
        <Route path="diagnosis/:slug" element={<ClientDiagnosisDetailPage />} />
        <Route path="protocol/:id" element={<ClientProtocolDetailPage />} />
        <Route path="insights/consumption" element={<ClientConsumptionPage />} />
        <Route path="insights/rankings" element={<ClientRankingsPage />} />
        <Route path="security" element={<ClientSecurityPage />} />
        <Route path="*" element={<Navigate to="/client/login" replace />} />
      </Routes>
    </CartProvider>
  );
}

export function StoreAdminRoutes() {
  return (
    <>
      <Route path="/dashboard/store-orders" element={<StoreOrdersPage />} />
      <Route path="/dashboard/store-orders/:id" element={<StoreOrderDetailPage />} />
      <Route path="/dashboard/store-settings" element={<StoreSettingsPage />} />
      <Route path="/dashboard/store-products" element={<StoreProductsAdminPage />} />
      <Route path="/dashboard/store-categories" element={<StoreCategoriesPage />} />
      <Route path="/dashboard/store-coupons" element={<StoreCouponsPage />} />
      <Route path="/dashboard/store-reviews" element={<StoreReviewsPage />} />
      <Route path="/dashboard/store-analytics" element={<StoreAnalyticsPage />} />
      <Route path="/dashboard/store-returns" element={<StoreReturnsPage />} />
      <Route path="/dashboard/store-catalogs" element={<ProductCatalogListPage />} />
      <Route path="/dashboard/store-catalogs/:id/edit" element={<ProductCatalogEditorPage />} />
    </>
  );
}

export function B2BAdminRoutes() {
  return (
    <>
      <Route path="/dashboard/order-notes" element={<OrderNotesPage />} />
      <Route path="/dashboard/order-notes/create" element={<CreateOrderNotePage />} />
      <Route path="/dashboard/order-notes/quick" element={<QuickOrderPage />} />
      <Route path="/dashboard/order-notes/:id" element={<OrderNoteDetailPage />} />
      <Route path="/dashboard/order-approvals" element={<OrderApprovalsPage />} />
      <Route path="/dashboard/b2b/approvals" element={<B2BOrderApprovalsPage />} />
      <Route path="/dashboard/client-users" element={<ClientUsersPage />} />
      <Route path="/dashboard/b2b-clients" element={<ClientUsersPage />} />
      <Route path="/dashboard/b2b/clients" element={<ClientUsersPage />} />
      <Route path="/dashboard/b2b/users" element={<ClientUsersPage />} />
      <Route path="/dashboard/b2b/plans" element={<B2BPortalSettingsPage />} />
      <Route path="/dashboard/b2b-portal" element={<B2BPortalSettingsPage />} />
      <Route path="/dashboard/b2b-config" element={<B2BPortalSettingsPage />} />
      <Route path="/dashboard/b2b-stock" element={<B2BStockPage />} />
      <Route path="/dashboard/b2b/promotions" element={<B2BPromotionsPage />} />
      <Route path="/dashboard/b2b-promotions" element={<B2BPromotionsPage />} />
      <Route path="/dashboard/b2b/funnel" element={<B2BFunnelPage />} />
      <Route path="/dashboard/b2b-funnel" element={<B2BFunnelPage />} />
      <Route path="/dashboard/integrations/ifthenpay" element={<IfthenpaySettingsPage />} />
      <Route path="/settings/payment-gateways" element={<PaymentGatewaysPage />} />
    </>
  );
}
