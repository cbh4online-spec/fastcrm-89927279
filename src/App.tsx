// Force rebuild for C2C public routes deployment - v2
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, Outlet } from "react-router-dom";
import { ClubLayout } from "@/components/club/ClubLayout";
import { HelmetProvider } from "react-helmet-async";
import { ThemeProvider } from "next-themes";
import { AuthProvider } from "@/contexts/AuthContext";
import { WorkspaceProvider } from "@/contexts/WorkspaceContext";
import { WorkspaceInstanceProvider } from "@/contexts/WorkspaceInstanceContext";
import { SubscriptionProvider } from "@/contexts/SubscriptionContext";
import { ActivityProfileProvider } from "@/contexts/ActivityProfileContext";
import Index from "./pages/Index";
import ObjectsPage from "./pages/ObjectsPage";
import ObjectsHomePage from "./pages/ObjectsHomePage";
import ObjectListPage from "./pages/ObjectListPage";
import ObjectDetailPage from "./pages/ObjectDetailPage";
import DataModelPage from "./pages/DataModelPage";
import VisualDataModelPage from "./pages/VisualDataModelPage";
import IntelligencePage from "./pages/IntelligencePage";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import Auth from "./pages/Auth";
import Onboarding from "./pages/Onboarding";
import CommandCenter from "./pages/CommandCenter";
import WeeklyDashboard from "./pages/WeeklyDashboard";
import TasksPage from "./pages/TasksPage";
import Settings from "./pages/Settings";
import Leads from "./pages/Leads";
import LeadDetail from "./pages/LeadDetail";
import OpportunitiesPage from "./pages/OpportunitiesPage";
import OpportunityDetail from "./pages/OpportunityDetail";
import Inbox from "./pages/Inbox";
import Automations from "./pages/Automations";
import Funnels from "./pages/Funnels";
import BioOS from "./pages/BioOS";

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
import AIEmployeesPage from "./pages/AIEmployeesPage";
import AIEmployeeNewPage from "./pages/AIEmployeeNewPage";
import AIEmployeeDetailPage from "./pages/AIEmployeeDetailPage";
import MarketingHomepage from "./pages/MarketingHomepage";
import FastCRMLanding from "./pages/FastCRMLanding";
import GenerateLandingImages from "./pages/GenerateLandingImages";
import VerticalLandingPage from "./pages/VerticalLandingPage";
import ProposalView from "./pages/ProposalView";
import CommunicationTemplates from "./pages/CommunicationTemplates";
import Sequences from "./pages/Sequences";
import AlertsPage from "./pages/AlertsPage";
import ImpactMapPage from "./pages/ImpactMapPage";
import SystemHealthPage from "./pages/SystemHealthPage";
import EventMapPage from "./pages/EventMapPage";

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
import ClientDiagnosisPage from "./pages/client/ClientDiagnosisPage";
import ClientDiagnosisDetailPage from "./pages/client/ClientDiagnosisDetailPage";
import ClientProtocolDetailPage from "./pages/client/ClientProtocolDetailPage";
import ClientConsumptionPage from "./pages/client/ClientConsumptionPage";
import ClientRankingsPage from "./pages/client/ClientRankingsPage";
// Admin Order Notes
import OrderNotesPage from "./pages/OrderNotesPage";
import CreateOrderNotePage from "./pages/CreateOrderNotePage";
import OrderNoteDetailPage from "./pages/OrderNoteDetailPage";
import OrderApprovalsPage from "./pages/OrderApprovalsPage";
import ClientUsersPage from "./pages/ClientUsersPage";
import B2BPortalSettingsPage from "./pages/B2BPortalSettingsPage";
import B2BStockPage from "./pages/B2BStockPage";
import ReportsOverview from "./pages/ReportsOverview";
import ReportsForecasts from "./pages/ReportsForecasts";
import ReportsConsumption from "./pages/ReportsConsumption";
import ReportsRetention from "./pages/ReportsRetention";
import ReportsKPIs from "./pages/ReportsKPIs";
import ReportsGrowth from "./pages/ReportsGrowth";
import ReportsSales from "./pages/ReportsSales";
import ReportsDashboards from "./pages/ReportsDashboards";
import ReportDashboardView from "./pages/ReportDashboardView";
import ReportsGoals from "./pages/ReportsGoals";
import Marketplace from "./pages/Marketplace";
import PublicBioPage from "./pages/PublicBioPage";
import PublicBioShortLink from "./pages/PublicBioShortLink";
import C2CPublicMarketplace from "./pages/c2c/C2CPublicMarketplace";
import C2CPublicListingDetail from "./pages/c2c/C2CPublicListingDetail";
import C2CSellerRegistration from "./pages/c2c/C2CSellerRegistration";
import C2CSellersAdmin from "./pages/c2c/C2CSellersAdmin";
import MarketplaceAdmin from "./pages/admin/MarketplaceAdmin";
import GoogleLocalProspecting from "./pages/GoogleLocalProspecting";
import WebSearchProspecting from "./pages/WebSearchProspecting";
import ProfessionalProspecting from "./pages/ProfessionalProspecting";
import SchedulingPage from "./pages/SchedulingPage";
import CalendarsPage from "./pages/CalendarsPage";
import MeetingsPage from "./pages/MeetingsPage";
import MeetingTranscriptPage from "./pages/MeetingTranscriptPage";
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
import StrategyPage from "./pages/StrategyPage";
import DailyBriefPage from "./pages/DailyBriefPage";
import ContextOSPage from "./pages/ContextOSPage";
import CustomerLifecyclePage from "./pages/CustomerLifecyclePage";
import EventsManagementPage from "./components/events/EventsManagementPage";
import EventDetailPage from "./components/events/EventDetailPage";
import RevenueOverviewPage from "./pages/RevenueOverviewPage";
import ForgotPassword from "./pages/ForgotPassword";
import AcceptWorkspaceInvite from "./pages/AcceptWorkspaceInvite";
import LeadEnricher from "./pages/LeadEnricher";
import StoreOrdersPage from "./pages/StoreOrdersPage";
import StoreOrderDetailPage from "./pages/StoreOrderDetailPage";
import StoreSettingsPage from "./pages/StoreSettingsPage";
import StoreProductsAdminPage from "./pages/StoreProductsAdminPage";
import StoreCategoriesPage from "./pages/StoreCategoriesPage";
import StoreCouponsPage from "./pages/StoreCouponsPage";
import StoreAnalyticsPage from "./pages/StoreAnalyticsPage";
import MobileQuickProductCreate from "./pages/MobileQuickProductCreate";
import EventRsvpResponse from "./pages/EventRsvpResponse";
import AISalesCoachPage from "./pages/AISalesCoachPage";
import AIDocumentOCRPage from "./pages/AIDocumentOCRPage";
import EmailCampaignsPage from "./pages/EmailCampaignsPage";
import IMOAIPage from "./pages/IMOAIPage";
import ZapierPage from "./pages/ZapierPage";
import CEOCopilotPage from "./pages/CEOCopilotPage";

