import { lazy } from "react";
import { Route, Navigate } from "react-router-dom";

const Leads = lazy(() => import("@/pages/Leads"));
const LeadDetail = lazy(() => import("@/pages/LeadDetail"));
const Contacts = lazy(() => import("@/pages/Contacts"));
const ContactDetail = lazy(() => import("@/pages/ContactDetail"));
const Companies = lazy(() => import("@/pages/Companies"));
const CompanyDetail = lazy(() => import("@/pages/CompanyDetail"));
const OpportunitiesPage = lazy(() => import("@/pages/OpportunitiesPage"));
const OpportunityDetail = lazy(() => import("@/pages/OpportunityDetail"));
const Crm = lazy(() => import("@/pages/Crm"));
const Proposals = lazy(() => import("@/pages/Proposals"));
const ProposalDetail = lazy(() => import("@/pages/ProposalDetail"));
const Products = lazy(() => import("@/pages/Products"));
const Packages = lazy(() => import("@/pages/Packages"));
const BundlesPage = lazy(() => import("@/pages/BundlesPage"));
const Invoices = lazy(() => import("@/pages/Invoices"));
const InvoiceDetail = lazy(() => import("@/pages/InvoiceDetail"));
const Payments = lazy(() => import("@/pages/Payments"));
const RenewalsPage = lazy(() => import("@/pages/RenewalsPage"));
const RenewalDetailPage = lazy(() => import("@/pages/RenewalDetailPage"));
const ProspectingHub = lazy(() => import("@/pages/ProspectingHub"));
const GoogleLocalProspecting = lazy(() => import("@/pages/GoogleLocalProspecting"));
const WebSearchProspecting = lazy(() => import("@/pages/WebSearchProspecting"));
const ProfessionalProspecting = lazy(() => import("@/pages/ProfessionalProspecting"));
const CompetitorTrackerPage = lazy(() => import("@/pages/CompetitorTrackerPage"));
const LeadEnricher = lazy(() => import("@/pages/LeadEnricher"));
const Inbox = lazy(() => import("@/pages/Inbox"));
const Groups = lazy(() => import("@/pages/Groups"));
const TelegramPage = lazy(() => import("@/pages/TelegramPage"));
const CommunicationTemplates = lazy(() => import("@/pages/CommunicationTemplates"));
const Sequences = lazy(() => import("@/pages/Sequences"));
const EmailCampaignsPage = lazy(() => import("@/pages/EmailCampaignsPage"));
const SuppressionsPage = lazy(() => import("@/pages/SuppressionsPage"));
const Automations = lazy(() => import("@/pages/Automations"));
const Funnels = lazy(() => import("@/pages/Funnels"));
const BioOS = lazy(() => import("@/pages/BioOS"));
const FormStudioPage = lazy(() => import("@/pages/FormStudioPage"));
const Imports = lazy(() => import("@/pages/Imports"));
const SchedulingPage = lazy(() => import("@/pages/SchedulingPage"));
const MeetingTranscriptPage = lazy(() => import("@/pages/MeetingTranscriptPage"));
const FeedPage = lazy(() => import("@/pages/FeedPage"));
const ProductivityPage = lazy(() => import("@/pages/ProductivityPage"));
const MemberPanelPage = lazy(() => import("@/pages/MemberPanelPage"));
const Profile = lazy(() => import("@/pages/Profile"));
const Marketing = lazy(() => import("@/pages/Marketing"));
const CustomerLifecyclePage = lazy(() => import("@/pages/CustomerLifecyclePage"));
const EventsManagementPage = lazy(() => import("@/components/events/EventsManagementPage"));
const EventDetailPage = lazy(() => import("@/components/events/EventDetailPage"));
const FastMatchDiscoveryPage = lazy(() => import("@/pages/fastmatch/FastMatchDiscoveryPage"));

