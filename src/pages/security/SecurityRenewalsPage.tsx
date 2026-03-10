import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { useSecurityRenewals } from "@/hooks/security/useSecurityRenewals";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RefreshCw, AlertTriangle, CheckCircle, XCircle, Clock, Phone, Zap } from "lucide-react";
import { format, differenceInDays } from "date-fns";
import { useState } from "react";

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

function getStageKey(stage: string) {
  return `renewalStage${stage.split("_").map((w: string) => w.charAt(0).toUpperCase() + w.slice(1)).join("")}`;
}

export default function SecurityRenewalsPage() {
  const { t } = useTranslation("security");
  const navigate = useNavigate();
  const { renewals, isLoading, triggerAutoCreate } = useSecurityRenewals();
  const [stageFilter, setStageFilter] = useState<string>("all");

  const filtered = stageFilter === "all" ? renewals : renewals.filter((r: any) => r.renewal_stage === stageFilter);
  const activeRenewals = filtered.filter((r: any) => stageGroups.active.includes(r.renewal_stage));
  const completedRenewals = filtered.filter((r: any) => stageGroups.completed.includes(r.renewal_stage));

  const urgentCount = renewals.filter((r: any) => r.renewal_stage === "upcoming_30").length;
  const renewedCount = renewals.filter((r: any) => r.renewal_stage === "renewed").length;
  const lostCount = renewals.filter((r: any) => r.renewal_stage === "lost").length;
  const totalValue = renewals.reduce((acc: number, r: any) => acc + (Number(r.renewal_value) || 0), 0);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <RefreshCw className="h-7 w-7 text-primary" />
            <h1 className="text-2xl font-bold">{t("renewals")}</h1>
          </div>
          <Button variant="outline" size="sm" onClick={() => triggerAutoCreate.mutate()} disabled={triggerAutoCreate.isPending}>
            <Zap className="h-4 w-4 mr-1" /> {t("renewalAutoDetect")}
          </Button>
        </div>

        {/* KPI Row */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold">{renewals.length}</p>
              <p className="text-xs text-muted-foreground">{t("total")}</p>
            </CardContent>
          </Card>
          <Card className={urgentCount > 0 ? "border-destructive/50" : ""}>
            <CardContent className="p-4 text-center">
              <AlertTriangle className={`h-4 w-4 mx-auto mb-1 ${urgentCount > 0 ? "text-destructive" : "text-muted-foreground"}`} />
              <p className="text-2xl font-bold text-destructive">{urgentCount}</p>
              <p className="text-xs text-muted-foreground">{t("renewalStageUpcoming30")}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <CheckCircle className="h-4 w-4 mx-auto mb-1 text-green-500" />
              <p className="text-2xl font-bold">{renewedCount}</p>
              <p className="text-xs text-muted-foreground">{t("renewalStageRenewed")}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <XCircle className="h-4 w-4 mx-auto mb-1 text-muted-foreground" />
              <p className="text-2xl font-bold">{lostCount}</p>
              <p className="text-xs text-muted-foreground">{t("renewalStageLost")}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold">{totalValue > 0 ? `€${totalValue.toFixed(0)}` : "—"}</p>
              <p className="text-xs text-muted-foreground">{t("renewalTotalValue")}</p>
            </CardContent>
          </Card>
        </div>

        {/* Filter */}
        <div className="flex gap-3 items-center">
          <Select value={stageFilter} onValueChange={setStageFilter}>
            <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("all")}</SelectItem>
              {[...stageGroups.active, ...stageGroups.completed].map((s) => (
                <SelectItem key={s} value={s}>{t(getStageKey(s))}</SelectItem>
              ))}
            </SelectContent>
          </Select>
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
              activeRenewals.map((r: any) => <RenewalCard key={r.id} renewal={r} t={t} onClick={() => navigate(`/dashboard/security/renewals/${r.id}`)} />)
            )}
          </TabsContent>

          <TabsContent value="completed" className="space-y-3 mt-4">
            {completedRenewals.length === 0 ? (
              <Card><CardContent className="py-12 text-center"><p className="text-muted-foreground">Nenhuma renovação concluída</p></CardContent></Card>
            ) : (
              completedRenewals.map((r: any) => <RenewalCard key={r.id} renewal={r} t={t} onClick={() => navigate(`/dashboard/security/renewals/${r.id}`)} />)
            )}
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}

function RenewalCard({ renewal, t, onClick }: { renewal: any; t: any; onClick: () => void }) {
  const contract = renewal.security_contracts as any;
  const sys = contract?.security_systems as any;
  const site = sys?.security_installation_sites as any;
  const client = contract?.security_clients as any;
  const daysUntilDue = renewal.renewal_due_date ? differenceInDays(new Date(renewal.renewal_due_date), new Date()) : null;

  return (
    <Card
      className={`cursor-pointer hover:shadow-md transition-shadow ${renewal.renewal_stage === "upcoming_30" ? "border-destructive/50" : ""}`}
      onClick={onClick}
    >
      <CardContent className="p-4 flex items-center justify-between gap-4">
        <div className="flex-1 min-w-0">
          <p className="font-medium truncate">{site?.site_name || client?.company_name || "Renovação"}</p>
          <p className="text-sm text-muted-foreground">
            {contract?.contract_type || "—"}
            {renewal.renewal_due_date && ` · Vence: ${format(new Date(renewal.renewal_due_date), "dd/MM/yyyy")}`}
          </p>
          <div className="flex items-center gap-3 mt-1">
            {daysUntilDue !== null && (
              <span className={`text-xs flex items-center gap-1 ${daysUntilDue <= 30 ? "text-destructive" : "text-muted-foreground"}`}>
                <Clock className="h-3 w-3" /> {daysUntilDue}d
              </span>
            )}
            {renewal.contact_attempts > 0 && (
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <Phone className="h-3 w-3" /> {renewal.contact_attempts}
              </span>
            )}
            {renewal.renewal_value && (
              <span className="text-xs text-muted-foreground">€{Number(renewal.renewal_value).toFixed(0)}</span>
            )}
          </div>
        </div>
        <Badge variant={(stageColors[renewal.renewal_stage] || "secondary") as any}>
          {t(getStageKey(renewal.renewal_stage)) || renewal.renewal_stage}
        </Badge>
      </CardContent>
    </Card>
  );
}
