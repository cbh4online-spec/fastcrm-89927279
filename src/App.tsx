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
import { WorkspaceProvider } from "@/contexts/WorkspaceContext";
import { WorkspaceInstanceProvider } from "@/contexts/WorkspaceInstanceContext";
import { SubscriptionProvider } from "@/contexts/SubscriptionContext";
import { ActivityProfileProvider } from "@/contexts/ActivityProfileContext";

import {
  GTMProvider,
  GDPRBanner,
  MetaPixelLoader,
  KeywordsListPage,
  KeywordDetailPage,
  TemplatesListPage,
  TemplateDetailPage,
  ToolsListPage,
  ToolDetailPage,
  CategoriesListPage,
  CategoryDetailPage,
  ComparePage,
  CompareListPage,
  BlogListPage,
  BlogPostPage,
  GuidePage,
  GuidesListPage,
  GlossaryListPage,
  GlossaryTermPage,
  KeywordIdeasToolPage,
  PrivacyPolicyPage,
  TermsOfUsePage,
  GDPRPage,
  CookiePolicyPage,
} from "./modules/growth-seo";

// Route modules (lazy-loaded internally)
import { SecurityRoutes } from "@/routes/SecurityRoutes";
import { ProcurementRoutes } from "@/routes/ProcurementRoutes";
import { C2CDashboardRoutes } from "@/routes/C2CRoutes";
import { AccountBriefRoutes } from "@/routes/AccountBriefRoutes";
import { PerformanceRoutes } from "@/routes/PerformanceRoutes";
import { CheckoutAdminRoutes } from "@/routes/CheckoutRoutes";
import { ReportsRoutes } from "@/routes/ReportsRoutes";
import { StudentJourneyRoutes } from "@/routes/StudentJourneyRoutes";
import { RevenueFlightControlRoutes } from "@/routes/RevenueFlightControlRoutes";
import { FastClubPortalRoutes } from "@/routes/FastClubRoutes";
import { AIRoutes } from "@/routes/AIRoutes";
import { SalesCRMRoutes } from "@/routes/SalesCRMRoutes";
import { StoreRoutes, ClientPortalRoutes, StoreAdminRoutes, B2BAdminRoutes } from "@/routes/StoreClientRoutes";

