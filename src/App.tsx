import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import { AuthProvider } from "@/contexts/AuthContext";
import { WorkspaceProvider } from "@/contexts/WorkspaceContext";
import { WorkspaceInstanceProvider } from "@/contexts/WorkspaceInstanceContext";
import { SubscriptionProvider } from "@/contexts/SubscriptionContext";
import { ActivityProfileProvider } from "@/contexts/ActivityProfileContext";
import Index from "./pages/Index";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import Auth from "./pages/Auth";
import Onboarding from "./pages/Onboarding";
import Dashboard from "./pages/Dashboard";
import Settings from "./pages/Settings";
import Leads from "./pages/Leads";
import LeadDetail from "./pages/LeadDetail";
import OpportunitiesPage from "./pages/OpportunitiesPage";
import OpportunityDetail from "./pages/OpportunityDetail";
import Inbox from "./pages/Inbox";
import Automations from "./pages/Automations";
import LandingPages from "./pages/LandingPages";
import PublicLandingPage from "./pages/PublicLandingPage";
import Proposals from "./pages/Proposals";
import ProposalDetail from "./pages/ProposalDetail";
import PublicProposalPage from "./pages/PublicProposalPage";
import SuperAdmin from "./pages/SuperAdmin";
import Contacts from "./pages/Contacts";
import ContactDetail from "./pages/ContactDetail";
import Companies from "./pages/Companies";
import CompanyDetail from "./pages/CompanyDetail";
import AISuggestionsHistory from "./pages/AISuggestionsHistory";
import Crm from "./pages/Crm";
import FormStudioPage from "./pages/FormStudioPage";
import NotFound from "./pages/NotFound";
import Payments from "./pages/Payments";
import KPIs from "./pages/KPIs";
import Products from "./pages/Products";
import Packages from "./pages/Packages";
import Imports from "./pages/Imports";
import PublicProductSheet from "./pages/PublicProductSheet";
import Invoices from "./pages/Invoices";
import InvoiceDetail from "./pages/InvoiceDetail";
import KnowledgeBase from "./pages/KnowledgeBase";
import AIProfiles from "./pages/AIProfiles";
import AIAssistants from "./pages/AIAssistants";
import ConversationalEngine from "./pages/ConversationalEngine";
import MarketingHomepage from "./pages/MarketingHomepage";
import CommunicationTemplates from "./pages/CommunicationTemplates";

