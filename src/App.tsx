const BUILD_VERSION = "v20260313-2130";

import { Suspense, lazy } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { BrowserRouter, Routes, Route, Navigate, useParams } from "react-router-dom";
import { NuqsAdapter } from "nuqs/adapters/react";
import { HelmetProvider } from "react-helmet-async";
import { ThemeProvider } from "next-themes";
import { AuthProvider } from "@/contexts/AuthContext";
import { StoreCartProvider } from "@/contexts/StoreCartContext";
import { ChunkErrorBoundary } from "@/components/ChunkErrorBoundary";

import { GTMProvider, MetaPixelLoader } from "./modules/growth-seo";

// Standalone route modules
import { StoreRoutes } from "@/routes/StoreRoutes";
import { ClientPortalRoutes } from "@/routes/ClientPortalRoutes";
import { PartnerRoutes } from "@/routes/PartnerRoutes";
import CRMRoutesV2 from "@/routes/CRMRoutes";
import { FastClubPortalRoutes } from "@/routes/FastClubRoutes";

// Lazy-loaded pages (top-level public only)
const PublicFunnelPage = lazy(() => import("@/pages/PublicFunnelPage"));
const PublicBioPage = lazy(() => import("@/pages/PublicBioPage"));
const BuilderPublicPage = lazy(() => import("@/pages/builder/BuilderPublicPage"));
const PublicBioShortLink = lazy(() => import("@/pages/PublicBioShortLink"));
const C2CPublicMarketplace = lazy(() => import("@/pages/c2c/C2CPublicMarketplace"));
const C2CPublicLivestreamViewer = lazy(() => import("@/pages/c2c/C2CPublicLivestreamViewer"));
const C2CPublicLivesGallery = lazy(() => import("@/pages/c2c/C2CPublicLivesGallery"));
const C2CPublicGoLiveSetup = lazy(() => import("@/pages/c2c/C2CPublicGoLiveSetup"));
const C2CPublicListingDetail = lazy(() => import("@/pages/c2c/C2CPublicListingDetail"));
const C2CPublicCategoryPage = lazy(() => import("@/pages/c2c/C2CPublicCategoryPage"));
const C2CPublicSearchPage = lazy(() => import("@/pages/c2c/C2CPublicSearchPage"));
const C2CSellerRegistration = lazy(() => import("@/pages/c2c/C2CSellerRegistration"));
const C2CSponsorPortal = lazy(() => import("@/pages/c2c/C2CSponsorPortal"));
const C2CSellerInviteActivation = lazy(() => import("@/pages/c2c/C2CSellerInviteActivation"));
const C2CPublicSellerProfile = lazy(() => import("@/pages/c2c/C2CPublicSellerProfile"));
const GlobalLivesDiscovery = lazy(() => import("@/pages/c2c/GlobalLivesDiscovery"));
const GlobalLiveViewer = lazy(() => import("@/pages/c2c/GlobalLiveViewer"));
const LiveStudio = lazy(() => import("@/pages/c2c/LiveStudio"));
const CheckoutPage = lazy(() => import("@/pages/checkout/CheckoutPage"));
const UpsellPage = lazy(() => import("@/pages/checkout/UpsellPage"));
const DownsellPage = lazy(() => import("@/pages/checkout/DownsellPage"));
const ThankYouPage = lazy(() => import("@/pages/checkout/ThankYouPage"));
const RecoverCartPage = lazy(() => import("@/pages/checkout/RecoverCartPage"));
const SupplierPortalPage = lazy(() => import("@/pages/procurement/SupplierPortalPage"));
const FastClubLandingPage = lazy(() => import("@/pages/fastclub/FastClubLandingPage"));
const FastClubApplyPage = lazy(() => import("@/pages/fastclub/FastClubApplyPage"));
const PublicCommunityPage = lazy(() => import("@/pages/community/PublicCommunityPage"));
const PublicCommunityTopicPage = lazy(() => import("@/pages/community/PublicCommunityTopicPage"));
const CommunityAuthPage = lazy(() => import("@/pages/community/CommunityAuthPage"));
const PublicBookingPage = lazy(() => import("@/pages/PublicBookingPage"));
const PitchPublicView = lazy(() => import("@/pages/dashboard/PitchPublicView"));
const PublicEbookPage = lazy(() => import("@/pages/PublicEbookPage"));
const PublicEbookShortLink = lazy(() => import("@/pages/PublicEbookShortLink"));
const PublicTicketPortalPage = lazy(() => import("@/pages/PublicTicketPortalPage"));
const PublicProposalPortalPage = lazy(() => import("@/pages/PublicProposalPortalPage"));
const PublicOnboardingPortalPage = lazy(() => import("@/pages/PublicOnboardingPortalPage"));
const CareersPage = lazy(() => import("@/pages/public/CareersPage"));
const JobDetailPublicPage = lazy(() => import("@/pages/public/JobDetailPublicPage"));
const PortalRegisterPage = lazy(() => import("@/pages/public/PortalRegisterPage"));
const PortalLoginPage = lazy(() => import("@/pages/public/PortalLoginPage"));
const InstallPage = lazy(() => import("@/pages/InstallPage"));
const PortalDashboardPage = lazy(() => import("@/pages/public/PortalDashboardPage"));
const WorkerRegisterPage = lazy(() => import("@/pages/public/WorkerRegisterPage"));
const WorkerDashboardPage = lazy(() => import("@/pages/public/WorkerDashboardPage"));
const PublicInvoicePayPage = lazy(() => import("@/pages/public/PublicInvoicePayPage"));
const LeadChefLanding = lazy(() => import("@/pages/LeadChefLanding"));
const LeadChefPricingPage = lazy(() => import("@/pages/LeadChefPricingPage"));