// Renewals
import RenewalsPage from "./pages/RenewalsPage";
import RenewalDetailPage from "./pages/RenewalDetailPage";

// Procurement
import ProcurementDashboardPage from "./pages/procurement/ProcurementDashboardPage";
import SuppliersPage from "./pages/procurement/SuppliersPage";
import PurchaseRequestsPage from "./pages/procurement/PurchaseRequestsPage";
import PurchaseOrdersPage from "./pages/procurement/PurchaseOrdersPage";
import GoodsReceiptsPage from "./pages/procurement/GoodsReceiptsPage";
import SupplierInvoicesPage from "./pages/procurement/SupplierInvoicesPage";
import SupplierProductsPage from "./pages/procurement/SupplierProductsPage";
import SupplierPriceImportPage from "./pages/procurement/SupplierPriceImportPage";
import ProcurementProjectsPage from "./pages/procurement/ProcurementProjectsPage";
import ProcurementProjectDetailPage from "./pages/procurement/ProcurementProjectDetailPage";
import RFQsPage from "./pages/procurement/RFQsPage";
import RFQDetailPage from "./pages/procurement/RFQDetailPage";
import RFQsDashboardPage from "./pages/procurement/RFQsDashboardPage";
import ProcurementNeedsBoardPage from "./pages/procurement/ProcurementNeedsBoardPage";
import SupplierPortalPage from "./pages/procurement/SupplierPortalPage";

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
import C2CSellerArea from "./pages/c2c/C2CSellerArea";
import C2CAffiliateCenter from "./pages/c2c/C2CAffiliateCenter";
import C2CReferralCenter from "./pages/c2c/C2CReferralCenter";
import C2CAffiliateAdmin from "./pages/c2c/C2CAffiliateAdmin";
import C2CSellerProfile from "./pages/c2c/C2CSellerProfile";
import C2CEditListing from "./pages/c2c/C2CEditListing";
import C2CNotifications from "./pages/c2c/C2CNotifications";
import C2CSellerInviteActivation from "./pages/c2c/C2CSellerInviteActivation";
import C2CPublicSellerProfile from "./pages/c2c/C2CPublicSellerProfile";

