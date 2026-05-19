import { Suspense, lazy } from "react";
import { Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { WorkspaceProvider } from "@/contexts/WorkspaceContext";
import { WorkspaceInstanceProvider } from "@/contexts/WorkspaceInstanceContext";
import { SubscriptionProvider } from "@/contexts/SubscriptionContext";
import { ActivityProfileProvider } from "@/contexts/ActivityProfileContext";
import { EnrichmentProcessorProvider } from "@/contexts/EnrichmentProcessorContext";
import { GDPRBanner } from "@/modules/growth-seo";
import { EnrichmentFloatingIndicator } from "@/components/enrichment/EnrichmentFloatingIndicator";
import { ActivationProvider } from "@/features/activation/components/ActivationProvider";
import { OnboardingShortcutProvider } from "@/components/onboarding/OnboardingShortcutProvider";

// Route modules
import { SecurityRoutes } from "@/routes/SecurityRoutes";
import { ProcurementRoutes } from "@/routes/ProcurementRoutes";
import { HelpdeskRoutes } from "@/routes/HelpdeskRoutes";
import { TicketsRoutes } from "@/routes/TicketsRoutes";
import { HRRoutes } from "@/routes/HRRoutes";
import { C2CDashboardRoutes } from "@/routes/C2CRoutes";
import { AffiliateRoutes } from "@/routes/AffiliateRoutes";
import { AccountBriefRoutes } from "@/routes/AccountBriefRoutes";
import { PerformanceRoutes } from "@/routes/PerformanceRoutes";
import { CheckoutAdminRoutes } from "@/routes/CheckoutRoutes";
import { ReportsRoutes } from "@/routes/ReportsRoutes";
import { StudentJourneyRoutes } from "@/routes/StudentJourneyRoutes";
import { RevenueFlightControlRoutes } from "@/routes/RevenueFlightControlRoutes";
import { AIRoutes } from "@/routes/AIRoutes";
import { SalesCRMRoutes } from "@/routes/SalesCRMRoutes";
import { MetaModuleRoutes } from "@/routes/MetaModuleRoutes";
import { StoreAdminRoutes, B2BAdminRoutes } from "@/routes/StoreClientRoutes";


// CRM sub-modules
import { PublicSeoRoutes } from "@/routes/crm/PublicSeoRoutes";
import { DashboardCoreRoutes } from "@/routes/crm/DashboardCoreRoutes";
import { RevenueCommerceRoutes } from "@/routes/crm/RevenueCommerceRoutes";
import { VerticalOpsRoutes } from "@/routes/crm/VerticalOpsRoutes";

const ReportsKPIs = lazy(() => import("@/pages/ReportsKPIs"));
const BuilderHubPage = lazy(() => import("@/pages/builder/BuilderHubPage"));
const BuilderAssetEditorPage = lazy(() => import("@/pages/builder/BuilderAssetEditorPage"));
const MessagesPage = lazy(() => import("@/pages/MessagesPage"));

const PageLoader = () => (
  <div className="flex items-center justify-center min-h-screen">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
  </div>
);

export default function CRMRoutesV2() {
  return (
    <AuthProvider>
      <WorkspaceProvider>
        <ActivityProfileProvider>
          <WorkspaceInstanceProvider>
            <SubscriptionProvider>
              <EnrichmentProcessorProvider>
                <Suspense fallback={<PageLoader />}>
                  <Routes>
                    {/* Mensageria interna - rota explícita para preceder catch-alls */}
                    <Route path="/messages" element={<MessagesPage />} />
                    {PublicSeoRoutes()}
                    {DashboardCoreRoutes()}
                    {SalesCRMRoutes()}
                    {MetaModuleRoutes()}
                    {AIRoutes()}
                    <Route path="/dashboard/kpis" element={<ReportsKPIs />} />
                    <Route path="/dashboard/builder" element={<BuilderHubPage />} />
                    <Route path="/dashboard/builder/:id" element={<BuilderAssetEditorPage />} />
                    {ReportsRoutes()}
                    {AccountBriefRoutes()}
                    {RevenueFlightControlRoutes()}
                    {PerformanceRoutes()}
                    {ProcurementRoutes()}
                    {SecurityRoutes()}
                    {StudentJourneyRoutes()}
                    {CheckoutAdminRoutes()}
                    {C2CDashboardRoutes()}
                    {AffiliateRoutes()}
                    {StoreAdminRoutes()}
                    {B2BAdminRoutes()}
                    {HelpdeskRoutes()}
                    {TicketsRoutes()}
                    {HRRoutes()}
                    {RevenueCommerceRoutes()}
                    {VerticalOpsRoutes()}
                    
                  </Routes>
                </Suspense>
                <EnrichmentFloatingIndicator />
                <ActivationProvider />
                <OnboardingShortcutProvider />
                <GDPRBanner />
              </EnrichmentProcessorProvider>
            </SubscriptionProvider>
          </WorkspaceInstanceProvider>
        </ActivityProfileProvider>
      </WorkspaceProvider>
    </AuthProvider>
  );
}
