import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { WizardShell } from "@/components/context-os/WizardShell";
import { useBusinessContext } from "@/hooks/useBusinessContext";
import { Loader2 } from "lucide-react";

export default function ContextOSPage() {
  const { data, isLoading } = useBusinessContext();

  return (
    <DashboardLayout>
      <div className="p-4 md:p-8">
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-gold" />
          </div>
        ) : (
          <WizardShell initialData={data} />
        )}
      </div>
    </DashboardLayout>
  );
}
