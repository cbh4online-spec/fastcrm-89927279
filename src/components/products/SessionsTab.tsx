import { useState } from "react";
import { Card } from "@/components/ui/card";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Play, Clock, CheckCircle, AlertTriangle, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { pt } from "date-fns/locale";
import {
  useProductEntitlements,
  useRegisterConsumption,
} from "@/hooks/useEntitlements";
import { entitlementStatusLabels } from "@/types/product";
import type { Product } from "@/types/product";

interface SessionsTabProps {
  product: Product;
}

export function SessionsTab({ product }: SessionsTabProps) {
  const [registerOpen, setRegisterOpen] = useState(false);
  const [selectedEntitlementId, setSelectedEntitlementId] = useState<string>("");
  const [notes, setNotes] = useState("");

  const { data: entitlements, isLoading } = useProductEntitlements(product.id);
  const registerConsumption = useRegisterConsumption();

  const handleRegister = async () => {
    if (!selectedEntitlementId) return;
    await registerConsumption.mutateAsync({
      entitlementId: selectedEntitlementId,
      notes: notes || undefined,
    });
    setRegisterOpen(false);
    setSelectedEntitlementId("");
    setNotes("");
  };

  const openRegister = (entitlementId: string) => {
    setSelectedEntitlementId(entitlementId);
    setRegisterOpen(true);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "default";
      case "completed":
        return "secondary";
      case "expired":
        return "destructive";
      default:
        return "outline";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "active":
        return <Play className="h-3 w-3" />;
      case "completed":
        return <CheckCircle className="h-3 w-3" />;
      case "expired":
        return <AlertTriangle className="h-3 w-3" />;
      default:
        return <Clock className="h-3 w-3" />;
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Pacotes de {product.unit_name || "sessões"} vendidos
        </p>
      </div>

      {entitlements && entitlements.length > 0 ? (
        <div className="space-y-3">
          {entitlements.map((ent) => {
            const progress = (ent.used_units / ent.total_units) * 100;
            const isLow = ent.remaining_units <= Math.ceil(ent.total_units * 0.2);

            return (
              <Card key={ent.id} className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className="font-medium">
                      {ent.contact?.name || ent.company?.name || "Cliente"}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Criado em {format(new Date(ent.created_at), "dd/MM/yyyy", { locale: pt })}
                      {ent.expiry_date && (
                        <> • Expira em {format(new Date(ent.expiry_date), "dd/MM/yyyy", { locale: pt })}</>
                      )}
                    </p>
                  </div>
                  <Badge variant={getStatusColor(ent.status)}>
                    {getStatusIcon(ent.status)}
                    <span className="ml-1">{entitlementStatusLabels[ent.status]}</span>
                  </Badge>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span>
                      {ent.used_units} de {ent.total_units} {ent.unit_name}
                    </span>
                    <span className={isLow && ent.status === "active" ? "text-yellow-600 font-medium" : ""}>
                      {ent.remaining_units} restantes
                    </span>
                  </div>
                  <Progress value={progress} className="h-2" />
                </div>

                {ent.status === "active" && (
                  <div className="mt-3 flex justify-end">
                    <Button size="sm" onClick={() => openRegister(ent.id)}>
                      <Plus className="h-4 w-4 mr-1" />
                      Registar {ent.unit_name}
                    </Button>
                  </div>
                )}

                {isLow && ent.status === "active" && (
                  <p className="text-xs text-yellow-600 mt-2">
                    ⚠️ Pacote quase a terminar. Sugerir renovação ou upgrade.
                  </p>
                )}
              </Card>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-8 text-muted-foreground">
          <Clock className="h-12 w-12 mx-auto mb-2 opacity-30" />
          <p>Nenhum pacote vendido ainda.</p>
          <p className="text-sm">
            Pacotes são criados automaticamente quando este produto é vendido.
          </p>
        </div>
      )}

      {/* Register consumption dialog */}
      <Dialog open={registerOpen} onOpenChange={setRegisterOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Registar {product.unit_name || "Sessão"}</DialogTitle>
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
