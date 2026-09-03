import { lazy } from "react";
import { Route, Navigate } from "react-router-dom";

const Inbox = lazy(() => import("@/pages/Inbox"));
const InboxSnippets = lazy(() => import("@/pages/InboxSnippets"));
const WhatsAppOpsDashboard = lazy(() => import("@/pages/WhatsAppOpsDashboard"));
const WhatsAppPro = lazy(() => import("@/pages/WhatsAppPro"));
const WhatsAppCampaignsPage = lazy(() => import("@/pages/WhatsAppCampaignsPage"));
const WhatsAppAnalyticsPage = lazy(() => import("@/pages/WhatsAppAnalyticsPage"));
const WhatsAppTemplatesPage = lazy(() => import("@/pages/WhatsAppTemplatesPage"));
const WhatsAppSequencesPage = lazy(() => import("@/pages/WhatsAppSequencesPage"));
const WhatsAppSequenceEditorPage = lazy(() => import("@/pages/WhatsAppSequenceEditorPage"));
const WhatsAppInboxPage = lazy(() => import("@/pages/WhatsAppInboxPage"));
const WhatsAppScheduledPage = lazy(() => import("@/pages/WhatsAppScheduledPage"));
const WhatsAppQuickRepliesPage = lazy(() => import("@/pages/WhatsAppQuickRepliesPage"));
const WhatsAppCatalogPage = lazy(() => import("@/pages/WhatsAppCatalogPage"));
const WhatsAppBotRulesPage = lazy(() => import("@/pages/WhatsAppBotRulesPage"));
const WhatsAppContactsImportPage = lazy(() => import("@/pages/WhatsAppContactsImportPage"));
const WhatsAppSegmentsPage = lazy(() => import("@/pages/WhatsAppSegmentsPage"));
const WhatsAppConsentPage = lazy(() => import("@/pages/WhatsAppConsentPage"));
const WhatsAppQuickTemplatesPage = lazy(() => import("@/pages/WhatsAppQuickTemplatesPage"));
const WhatsAppRecurringPage = lazy(() => import("@/pages/WhatsAppRecurringPage"));
const WhatsAppThrottlePage = lazy(() => import("@/pages/WhatsAppThrottlePage"));
const WhatsAppGroupsPage = lazy(() => import("@/pages/WhatsAppGroupsPage"));
const Groups = lazy(() => import("@/pages/Groups"));
const TelegramPage = lazy(() => import("@/pages/TelegramPage"));
const CommunicationTemplates = lazy(() => import("@/pages/CommunicationTemplates"));
const Sequences = lazy(() => import("@/pages/Sequences"));
const EmailCampaignsPage = lazy(() => import("@/pages/EmailCampaignsPage"));
const SuppressionsPage = lazy(() => import("@/pages/SuppressionsPage"));
const SmartWorkflowsPage = lazy(() => import("@/pages/SmartWorkflowsPage"));
const CostGuardPage = lazy(() => import("@/pages/CostGuardPage"));
const MyPlanPage = lazy(() => import("@/pages/MyPlanPage"));
const PlansComparisonPage = lazy(() => import("@/pages/PlansComparisonPage"));
const BillingPlansAdminPage = lazy(() => import("@/pages/admin/BillingPlansAdminPage"));
const VoiceHubPage = lazy(() => import("@/pages/VoiceHubPage"));
const ExecutiveCommandDashboard = lazy(() => import("@/pages/ExecutiveCommandDashboard"));
const PlanManagementPage = lazy(() => import("@/pages/PlanManagementPage"));
const WorkspacePlanPage = lazy(() => import("@/pages/WorkspacePlanPage"));
const OnboardingProjectsPage = lazy(() => import("@/pages/OnboardingProjectsPage"));
const OnboardingProjectDetailPage = lazy(() => import("@/pages/OnboardingProjectDetailPage"));
const DeliveryProjectsPage = lazy(() => import("@/pages/DeliveryProjectsPage"));
const DeliveryProjectDetailPage = lazy(() => import("@/pages/DeliveryProjectDetailPage"));
const CustomerSuccessPage = lazy(() => import("@/pages/CustomerSuccessPage"));
const CustomerAccountDetailPage = lazy(() => import("@/pages/CustomerAccountDetailPage"));
const KernelAdminPage = lazy(() => import("@/pages/KernelAdminPage"));
const ProductAuditPage = lazy(() => import("@/pages/admin/ProductAuditPage"));