// Lazy-loaded pages (remaining)
const FastCRMLanding = lazy(() => import("@/pages/FastCRMLanding"));
const Login = lazy(() => import("@/pages/Login"));
const Signup = lazy(() => import("@/pages/Signup"));
const Auth = lazy(() => import("@/pages/Auth"));
const ForgotPassword = lazy(() => import("@/pages/ForgotPassword"));
const Onboarding = lazy(() => import("@/pages/Onboarding"));
const WeeklyDashboard = lazy(() => import("@/pages/WeeklyDashboard"));
const CommandCenter = lazy(() => import("@/pages/CommandCenter"));
const Settings = lazy(() => import("@/pages/Settings"));
const SuperAdmin = lazy(() => import("@/pages/SuperAdmin"));
const NotFound = lazy(() => import("@/pages/NotFound"));
const ObjectsHomePage = lazy(() => import("@/pages/ObjectsHomePage"));
const ObjectListPage = lazy(() => import("@/pages/ObjectListPage"));
const ObjectDetailPage = lazy(() => import("@/pages/ObjectDetailPage"));
const DataModelPage = lazy(() => import("@/pages/DataModelPage"));
const VisualDataModelPage = lazy(() => import("@/pages/VisualDataModelPage"));
const IntelligencePage = lazy(() => import("@/pages/IntelligencePage"));
const ContextOSPage = lazy(() => import("@/pages/ContextOSPage"));
const RevenueOverviewPage = lazy(() => import("@/pages/RevenueOverviewPage"));
const TasksPage = lazy(() => import("@/pages/TasksPage"));
const AlertsPage = lazy(() => import("@/pages/AlertsPage"));
const ImpactMapPage = lazy(() => import("@/pages/ImpactMapPage"));
const SystemHealthPage = lazy(() => import("@/pages/SystemHealthPage"));
const DependenciesPage = lazy(() => import("@/pages/dashboard/system/DependenciesPage"));
const EventMapPage = lazy(() => import("@/pages/EventMapPage"));
const EventMatrixPage = lazy(() => import("@/pages/EventMatrixPage"));
const EventTestsPage = lazy(() => import("@/pages/EventTestsPage"));
const RevenueRadarPage = lazy(() => import("@/pages/RevenueRadarPage"));
const KernelMonitorPage = lazy(() => import("@/pages/KernelMonitorPage"));
const GenerateLandingImages = lazy(() => import("@/pages/GenerateLandingImages"));
const ProposalView = lazy(() => import("@/pages/ProposalView"));
const PublicLandingPage = lazy(() => import("@/pages/PublicLandingPage"));
const PublicProductSheet = lazy(() => import("@/pages/PublicProductSheet"));
const PublicProposalPage = lazy(() => import("@/pages/PublicProposalPage"));
const VerticalLandingPage = lazy(() => import("@/pages/VerticalLandingPage"));
const MarketingHomepage = lazy(() => import("@/pages/MarketingHomepage"));
const Marketplace = lazy(() => import("@/pages/Marketplace"));
const MarketplaceAdmin = lazy(() => import("@/pages/admin/MarketplaceAdmin"));
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
const FastClubApplicationsPage = lazy(() => import("@/pages/fastclub/FastClubApplicationsPage"));
const PublicCommunityPage = lazy(() => import("@/pages/community/PublicCommunityPage"));
const PublicCommunityTopicPage = lazy(() => import("@/pages/community/PublicCommunityTopicPage"));
const CommunityAuthPage = lazy(() => import("@/pages/community/CommunityAuthPage"));
const EventRsvpResponse = lazy(() => import("@/pages/EventRsvpResponse"));
const AcceptWorkspaceInvite = lazy(() => import("@/pages/AcceptWorkspaceInvite"));
const MobileQuickProductCreate = lazy(() => import("@/pages/MobileQuickProductCreate"));
const VisionPage = lazy(() => import("@/pages/VisionPage"));
const VisionDuoAcceptPage = lazy(() => import("@/pages/VisionDuoAcceptPage"));
const StrategyPage = lazy(() => import("@/pages/StrategyPage"));
const DailyBriefPage = lazy(() => import("@/pages/DailyBriefPage"));
const CommandCenterV2Page = lazy(() => import("@/pages/CommandCenterV2Page"));
const InstagramLooterPage = lazy(() => import("@/pages/dashboard/InstagramLooterPage"));
const SEOAdminPage = lazy(() => import("@/pages/dashboard/seo"));
const CreditIntermediation = lazy(() => import("@/pages/CreditIntermediation"));
const ZapierPage = lazy(() => import("@/pages/ZapierPage"));
const BackgroundJobsPage = lazy(() => import("@/pages/BackgroundJobsPage"));
const KPIs = lazy(() => import("@/pages/KPIs"));

// Redirect legacy /c2c/:slug/* to /marketplace/:slug/*
function C2CRedirectToMarketplace() {
  const { workspaceSlug, "*": rest } = useParams();
  const suffix = rest ? `/${rest}` : "";
  return <Navigate to={`/marketplace/${workspaceSlug}${suffix}${window.location.search}`} replace />;
}

const queryClient = new QueryClient();

// Loading fallback
const PageLoader = () => (
  <div className="flex items-center justify-center min-h-screen">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
  </div>
);

