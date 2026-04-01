import { lazy } from "react";
import { Route, Navigate } from "react-router-dom";

const Inbox = lazy(() => import("@/pages/Inbox"));
const Groups = lazy(() => import("@/pages/Groups"));
const TelegramPage = lazy(() => import("@/pages/TelegramPage"));
const CommunicationTemplates = lazy(() => import("@/pages/CommunicationTemplates"));
const Sequences = lazy(() => import("@/pages/Sequences"));
const EmailCampaignsPage = lazy(() => import("@/pages/EmailCampaignsPage"));
const SuppressionsPage = lazy(() => import("@/pages/SuppressionsPage"));

export function CommunicationRoutes() {
  return (
    <>
      <Route path="/dashboard/inbox" element={<Inbox />} />
      <Route path="/dashboard/whatsapp" element={<Navigate to="/dashboard/inbox?channel=whatsapp" replace />} />
      <Route path="/dashboard/groups" element={<Groups />} />
      <Route path="/dashboard/telegram" element={<TelegramPage />} />
      <Route path="/dashboard/communication/templates" element={<CommunicationTemplates />} />
      <Route path="/dashboard/sequences" element={<Sequences />} />
      <Route path="/dashboard/email-campaigns" element={<EmailCampaignsPage />} />
      <Route path="/dashboard/email-campaigns/suppressions" element={<SuppressionsPage />} />
    </>
  );
}