export function CommunicationRoutes() {
  return (
    <>
      <Route path="/dashboard/inbox" element={<Inbox />} />
      <Route path="/dashboard/inbox/snippets" element={<InboxSnippets />} />
      <Route path="/dashboard/whatsapp/ops" element={<WhatsAppOpsDashboard />} />
      <Route path="/dashboard/inbox/ops" element={<Navigate to="/dashboard/whatsapp/ops" replace />} />

      <Route path="/dashboard/whatsapp-pro" element={<WhatsAppPro />} />
      <Route path="/dashboard/whatsapp-pro/campaigns" element={<WhatsAppCampaignsPage />} />
      <Route path="/dashboard/whatsapp-pro/analytics" element={<WhatsAppAnalyticsPage />} />
      <Route path="/dashboard/whatsapp-pro/templates" element={<WhatsAppTemplatesPage />} />
      <Route path="/dashboard/whatsapp-pro/sequences" element={<WhatsAppSequencesPage />} />
      <Route path="/dashboard/whatsapp-pro/sequences/:id" element={<WhatsAppSequenceEditorPage />} />
      <Route path="/dashboard/whatsapp-pro/inbox" element={<WhatsAppInboxPage />} />
      <Route path="/dashboard/whatsapp-pro/scheduled" element={<WhatsAppScheduledPage />} />
      <Route path="/dashboard/whatsapp-pro/quick-replies" element={<WhatsAppQuickRepliesPage />} />
      <Route path="/dashboard/whatsapp-pro/catalog" element={<WhatsAppCatalogPage />} />
      <Route path="/dashboard/whatsapp-pro/bot-rules" element={<WhatsAppBotRulesPage />} />
      <Route path="/dashboard/whatsapp-pro/contacts-import" element={<WhatsAppContactsImportPage />} />
      <Route path="/dashboard/whatsapp-pro/segments" element={<WhatsAppSegmentsPage />} />
      <Route path="/dashboard/whatsapp-pro/consent" element={<WhatsAppConsentPage />} />
      <Route path="/dashboard/whatsapp-pro/quick-templates" element={<WhatsAppQuickTemplatesPage />} />
      <Route path="/dashboard/whatsapp-pro/recurring" element={<WhatsAppRecurringPage />} />
      <Route path="/dashboard/whatsapp-pro/throttle" element={<WhatsAppThrottlePage />} />
      <Route path="/dashboard/whatsapp-pro/groups" element={<WhatsAppGroupsPage />} />
      <Route path="/dashboard/whatsapp" element={<Navigate to="/dashboard/whatsapp-pro" replace />} />
      <Route path="/dashboard/groups" element={<Groups />} />
      <Route path="/dashboard/telegram" element={<TelegramPage />} />
      <Route path="/dashboard/voicehub" element={<VoiceHubPage />} />
      <Route path="/dashboard/communication/executive" element={<ExecutiveCommandDashboard />} />
      <Route path="/dashboard/executive-command" element={<ExecutiveCommandDashboard />} />
      <Route path="/dashboard/communication/templates" element={<CommunicationTemplates />} />
      <Route path="/dashboard/sequences" element={<Sequences />} />
      <Route path="/dashboard/email-campaigns" element={<EmailCampaignsPage />} />
      <Route path="/dashboard/email-campaigns/suppressions" element={<SuppressionsPage />} />
      <Route path="/dashboard/communication/automations" element={<SmartWorkflowsPage />} />
      <Route path="/dashboard/smart-workflows" element={<SmartWorkflowsPage />} />
      <Route path="/dashboard/cost-guard" element={<CostGuardPage />} />
      <Route path="/dashboard/communication/cost-guard" element={<CostGuardPage />} />
      <Route path="/dashboard/settings/plan" element={<MyPlanPage />} />
      <Route path="/dashboard/plans" element={<PlansComparisonPage />} />
      <Route path="/admin/billing-plans" element={<BillingPlansAdminPage />} />
      <Route path="/admin/plan-management" element={<PlanManagementPage />} />
      <Route path="/dashboard/settings/workspace-plan" element={<WorkspacePlanPage />} />
      <Route path="/dashboard/onboarding" element={<OnboardingProjectsPage />} />
      <Route path="/dashboard/onboarding/:id" element={<OnboardingProjectDetailPage />} />
      <Route path="/dashboard/delivery/projects" element={<DeliveryProjectsPage />} />
      <Route path="/dashboard/delivery/projects/:id" element={<DeliveryProjectDetailPage />} />
      <Route path="/dashboard/customer-success" element={<CustomerSuccessPage />} />
      <Route path="/dashboard/customer-success/:id" element={<CustomerAccountDetailPage />} />
      <Route path="/admin/kernel" element={<KernelAdminPage />} />
      <Route path="/admin/product-audit" element={<ProductAuditPage />} />
    </>
  );
}