// CRM Routes - WITH all CRM providers
function CRMRoutes() {
  return (
    <AuthProvider>
      <WorkspaceProvider>
        <ActivityProfileProvider>
          <WorkspaceInstanceProvider>
            <SubscriptionProvider>
              <Suspense fallback={<PageLoader />}>
                <Routes>
                  {/* SEO Public Routes */}
                  <Route path="/keywords" element={<KeywordsListPage />} />
                  <Route path="/keywords/:slug" element={<KeywordDetailPage />} />
                  <Route path="/templates" element={<TemplatesListPage />} />
                  <Route path="/templates/:slug" element={<TemplateDetailPage />} />
                  <Route path="/tools" element={<ToolsListPage />} />
                  <Route path="/tools/keyword-ideas" element={<KeywordIdeasToolPage />} />
                  <Route path="/tools/:slug" element={<ToolDetailPage />} />
                  <Route path="/categories" element={<CategoriesListPage />} />
                  <Route path="/categories/:slug" element={<CategoryDetailPage />} />
                  <Route path="/compare" element={<CompareListPage />} />
                  <Route path="/compare/:slug" element={<ComparePage />} />
                  <Route path="/blog" element={<BlogListPage />} />
                  <Route path="/blog/:slug" element={<BlogPostPage />} />
                  <Route path="/guides" element={<GuidesListPage />} />
                  <Route path="/guides/:slug" element={<GuidePage />} />
                  <Route path="/glossary" element={<GlossaryListPage />} />
                  <Route path="/glossary/:slug" element={<GlossaryTermPage />} />
                  
                  {/* Legal Pages */}
                  <Route path="/privacy" element={<PrivacyPolicyPage />} />
                  <Route path="/terms" element={<TermsOfUsePage />} />
                  <Route path="/gdpr" element={<GDPRPage />} />
                  <Route path="/cookies" element={<CookiePolicyPage />} />
                  
                  {/* Main Routes */}
                  <Route path="/" element={<FastCRMLanding />} />
                  <Route path="/fastcrm" element={<FastCRMLanding />} />
                  <Route path="/admin/generate-landing-images" element={<GenerateLandingImages />} />
                  <Route path="/proposal/:id" element={<ProposalView />} />
                  <Route path="/login" element={<Login />} />
                  <Route path="/signup" element={<Signup />} />
                  <Route path="/auth" element={<Auth />} />
                  <Route path="/forgot-password" element={<ForgotPassword />} />
                  <Route path="/onboarding" element={<Onboarding />} />
                  <Route path="/dashboard" element={<WeeklyDashboard />} />
                  <Route path="/dashboard/command-center" element={<CommandCenter />} />
                  <Route path="/dashboard/objects" element={<Navigate to="/objects" replace />} />
                  
                  {/* Objects MVP routes */}
                  <Route path="/objects" element={<ObjectsHomePage />} />
                  <Route path="/objects/:type" element={<ObjectListPage />} />
                  <Route path="/objects/:type/:id" element={<ObjectDetailPage />} />
                  <Route path="/dashboard/intelligence" element={<IntelligencePage />} />
                  <Route path="/dashboard/context-os" element={<ContextOSPage />} />
                  <Route path="/dashboard/revenue" element={<RevenueOverviewPage />} />
                  <Route path="/dashboard/ask" element={<Navigate to="/dashboard/command-center" replace />} />
                  <Route path="/dashboard/tasks" element={<TasksPage />} />
                  <Route path="/dashboard/alerts" element={<AlertsPage />} />
                  <Route path="/dashboard/impact-map" element={<ImpactMapPage />} />
                  <Route path="/dashboard/system/health" element={<SystemHealthPage />} />
                  <Route path="/dashboard/system/events" element={<EventMapPage />} />
                  <Route path="/dashboard/system/event-matrix" element={<EventMatrixPage />} />
                  <Route path="/dashboard/system/event-tests" element={<EventTestsPage />} />
                  <Route path="/dashboard/system/dependencies" element={<DependenciesPage />} />
                  <Route path="/dashboard/revenue-radar" element={<RevenueRadarPage />} />
                  <Route path="/dashboard/kernel" element={<KernelMonitorPage />} />
                  
                  {/* Settings */}
                  <Route path="/dashboard/settings" element={<Navigate to="/settings" replace />} />
                  <Route path="/dashboard/settings/:section" element={<Navigate to="/settings" replace />} />
                  <Route path="/settings" element={<Settings />} />
                  <Route path="/settings/data-model" element={<DataModelPage />} />
                  <Route path="/platform/data" element={<VisualDataModelPage />} />
                  <Route path="/settings/:section" element={<Settings />} />

                  {/* Sales & CRM Routes */}
                  <SalesCRMRoutes />

                  {/* AI Routes */}
                  <AIRoutes />
                  <Route path="/dashboard/kpis" element={<ReportsKPIs />} />

                  {/* Reports */}
                  <ReportsRoutes />

                  {/* Account Brief */}
                  <AccountBriefRoutes />

                  {/* Revenue Flight Control */}
                  <RevenueFlightControlRoutes />

                  {/* Performance Engine */}
                  <PerformanceRoutes />

                  {/* Procurement */}
                  <ProcurementRoutes />

                  {/* Security Ops */}
                  <SecurityRoutes />

                  {/* Student Journey */}
                  <StudentJourneyRoutes />

                  {/* Checkout Admin */}
                  <CheckoutAdminRoutes />

                  {/* C2C Marketplace (Dashboard) */}
                  <C2CDashboardRoutes />

                  {/* Store Admin */}
                  <StoreAdminRoutes />

                  {/* B2B Admin */}
                  <B2BAdminRoutes />

                  {/* Marketplace */}
                  <Route path="/dashboard/marketplace" element={<Marketplace />} />
                  <Route path="/dashboard/admin/marketplace" element={<MarketplaceAdmin />} />

                  {/* Dashboard misc */}
                  <Route path="/dashboard/seo" element={<SEOAdminPage />} />
                  <Route path="/dashboard/instagram-looter" element={<InstagramLooterPage />} />
                  <Route path="/dashboard/instagram-looter/:tab" element={<InstagramLooterPage />} />
                  <Route path="/dashboard/credit" element={<CreditIntermediation />} />
                  <Route path="/dashboard/strategy" element={<StrategyPage />} />
                  <Route path="/dashboard/daily-brief" element={<DailyBriefPage />} />
                  <Route path="/dashboard/vision" element={<VisionPage />} />
                  <Route path="/dashboard/zapier" element={<ZapierPage />} />
                  <Route path="/dashboard/background-jobs" element={<BackgroundJobsPage />} />
                  <Route path="/command-center" element={<CommandCenterV2Page />} />
                  <Route path="/command-center/:conversationId" element={<CommandCenterV2Page />} />

                  {/* FastClub redirect */}
                  <Route path="/dashboard/fastclub" element={<Navigate to="/club/fastclub" replace />} />
                  <Route path="/dashboard/fastclub/candidaturas" element={<FastClubApplicationsPage />} />
                  <Route path="/dashboard/fastclub/*" element={<Navigate to="/club/fastclub" replace />} />
                  
                  {/* Mobile */}
                  <Route path="/mobile/products/quick-create" element={<MobileQuickProductCreate />} />
                  
                  {/* Public pages */}
                  <Route path="/p/:workspaceSlug/:pageSlug" element={<PublicLandingPage />} />
                  <Route path="/product/:slug" element={<PublicProductSheet />} />
                  <Route path="/p/:slug" element={<PublicProposalPage />} />
                  <Route path="/super-admin" element={<SuperAdmin />} />
                  <Route path="/clinicas" element={<VerticalLandingPage />} />
                  <Route path="/imobiliarias" element={<VerticalLandingPage />} />
                  <Route path="/formacao" element={<VerticalLandingPage />} />
                  <Route path="/condominios" element={<VerticalLandingPage />} />
                  <Route path="/agencias" element={<VerticalLandingPage />} />
                  <Route path="/empresas" element={<VerticalLandingPage />} />
                  <Route path="/event-rsvp" element={<EventRsvpResponse />} />
                  <Route path="/invite/:token" element={<AcceptWorkspaceInvite />} />
                  <Route path="/vision/duo/accept/:token" element={<VisionDuoAcceptPage />} />
                  
                  <Route path="/:slug" element={<VerticalLandingPage />} />
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </Suspense>
              <GDPRBanner />
            </SubscriptionProvider>
          </WorkspaceInstanceProvider>
        </ActivityProfileProvider>
      </WorkspaceProvider>
    </AuthProvider>
  );
}

// Import ReportsKPIs for the kpis redirect
const ReportsKPIs = lazy(() => import("@/pages/ReportsKPIs"));

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
                <FastClubPortalRoute />

                {/* Public Community */}
                <Route path="/club/:slug" element={<AuthProvider><PublicCommunityPage /></AuthProvider>} />
                <Route path="/club/:slug/topic/:topicId" element={<AuthProvider><PublicCommunityTopicPage /></AuthProvider>} />
                <Route path="/club/:slug/auth" element={<AuthProvider><CommunityAuthPage /></AuthProvider>} />
                
                {/* Client Portal - ISOLATED from CRM providers */}
                <Route path="/client/*" element={<ClientPortalRoutes />} />
                
                {/* CRM and all other routes - WITH CRM providers */}
                <Route path="/*" element={<CRMRoutes />} />
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
