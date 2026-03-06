import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { WizardShell } from "@/components/context-os/WizardShell";
import { ContextOSHub } from "@/components/context-os/ContextOSHub";
import { useBusinessContext } from "@/hooks/useBusinessContext";
import { useContextScore } from "@/hooks/useContextScore";
import { Loader2 } from "lucide-react";

export default function ContextOSPage() {
  const { data, isLoading, isConfigured } = useBusinessContext();
  const { globalScore } = useContextScore(data);

  return (
    <DashboardLayout>
      <div className="p-4 md:p-8">
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : !isConfigured || globalScore < 30 ? (
          <WizardShell initialData={data} />
        ) : (
          <ContextOSHub data={data} />
        )}
      </div>
    </DashboardLayout>
  );
}
