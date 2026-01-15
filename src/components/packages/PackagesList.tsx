import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Search,
  Filter,
  Play,
  CheckCircle,
  XCircle,
  Clock,
  Plus,
  Loader2,
  Package,
  AlertTriangle,
  User,
  Building2,
} from "lucide-react";
import { format } from "date-fns";
import { pt } from "date-fns/locale";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useRegisterConsumption } from "@/hooks/useEntitlements";
import { entitlementStatusLabels, type EntitlementStatus } from "@/types/product";
import { PackageAlertCard } from "./PackageAlertCard";
import { useAllPackageAlerts } from "@/hooks/usePackageAlerts";
import type { PackageAlert } from "@/types/entitlement";

interface PackagesListProps {
  filterProductId?: string;
  filterContactId?: string;
  filterCompanyId?: string;
  showAlerts?: boolean;
}

const statusFilters = [
  { value: "all", label: "Todos" },
  { value: "active", label: "Ativos" },
  { value: "completed", label: "Concluídos" },
  { value: "expired", label: "Expirados" },
  { value: "cancelled", label: "Cancelados" },
];

const statusIcons: Record<string, React.ReactNode> = {
  active: <Play className="h-3 w-3" />,
  completed: <CheckCircle className="h-3 w-3" />,
  expired: <XCircle className="h-3 w-3" />,
  cancelled: <XCircle className="h-3 w-3" />,
};

const statusColors: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  active: "default",
  completed: "secondary",
  expired: "destructive",
  cancelled: "outline",
};

export function PackagesList({
  filterProductId,
  filterContactId,
  filterCompanyId,
  showAlerts = true,
}: PackagesListProps) {
  const { currentWorkspace } = useWorkspace();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [registerOpen, setRegisterOpen] = useState(false);
  const [selectedPackageId, setSelectedPackageId] = useState<string>("");
  const [notes, setNotes] = useState("");

  const registerConsumption = useRegisterConsumption();
  const { data: alerts = [] } = useAllPackageAlerts();

  const { data: packages = [], isLoading } = useQuery({
    queryKey: ["all-packages", currentWorkspace?.id, filterProductId, filterContactId, filterCompanyId],
    queryFn: async () => {
      if (!currentWorkspace?.id) return [];

      let query = supabase
        .from("client_entitlements")
        .select(`
          *,
          product:products(id, name, base_price, currency),
          contact:contacts(id, name, email),
          company:companies(id, name)
        `)
        .eq("workspace_id", currentWorkspace.id)
        .order("created_at", { ascending: false });

      if (filterProductId) {
        query = query.eq("product_id", filterProductId);
      }
      if (filterContactId) {
        query = query.eq("contact_id", filterContactId);
      }
      if (filterCompanyId) {
        query = query.eq("company_id", filterCompanyId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
    enabled: !!currentWorkspace?.id,
  });

  const filteredPackages = packages.filter((pkg) => {
    // Search filter
    const searchLower = search.toLowerCase();
    const matchesSearch =
      !search ||
      pkg.product?.name?.toLowerCase().includes(searchLower) ||
      pkg.contact?.name?.toLowerCase().includes(searchLower) ||
      pkg.company?.name?.toLowerCase().includes(searchLower);

    // Status filter
    const matchesStatus = statusFilter === "all" || pkg.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const handleRegister = async () => {
    if (!selectedPackageId) return;
    await registerConsumption.mutateAsync({
      entitlementId: selectedPackageId,
      notes: notes || undefined,
    });
    setRegisterOpen(false);
    setSelectedPackageId("");
    setNotes("");
  };

  const openRegister = (packageId: string) => {
    setSelectedPackageId(packageId);
    setRegisterOpen(true);
  };

  const handleAlertAction = (action: string, alert: PackageAlert) => {
    // TODO: Implement alert actions
    console.log("Alert action:", action, alert);
  };

  // Get alerts related to displayed packages
  const relevantAlerts = showAlerts
    ? alerts.filter((a) =>
        filteredPackages.some((p) => p.id === a.entitlementId)
      )
    : [];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Pesquisar por produto ou cliente..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[160px]">
            <Filter className="h-4 w-4 mr-2" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {statusFilters.map((s) => (
              <SelectItem key={s.value} value={s.value}>
                {s.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Alerts Summary */}
      {relevantAlerts.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <AlertTriangle className="h-4 w-4" />
            {relevantAlerts.length} alerta{relevantAlerts.length > 1 ? "s" : ""} ativo{relevantAlerts.length > 1 ? "s" : ""}
          </div>
          <div className="grid gap-2">
            {relevantAlerts.slice(0, 3).map((alert, idx) => (
              <PackageAlertCard
                key={idx}
                alert={alert}
                compact
                onAction={handleAlertAction}
              />
            ))}
          </div>
        </div>
      )}

      {/* Packages List */}
      {filteredPackages.length > 0 ? (
        <div className="grid gap-3">
          {filteredPackages.map((pkg) => {
            const progress = (pkg.used_units / pkg.total_units) * 100;
            const isLow = pkg.remaining_units <= Math.ceil(pkg.total_units * 0.2);
            const clientName = pkg.contact?.name || pkg.company?.name || "Cliente";
            const ClientIcon = pkg.contact ? User : Building2;

            return (
              <Card key={pkg.id} className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-medium truncate">{pkg.product?.name}</h4>
                      <Badge variant={statusColors[pkg.status]}>
                        {statusIcons[pkg.status]}
                        <span className="ml-1">{entitlementStatusLabels[pkg.status as EntitlementStatus]}</span>
                      </Badge>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <ClientIcon className="h-3 w-3" />
                        {clientName}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {format(new Date(pkg.created_at), "dd/MM/yyyy", { locale: pt })}
                      </span>
                      {pkg.expiry_date && (
                        <span className="flex items-center gap-1">
                          Expira: {format(new Date(pkg.expiry_date), "dd/MM/yyyy", { locale: pt })}
                        </span>
                      )}
                    </div>
                  </div>

                  {pkg.status === "active" && (
                    <Button size="sm" onClick={() => openRegister(pkg.id)}>
                      <Plus className="h-4 w-4 mr-1" />
                      Registar
                    </Button>
                  )}
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span>
                      {pkg.used_units} de {pkg.total_units} {pkg.unit_name}
                    </span>
                    <span className={isLow && pkg.status === "active" ? "text-yellow-600 font-medium" : ""}>
                      {pkg.remaining_units} restantes
                    </span>
                  </div>
                  <Progress value={progress} className="h-2" />
                </div>

                {isLow && pkg.status === "active" && (
                  <p className="text-xs text-yellow-600 mt-2 flex items-center gap-1">
                    <AlertTriangle className="h-3 w-3" />
                    Pacote quase a terminar. Considere sugerir renovação.
                  </p>
                )}
              </Card>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-12 text-muted-foreground">
          <Package className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p className="font-medium">Nenhum pacote encontrado</p>
          <p className="text-sm">
            Os pacotes são criados automaticamente quando produtos por sessões são vendidos.
          </p>
        </div>
      )}

      {/* Register Session Dialog */}
      <Dialog open={registerOpen} onOpenChange={setRegisterOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Registar Sessão</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Notas (opcional)</Label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Observações sobre esta sessão..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRegisterOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleRegister} disabled={registerConsumption.isPending}>
              {registerConsumption.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Registar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
