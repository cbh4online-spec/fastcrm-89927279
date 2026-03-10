import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useTranslation } from "react-i18next";
import { useSecurityOccurrences } from "@/hooks/security/useSecurityOccurrences";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useNavigate } from "react-router-dom";
import { AlertTriangle, Plus, Search } from "lucide-react";
import { useState } from "react";
import { format } from "date-fns";
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

export default function SecurityOccurrencesPage() {
  const { t } = useTranslation("security");
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [severityFilter, setSeverityFilter] = useState<string>("all");
  const [dialogOpen, setDialogOpen] = useState(false);

  const filters: any = {};
  if (statusFilter !== "all") filters.status = statusFilter;
  if (severityFilter !== "all") filters.severity = severityFilter;

  const { occurrences, isLoading } = useSecurityOccurrences(filters);

  const filtered = occurrences.filter((o: any) => {
    const site = (o.security_systems as any)?.security_installation_sites as any;
    return [o.title, o.description, site?.site_name]
      .filter(Boolean).join(" ").toLowerCase().includes(search.toLowerCase());
  });

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

        <div className="flex flex-wrap gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder={t("search")} value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[170px]"><SelectValue placeholder={t("status")} /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("all")}</SelectItem>
              <SelectItem value="open">{t("occurrenceStatusOpen")}</SelectItem>
              <SelectItem value="in_progress">{t("occurrenceStatusInProgress")}</SelectItem>
              <SelectItem value="waiting_parts">{t("occurrenceStatusWaitingParts")}</SelectItem>
              <SelectItem value="resolved">{t("occurrenceStatusResolved")}</SelectItem>
              <SelectItem value="closed">{t("occurrenceStatusClosed")}</SelectItem>
            </SelectContent>
          </Select>
          <Select value={severityFilter} onValueChange={setSeverityFilter}>
            <SelectTrigger className="w-[150px]"><SelectValue placeholder="Severidade" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("all")}</SelectItem>
              <SelectItem value="low">{t("severityLow")}</SelectItem>
              <SelectItem value="medium">{t("severityMedium")}</SelectItem>
              <SelectItem value="high">{t("severityHigh")}</SelectItem>
              <SelectItem value="critical">{t("severityCritical")}</SelectItem>
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
              const slaBreached = occ.sla_resolution_deadline && new Date(occ.sla_resolution_deadline) < new Date() && occ.status !== "closed" && occ.status !== "resolved";
              const escalated = (occ.escalation_level || 0) > 0;
              return (
                <Card
                  key={occ.id}
                  className={`cursor-pointer hover:border-primary/50 transition-colors ${slaBreached ? "border-destructive/50" : ""}`}
                  onClick={() => navigate(`/dashboard/security/occurrences/${occ.id}`)}
                >
                  <CardContent className="p-4 flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-medium">{occ.title || occ.occurrence_type}</p>
                        {occ.severity && (
                          <Badge variant={(severityColors[occ.severity] || "secondary") as any} className="text-xs">
                            {t(`severity${occ.severity.charAt(0).toUpperCase()}${occ.severity.slice(1)}` as any)}
                          </Badge>
                        )}
                        {slaBreached && <Badge variant="destructive" className="text-[10px]">SLA</Badge>}
                        {escalated && <Badge variant="outline" className="text-[10px]">Esc. {occ.escalation_level}</Badge>}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {site?.site_name || "—"}
                        {occ.occurred_at && ` · ${format(new Date(occ.occurred_at), "dd/MM/yyyy HH:mm")}`}
                        {occ.occurrence_origin && ` · ${t(`occurrenceOrigin${occ.occurrence_origin.charAt(0).toUpperCase()}${occ.occurrence_origin.slice(1)}` as any)}`}
                      </p>
                    </div>
                    <Badge variant={(statusColors[occ.status] || "secondary") as any}>
                      {t(`occurrenceStatus${occ.status.charAt(0).toUpperCase()}${occ.status.slice(1).replace(/_([a-z])/g, (_: any, c: string) => c.toUpperCase())}` as any) || occ.status}
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
