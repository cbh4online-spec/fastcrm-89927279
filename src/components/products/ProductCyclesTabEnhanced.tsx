import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
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
import {
  Plus,
  Trash2,
  Edit,
  Loader2,
  RefreshCw,
  Mail,
  MessageSquare,
  CheckSquare,
  TrendingUp,
  Zap,
  Bell,
} from "lucide-react";
import {
  useProductCycles,
  useCreateProductCycle,
  useUpdateProductCycle,
  useDeleteProductCycle,
} from "@/hooks/useProductCycles";
import {
  cycleTriggerLabels,
  cycleActionLabels,
  type Product,
  type ProductCycle,
  type CycleTriggerType,
  type CycleActionType,
} from "@/types/product";

interface ProductCyclesTabEnhancedProps {
  product: Product;
}

const triggerIcons: Record<CycleTriggerType, React.ReactNode> = {
  days_after_purchase: <RefreshCw className="h-4 w-4" />,
  days_without_session: <RefreshCw className="h-4 w-4" />,
  consumption_percent: <RefreshCw className="h-4 w-4" />,
  days_before_expiry: <RefreshCw className="h-4 w-4" />,
  custom: <Zap className="h-4 w-4" />,
};

const actionIcons: Record<CycleActionType, React.ReactNode> = {
  create_task: <CheckSquare className="h-4 w-4" />,
  send_email: <Mail className="h-4 w-4" />,
  send_whatsapp: <MessageSquare className="h-4 w-4" />,
  create_opportunity: <TrendingUp className="h-4 w-4" />,
  notify_owner: <Bell className="h-4 w-4" />,
  start_automation: <Zap className="h-4 w-4" />,
};