export function SalesCRMRoutes() {
  return (
    <>
      {/* CRM Core */}
      <Route path="/dashboard/leads" element={<Leads />} />
      <Route path="/dashboard/leads/:id" element={<LeadDetail />} />
      <Route path="/dashboard/contacts" element={<Contacts />} />
      <Route path="/dashboard/contacts/:id" element={<ContactDetail />} />
      <Route path="/dashboard/companies" element={<Companies />} />
      <Route path="/dashboard/companies/:id" element={<CompanyDetail />} />
      <Route path="/dashboard/opportunities" element={<OpportunitiesPage />} />
      <Route path="/dashboard/opportunities/:id" element={<OpportunityDetail />} />
      <Route path="/dashboard/crm" element={<Crm />} />
      
      {/* Proposals & Products */}
      <Route path="/dashboard/proposals" element={<Proposals />} />
      <Route path="/dashboard/proposals/:id" element={<ProposalDetail />} />
      <Route path="/dashboard/products" element={<Products />} />
      <Route path="/dashboard/b2b-products" element={<Products />} />
      <Route path="/dashboard/packages" element={<Packages />} />
      <Route path="/dashboard/bundles" element={<BundlesPage />} />
      <Route path="/dashboard/imports" element={<Imports />} />
      
      {/* Invoices & Payments */}
      <Route path="/dashboard/invoices" element={<Invoices />} />
      <Route path="/dashboard/invoices/:id" element={<InvoiceDetail />} />
      <Route path="/dashboard/payments" element={<Payments />} />
      <Route path="/dashboard/renewals" element={<RenewalsPage />} />
      <Route path="/dashboard/renewals/:id" element={<RenewalDetailPage />} />
      
      {/* Prospecting */}
      <Route path="/dashboard/prospecting" element={<ProspectingHub />} />
      <Route path="/dashboard/prospecting/google-local" element={<GoogleLocalProspecting />} />
      <Route path="/dashboard/prospecting/web-search" element={<WebSearchProspecting />} />
      <Route path="/dashboard/prospecting/professionals" element={<ProfessionalProspecting />} />
      <Route path="/dashboard/competitors" element={<CompetitorTrackerPage />} />
      <Route path="/dashboard/lead-enricher" element={<LeadEnricher />} />
      <Route path="/dashboard/fastmatch" element={<FastMatchDiscoveryPage />} />
      
      {/* Communication */}
      <Route path="/dashboard/inbox" element={<Inbox />} />
      <Route path="/dashboard/whatsapp" element={<Navigate to="/dashboard/inbox?channel=whatsapp" replace />} />
      <Route path="/dashboard/groups" element={<Groups />} />
      <Route path="/dashboard/telegram" element={<TelegramPage />} />
      <Route path="/dashboard/communication/templates" element={<CommunicationTemplates />} />
      <Route path="/dashboard/sequences" element={<Sequences />} />
      <Route path="/dashboard/email-campaigns" element={<EmailCampaignsPage />} />
      <Route path="/dashboard/email-campaigns/suppressions" element={<SuppressionsPage />} />
      
      {/* Marketing & Funnels */}
      <Route path="/dashboard/automations" element={<Automations />} />
      <Route path="/dashboard/funnels" element={<Funnels />} />
      <Route path="/dashboard/bio" element={<BioOS />} />
      <Route path="/dashboard/landing-pages" element={<Navigate to="/dashboard/funnels" replace />} />
      <Route path="/dashboard/form-studio" element={<FormStudioPage />} />
      <Route path="/dashboard/marketing" element={<Marketing />} />
      <Route path="/dashboard/lifecycle" element={<CustomerLifecyclePage />} />
      
      {/* Scheduling */}
      <Route path="/dashboard/scheduling" element={<SchedulingPage />} />
      <Route path="/dashboard/calendars" element={<Navigate to="/dashboard/scheduling" replace />} />
      <Route path="/dashboard/meetings" element={<Navigate to="/dashboard/scheduling" replace />} />
      <Route path="/dashboard/services" element={<Navigate to="/dashboard/scheduling" replace />} />
      <Route path="/dashboard/availability" element={<Navigate to="/dashboard/scheduling" replace />} />
      <Route path="/dashboard/meetings/:meetingId/transcript" element={<MeetingTranscriptPage />} />
      
      {/* Events */}
      <Route path="/dashboard/events" element={<EventsManagementPage />} />
      <Route path="/dashboard/events/:eventId" element={<EventDetailPage />} />
      
      {/* Misc */}
      <Route path="/dashboard/feed" element={<FeedPage />} />
      <Route path="/dashboard/productivity" element={<ProductivityPage />} />
      <Route path="/dashboard/member" element={<MemberPanelPage />} />
      <Route path="/dashboard/profile" element={<Profile />} />
    </>
  );
}
