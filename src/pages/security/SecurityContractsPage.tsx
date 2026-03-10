import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useTranslation } from "react-i18next";
import { useSecurityContracts } from "@/hooks/security/useSecurityContracts";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useNavigate } from "react-router-dom";
import { FileText, Plus, Search, CheckCircle, Clock, AlertTriangle, Euro } from "lucide-react";
import { useState } from "react";
import { format } from "date-fns";

const contractStatusColor: Record<string, string> = {
  draft: "secondary", active: "default", expired: "destructive",
  suspended: "outline", terminated: "secondary",
};

const contractStatusLabels: Record<string, string> = {
  draft: "Rascunho", active: "Ativo", expired: "Expirado",
  suspended: "Suspenso", terminated: "Terminado",
};

export default function SecurityContractsPage() {
  const { t } = useTranslation("security");
  const { contracts, isLoading } = useSecurityContracts();
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const displayContracts = statusFilter === "all" ? contracts : contracts.filter((c: any) => c.contract_status === statusFilter);

  const filtered = displayContracts.filter((c: any) => {
    const sys = c.security_systems as any;
    const site = sys?.security_installation_sites as any;
    return [c.contract_type, site?.site_name, c.contract_status]
      .filter(Boolean).join(" ").toLowerCase().includes(search.toLowerCase());
  });

  // KPIs
  const kpis = {
    draft: contracts.filter((c: any) => c.contract_status === "draft").length,
    active: contracts.filter((c: any) => c.contract_status === "active").length,
    expired: contracts.filter((c: any) => c.contract_status === "expired").length,
    totalValue: contracts
      .filter((c: any) => c.contract_status === "active")
      .reduce((s: number, c: any) => s + (Number((c.commercial_terms_json as any)?.total_value) || 0), 0),
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <FileText className="h-7 w-7 text-primary" />
            <h1 className="text-2xl font-bold">{t("contracts")}</h1>
          </div>
          <Button onClick={() => navigate("/dashboard/security/proposals")} variant="outline" className="gap-2">
            <Plus className="h-4 w-4" />
            Criar via Proposta
          </Button>
        </div>

        {/* KPI Row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-muted"><Clock className="h-4 w-4 text-muted-foreground" /></div>
              <div><p className="text-2xl font-bold">{kpis.draft}</p><p className="text-xs text-muted-foreground">Rascunhos</p></div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-500/10"><CheckCircle className="h-4 w-4 text-green-600" /></div>
              <div><p className="text-2xl font-bold">{kpis.active}</p><p className="text-xs text-muted-foreground">Ativos</p></div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-destructive/10"><AlertTriangle className="h-4 w-4 text-destructive" /></div>
              <div><p className="text-2xl font-bold">{kpis.expired}</p><p className="text-xs text-muted-foreground">Expirados</p></div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10"><Euro className="h-4 w-4 text-primary" /></div>
              <div><p className="text-2xl font-bold">€{kpis.totalValue.toLocaleString()}</p><p className="text-xs text-muted-foreground">Valor Ativo</p></div>
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
              {Object.entries(contractStatusLabels).map(([k, v]) => (
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
              <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground/40" />
              <p className="text-muted-foreground">{t("noContracts")}</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-3">
            {filtered.map((c: any) => {
              const sys = c.security_systems as any;
              const site = sys?.security_installation_sites as any;
              const value = (c.commercial_terms_json as any)?.total_value;
              return (
                <Card
                  key={c.id}
                  className="cursor-pointer hover:border-primary/50 transition-colors"
                  onClick={() => navigate(`/dashboard/security/contracts/${c.id}`)}
                >
                  <CardContent className="p-4 flex items-center justify-between">
                    <div className="space-y-1">
                      <p className="font-medium">{site?.site_name || "Contrato"}</p>
                      <p className="text-sm text-muted-foreground">
                        {c.contract_type}
                        {value && <span> · €{Number(value).toLocaleString()}</span>}
                        {c.start_date && ` · ${format(new Date(c.start_date), "dd/MM/yyyy")}`}
                        {c.end_date && ` → ${format(new Date(c.end_date), "dd/MM/yyyy")}`}
                      </p>
                    </div>
                    <Badge variant={(contractStatusColor[c.contract_status] || "secondary") as any}>
                      {contractStatusLabels[c.contract_status] || c.contract_status}
                    </Badge>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
