import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useTranslation } from "react-i18next";
import { useSecurityLeads } from "@/hooks/security/useSecurityLeads";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useNavigate } from "react-router-dom";
import { Target, Plus, Search, TrendingUp, Clock, CheckCircle, XCircle } from "lucide-react";
import { useState } from "react";
import { SecurityLeadDialog } from "@/components/security/SecurityLeadDialog";

const statusColors: Record<string, string> = {
  new: "default", qualifying: "secondary", qualified: "default",
  proposal_sent: "outline", won: "default", lost: "destructive", archived: "secondary",
};

const statusLabels: Record<string, string> = {
  new: "Novo", qualifying: "Em Qualificação", qualified: "Qualificado",
  proposal_sent: "Proposta Enviada", won: "Ganho", lost: "Perdido", archived: "Arquivado",
};

const originLabels: Record<string, string> = {
  direct: "Direto", partner: "Parceiro", site: "Site", phone: "Telefone",
  email: "Email", whatsapp: "WhatsApp", telegram: "Telegram", manual: "Manual",
};

export default function SecurityLeadsPage() {
  const { t } = useTranslation("security");
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [dialogOpen, setDialogOpen] = useState(false);

  // Fetch all leads for KPIs
  const { leads: allLeads } = useSecurityLeads();
  const { leads, isLoading } = useSecurityLeads(
    statusFilter !== "all" ? { status: statusFilter } : undefined
  );

  const filtered = leads.filter((l: any) =>
    [l.client_name, l.installation_address, l.system_type, (l.security_partners as any)?.name]
      .filter(Boolean).join(" ").toLowerCase().includes(search.toLowerCase())
  );

  // KPIs
  const kpis = {
    total: allLeads.length,
    active: allLeads.filter((l: any) => ["new", "qualifying", "qualified"].includes(l.status)).length,
    won: allLeads.filter((l: any) => l.status === "won").length,
    lost: allLeads.filter((l: any) => l.status === "lost").length,
    convRate: allLeads.length > 0 ? Math.round((allLeads.filter((l: any) => l.status === "won").length / allLeads.length) * 100) : 0,
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Target className="h-7 w-7 text-primary" />
            <h1 className="text-2xl font-bold">{t("securityLeads")}</h1>
          </div>
          <Button onClick={() => setDialogOpen(true)} className="gap-2">
            <Plus className="h-4 w-4" />
            {t("addNew")}
          </Button>
        </div>

        {/* KPI Row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10"><Clock className="h-4 w-4 text-primary" /></div>
              <div><p className="text-2xl font-bold">{kpis.active}</p><p className="text-xs text-muted-foreground">Ativos</p></div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-500/10"><CheckCircle className="h-4 w-4 text-green-600" /></div>
              <div><p className="text-2xl font-bold">{kpis.won}</p><p className="text-xs text-muted-foreground">Ganhos</p></div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-destructive/10"><XCircle className="h-4 w-4 text-destructive" /></div>
              <div><p className="text-2xl font-bold">{kpis.lost}</p><p className="text-xs text-muted-foreground">Perdidos</p></div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10"><TrendingUp className="h-4 w-4 text-primary" /></div>
              <div><p className="text-2xl font-bold">{kpis.convRate}%</p><p className="text-xs text-muted-foreground">Conversão</p></div>
            </CardContent>
          </Card>
        </div>

        <div className="flex gap-3 flex-wrap">
          <div className="relative max-w-sm flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder={t("search")} value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("all")}</SelectItem>
              {Object.entries(statusLabels).map(([k, v]) => (
                <SelectItem key={k} value={k}>{v}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {isLoading ? (
          <div className="text-center py-12 text-muted-foreground">A carregar...</div>
        ) : filtered.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Target className="h-12 w-12 mx-auto mb-4 text-muted-foreground/40" />
              <p className="text-muted-foreground">Nenhum lead registado</p>
              <p className="text-sm text-muted-foreground mt-1">Crie um lead manualmente ou converta um pedido de parceiro.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-3">
            {filtered.map((lead: any) => (
              <Card
                key={lead.id}
                className="cursor-pointer hover:border-primary/50 transition-colors"
                onClick={() => navigate(`/dashboard/security/leads/${lead.id}`)}
              >
                <CardContent className="p-4 flex items-center justify-between">
                  <div className="space-y-1">
                    <p className="font-medium">{lead.client_name || "Lead sem nome"}</p>
                    <p className="text-sm text-muted-foreground">
                      {lead.system_type && <span className="capitalize">{lead.system_type}</span>}
                      {lead.request_type && <span> · {lead.request_type}</span>}
                      {(lead.security_partners as any)?.name && <span> · {(lead.security_partners as any).name}</span>}
                    </p>
                    {lead.installation_address && (
                      <p className="text-xs text-muted-foreground">{lead.installation_address}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">{originLabels[lead.origin] || lead.origin}</Badge>
                    <Badge variant={(statusColors[lead.status] || "secondary") as any}>
                      {statusLabels[lead.status] || lead.status}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
      <SecurityLeadDialog open={dialogOpen} onOpenChange={setDialogOpen} />
    </DashboardLayout>
  );
}
