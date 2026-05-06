import { lazy } from "react";
import { Route, Navigate } from "react-router-dom";

const Inbox = lazy(() => import("@/pages/Inbox"));
const InboxSnippets = lazy(() => import("@/pages/InboxSnippets"));
const WhatsAppOpsDashboard = lazy(() => import("@/pages/WhatsAppOpsDashboard"));
const WhatsAppPro = lazy(() => import("@/pages/WhatsAppPro"));
const Groups = lazy(() => import("@/pages/Groups"));
const TelegramPage = lazy(() => import("@/pages/TelegramPage"));
const CommunicationTemplates = lazy(() => import("@/pages/CommunicationTemplates"));
const Sequences = lazy(() => import("@/pages/Sequences"));
const EmailCampaignsPage = lazy(() => import("@/pages/EmailCampaignsPage"));
const SuppressionsPage = lazy(() => import("@/pages/SuppressionsPage"));
const SmartWorkflowsPage = lazy(() => import("@/pages/SmartWorkflowsPage"));

export function CommunicationRoutes() {
  return (
    <>
      <Route path="/dashboard/inbox" element={<Inbox />} />
      <Route path="/dashboard/inbox/snippets" element={<InboxSnippets />} />
      <Route path="/dashboard/whatsapp/ops" element={<WhatsAppOpsDashboard />} />
      <Route path="/dashboard/inbox/ops" element={<WhatsAppOpsDashboard />} />
      <Route path="/dashboard/whatsapp-pro" element={<WhatsAppPro />} />
      <Route path="/dashboard/whatsapp" element={<Navigate to="/dashboard/whatsapp-pro" replace />} />
      <Route path="/dashboard/groups" element={<Groups />} />
      <Route path="/dashboard/telegram" element={<TelegramPage />} />
      <Route path="/dashboard/communication/templates" element={<CommunicationTemplates />} />
      <Route path="/dashboard/sequences" element={<Sequences />} />
      <Route path="/dashboard/email-campaigns" element={<EmailCampaignsPage />} />
      <Route path="/dashboard/email-campaigns/suppressions" element={<SuppressionsPage />} />
    </>
  );
}
