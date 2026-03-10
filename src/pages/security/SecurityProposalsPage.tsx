import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { FileText, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function SecurityProposalsPage() {
  const { t } = useTranslation("security");
  const navigate = useNavigate();

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <FileText className="h-7 w-7 text-primary" />
            <h1 className="text-2xl font-bold">{t("proposals")}</h1>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Propostas de Segurança</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              As propostas de segurança utilizam o motor de propostas existente do FastCRM, filtradas por vertical.
              Aceda às propostas gerais para criar ou consultar propostas relacionadas com Security Ops.
            </p>
            <div className="flex gap-3">
              <Button onClick={() => navigate("/dashboard/proposals")} className="gap-2">
                <ArrowRight className="h-4 w-4" />
                Ver Propostas
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
