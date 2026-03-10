import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useTranslation } from "react-i18next";
import { useSecurityOccurrences } from "@/hooks/security/useSecurityOccurrences";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useNavigate } from "react-router-dom";
import { AlertTriangle, Plus, Search, ShieldAlert, Clock, CheckCircle2, Timer } from "lucide-react";
import { useState } from "react";
import { format, differenceInHours } from "date-fns";
import { SecurityOccurrenceDialog } from "@/components/security/SecurityOccurrenceDialog";

const severityColors: Record<string, string> = {
  low: "secondary",
  medium: "outline",
  high: "default",
  critical: "destructive",
};

const statusColors: Record<string, string> = {
  open: "destructive",
  in_progress: "default",
  waiting_parts: "outline",
  resolved: "secondary",
  closed: "secondary",
  cancelled: "secondary",
};

const statusLabels: Record<string, string> = {
  open: "Aberta",
  in_progress: "Em Progresso",
  waiting_parts: "Aguardar Peças",
  resolved: "Resolvida",
  closed: "Fechada",
  cancelled: "Cancelada",
};

export default function SecurityOccurrencesPage() {
  const { t } = useTranslation("security");
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [severityFilter, setSeverityFilter] = useState<string>("all");
  const [dialogOpen, setDialogOpen] = useState(false);

  // Fetch all for KPIs, then apply filters for list
  const { occurrences: allOccurrences } = useSecurityOccurrences();

  const filters: any = {};
  if (statusFilter !== "all") filters.status = statusFilter;
  if (severityFilter !== "all") filters.severity = severityFilter;
  const { occurrences, isLoading } = useSecurityOccurrences(filters);

  const filtered = occurrences.filter((o: any) => {
    const site = (o.security_systems as any)?.security_installation_sites as any;
    return [o.title, o.description, site?.site_name]
      .filter(Boolean).join(" ").toLowerCase().includes(search.toLowerCase());
  });

  // KPIs
  const now = new Date();
  const openCount = allOccurrences.filter((o: any) => o.status === "open" || o.status === "in_progress").length;
  const criticalOpen = allOccurrences.filter((o: any) => (o.status === "open" || o.status === "in_progress") && o.severity === "critical").length;
  const slaBreached = allOccurrences.filter((o: any) =>
    o.sla_resolution_deadline && new Date(o.sla_resolution_deadline) < now && o.status !== "closed" && o.status !== "resolved" && o.status !== "cancelled"
  ).length;
  const escalatedCount = allOccurrences.filter((o: any) => (o.escalation_level || 0) > 0 && o.status !== "closed" && o.status !== "cancelled").length;
  const closedThisMonth = allOccurrences.filter((o: any) => {
    if (o.status !== "closed" || !o.resolved_at) return false;
    const d = new Date(o.resolved_at);
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  }).length;
  const avgResolutionHours = (() => {
    const resolved = allOccurrences.filter((o: any) => o.resolved_at && o.created_at);
    if (resolved.length === 0) return 0;
    const total = resolved.reduce((sum: number, o: any) => sum + differenceInHours(new Date(o.resolved_at), new Date(o.created_at)), 0);
    return Math.round(total / resolved.length);
  })();

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <AlertTriangle className="h-7 w-7 text-primary" />
            <h1 className="text-2xl font-bold">{t("occurrences")}</h1>
          </div>
          <Button onClick={() => setDialogOpen(true)} className="gap-2">
            <Plus className="h-4 w-4" />
            {t("addNew")}
          </Button>
        </div>

        {/* KPI Row */}
        <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold">{openCount}</p>
              <p className="text-xs text-muted-foreground">Abertas</p>
            </CardContent>
          </Card>
          <Card className={criticalOpen > 0 ? "border-destructive/30" : ""}>
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-destructive">{criticalOpen}</p>
              <p className="text-xs text-muted-foreground">Críticas</p>
            </CardContent>
          </Card>
          <Card className={slaBreached > 0 ? "border-destructive/30" : ""}>
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-destructive">{slaBreached}</p>
              <p className="text-xs text-muted-foreground flex items-center justify-center gap-1"><Timer className="h-3 w-3" /> SLA Violado</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold">{escalatedCount}</p>
              <p className="text-xs text-muted-foreground flex items-center justify-center gap-1"><ShieldAlert className="h-3 w-3" /> Escaladas</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold">{closedThisMonth}</p>
              <p className="text-xs text-muted-foreground">Fechadas (mês)</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold">{avgResolutionHours}h</p>
              <p className="text-xs text-muted-foreground">Tempo Médio</p>
            </CardContent>
          </Card>
        </div>

        <div className="flex flex-wrap gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder={t("search")} value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[170px]"><SelectValue placeholder={t("status")} /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("all")}</SelectItem>
              <SelectItem value="open">Aberta</SelectItem>
              <SelectItem value="in_progress">Em Progresso</SelectItem>
              <SelectItem value="waiting_parts">Aguardar Peças</SelectItem>
              <SelectItem value="resolved">Resolvida</SelectItem>
              <SelectItem value="closed">Fechada</SelectItem>
            </SelectContent>
          </Select>
          <Select value={severityFilter} onValueChange={setSeverityFilter}>
            <SelectTrigger className="w-[150px]"><SelectValue placeholder="Severidade" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("all")}</SelectItem>
              <SelectItem value="low">Baixa</SelectItem>
              <SelectItem value="medium">Média</SelectItem>
              <SelectItem value="high">Alta</SelectItem>
              <SelectItem value="critical">Crítica</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {isLoading ? (
          <div className="text-center py-12 text-muted-foreground">A carregar...</div>
        ) : filtered.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <AlertTriangle className="h-12 w-12 mx-auto mb-4 text-muted-foreground/40" />
              <p className="text-muted-foreground">{t("noOccurrences")}</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-3">
            {filtered.map((occ: any) => {
              const site = (occ.security_systems as any)?.security_installation_sites as any;
              const slaViolated = occ.sla_resolution_deadline && new Date(occ.sla_resolution_deadline) < now && occ.status !== "closed" && occ.status !== "resolved";
              const escalated = (occ.escalation_level || 0) > 0;
              return (
                <Card
                  key={occ.id}
                  className={`cursor-pointer hover:border-primary/50 transition-colors ${slaViolated ? "border-destructive/50" : ""}`}
                  onClick={() => navigate(`/dashboard/security/occurrences/${occ.id}`)}
                >
                  <CardContent className="p-4 flex items-center justify-between">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-medium">{occ.title || occ.occurrence_type}</p>
                        {occ.severity && (
                          <Badge variant={(severityColors[occ.severity] || "secondary") as any} className="text-xs capitalize">
                            {occ.severity}
                          </Badge>
                        )}
                        {slaViolated && <Badge variant="destructive" className="text-[10px]">SLA</Badge>}
                        {escalated && (
                          <Badge variant="outline" className="text-[10px] gap-0.5">
                            <ShieldAlert className="h-2.5 w-2.5" /> Nv.{occ.escalation_level}
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {site?.site_name || "—"}
                        {occ.occurred_at && ` · ${format(new Date(occ.occurred_at), "dd/MM/yyyy HH:mm")}`}
                        {occ.occurrence_origin && ` · ${occ.occurrence_origin}`}
                      </p>
                    </div>
                    <Badge variant={(statusColors[occ.status] || "secondary") as any}>
                      {statusLabels[occ.status] || occ.status}
                    </Badge>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
      <SecurityOccurrenceDialog open={dialogOpen} onOpenChange={setDialogOpen} />
    </DashboardLayout>
  );
}