// Client Portal
import { CartProvider } from "@/contexts/CartContext";
import ClientLoginPage from "./pages/client/ClientLoginPage";
import ClientDashboardPage from "./pages/client/ClientDashboardPage";
import ClientCatalogPage from "./pages/client/ClientCatalogPage";
import ClientCartPage from "./pages/client/ClientCartPage";
import ClientCheckoutPage from "./pages/client/ClientCheckoutPage";
import ClientOrdersPage from "./pages/client/ClientOrdersPage";
import ClientOrderDetailPage from "./pages/client/ClientOrderDetailPage";
import ClientFavoritesPage from "./pages/client/ClientFavoritesPage";
import ClientAssistantPage from "./pages/client/ClientAssistantPage";
import ClientSetPasswordPage from "./pages/client/ClientSetPasswordPage";
import ClientForgotPasswordPage from "./pages/client/ClientForgotPasswordPage";
import ClientResetPasswordPage from "./pages/client/ClientResetPasswordPage";
import ClientTeamPage from "./pages/client/ClientTeamPage";
import ClientApprovalsPage from "./pages/client/ClientApprovalsPage";
import ClientInvoicesPage from "./pages/client/ClientInvoicesPage";
import ClientFinancialPage from "./pages/client/ClientFinancialPage";
import ClientContractsPage from "./pages/client/ClientContractsPage";
import ClientSupportPage from "./pages/client/ClientSupportPage";
import ClientTicketDetailPage from "./pages/client/ClientTicketDetailPage";
import ClientInvitePage from "./pages/client/ClientInvitePage";
// Admin Order Notes
import OrderNotesPage from "./pages/OrderNotesPage";
import OrderNoteDetailPage from "./pages/OrderNoteDetailPage";
import OrderApprovalsPage from "./pages/OrderApprovalsPage";
import ClientUsersPage from "./pages/ClientUsersPage";
import B2BPortalSettingsPage from "./pages/B2BPortalSettingsPage";
import ReportsOverview from "./pages/ReportsOverview";
import ReportsForecasts from "./pages/ReportsForecasts";
import ReportsConsumption from "./pages/ReportsConsumption";
import ReportsRetention from "./pages/ReportsRetention";
import ReportsKPIs from "./pages/ReportsKPIs";
import ReportsGrowth from "./pages/ReportsGrowth";
import ReportsSales from "./pages/ReportsSales";
import ReportsGoals from "./pages/ReportsGoals";
import Marketplace from "./pages/Marketplace";
import C2CPublicMarketplace from "./pages/c2c/C2CPublicMarketplace";
import C2CSellerRegistration from "./pages/c2c/C2CSellerRegistration";
import C2CSellersAdmin from "./pages/c2c/C2CSellersAdmin";
import MarketplaceAdmin from "./pages/admin/MarketplaceAdmin";
import GoogleLocalProspecting from "./pages/GoogleLocalProspecting";
import WebSearchProspecting from "./pages/WebSearchProspecting";
import ProfessionalProspecting from "./pages/ProfessionalProspecting";
import SchedulingPage from "./pages/SchedulingPage";
import CalendarsPage from "./pages/CalendarsPage";
import MeetingsPage from "./pages/MeetingsPage";
import ServicesPage from "./pages/ServicesPage";
import AvailabilityPage from "./pages/AvailabilityPage";
import FeedPage from "./pages/FeedPage";
import ProductivityPage from "./pages/ProductivityPage";
import MemberPanelPage from "./pages/MemberPanelPage";
import Profile from "./pages/Profile";
import Marketing from "./pages/Marketing";
import InstagramLooterPage from "./pages/dashboard/InstagramLooterPage";
import SEOAdminPage from "./pages/dashboard/seo";
import CreditIntermediation from "./pages/CreditIntermediation";
import LeadEnricher from "./pages/LeadEnricher";
import StoreOrdersPage from "./pages/StoreOrdersPage";
import StoreOrderDetailPage from "./pages/StoreOrderDetailPage";
import StoreSettingsPage from "./pages/StoreSettingsPage";
import StoreProductsAdminPage from "./pages/StoreProductsAdminPage";
import StoreCategoriesPage from "./pages/StoreCategoriesPage";
import StoreCouponsPage from "./pages/StoreCouponsPage";
import StoreAnalyticsPage from "./pages/StoreAnalyticsPage";

// C2C Marketplace
import C2CMarketplace from "./pages/c2c/C2CMarketplace";
import C2CListingDetail from "./pages/c2c/C2CListingDetail";
import C2CCreateListing from "./pages/c2c/C2CCreateListing";
import C2CMyListings from "./pages/c2c/C2CMyListings";
import C2CMessages from "./pages/c2c/C2CMessages";
import C2CFavorites from "./pages/c2c/C2CFavorites";
import C2CSellerBoost from "./pages/c2c/C2CSellerBoost";
import C2CSponsorPortal from "./pages/c2c/C2CSponsorPortal";
import C2CSponsorAdmin from "./pages/c2c/C2CSponsorAdmin";
import C2CSellerDashboard from "./pages/c2c/C2CSellerDashboard";

// FastClub (Community)
import FastClubPage from "./pages/community/FastClubPage";
import ForumPage from "./pages/community/ForumPage";
import ForumTopicPage from "./pages/community/ForumTopicPage";
import LoyaltyPage from "./pages/community/LoyaltyPage";
import PublicCommunityPage from "./pages/community/PublicCommunityPage";
import PublicCommunityTopicPage from "./pages/community/PublicCommunityTopicPage";
import CommunityAuthPage from "./pages/community/CommunityAuthPage";

