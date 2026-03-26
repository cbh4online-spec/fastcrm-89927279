import { lazy } from "react";
import { Route, Routes, Navigate } from "react-router-dom";
import { CartProvider } from "@/contexts/CartContext";

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
