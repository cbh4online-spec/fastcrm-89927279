import { useParams } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { OpportunityDetailPage } from "@/components/opportunities/OpportunityDetailPage";

export default function OpportunityDetail() {
  const { id } = useParams<{ id: string }>();

  return (
    <DashboardLayout>
      <OpportunityDetailPage opportunityId={id} />
    </DashboardLayout>
  );
}