// Store (Public E-commerce)
import { StoreCartProvider } from "@/contexts/StoreCartContext";
import StorePage from "./pages/store/StorePage";
import StoreProductPage from "./pages/store/StoreProductPage";
import StoreCheckoutPage from "./pages/store/StoreCheckoutPage";
import StoreSuccessPage from "./pages/store/StoreSuccessPage";
import StoreCancelPage from "./pages/store/StoreCancelPage";
import StoreWishlistPage from "./pages/store/StoreWishlistPage";
import StoreOrderHistoryPage from "./pages/store/StoreOrderHistoryPage";
import StoreDigitalAssetsPage from "./pages/store/StoreDigitalAssetsPage";
import StoreLoyaltyPage from "./pages/store/StoreLoyaltyPage";
import StoreReferralPage from "./pages/store/StoreReferralPage";
import StoreGiftCardsPage from "./pages/store/StoreGiftCardsPage";

// Student Journey Pages
import {
  SJDashboard,
  SJActivationDashboard,
  SJProfiles,
  SJProfileDetail,
  SJCourses,
  SJCohorts,
  SJCohortDetail,
} from "./pages/student-journey";
import { SJLayout } from "./components/student-journey";
import {
  KeywordsListPage,
  KeywordDetailPage,
  TemplatesListPage,
  TemplateDetailPage,
  ToolsListPage,
  ToolDetailPage,
  CategoriesListPage,
  CategoryDetailPage,
  ComparePage,
  BlogListPage,
  BlogPostPage,
  GuidePage,
  GuidesListPage,
  GlossaryListPage,
  GlossaryTermPage,
  KeywordIdeasToolPage,
  GTMProvider,
  GDPRBanner,
  MetaPixelLoader,
  PrivacyPolicyPage,
  TermsOfUsePage,
  GDPRPage,
  CookiePolicyPage,
} from "./modules/growth-seo";

const queryClient = new QueryClient();

// Store Routes - ISOLATED from CRM providers
function StoreRoutes() {
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
      </Routes>
    </StoreCartProvider>
  );
}

// Client Portal Routes - ISOLATED from CRM providers
function ClientPortalRoutes() {
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
        <Route path="*" element={<Navigate to="/client/login" replace />} />
      </Routes>
    </CartProvider>
  );
}

