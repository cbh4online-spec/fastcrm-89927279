import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useTranslation } from "react-i18next";
import { useSecurityRenewals } from "@/hooks/security/useSecurityRenewals";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RefreshCw } from "lucide-react";
import { format } from "date-fns";

const stageColors: Record<string, string> = {
  upcoming_90: "secondary",
  upcoming_60: "outline",
  upcoming_30: "destructive",
  proposal_sent: "default",
  negotiation: "default",
  renewed: "secondary",
  lost: "destructive",
  expired: "secondary",
};

const stageGroups = {
  active: ["upcoming_90", "upcoming_60", "upcoming_30", "proposal_sent", "negotiation"],
  completed: ["renewed", "lost", "expired"],
};

export default function SecurityRenewalsPage() {
  const { t } = useTranslation("security");
  const { renewals, isLoading } = useSecurityRenewals();

  const activeRenewals = renewals.filter((r: any) => stageGroups.active.includes(r.renewal_stage));
  const completedRenewals = renewals.filter((r: any) => stageGroups.completed.includes(r.renewal_stage));

  const urgentCount = renewals.filter((r: any) => r.renewal_stage === "upcoming_30").length;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <RefreshCw className="h-7 w-7 text-primary" />
          <h1 className="text-2xl font-bold">{t("renewals")}</h1>
        </div>

        {/* KPI Row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold">{renewals.length}</p>
              <p className="text-xs text-muted-foreground">{t("total")}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-destructive">{urgentCount}</p>
              <p className="text-xs text-muted-foreground">{t("renewalStageUpcoming30")}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold">{activeRenewals.length}</p>
              <p className="text-xs text-muted-foreground">Em Curso</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold">{renewals.filter((r: any) => r.renewal_stage === "renewed").length}</p>
              <p className="text-xs text-muted-foreground">{t("renewalStageRenewed")}</p>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="active">
          <TabsList>
            <TabsTrigger value="active">Em Curso ({activeRenewals.length})</TabsTrigger>
            <TabsTrigger value="completed">Concluídas ({completedRenewals.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="active" className="space-y-3 mt-4">
            {isLoading ? (
              <div className="text-center py-12 text-muted-foreground">A carregar...</div>
            ) : activeRenewals.length === 0 ? (
              <Card><CardContent className="py-12 text-center"><p className="text-muted-foreground">Nenhuma renovação em curso</p></CardContent></Card>
            ) : (
              activeRenewals.map((r: any) => <RenewalCard key={r.id} renewal={r} t={t} />)
            )}
          </TabsContent>

          <TabsContent value="completed" className="space-y-3 mt-4">
            {completedRenewals.length === 0 ? (
              <Card><CardContent className="py-12 text-center"><p className="text-muted-foreground">Nenhuma renovação concluída</p></CardContent></Card>
            ) : (
              completedRenewals.map((r: any) => <RenewalCard key={r.id} renewal={r} t={t} />)
            )}
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}

function RenewalCard({ renewal, t }: { renewal: any; t: any }) {
  const contract = renewal.security_contracts as any;
  const sys = contract?.security_systems as any;
  const site = sys?.security_installation_sites as any;

  const stageKey = `renewalStage${renewal.renewal_stage
    .split("_")
    .map((w: string) => w.charAt(0).toUpperCase() + w.slice(1))
    .join("")}` as any;

  return (
    <Card className={renewal.renewal_stage === "upcoming_30" ? "border-destructive/50" : ""}>
      <CardContent className="p-4 flex items-center justify-between">
        <div>
          <p className="font-medium">{site?.site_name || "Renovação"}</p>
          <p className="text-sm text-muted-foreground">
            {contract?.contract_type || "—"}
            {renewal.renewal_due_date && ` · Vence: ${format(new Date(renewal.renewal_due_date), "dd/MM/yyyy")}`}
          </p>
        </div>
        <Badge variant={(stageColors[renewal.renewal_stage] || "secondary") as any}>
          {t(stageKey) || renewal.renewal_stage}
        </Badge>
      </CardContent>
    </Card>
  );
}
