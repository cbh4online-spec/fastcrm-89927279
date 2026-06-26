import { lazy } from "react";
import { Route } from "react-router-dom";

const Leads = lazy(() => import("@/pages/Leads"));
const LeadDetail = lazy(() => import("@/pages/LeadDetail"));
const Contacts = lazy(() => import("@/pages/Contacts"));
const ContactDetail = lazy(() => import("@/pages/ContactDetail"));
const NewContactPage = lazy(() => import("@/pages/contacts/NewContactPage"));
const Companies = lazy(() => import("@/pages/Companies"));
const CompanyDetail = lazy(() => import("@/pages/CompanyDetail"));
const Crm = lazy(() => import("@/pages/Crm"));
const Imports = lazy(() => import("@/pages/Imports"));
const GestoresPage = lazy(() => import("@/pages/dashboard/GestoresPage"));

export function SalesCoreRoutes() {
  return (
    <>
      <Route path="/dashboard/leads" element={<Leads />} />
      <Route path="/dashboard/leads/:id" element={<LeadDetail />} />
      <Route path="/dashboard/contacts" element={<Contacts />} />
      <Route path="/dashboard/contacts/new" element={<NewContactPage />} />
      <Route path="/dashboard/contacts/:id" element={<ContactDetail />} />
      <Route path="/dashboard/companies" element={<Companies />} />
      <Route path="/dashboard/companies/:id" element={<CompanyDetail />} />
      <Route path="/dashboard/crm" element={<Crm />} />
      <Route path="/dashboard/imports" element={<Imports />} />
      <Route path="/dashboard/gestores" element={<GestoresPage />} />
    </>
  );
}