// CRM Routes - WITH all CRM providers
function CRMRoutes() {
  return (
    <AuthProvider>
      <WorkspaceProvider>
        <ActivityProfileProvider>
          <WorkspaceInstanceProvider>
            <SubscriptionProvider>
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
                <Route path="/" element={<MarketingHomepage />} />
                <Route path="/login" element={<Login />} />
                <Route path="/signup" element={<Signup />} />
                <Route path="/auth" element={<Auth />} />
                <Route path="/onboarding" element={<Onboarding />} />
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/dashboard/settings" element={<Settings />} />
                <Route path="/dashboard/settings/:section" element={<Settings />} />
                <Route path="/dashboard/leads" element={<Leads />} />
                <Route path="/dashboard/leads/:id" element={<LeadDetail />} />
                <Route path="/dashboard/prospecting/google-local" element={<GoogleLocalProspecting />} />
                <Route path="/dashboard/prospecting/web-search" element={<WebSearchProspecting />} />
                <Route path="/dashboard/prospecting/professionals" element={<ProfessionalProspecting />} />
                <Route path="/dashboard/opportunities" element={<OpportunitiesPage />} />
                <Route path="/dashboard/opportunities/:id" element={<OpportunityDetail />} />
                <Route path="/dashboard/inbox" element={<Inbox />} />
                <Route path="/dashboard/automations" element={<Automations />} />
                <Route path="/dashboard/landing-pages" element={<LandingPages />} />
                <Route path="/dashboard/contacts" element={<Contacts />} />
                <Route path="/dashboard/contacts/:id" element={<ContactDetail />} />
                <Route path="/dashboard/companies" element={<Companies />} />
                <Route path="/dashboard/companies/:id" element={<CompanyDetail />} />
                <Route path="/dashboard/ai-suggestions" element={<AISuggestionsHistory />} />
                <Route path="/dashboard/crm" element={<Crm />} />
                <Route path="/dashboard/form-studio" element={<FormStudioPage />} />
                <Route path="/dashboard/proposals" element={<Proposals />} />
                <Route path="/dashboard/proposals/:id" element={<ProposalDetail />} />
                <Route path="/dashboard/products" element={<Products />} />
                <Route path="/dashboard/packages" element={<Packages />} />
                <Route path="/dashboard/imports" element={<Imports />} />
                <Route path="/dashboard/payments" element={<Payments />} />
                <Route path="/dashboard/invoices" element={<Invoices />} />
                <Route path="/dashboard/invoices/:id" element={<InvoiceDetail />} />
                <Route path="/dashboard/knowledge-base" element={<Navigate to="/dashboard/ai-assistants" replace />} />
                <Route path="/dashboard/ai-profiles" element={<Navigate to="/dashboard/ai-assistants" replace />} />
                <Route path="/dashboard/ai-assistants" element={<AIAssistants />} />
                <Route path="/dashboard/conversational-engine" element={<ConversationalEngine />} />
                <Route path="/dashboard/kpis" element={<ReportsKPIs />} />
                <Route path="/dashboard/communication/templates" element={<CommunicationTemplates />} />
                <Route path="/dashboard/reports" element={<ReportsOverview />} />
                <Route path="/dashboard/reports/forecasts" element={<ReportsForecasts />} />
                <Route path="/dashboard/reports/consumption" element={<ReportsConsumption />} />
                <Route path="/dashboard/reports/retention" element={<ReportsRetention />} />
                <Route path="/dashboard/reports/kpis" element={<ReportsKPIs />} />
                <Route path="/dashboard/reports/growth" element={<ReportsGrowth />} />
                <Route path="/dashboard/reports/sales" element={<ReportsSales />} />
                <Route path="/dashboard/reports/goals" element={<ReportsGoals />} />
                <Route path="/dashboard/marketplace" element={<Marketplace />} />
                <Route path="/dashboard/admin/marketplace" element={<MarketplaceAdmin />} />
                <Route path="/dashboard/scheduling" element={<SchedulingPage />} />
                <Route path="/dashboard/calendars" element={<Navigate to="/dashboard/scheduling" replace />} />
                <Route path="/dashboard/meetings" element={<Navigate to="/dashboard/scheduling" replace />} />
                <Route path="/dashboard/services" element={<Navigate to="/dashboard/scheduling" replace />} />
                <Route path="/dashboard/availability" element={<Navigate to="/dashboard/scheduling" replace />} />
                <Route path="/dashboard/feed" element={<FeedPage />} />
                <Route path="/dashboard/productivity" element={<ProductivityPage />} />
                <Route path="/dashboard/member" element={<MemberPanelPage />} />
                <Route path="/dashboard/profile" element={<Profile />} />
                <Route path="/dashboard/marketing" element={<Marketing />} />
                <Route path="/dashboard/seo" element={<SEOAdminPage />} />
                <Route path="/dashboard/instagram-looter" element={<InstagramLooterPage />} />
                <Route path="/dashboard/instagram-looter/:tab" element={<InstagramLooterPage />} />
                <Route path="/dashboard/credit" element={<CreditIntermediation />} />
                <Route path="/dashboard/lead-enricher" element={<LeadEnricher />} />
                
                {/* Order Notes Admin Routes */}
                <Route path="/dashboard/order-notes" element={<OrderNotesPage />} />
                <Route path="/dashboard/order-notes/:id" element={<OrderNoteDetailPage />} />
                <Route path="/dashboard/order-approvals" element={<OrderApprovalsPage />} />
                <Route path="/dashboard/client-users" element={<ClientUsersPage />} />
                <Route path="/dashboard/b2b-portal" element={<B2BPortalSettingsPage />} />
                <Route path="/dashboard/store-orders" element={<StoreOrdersPage />} />
                <Route path="/dashboard/store-orders/:id" element={<StoreOrderDetailPage />} />
                <Route path="/dashboard/store-settings" element={<StoreSettingsPage />} />
                <Route path="/dashboard/store-products" element={<StoreProductsAdminPage />} />
                <Route path="/dashboard/store-categories" element={<StoreCategoriesPage />} />
                <Route path="/dashboard/store-coupons" element={<StoreCouponsPage />} />
                <Route path="/dashboard/store-analytics" element={<StoreAnalyticsPage />} />
                
                {/* C2C Marketplace */}
                <Route path="/dashboard/c2c" element={<C2CMarketplace />} />
                <Route path="/dashboard/c2c/create" element={<C2CCreateListing />} />
                <Route path="/dashboard/c2c/my-listings" element={<C2CMyListings />} />
                <Route path="/dashboard/c2c/messages" element={<C2CMessages />} />
                <Route path="/dashboard/c2c/favorites" element={<C2CFavorites />} />
                <Route path="/dashboard/c2c/boost" element={<C2CSellerBoost />} />
                <Route path="/dashboard/c2c/sellers" element={<C2CSellersAdmin />} />
                <Route path="/dashboard/c2c/sponsors" element={<C2CSponsorAdmin />} />
                <Route path="/dashboard/c2c/analytics" element={<C2CSellerDashboard />} />
                <Route path="/dashboard/c2c/:id" element={<C2CListingDetail />} />
                
                {/* FastClub */}
                <Route path="/dashboard/fastclub" element={<FastClubPage />} />
                <Route path="/dashboard/fastclub/forum" element={<ForumPage />} />
                <Route path="/dashboard/fastclub/forum/:topicId" element={<ForumTopicPage />} />
                <Route path="/dashboard/fastclub/rewards" element={<LoyaltyPage />} />

                {/* Student Journey Module Routes */}
                <Route path="/dashboard/student-journey" element={<SJLayout><SJDashboard /></SJLayout>} />
                <Route path="/dashboard/student-journey/activation" element={<SJLayout><SJActivationDashboard /></SJLayout>} />
                <Route path="/dashboard/student-journey/profiles" element={<SJLayout><SJProfiles /></SJLayout>} />
                <Route path="/dashboard/student-journey/profiles/:id" element={<SJLayout><SJProfileDetail /></SJLayout>} />
                <Route path="/dashboard/student-journey/courses" element={<SJLayout><SJCourses /></SJLayout>} />
                <Route path="/dashboard/student-journey/cohorts" element={<SJLayout><SJCohorts /></SJLayout>} />
                <Route path="/dashboard/student-journey/cohorts/:id" element={<SJLayout><SJCohortDetail /></SJLayout>} />
                
                <Route path="/p/:workspaceSlug/:pageSlug" element={<PublicLandingPage />} />
                <Route path="/product/:slug" element={<PublicProductSheet />} />
                <Route path="/p/:slug" element={<PublicProposalPage />} />
                <Route path="/super-admin" element={<SuperAdmin />} />
                <Route path="*" element={<NotFound />} />
              </Routes>
              <GDPRBanner />
            </SubscriptionProvider>
          </WorkspaceInstanceProvider>
        </ActivityProfileProvider>
      </WorkspaceProvider>
    </AuthProvider>
  );
}

