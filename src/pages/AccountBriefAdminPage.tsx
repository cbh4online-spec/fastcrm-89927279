import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { ModuleGuard } from "@/components/guards/ModuleGuard";
import { PageHeader } from "@/components/common/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Shield } from "lucide-react";

export default function AccountBriefAdminPage() {
  return (
    <ModuleGuard moduleSlug="account-brief" moduleName="Account Brief">
      <DashboardLayout>
        <div className="space-y-6">
          <PageHeader title="Account Brief — Admin" description="Gestão técnica e operacional do módulo" />
          <Card className="border-0 shadow-lg">
            <CardContent className="flex flex-col items-center justify-center py-16 text-center">
              <Shield className="w-12 h-12 text-muted-foreground/30 mb-4" />
              <h3 className="text-lg font-semibold mb-1">Área Administrativa</h3>
              <p className="text-sm text-muted-foreground">Funcionalidades de administração serão adicionadas nas próximas fases.</p>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    </ModuleGuard>
  );
}
