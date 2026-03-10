import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { useSecurityProposals } from "@/hooks/security/useSecurityProposals";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FileText, Search, Plus } from "lucide-react";
import { useState } from "react";
import { format } from "date-fns";

const statusColors: Record<string, string> = {
  draft: "secondary",
  sent: "default",
  under_review: "outline",
  accepted: "default",
  rejected: "destructive",
  expired: "secondary",
};

const statusLabels: Record<string, string> = {
  draft: "Rascunho",
  sent: "Enviada",
  under_review: "Em Análise",
  accepted: "Aceite",
  rejected: "Rejeitada",
  expired: "Expirada",
};

export default function SecurityProposalsPage() {
  const { t } = useTranslation("security");
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const { proposals, isLoading } = useSecurityProposals(
    statusFilter !== "all" ? { status: statusFilter } : undefined
  );

  const filtered = proposals.filter((p: any) =>
    [p.title, p.proposal_number, (p.security_clients as any)?.name, (p.security_installation_sites as any)?.site_name]
      .filter(Boolean)
      .join(" ")
      .toLowerCase()
      .includes(search.toLowerCase())
  );

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <FileText className="h-7 w-7 text-primary" />
            <h1 className="text-2xl font-bold">{t("proposals")}</h1>
          </div>
          <Button onClick={() => navigate("/dashboard/security/leads")} variant="outline" className="gap-2">
            <Plus className="h-4 w-4" />
            Criar via Lead
          </Button>
        </div>

        <div className="flex gap-3 flex-wrap">
          <div className="relative max-w-sm flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder={t("search")} value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue />
            </SelectTrigger>
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
              <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground/40" />
              <p className="text-muted-foreground">Nenhuma proposta registada</p>
              <p className="text-sm text-muted-foreground mt-1">As propostas são criadas a partir de leads qualificados.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-3">
            {filtered.map((p: any) => (
              <Card
                key={p.id}
                className="cursor-pointer hover:border-primary/50 transition-colors"
                onClick={() => navigate(`/dashboard/security/proposals/${p.id}`)}
              >
                <CardContent className="p-4 flex items-center justify-between">
                  <div className="space-y-1">
                    <p className="font-medium">{p.title || p.proposal_number || "Proposta"}</p>
                    <p className="text-sm text-muted-foreground">
                      {(p.security_clients as any)?.name && <span>{(p.security_clients as any).name} · </span>}
                      v{p.version}
                      {p.final_value && <span> · €{Number(p.final_value).toFixed(2)}</span>}
                      {p.valid_until && <span> · Válida até {format(new Date(p.valid_until), "dd/MM/yyyy")}</span>}
                    </p>
                  </div>
                  <Badge variant={(statusColors[p.status] || "secondary") as any}>
                    {statusLabels[p.status] || p.status}
                  </Badge>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