const App = () => (
  <HelmetProvider>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <GTMProvider containerId="GTM-WLVH4TJJ">
            <MetaPixelLoader />
            <Routes>
              {/* Store - ISOLATED from CRM providers */}
              <Route path="/store/*" element={<StoreRoutes />} />
              
              {/* C2C Public Marketplace */}
              <Route path="/c2c/:workspaceSlug" element={<C2CPublicMarketplace />} />
              <Route path="/c2c/:workspaceSlug/sell" element={<C2CSellerRegistration />} />
              <Route path="/c2c/:workspaceSlug/sponsor" element={<C2CSponsorPortal />} />
              
              {/* Public Community */}
              <Route path="/club/:slug" element={<AuthProvider><PublicCommunityPage /></AuthProvider>} />
              <Route path="/club/:slug/topic/:topicId" element={<AuthProvider><PublicCommunityTopicPage /></AuthProvider>} />
              <Route path="/club/:slug/auth" element={<AuthProvider><CommunityAuthPage /></AuthProvider>} />
              
              {/* Client Portal - ISOLATED from CRM providers */}
              <Route path="/client/*" element={<ClientPortalRoutes />} />
              
              {/* CRM and all other routes - WITH CRM providers */}
              <Route path="/*" element={<CRMRoutes />} />
            </Routes>
          </GTMProvider>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  </HelmetProvider>
);

export default App;