export function ProductCyclesTabEnhanced({ product }: ProductCyclesTabEnhancedProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCycle, setEditingCycle] = useState<ProductCycle | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    triggerType: "days_after_purchase" as CycleTriggerType,
    triggerValue: "",
    actionType: "create_task" as CycleActionType,
    actionConfig: {} as Record<string, any>,
  });

  const { data: cycles = [], isLoading } = useProductCycles(product.id);
  const createCycle = useCreateProductCycle();
  const updateCycle = useUpdateProductCycle();
  const deleteCycle = useDeleteProductCycle();

  const openDialog = (cycle?: ProductCycle) => {
    if (cycle) {
      setEditingCycle(cycle);
      setFormData({
        name: cycle.name,
        triggerType: cycle.trigger_type,
        triggerValue: cycle.trigger_value.toString(),
        actionType: cycle.action_type,
        actionConfig: cycle.action_config || {},
      });
    } else {
      setEditingCycle(null);
      setFormData({
        name: "",
        triggerType: "days_after_purchase",
        triggerValue: "",
        actionType: "create_task",
        actionConfig: {},
      });
    }
    setDialogOpen(true);
  };

  const handleSubmit = async () => {
    if (!formData.name || !formData.triggerValue) return;

    if (editingCycle) {
      await updateCycle.mutateAsync({
        id: editingCycle.id,
        productId: product.id,
        name: formData.name,
        triggerType: formData.triggerType,
        triggerValue: parseInt(formData.triggerValue),
        actionType: formData.actionType,
        actionConfig: formData.actionConfig,
      });
    } else {
      await createCycle.mutateAsync({
        productId: product.id,
        name: formData.name,
        triggerType: formData.triggerType,
        triggerValue: parseInt(formData.triggerValue),
        actionType: formData.actionType,
        actionConfig: formData.actionConfig,
      });
    }

    setDialogOpen(false);
  };

  const handleDelete = async (cycle: ProductCycle) => {
    await deleteCycle.mutateAsync({
      id: cycle.id,
      productId: product.id,
    });
  };

  const handleToggleActive = async (cycle: ProductCycle) => {
    await updateCycle.mutateAsync({
      id: cycle.id,
      productId: product.id,
      isActive: !cycle.is_active,
    });
  };

  const getTriggerDescription = (cycle: ProductCycle) => {
    switch (cycle.trigger_type) {
      case "days_after_purchase":
        return `${cycle.trigger_value} dias após a compra`;
      case "days_without_session":
        return `${cycle.trigger_value} dias sem sessão`;
      case "consumption_percent":
        return `Ao consumir ${cycle.trigger_value}% das unidades`;
      case "days_before_expiry":
        return `${cycle.trigger_value} dias antes de expirar`;
      default:
        return `Valor: ${cycle.trigger_value}`;
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
        <div>
          <h3 className="font-medium">Ciclos Automáticos</h3>
          <p className="text-sm text-muted-foreground">
            Configure ações automáticas baseadas em eventos do produto
          </p>
        </div>
        <Button size="sm" onClick={() => openDialog()}>
          <Plus className="h-4 w-4 mr-1" />
          Novo Ciclo
        </Button>
      </div>

      {/* Info Card */}
      <Card className="p-4 bg-muted/50">
        <p className="text-sm text-muted-foreground">
          💡 Os ciclos automáticos criam tarefas, enviam mensagens ou geram oportunidades
          automaticamente no momento certo, sem que precise de intervir manualmente.
        </p>
      </Card>

      {cycles.length > 0 ? (
        <div className="space-y-3">
          {cycles.map((cycle) => (
            <Card key={cycle.id} className={`p-4 ${!cycle.is_active ? "opacity-60" : ""}`}>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h4 className="font-medium">{cycle.name}</h4>
                    {!cycle.is_active && (
                      <Badge variant="outline" className="text-xs">Inativo</Badge>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-3 text-sm">
                    <div className="flex items-center gap-1.5 text-muted-foreground">
                      {triggerIcons[cycle.trigger_type]}
                      <span>{getTriggerDescription(cycle)}</span>
                    </div>
                    <span className="text-muted-foreground">→</span>
                    <div className="flex items-center gap-1.5">
                      {actionIcons[cycle.action_type]}
                      <span className="font-medium">{cycleActionLabels[cycle.action_type]}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Switch
                    checked={cycle.is_active}
                    onCheckedChange={() => handleToggleActive(cycle)}
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => openDialog(cycle)}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDelete(cycle)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <div className="text-center py-8 border-2 border-dashed rounded-lg">
          <RefreshCw className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
          <p className="text-muted-foreground">Sem ciclos configurados</p>
          <p className="text-sm text-muted-foreground mt-1">
            Crie ciclos para automatizar ações baseadas em eventos
          </p>
          <Button className="mt-4" onClick={() => openDialog()}>
            <Plus className="h-4 w-4 mr-2" />
            Criar Primeiro Ciclo
          </Button>
        </div>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingCycle ? "Editar Ciclo" : "Novo Ciclo Automático"}
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Nome do Ciclo *</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Ex: Follow-up pós-compra"
              />
            </div>

            <div className="space-y-2">
              <Label>Quando disparar</Label>
              <Select
                value={formData.triggerType}
                onValueChange={(v) => setFormData({ ...formData, triggerType: v as CycleTriggerType })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(cycleTriggerLabels).map(([key, label]) => (
                    <SelectItem key={key} value={key}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>
                {formData.triggerType === "consumption_percent" ? "Percentagem (%)" : "Valor (dias)"}
              </Label>
              <Input
                type="number"
                value={formData.triggerValue}
                onChange={(e) => setFormData({ ...formData, triggerValue: e.target.value })}
                placeholder={formData.triggerType === "consumption_percent" ? "Ex: 80" : "Ex: 30"}
              />
            </div>

            <div className="space-y-2">
              <Label>Ação a Executar</Label>
              <Select
                value={formData.actionType}
                onValueChange={(v) => setFormData({ ...formData, actionType: v as CycleActionType })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(cycleActionLabels).map(([key, label]) => (
                    <SelectItem key={key} value={key}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Action-specific config would go here */}
            <div className="p-3 bg-muted/50 rounded-lg">
              <p className="text-xs text-muted-foreground">
                ℹ️ A ação será criada automaticamente quando a condição for atingida.
                Inclui contexto do produto e cliente para fácil identificação.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={!formData.name || !formData.triggerValue || createCycle.isPending || updateCycle.isPending}
            >
              {(createCycle.isPending || updateCycle.isPending) && (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              )}
              {editingCycle ? "Guardar" : "Criar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
