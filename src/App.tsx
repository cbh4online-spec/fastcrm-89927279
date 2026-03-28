const BUILD_VERSION = "v20260313-2130";

import { Suspense, lazy } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useParams } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import { ThemeProvider } from "next-themes";
import { AuthProvider } from "@/contexts/AuthContext";

import { GTMProvider, MetaPixelLoader } from "./modules/growth-seo";

// Standalone route modules
import { StoreRoutes } from "@/routes/StoreRoutes";
import { ClientPortalRoutes } from "@/routes/ClientPortalRoutes";
import CRMRoutesV2 from "@/routes/CRMRoutes";
import { FastClubPortalRoutes } from "@/routes/FastClubRoutes";

// Lazy-loaded pages (top-level public only)
const PublicFunnelPage = lazy(() => import("@/pages/PublicFunnelPage"));
const PublicBioPage = lazy(() => import("@/pages/PublicBioPage"));
const PublicBioShortLink = lazy(() => import("@/pages/PublicBioShortLink"));
const C2CPublicMarketplace = lazy(() => import("@/pages/c2c/C2CPublicMarketplace"));
const C2CPublicListingDetail = lazy(() => import("@/pages/c2c/C2CPublicListingDetail"));
const C2CPublicCategoryPage = lazy(() => import("@/pages/c2c/C2CPublicCategoryPage"));
const C2CPublicSearchPage = lazy(() => import("@/pages/c2c/C2CPublicSearchPage"));
const C2CSellerRegistration = lazy(() => import("@/pages/c2c/C2CSellerRegistration"));
const C2CSponsorPortal = lazy(() => import("@/pages/c2c/C2CSponsorPortal"));
const C2CSellerInviteActivation = lazy(() => import("@/pages/c2c/C2CSellerInviteActivation"));
const C2CPublicSellerProfile = lazy(() => import("@/pages/c2c/C2CPublicSellerProfile"));
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
const PublicEbookPage = lazy(() => import("@/pages/PublicEbookPage"));

// Redirect legacy /c2c/:slug/* to /marketplace/:slug/*
function C2CRedirectToMarketplace() {
  const { workspaceSlug, "*": rest } = useParams();
  const suffix = rest ? `/${rest}` : "";
  return <Navigate to={`/marketplace/${workspaceSlug}${suffix}${window.location.search}`} replace />;
}

const queryClient = new QueryClient();

const PageLoader = () => (
  <div className="flex items-center justify-center min-h-screen">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
  </div>
);

const App = () => (
  <HelmetProvider>
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false}>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <GTMProvider containerId="GTM-WLVH4TJJ">
            <MetaPixelLoader />
            <Suspense fallback={<PageLoader />}>
              <Routes>
                {/* Public Funnel Pages */}
                <Route path="/funnel/:slug" element={<AuthProvider><PublicFunnelPage /></AuthProvider>} />

                {/* Public Bio Pages */}
                <Route path="/bio/:workspaceSlug/:pageSlug" element={<PublicBioPage />} />
                <Route path="/b/:shortCode" element={<PublicBioShortLink />} />

                {/* Store - ISOLATED from CRM providers */}
                <Route path="/store/*" element={<StoreRoutes />} />
                
                {/* C2C / Marketplace Public */}
                <Route path="/marketplace/:workspaceSlug/listing/:id" element={<C2CPublicListingDetail />} />
                <Route path="/marketplace/:workspaceSlug/category/:category" element={<C2CPublicCategoryPage />} />
                <Route path="/marketplace/:workspaceSlug/search" element={<C2CPublicSearchPage />} />
                <Route path="/marketplace/:workspaceSlug/sell" element={<AuthProvider><C2CSellerRegistration /></AuthProvider>} />
                <Route path="/marketplace/:workspaceSlug/sponsor" element={<AuthProvider><C2CSponsorPortal /></AuthProvider>} />
                <Route path="/marketplace/:workspaceSlug/invite/:token" element={<C2CSellerInviteActivation />} />
                <Route path="/marketplace/:workspaceSlug/seller/:sellerId" element={<C2CPublicSellerProfile />} />
                <Route path="/marketplace/:workspaceSlug" element={<C2CPublicMarketplace />} />
                <Route path="/marketplace/:workspaceSlug/:id" element={<C2CPublicListingDetail />} />
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
                
                {/* Public FastClub Landing */}
                <Route path="/fastclub" element={<FastClubLandingPage />} />
                <Route path="/club/fastclub/apply" element={<FastClubApplyPage />} />
                
                {/* FastClub Portal Routes */}
                {FastClubPortalRoutes()}

                {/* Public Booking */}
                <Route path="/book/:slug" element={<PublicBookingPage />} />
                <Route path="/:workspaceSlug/book/:slug" element={<PublicBookingPage />} />

                {/* Public Community */}
                <Route path="/club/:slug" element={<AuthProvider><PublicCommunityPage /></AuthProvider>} />
                <Route path="/club/:slug/topic/:topicId" element={<AuthProvider><PublicCommunityTopicPage /></AuthProvider>} />
                <Route path="/club/:slug/auth" element={<AuthProvider><CommunityAuthPage /></AuthProvider>} />
                
                {/* Client Portal - ISOLATED from CRM providers */}
                <Route path="/client/*" element={<ClientPortalRoutes />} />
                
                {/* CRM and all other routes - WITH CRM providers */}
                <Route path="/*" element={<CRMRoutesV2 />} />
              </Routes>
            </Suspense>
          </GTMProvider>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
    </ThemeProvider>
  <div data-build-version={BUILD_VERSION} style={{ display: 'none' }} />
  </HelmetProvider>
);

export default App;
