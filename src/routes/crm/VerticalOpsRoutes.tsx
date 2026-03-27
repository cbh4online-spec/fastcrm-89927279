import { lazy } from "react";
import { Route } from "react-router-dom";

const PublicLandingPage = lazy(() => import("@/pages/PublicLandingPage"));
const PublicProductSheet = lazy(() => import("@/pages/PublicProductSheet"));
const PublicProposalPage = lazy(() => import("@/pages/PublicProposalPage"));
const SuperAdmin = lazy(() => import("@/pages/SuperAdmin"));
const VerticalLandingPage = lazy(() => import("@/pages/VerticalLandingPage"));
const EventRsvpResponse = lazy(() => import("@/pages/EventRsvpResponse"));
const AcceptWorkspaceInvite = lazy(() => import("@/pages/AcceptWorkspaceInvite"));
const VisionDuoAcceptPage = lazy(() => import("@/pages/VisionDuoAcceptPage"));
const UnsubscribePage = lazy(() => import("@/pages/UnsubscribePage"));
const NotFound = lazy(() => import("@/pages/NotFound"));

export function VerticalOpsRoutes() {
  return (
    <>
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
      <Route path="/unsubscribe" element={<UnsubscribePage />} />
      <Route path="/invite/:token" element={<AcceptWorkspaceInvite />} />
      <Route path="/vision/duo/accept/:token" element={<VisionDuoAcceptPage />} />

      {/* Catch-all */}
      <Route path="/:slug" element={<VerticalLandingPage />} />
      <Route path="*" element={<NotFound />} />
    </>
  );
}
