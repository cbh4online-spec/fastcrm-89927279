import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useTranslation } from "react-i18next";
import { useSecuritySystems } from "@/hooks/security/useSecuritySystems";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useNavigate } from "react-router-dom";
import { Camera, Plus, Search, Shield, Radio, Cpu } from "lucide-react";
import { useState } from "react";
import { SecuritySystemDialog } from "@/components/security/SecuritySystemDialog";
import { SecurityQRBatchPrint } from "@/components/security/SecurityQRCode";

const systemTypeBadge: Record<string, string> = {
  cctv: "CCTV", intrusion: "Intrusão", sadi: "SADI",
  access_control: "Acessos", mixed: "Misto",
};

const statusColor: Record<string, string> = {
  draft: "secondary", por_validar: "outline", active: "default",
  inactive: "secondary", under_maintenance: "outline",
  suspended: "destructive", archived: "secondary",
};

const statusLabels: Record<string, string> = {
  draft: "Rascunho", por_validar: "Por Validar", active: "Ativo",
  inactive: "Inativo", under_maintenance: "Em Manutenção",
  suspended: "Suspenso", archived: "Arquivado",
};

export default function SecuritySystemsPage() {
  const { t } = useTranslation("security");
  const { systems, isLoading } = useSecuritySystems();
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [dialogOpen, setDialogOpen] = useState(false);

  const filtered = systems.filter((s: any) => {
    const matchSearch = [s.main_brand, s.main_model, (s.security_installation_sites as any)?.site_name]
      .filter(Boolean).join(" ").toLowerCase().includes(search.toLowerCase());
    const matchType = typeFilter === "all" || s.system_type === typeFilter;
    const matchStatus = statusFilter === "all" || s.status === statusFilter;
    return matchSearch && matchType && matchStatus;
  });

  // KPIs
  const active = systems.filter((s: any) => s.status === "active").length;
  const typeCounts = systems.reduce((acc: Record<string, number>, s: any) => {
    acc[s.system_type] = (acc[s.system_type] || 0) + 1;
    return acc;
  }, {});

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Camera className="h-7 w-7 text-primary" />
            <h1 className="text-2xl font-bold">{t("systems")}</h1>
          </div>
          <div className="flex gap-2">
            <SecurityQRBatchPrint
              entityType="system"
              items={filtered.map((s: any) => ({
                id: s.id,
                label: (s.security_installation_sites as any)?.site_name || "Sistema",
                sublabel: `${systemTypeBadge[s.system_type] || s.system_type} · ${[s.main_brand, s.main_model].filter(Boolean).join(" ")}`,
              }))}
            />
            <Button onClick={() => setDialogOpen(true)} className="gap-2">
              <Plus className="h-4 w-4" /> {t("addNew")}
            </Button>
          </div>
        </div>

        {/* KPI Row */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold">{systems.length}</p>
              <p className="text-xs text-muted-foreground">Total</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-primary">{active}</p>
              <p className="text-xs text-muted-foreground">Ativos</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold">{typeCounts.cctv || 0}</p>
              <p className="text-xs text-muted-foreground">CCTV</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold">{typeCounts.intrusion || 0}</p>
              <p className="text-xs text-muted-foreground">Intrusão</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold">{(typeCounts.sadi || 0) + (typeCounts.access_control || 0) + (typeCounts.mixed || 0)}</p>
              <p className="text-xs text-muted-foreground">Outros</p>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder={t("search")} value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
          </div>
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-[150px]"><SelectValue placeholder="Tipo" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="cctv">CCTV</SelectItem>
              <SelectItem value="intrusion">Intrusão</SelectItem>
              <SelectItem value="sadi">SADI</SelectItem>
              <SelectItem value="access_control">Acessos</SelectItem>
              <SelectItem value="mixed">Misto</SelectItem>
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[150px]"><SelectValue placeholder="Estado" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="active">Ativo</SelectItem>
              <SelectItem value="draft">Rascunho</SelectItem>
              <SelectItem value="inactive">Inativo</SelectItem>
              <SelectItem value="under_maintenance">Manutenção</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {isLoading ? (
          <div className="text-center py-12 text-muted-foreground">A carregar...</div>
        ) : filtered.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Camera className="h-12 w-12 mx-auto mb-4 text-muted-foreground/40" />
              <p className="text-muted-foreground">{t("noSystems")}</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-3">
            {filtered.map((sys: any) => (
              <Card
                key={sys.id}
                className="cursor-pointer hover:border-primary/50 transition-colors"
                onClick={() => navigate(`/dashboard/security/systems/${sys.id}`)}
              >
                <CardContent className="p-4 flex items-center justify-between">
                  <div>
                    <p className="font-medium">
                      {(sys.security_installation_sites as any)?.site_name || "Local não definido"}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {[sys.main_brand, sys.main_model].filter(Boolean).join(" ")}
                      {(sys.security_installation_sites as any)?.locality && ` — ${(sys.security_installation_sites as any).locality}`}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">{systemTypeBadge[sys.system_type] || sys.system_type}</Badge>
                    <Badge variant={(statusColor[sys.status] || "secondary") as any}>
                      {statusLabels[sys.status] || sys.status}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
      <SecuritySystemDialog open={dialogOpen} onOpenChange={setDialogOpen} />
    </DashboardLayout>
  );
}