// FastClub (Community)
import FastClubPage from "./pages/community/FastClubPage";
import ForumPage from "./pages/community/ForumPage";
import ForumTopicPage from "./pages/community/ForumTopicPage";
import LoyaltyPage from "./pages/community/LoyaltyPage";
import PublicCommunityPage from "./pages/community/PublicCommunityPage";
import PublicCommunityTopicPage from "./pages/community/PublicCommunityTopicPage";
import CommunityAuthPage from "./pages/community/CommunityAuthPage";

// FastClub Freemium Pages
import StartHerePage from "./pages/fastclub/StartHerePage";
import MetodoParePage from "./pages/fastclub/MetodoParePage";
import DemosPage from "./pages/fastclub/DemosPage";
import DesafioPage from "./pages/fastclub/DesafioPage";
import ResultadosPage from "./pages/fastclub/ResultadosPage";
import RedePrivadaPage from "./pages/fastclub/RedePrivadaPage";
import AnunciosPage from "./pages/fastclub/AnunciosPage";

// FastClub Premium Pages
import MissaoSemanaPage from "./pages/fastclub/MissaoSemanaPage";
import ImplementacaoPage from "./pages/fastclub/ImplementacaoPage";
import IAAvancadaPage from "./pages/fastclub/IAAvancadaPage";
import FastMatchPage from "./pages/fastclub/FastMatchPage";
import LaboratorioPage from "./pages/fastclub/LaboratorioPage";
import HotSeatsPage from "./pages/fastclub/HotSeatsPage";
import FastClubLandingPage from "./pages/fastclub/FastClubLandingPage";
import FastClubApplyPage from "./pages/fastclub/FastClubApplyPage";
import FastClubApplicationsPage from "./pages/fastclub/FastClubApplicationsPage";

// FastClub Subchannel Pages
import PlaneamentoParePage from "./pages/fastclub/metodo-pare/PlaneamentoPage";
import AutomacaoParePage from "./pages/fastclub/metodo-pare/AutomacaoPage";
import ResultadosParePage from "./pages/fastclub/metodo-pare/ResultadosParePage";
import EficienciaParePage from "./pages/fastclub/metodo-pare/EficienciaPage";
import DemonstracoesPage from "./pages/fastclub/demos/DemonstracoesPage";
import CasosPraticosPage from "./pages/fastclub/demos/CasosPraticosPage";
import RoadmapFCPage from "./pages/fastclub/demos/RoadmapPage";
import ComoFuncionaPage from "./pages/fastclub/rede-privada/ComoFuncionaPage";
import OtimizarPerfilPage from "./pages/fastclub/rede-privada/OtimizarPerfilPage";
import IndicadoresPage from "./pages/fastclub/rede-privada/IndicadoresPage";
import NegociosFechadosPage from "./pages/fastclub/rede-privada/NegociosFechadosPage";
import EstrategiasPage from "./pages/fastclub/rede-privada/EstrategiasPage";
import AtualizacoesPage from "./pages/fastclub/AtualizacoesPage";

