import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
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
  Package,
  Plus,
  Play,
  CheckCircle,
  XCircle,
  Clock,
  Loader2,
  AlertTriangle,
  ChevronRight,
  CalendarPlus,
} from "lucide-react";
import { format } from "date-fns";
import { pt } from "date-fns/locale";
import { useClientEntitlements, useRegisterConsumption } from "@/hooks/useEntitlements";
import { useClientPackageAlerts } from "@/hooks/usePackageAlerts";
import { entitlementStatusLabels, type EntitlementStatus } from "@/types/product";
import { PackageAlertCard } from "./PackageAlertCard";
import type { PackageAlert } from "@/types/entitlement";

interface ClientPackagesSectionProps {
  contactId?: string;
  companyId?: string;
  clientName?: string;
}

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

export function ClientPackagesSection({
  contactId,
  companyId,
  clientName = "Cliente",
}: ClientPackagesSectionProps) {
  const [registerOpen, setRegisterOpen] = useState(false);
  const [selectedPackageId, setSelectedPackageId] = useState<string>("");
  const [selectedPackageName, setSelectedPackageName] = useState<string>("");
  const [notes, setNotes] = useState("");

  const { data: packages = [], isLoading } = useClientEntitlements({ contactId, companyId });
  const { data: alerts = [] } = useClientPackageAlerts({ contactId, companyId });
  const registerConsumption = useRegisterConsumption();

  const activePackages = packages.filter((p) => p.status === "active");
  const otherPackages = packages.filter((p) => p.status !== "active");

  const handleRegister = async () => {
    if (!selectedPackageId) return;
    await registerConsumption.mutateAsync({
      entitlementId: selectedPackageId,
      notes: notes || undefined,
    });
    setRegisterOpen(false);
    setSelectedPackageId("");
    setSelectedPackageName("");
    setNotes("");
  };

  const openRegister = (packageId: string, packageName: string) => {
    setSelectedPackageId(packageId);
    setSelectedPackageName(packageName);
    setRegisterOpen(true);
  };

  const handleAlertAction = (action: string, alert: PackageAlert) => {
    // TODO: Implement alert actions
    console.log("Alert action:", action, alert);
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center p-6">
          <Loader2 className="h-5 w-5 animate-spin" />
        </CardContent>
      </Card>
    );
  }

  if (packages.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Package className="h-4 w-4" />
            Pacotes & Sessões
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-6 text-muted-foreground">
            <Package className="h-10 w-10 mx-auto mb-2 opacity-30" />
            <p className="text-sm">Nenhum pacote ativo</p>
            <p className="text-xs mt-1">
              Pacotes são criados ao vender produtos por sessões.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Package className="h-4 w-4" />
            Pacotes & Sessões
            {activePackages.length > 0 && (
              <Badge variant="secondary" className="ml-1">
                {activePackages.length} ativo{activePackages.length > 1 ? "s" : ""}
              </Badge>
            )}
          </CardTitle>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Alerts */}
        {alerts.length > 0 && (
          <div className="space-y-2">
            {alerts.slice(0, 2).map((alert, idx) => (
              <PackageAlertCard
                key={idx}
                alert={alert}
                compact
                onAction={handleAlertAction}
              />
            ))}
          </div>
        )}

        {/* Active Packages */}
        {activePackages.length > 0 && (
          <div className="space-y-3">
            {activePackages.map((pkg) => {
              const progress = (pkg.used_units / pkg.total_units) * 100;
              const isLow = pkg.remaining_units <= Math.ceil(pkg.total_units * 0.2);
              const productName = pkg.product?.name || "Produto";
              const unitName = pkg.unit_name || "sessão";

              return (
                <div
                  key={pkg.id}
                  className="p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <h4 className="font-medium text-sm">{productName}</h4>
                      <Badge variant="default" className="h-5">
                        {statusIcons.active}
                        <span className="ml-1">Ativo</span>
                      </Badge>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 text-xs"
                      onClick={() => openRegister(pkg.id, productName)}
                    >
                      <Plus className="h-3 w-3 mr-1" />
                      Registar
                    </Button>
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">
                        {pkg.used_units}/{pkg.total_units} {unitName}
                      </span>
                      <span className={isLow ? "text-yellow-600 font-medium" : "text-muted-foreground"}>
                        {pkg.remaining_units} restantes
                      </span>
                    </div>
                    <Progress value={progress} className="h-1.5" />
                  </div>

                  {pkg.expiry_date && (
                    <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      Expira em {format(new Date(pkg.expiry_date), "dd/MM/yyyy", { locale: pt })}
                    </p>
                  )}

                  {isLow && (
                    <p className="text-xs text-yellow-600 mt-1.5 flex items-center gap-1">
                      <AlertTriangle className="h-3 w-3" />
                      Quase a terminar
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Other Packages (collapsed) */}
        {otherPackages.length > 0 && (
          <div className="pt-2 border-t">
            <p className="text-xs text-muted-foreground mb-2">
              {otherPackages.length} pacote{otherPackages.length > 1 ? "s" : ""} anterior{otherPackages.length > 1 ? "es" : ""}
            </p>
            <div className="space-y-2">
              {otherPackages.slice(0, 3).map((pkg) => (
                <div
                  key={pkg.id}
                  className="flex items-center justify-between p-2 rounded bg-muted/50 text-sm"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground">{pkg.product?.name}</span>
                    <Badge variant={statusColors[pkg.status]} className="h-5 text-xs">
                      {statusIcons[pkg.status]}
                      <span className="ml-1">{entitlementStatusLabels[pkg.status as EntitlementStatus]}</span>
                    </Badge>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {pkg.used_units}/{pkg.total_units}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>

      {/* Register Session Dialog */}
      <Dialog open={registerOpen} onOpenChange={setRegisterOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Registar Sessão - {selectedPackageName}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              A registar sessão para {clientName}.
            </p>
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
              Registar Sessão
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