// FastCRM V2 — premium app shell preview
const DashboardV2Page = lazy(() => import("@/pages/app-v2/DashboardV2Page"));

// Marketing public pages
const MarketingLayout = lazy(() => import("@/marketing/layout/MarketingLayout"));
const MarketingPricingPage = lazy(() => import("@/marketing/pages/MarketingPricingPage"));
const MarketingFeaturesIndexPage = lazy(() => import("@/marketing/pages/MarketingFeaturesIndexPage"));
const MarketingCasesPage = lazy(() => import("@/marketing/pages/MarketingCasesPage"));
const MarketingAboutPage = lazy(() => import("@/marketing/pages/MarketingAboutPage"));
const MarketingContactPage = lazy(() => import("@/marketing/pages/MarketingContactPage"));
// /lp/:workspaceSlug/:pageSlug → redirect to canonical /p/:workspaceSlug/:pageSlug
function LandingPageAliasRedirect() {
  const { workspaceSlug, pageSlug } = useParams();
  return <Navigate to={`/p/${workspaceSlug}/${pageSlug}${window.location.search}`} replace />;
}

// Redirect legacy /c2c/:slug/* to /marketplace/:slug/*
function C2CRedirectToMarketplace() {
  const { workspaceSlug, "*": rest } = useParams();
  const suffix = rest ? `/${rest}` : "";
  return <Navigate to={`/marketplace/${workspaceSlug}${suffix}${window.location.search}`} replace />;
}