// FastMatch Discovery (CRM)
import FastMatchDiscoveryPage from "./pages/fastmatch/FastMatchDiscoveryPage";

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
  CompareListPage,
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
        <Route path="diagnosis" element={<ClientDiagnosisPage />} />
        <Route path="diagnosis/:slug" element={<ClientDiagnosisDetailPage />} />
        <Route path="protocol/:id" element={<ClientProtocolDetailPage />} />
        <Route path="insights/consumption" element={<ClientConsumptionPage />} />
        <Route path="insights/rankings" element={<ClientRankingsPage />} />
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
                
                {/* Settings redirect to /settings */}
                <Route path="/dashboard/settings" element={<Navigate to="/settings" replace />} />
                <Route path="/dashboard/settings/:section" element={<Navigate to="/settings" replace />} />
                
                {/* Settings at clean URL */}
                <Route path="/settings" element={<Settings />} />
                <Route path="/settings/data-model" element={<DataModelPage />} />
                <Route path="/platform/data" element={<VisualDataModelPage />} />
                <Route path="/settings/:section" element={<Settings />} />
                <Route path="/dashboard/leads" element={<Leads />} />
                <Route path="/dashboard/leads/:id" element={<LeadDetail />} />
                <Route path="/dashboard/prospecting/google-local" element={<GoogleLocalProspecting />} />
                <Route path="/dashboard/prospecting/web-search" element={<WebSearchProspecting />} />
                <Route path="/dashboard/prospecting/professionals" element={<ProfessionalProspecting />} />
                <Route path="/dashboard/opportunities" element={<OpportunitiesPage />} />
                <Route path="/dashboard/opportunities/:id" element={<OpportunityDetail />} />
                <Route path="/dashboard/inbox" element={<Inbox />} />
                <Route path="/dashboard/automations" element={<Automations />} />
                <Route path="/dashboard/funnels" element={<Funnels />} />
                <Route path="/dashboard/bio" element={<BioOS />} />
                <Route path="/dashboard/landing-pages" element={<Navigate to="/dashboard/funnels" replace />} />
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
                <Route path="/dashboard/knowledge" element={<KnowledgeBase />} />
                <Route path="/dashboard/invoices/:id" element={<InvoiceDetail />} />
                <Route path="/dashboard/renewals" element={<RenewalsPage />} />
                <Route path="/dashboard/renewals/:id" element={<RenewalDetailPage />} />
                <Route path="/dashboard/knowledge-base" element={<Navigate to="/dashboard/ai-assistants" replace />} />
                <Route path="/dashboard/ai-profiles" element={<Navigate to="/dashboard/ai-assistants" replace />} />
                <Route path="/dashboard/ai-assistants" element={<AIAssistants />} />
                <Route path="/dashboard/conversational-engine" element={<ConversationalEngine />} />
                <Route path="/dashboard/ai-employees" element={<AIEmployeesPage />} />
                <Route path="/dashboard/ai-employees/new" element={<AIEmployeeNewPage />} />
                <Route path="/dashboard/ai-employees/:botId" element={<AIEmployeeDetailPage />} />
                <Route path="/dashboard/ai-employees/:botId/analytics" element={<AIEmployeeDetailPage />} />
                <Route path="/dashboard/kpis" element={<ReportsKPIs />} />
                <Route path="/dashboard/communication/templates" element={<CommunicationTemplates />} />
                <Route path="/dashboard/sequences" element={<Sequences />} />
                <Route path="/dashboard/reports" element={<ReportsOverview />} />
                <Route path="/dashboard/reports/forecasts" element={<ReportsForecasts />} />
                <Route path="/dashboard/reports/consumption" element={<ReportsConsumption />} />
                <Route path="/dashboard/reports/retention" element={<ReportsRetention />} />
                <Route path="/dashboard/reports/kpis" element={<ReportsKPIs />} />
                <Route path="/dashboard/reports/growth" element={<ReportsGrowth />} />
                <Route path="/dashboard/reports/sales" element={<ReportsSales />} />
                <Route path="/dashboard/reports/goals" element={<ReportsGoals />} />
                <Route path="/dashboard/reports/dashboards" element={<ReportsDashboards />} />
                <Route path="/dashboard/reports/dashboards/:id" element={<ReportDashboardView />} />
                <Route path="/dashboard/marketplace" element={<Marketplace />} />
                <Route path="/dashboard/admin/marketplace" element={<MarketplaceAdmin />} />
                <Route path="/dashboard/scheduling" element={<SchedulingPage />} />
                <Route path="/dashboard/calendars" element={<Navigate to="/dashboard/scheduling" replace />} />
                <Route path="/dashboard/meetings" element={<Navigate to="/dashboard/scheduling" replace />} />
                <Route path="/dashboard/services" element={<Navigate to="/dashboard/scheduling" replace />} />
                <Route path="/dashboard/availability" element={<Navigate to="/dashboard/scheduling" replace />} />
                <Route path="/dashboard/meetings/:meetingId/transcript" element={<MeetingTranscriptPage />} />
                <Route path="/dashboard/feed" element={<FeedPage />} />
                <Route path="/dashboard/productivity" element={<ProductivityPage />} />
                <Route path="/dashboard/member" element={<MemberPanelPage />} />
                <Route path="/dashboard/profile" element={<Profile />} />
                <Route path="/dashboard/marketing" element={<Marketing />} />
                <Route path="/dashboard/seo" element={<SEOAdminPage />} />
                <Route path="/dashboard/instagram-looter" element={<InstagramLooterPage />} />
                <Route path="/dashboard/instagram-looter/:tab" element={<InstagramLooterPage />} />
                <Route path="/dashboard/credit" element={<CreditIntermediation />} />
                <Route path="/dashboard/strategy" element={<StrategyPage />} />
                <Route path="/dashboard/daily-brief" element={<DailyBriefPage />} />
                <Route path="/dashboard/lifecycle" element={<CustomerLifecyclePage />} />
                <Route path="/dashboard/events" element={<EventsManagementPage />} />
                <Route path="/dashboard/events/:eventId" element={<EventDetailPage />} />
                <Route path="/dashboard/lead-enricher" element={<LeadEnricher />} />
                <Route path="/dashboard/ai-sales-coach" element={<AISalesCoachPage />} />
                <Route path="/dashboard/ai-document-ocr" element={<AIDocumentOCRPage />} />
                <Route path="/dashboard/email-campaigns" element={<EmailCampaignsPage />} />
                <Route path="/dashboard/imo-ai" element={<IMOAIPage />} />
                <Route path="/dashboard/zapier" element={<ZapierPage />} />
                
                {/* Procurement Routes */}
                <Route path="/dashboard/procurement" element={<ProcurementDashboardPage />} />
                <Route path="/dashboard/procurement/suppliers" element={<SuppliersPage />} />
                <Route path="/dashboard/procurement/requests" element={<PurchaseRequestsPage />} />
                <Route path="/dashboard/procurement/orders" element={<PurchaseOrdersPage />} />
                <Route path="/dashboard/procurement/receipts" element={<GoodsReceiptsPage />} />
                <Route path="/dashboard/procurement/invoices" element={<SupplierInvoicesPage />} />
                <Route path="/dashboard/procurement/catalog" element={<SupplierProductsPage />} />
                <Route path="/dashboard/procurement/price-import" element={<SupplierPriceImportPage />} />
                <Route path="/dashboard/procurement/projects" element={<ProcurementProjectsPage />} />
                <Route path="/dashboard/procurement/projects/:id" element={<ProcurementProjectDetailPage />} />
                <Route path="/dashboard/procurement/rfqs" element={<RFQsPage />} />
                <Route path="/dashboard/procurement/rfqs/:id" element={<RFQDetailPage />} />
                <Route path="/dashboard/procurement/rfqs-dashboard" element={<RFQsDashboardPage />} />
                <Route path="/dashboard/procurement/needs" element={<ProcurementNeedsBoardPage />} />
                
                {/* Order Notes Admin Routes */}
                <Route path="/dashboard/order-notes" element={<OrderNotesPage />} />
                <Route path="/dashboard/order-notes/create" element={<CreateOrderNotePage />} />
                <Route path="/dashboard/order-notes/:id" element={<OrderNoteDetailPage />} />
                <Route path="/dashboard/order-approvals" element={<OrderApprovalsPage />} />
                <Route path="/dashboard/client-users" element={<ClientUsersPage />} />
                <Route path="/dashboard/b2b-portal" element={<B2BPortalSettingsPage />} />
                <Route path="/dashboard/b2b-stock" element={<B2BStockPage />} />
                <Route path="/dashboard/store-orders" element={<StoreOrdersPage />} />
                <Route path="/dashboard/store-orders/:id" element={<StoreOrderDetailPage />} />
                <Route path="/dashboard/store-settings" element={<StoreSettingsPage />} />
                <Route path="/dashboard/store-products" element={<StoreProductsAdminPage />} />
                <Route path="/dashboard/store-categories" element={<StoreCategoriesPage />} />
                <Route path="/dashboard/store-coupons" element={<StoreCouponsPage />} />
                <Route path="/dashboard/store-analytics" element={<StoreAnalyticsPage />} />
                
                {/* Mobile Quick Product Creator */}
                <Route path="/mobile/products/quick-create" element={<MobileQuickProductCreate />} />
                
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
                <Route path="/dashboard/c2c/seller-area" element={<C2CSellerArea />} />
                <Route path="/dashboard/c2c/affiliates" element={<C2CAffiliateCenter />} />
                <Route path="/dashboard/c2c/referrals" element={<C2CReferralCenter />} />
                <Route path="/dashboard/c2c/affiliate-admin" element={<C2CAffiliateAdmin />} />
                <Route path="/dashboard/c2c/notifications" element={<C2CNotifications />} />
                <Route path="/dashboard/c2c/seller/:sellerId" element={<C2CSellerProfile />} />
                <Route path="/dashboard/c2c/edit/:id" element={<C2CEditListing />} />
                <Route path="/dashboard/c2c/:id" element={<C2CListingDetail />} />
                
                {/* FastClub - redirect old paths */}
                <Route path="/dashboard/fastclub" element={<Navigate to="/club/fastclub" replace />} />
                <Route path="/dashboard/fastclub/candidaturas" element={<FastClubApplicationsPage />} />
                <Route path="/dashboard/fastclub/*" element={<Navigate to="/club/fastclub" replace />} />
                
                {/* FastMatch Discovery (CRM) */}
                <Route path="/dashboard/fastmatch" element={<FastMatchDiscoveryPage />} />

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
                {/* Vertical Landing Pages (static + dynamic, catch-all at the end) */}
                <Route path="/clinicas" element={<VerticalLandingPage />} />
                <Route path="/imobiliarias" element={<VerticalLandingPage />} />
                <Route path="/formacao" element={<VerticalLandingPage />} />
                <Route path="/condominios" element={<VerticalLandingPage />} />
                <Route path="/agencias" element={<VerticalLandingPage />} />
                <Route path="/empresas" element={<VerticalLandingPage />} />
                <Route path="/event-rsvp" element={<EventRsvpResponse />} />
                <Route path="/invite/:token" element={<AcceptWorkspaceInvite />} />
                <Route path="/marketplace" element={<Navigate to="/dashboard/marketplace" replace />} />
                <Route path="/:slug" element={<VerticalLandingPage />} />
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
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false}>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <GTMProvider containerId="GTM-WLVH4TJJ">
            <MetaPixelLoader />
            <Routes>
              {/* Public Bio Pages */}
              <Route path="/bio/:workspaceSlug/:pageSlug" element={<PublicBioPage />} />
              <Route path="/b/:shortCode" element={<PublicBioShortLink />} />

              {/* Store - ISOLATED from CRM providers */}
              <Route path="/store/*" element={<StoreRoutes />} />
              
              {/* C2C Public Marketplace */}
              <Route path="/c2c/:workspaceSlug/:id" element={<C2CPublicListingDetail />} />
              <Route path="/c2c/:workspaceSlug" element={<C2CPublicMarketplace />} />
              <Route path="/c2c/:workspaceSlug/sell" element={<AuthProvider><C2CSellerRegistration /></AuthProvider>} />
              <Route path="/c2c/:workspaceSlug/sponsor" element={<AuthProvider><C2CSponsorPortal /></AuthProvider>} />
              <Route path="/c2c/:workspaceSlug/invite/:token" element={<C2CSellerInviteActivation />} />
              <Route path="/c2c/:workspaceSlug/seller/:sellerId" element={<C2CPublicSellerProfile />} />

              {/* Supplier Portal (public, token-based) */}
              <Route path="/supplier-portal/:token" element={<SupplierPortalPage />} />
              
              {/* Public FastClub Landing */}
              <Route path="/fastclub" element={<FastClubLandingPage />} />
              <Route path="/club/fastclub/apply" element={<FastClubApplyPage />} />
              
              {/* FastClub Portal Routes - BEFORE /club/:slug to prevent catch-all */}
              <Route path="/club/fastclub" element={
                <AuthProvider>
                  <WorkspaceProvider>
                    <WorkspaceInstanceProvider>
                      <ActivityProfileProvider>
                        <SubscriptionProvider>
                          <ClubLayout><Outlet /></ClubLayout>
                        </SubscriptionProvider>
                      </ActivityProfileProvider>
                    </WorkspaceInstanceProvider>
                  </WorkspaceProvider>
                </AuthProvider>
              }>
                <Route index element={<FastClubPage />} />
                <Route path="forum" element={<ForumPage />} />
                <Route path="forum/:topicId" element={<ForumTopicPage />} />
                <Route path="rewards" element={<LoyaltyPage />} />
                <Route path="start-here" element={<StartHerePage />} />
                <Route path="metodo-pare" element={<MetodoParePage />} />
                <Route path="metodo-pare/planeamento" element={<PlaneamentoParePage />} />
                <Route path="metodo-pare/automacao" element={<AutomacaoParePage />} />
                <Route path="metodo-pare/resultados" element={<ResultadosParePage />} />
                <Route path="metodo-pare/eficiencia" element={<EficienciaParePage />} />
                <Route path="demos" element={<DemosPage />} />
                <Route path="demos/demonstracoes" element={<DemonstracoesPage />} />
                <Route path="demos/casos-praticos" element={<CasosPraticosPage />} />
                <Route path="demos/roadmap" element={<RoadmapFCPage />} />
                <Route path="desafio-7-dias" element={<DesafioPage />} />
                <Route path="resultados" element={<ResultadosPage />} />
                <Route path="rede-privada" element={<RedePrivadaPage />} />
                <Route path="rede-privada/como-funciona" element={<ComoFuncionaPage />} />
                <Route path="rede-privada/otimizar-perfil" element={<OtimizarPerfilPage />} />
                <Route path="rede-privada/indicadores" element={<IndicadoresPage />} />
                <Route path="rede-privada/negocios-fechados" element={<NegociosFechadosPage />} />
                <Route path="rede-privada/estrategias" element={<EstrategiasPage />} />
                <Route path="anuncios" element={<AnunciosPage />} />
                <Route path="atualizacoes" element={<AtualizacoesPage />} />
                <Route path="missao-semana" element={<MissaoSemanaPage />} />
                <Route path="implementacao" element={<ImplementacaoPage />} />
                <Route path="ia-avancada" element={<IAAvancadaPage />} />
                <Route path="fastmatch" element={<FastMatchPage />} />
                <Route path="laboratorio" element={<LaboratorioPage />} />
                <Route path="hot-seats" element={<HotSeatsPage />} />
              </Route>

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
    </ThemeProvider>
  </HelmetProvider>
);

export default App;
