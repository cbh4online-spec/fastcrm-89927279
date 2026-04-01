import { Helmet } from "react-helmet-async";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { StoreAnalyticsShell } from "@/components/store/analytics/StoreAnalyticsShell";

export default function StoreAnalyticsPage() {
  return (
    <DashboardLayout>
      <Helmet>
        <title>Analytics da Loja | FastCRM</title>
      </Helmet>
      <StoreAnalyticsShell />
    </DashboardLayout>
  );
}
