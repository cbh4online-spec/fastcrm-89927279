import { lazy } from "react";
import { Route, Navigate } from "react-router-dom";

const Automations = lazy(() => import("@/pages/Automations"));
const Funnels = lazy(() => import("@/pages/Funnels"));
const NurtureDashboardPage = lazy(() => import("@/pages/NurtureDashboardPage"));
const EbooksPage = lazy(() => import("@/pages/EbooksPage"));
const EbookTemplateGalleryPage = lazy(() => import("@/pages/EbookTemplateGalleryPage"));
const EbookTemplatesAdminPage = lazy(() => import("@/pages/EbookTemplatesAdminPage"));
const BioOS = lazy(() => import("@/pages/BioOS"));
const FormStudioPage = lazy(() => import("@/pages/FormStudioPage"));
const Marketing = lazy(() => import("@/pages/Marketing"));
const CustomerLifecyclePage = lazy(() => import("@/pages/CustomerLifecyclePage"));

export function SalesMarketingRoutes() {
  return (
    <>
      <Route path="/dashboard/automations" element={<Automations />} />
      <Route path="/dashboard/funnels" element={<Funnels />} />
      <Route path="/dashboard/funnels/nurture" element={<NurtureDashboardPage />} />
      <Route path="/dashboard/ebooks" element={<EbooksPage />} />
      <Route path="/dashboard/ebooks/templates" element={<EbookTemplateGalleryPage />} />
      <Route path="/dashboard/ebooks/templates/admin" element={<EbookTemplatesAdminPage />} />
      <Route path="/dashboard/bio" element={<BioOS />} />
      <Route path="/dashboard/landing-pages" element={<Navigate to="/dashboard/funnels" replace />} />
      <Route path="/dashboard/form-studio" element={<FormStudioPage />} />
      <Route path="/dashboard/marketing" element={<Marketing />} />
      <Route path="/dashboard/lifecycle" element={<CustomerLifecyclePage />} />
    </>
  );
}
