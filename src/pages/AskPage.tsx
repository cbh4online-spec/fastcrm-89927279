import { useSearchParams } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { AskFastCRMInline } from "@/components/ask-fastcrm/AskFastCRMInline";

export default function AskPage() {
  const [searchParams] = useSearchParams();
  const initialQuery = searchParams.get("q") || undefined;

  return (
    <DashboardLayout>
      <AskFastCRMInline initialQuery={initialQuery} fullPage />
    </DashboardLayout>
  );
}
