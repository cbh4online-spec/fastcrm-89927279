import { useParams, Navigate } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { getObjectConfig } from "@/config/objectRegistry";
import { lazy, Suspense } from "react";
import { Loader2 } from "lucide-react";

const ENIContactDetailWithSidebar = lazy(() =>
  import("@/components/contacts/eni/ENIContactDetailWithSidebar").then(m => ({ default: m.ENIContactDetailWithSidebar }))
);
const CompanyDetailWithSidebar = lazy(() =>
  import("@/components/companies/CompanyDetailWithSidebar").then(m => ({ default: m.CompanyDetailWithSidebar }))
);
const OpportunityDetailPage = lazy(() =>
  import("@/components/opportunities/OpportunityDetailPage").then(m => ({ default: m.OpportunityDetailPage }))
);

const Loading = () => (
  <div className="flex justify-center py-12">
    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
  </div>
);

export default function ObjectDetailPage() {
  const { type, id } = useParams<{ type: string; id: string }>();
  const config = type ? getObjectConfig(type) : undefined;

  if (!config || !id) {
    return <Navigate to="/objects" replace />;
  }

  return (
    <DashboardLayout>
      <Suspense fallback={<Loading />}>
        {config.slug === "contacts" && <ENIContactDetailWithSidebar />}
        {config.slug === "companies" && <CompanyDetailWithSidebar />}
        {config.slug === "deals" && <OpportunityDetailPage opportunityId={id} />}
      </Suspense>
    </DashboardLayout>
  );
}
