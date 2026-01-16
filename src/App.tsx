import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { WorkspaceProvider } from "@/contexts/WorkspaceContext";
import { WorkspaceInstanceProvider } from "@/contexts/WorkspaceInstanceContext";
import { SubscriptionProvider } from "@/contexts/SubscriptionContext";
import Index from "./pages/Index";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import Onboarding from "./pages/Onboarding";
import Dashboard from "./pages/Dashboard";
import Settings from "./pages/Settings";
import Leads from "./pages/Leads";
import LeadDetail from "./pages/LeadDetail";
import OpportunitiesPage from "./pages/OpportunitiesPage";
import Inbox from "./pages/Inbox";
import Automations from "./pages/Automations";
import LandingPages from "./pages/LandingPages";
import PublicLandingPage from "./pages/PublicLandingPage";
import Proposals from "./pages/Proposals";
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
import KnowledgeBase from "./pages/KnowledgeBase";
import AIProfiles from "./pages/AIProfiles";
import FastCRMLanding from "./pages/FastCRMLanding";
import CommunicationTemplates from "./pages/CommunicationTemplates";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <WorkspaceProvider>
            <WorkspaceInstanceProvider>
              <SubscriptionProvider>
                <Routes>
                  <Route path="/" element={<FastCRMLanding />} />
                  <Route path="/login" element={<Login />} />
                  <Route path="/signup" element={<Signup />} />
                  <Route path="/onboarding" element={<Onboarding />} />
                  <Route path="/dashboard" element={<Dashboard />} />
                  <Route path="/dashboard/settings" element={<Settings />} />
                  <Route path="/dashboard/settings/:section" element={<Settings />} />
                  <Route path="/dashboard/leads" element={<Leads />} />
                  <Route path="/dashboard/leads/:id" element={<LeadDetail />} />
                  <Route path="/dashboard/opportunities" element={<OpportunitiesPage />} />
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
                  <Route path="/dashboard/products" element={<Products />} />
                  <Route path="/dashboard/packages" element={<Packages />} />
                  <Route path="/dashboard/imports" element={<Imports />} />
                  <Route path="/dashboard/payments" element={<Payments />} />
                  <Route path="/dashboard/invoices" element={<Invoices />} />
                  <Route path="/dashboard/knowledge-base" element={<KnowledgeBase />} />
                  <Route path="/dashboard/ai-profiles" element={<AIProfiles />} />
                  <Route path="/dashboard/kpis" element={<KPIs />} />
                  <Route path="/dashboard/communication/templates" element={<CommunicationTemplates />} />
                  <Route path="/dashboard/reports" element={<ReportsOverview />} />
                  <Route path="/dashboard/reports/forecasts" element={<ReportsForecasts />} />
                  <Route path="/dashboard/reports/consumption" element={<ReportsConsumption />} />
                  <Route path="/dashboard/reports/retention" element={<ReportsRetention />} />
                  <Route path="/p/:workspaceSlug/:pageSlug" element={<PublicLandingPage />} />
                  <Route path="/product/:slug" element={<PublicProductSheet />} />
                  <Route path="/p/:slug" element={<PublicProposalPage />} />
                  <Route path="/super-admin" element={<SuperAdmin />} />
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </SubscriptionProvider>
            </WorkspaceInstanceProvider>
          </WorkspaceProvider>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