function BuilderIdRedirect() {
  const { id } = useParams();
  return <Navigate to={`/dashboard/builder/${id}`} replace />;
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30 * 1000, // 30s default — prevents unnecessary refetches
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

const PageLoader = () => (
  <div className="flex items-center justify-center min-h-screen">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
  </div>
);

const App = () => (
  <HelmetProvider>
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false} forcedTheme="light">
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <NuqsAdapter>
        <BrowserRouter>
          <GTMProvider containerId="GTM-WLVH4TJJ">
            <MetaPixelLoader />
            <ChunkErrorBoundary>
            <Suspense fallback={<PageLoader />}>
              <Routes>
                {/* PWA install helper */}
                <Route path="/install" element={<InstallPage />} />

                {/* Public Funnel Pages */}
                <Route path="/funnel/:slug" element={<AuthProvider><PublicFunnelPage /></AuthProvider>} />

                {/* Public Landing Pages (legacy alias → redirect to canonical /p/) */}
                <Route path="/lp/:workspaceSlug/:pageSlug" element={<LandingPageAliasRedirect />} />

                {/* Public Invoice Payment */}
                <Route path="/pay/invoice/:token" element={<PublicInvoicePayPage />} />

                {/* Public Bio Pages */}
                <Route path="/bio/:workspaceSlug/:pageSlug" element={<PublicBioPage />} />
                <Route path="/b/:shortCode" element={<PublicBioShortLink />} />

                {/* Builder — public published assets */}
                <Route path="/p/:slug" element={<BuilderPublicPage />} />

                {/* Builder shortcuts → redirect to dashboard */}
                <Route path="/builder" element={<Navigate to="/dashboard/builder" replace />} />
                <Route path="/builder/:id" element={<BuilderIdRedirect />} />

                {/* Store - ISOLATED from CRM providers */}
                <Route path="/store/*" element={<StoreRoutes />} />
                
                {/* C2C / Marketplace Public */}
                <Route path="/marketplace/:workspaceSlug/listing/:id" element={<C2CPublicListingDetail />} />
                <Route path="/marketplace/:workspaceSlug/category/:category" element={<C2CPublicCategoryPage />} />
                <Route path="/marketplace/:workspaceSlug/search" element={<C2CPublicSearchPage />} />
                <Route path="/marketplace/:workspaceSlug/sell" element={<AuthProvider><C2CSellerRegistration /></AuthProvider>} />
                <Route path="/marketplace/:workspaceSlug/create" element={<AuthProvider><C2CSellerRegistration /></AuthProvider>} />
                <Route path="/marketplace/:workspaceSlug/sponsor" element={<AuthProvider><C2CSponsorPortal /></AuthProvider>} />
                <Route path="/marketplace/:workspaceSlug/invite/:token" element={<C2CSellerInviteActivation />} />
                <Route path="/marketplace/:workspaceSlug/seller/:sellerId" element={<C2CPublicSellerProfile />} />
                <Route path="/marketplace/:workspaceSlug/lives" element={<C2CPublicLivesGallery />} />
                <Route path="/marketplace/:workspaceSlug/go-live" element={<AuthProvider><C2CPublicGoLiveSetup /></AuthProvider>} />
                <Route path="/marketplace/:workspaceSlug/live/:id" element={<StoreCartProvider><C2CPublicLivestreamViewer /></StoreCartProvider>} />
                <Route path="/marketplace/:workspaceSlug" element={<C2CPublicMarketplace />} />
                <Route path="/marketplace/:workspaceSlug/:id" element={<C2CPublicListingDetail />} />
                <Route path="/marketplace/lives" element={<GlobalLivesDiscovery />} />
                <Route path="/marketplace/lives/studio" element={<AuthProvider><LiveStudio /></AuthProvider>} />
                <Route path="/marketplace/lives/:id" element={<GlobalLiveViewer />} />
                <Route path="/marketplace" element={<Navigate to="/dashboard/marketplace" replace />} />
                {/* Legacy /c2c/ routes → redirect to /marketplace/ */}
                <Route path="/c2c/:workspaceSlug/*" element={<C2CRedirectToMarketplace />} />
                <Route path="/c2c/:workspaceSlug" element={<C2CRedirectToMarketplace />} />

                {/* Checkout System (public) */}
                <Route path="/checkout/recover/:token" element={<RecoverCartPage />} />
                <Route path="/checkout/:funnelSlug" element={<CheckoutPage />} />
                <Route path="/checkout/:funnelSlug/upsell/:offerId" element={<UpsellPage />} />
                <Route path="/checkout/:funnelSlug/downsell/:offerId" element={<DownsellPage />} />
                <Route path="/checkout/:funnelSlug/thank-you" element={<ThankYouPage />} />

                {/* Supplier Portal (public, token-based) */}
                <Route path="/supplier-portal/:token" element={<SupplierPortalPage />} />
                
                {/* Public Ticket Portal (token-based) */}
                <Route path="/ticket/:token" element={<PublicTicketPortalPage />} />

                {/* Public Customer Portal — Fase 1X */}
                <Route path="/portal/proposal/:token" element={<PublicProposalPortalPage />} />
                <Route path="/portal/onboarding/:token" element={<PublicOnboardingPortalPage />} />
                
                {/* Public FastClub Landing */}
                <Route path="/fastclub" element={<FastClubLandingPage />} />
                <Route path="/club/fastclub/apply" element={<FastClubApplyPage />} />

                {/* Public LeadChef Landing */}
                <Route path="/leadchef" element={<LeadChefLanding />} />
                <Route path="/leadchef-landing" element={<LeadChefLanding />} />
                <Route path="/leadchef/precos" element={<LeadChefPricingPage />} />
                <Route path="/leadchef/pricing" element={<LeadChefPricingPage />} />
                
                {/* FastClub Portal Routes */}
                {FastClubPortalRoutes()}

                {/* Public Careers */}
                <Route path="/careers/:workspaceSlug" element={<CareersPage />} />
                <Route path="/careers/:workspaceSlug/register" element={<PortalRegisterPage />} />
                <Route path="/careers/:workspaceSlug/login" element={<PortalLoginPage />} />
                <Route path="/careers/:workspaceSlug/dashboard" element={<PortalDashboardPage />} />
                <Route path="/careers/:workspaceSlug/register-worker" element={<WorkerRegisterPage />} />
                <Route path="/careers/:workspaceSlug/worker-dashboard" element={<WorkerDashboardPage />} />
                <Route path="/careers/:workspaceSlug/:jobSlug" element={<JobDetailPublicPage />} />

                {/* Public Pitch Share */}
                <Route path="/p/:token" element={<PitchPublicView />} />

                {/* Public Booking */}
                <Route path="/book/:slug" element={<PublicBookingPage />} />
                <Route path="/:workspaceSlug/book/:slug" element={<PublicBookingPage />} />

                {/* Public eBook Reader */}
                <Route path="/e/:shortCode" element={<PublicEbookShortLink />} />
                <Route path="/ebook/:slug" element={<PublicEbookPage />} />

                {/* Public Community */}
                <Route path="/club/:slug" element={<AuthProvider><PublicCommunityPage /></AuthProvider>} />
                <Route path="/club/:slug/topic/:topicId" element={<AuthProvider><PublicCommunityTopicPage /></AuthProvider>} />
                <Route path="/club/:slug/auth" element={<AuthProvider><CommunityAuthPage /></AuthProvider>} />
                
                {/* Partner Center B2B - ISOLATED */}
                <Route path="/partner/*" element={<PartnerRoutes />} />

                {/* Client Portal - ISOLATED from CRM providers */}
                <Route path="/client/*" element={<ClientPortalRoutes />} />

                {/* FastCRM V2 preview (premium shell) */}
                <Route path="/app-v2" element={<Navigate to="/app-v2/dashboard" replace />} />
                <Route path="/app-v2/dashboard" element={<DashboardV2Page />} />

                {/* Legacy dashboard alias */}
                <Route path="/dashboards" element={<Navigate to="/dashboard" replace />} />
                <Route path="/dashboards/*" element={<Navigate to="/dashboard" replace />} />

                {/* Marketing public pages */}
                <Route element={<MarketingLayout />}>
                  <Route path="/precos" element={<MarketingPricingPage />} />
                  <Route path="/funcionalidades" element={<MarketingFeaturesIndexPage />} />
                  <Route path="/casos" element={<MarketingCasesPage />} />
                  <Route path="/sobre" element={<MarketingAboutPage />} />
                  <Route path="/contacto" element={<MarketingContactPage />} />
                </Route>

                {/* CRM and all other routes - WITH CRM providers */}
                <Route path="/*" element={<CRMRoutesV2 />} />
              </Routes>
            </Suspense>
            </ChunkErrorBoundary>
          </GTMProvider>
        </BrowserRouter>
        </NuqsAdapter>
      </TooltipProvider>
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
    </ThemeProvider>
  <div data-build-version={BUILD_VERSION} style={{ display: 'none' }} />
  </HelmetProvider>
);

export default App;
