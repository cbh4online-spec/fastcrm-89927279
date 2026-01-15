import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
  ArrowRight,
  Trash2,
  Edit,
  Loader2,
  TrendingUp,
  Calendar,
  Sparkles,
} from "lucide-react";
import {
  useProductProgressions,
  useCreateProductProgression,
  useUpdateProductProgression,
  useDeleteProductProgression,
} from "@/hooks/useProductProgressions";
import { useProducts } from "@/hooks/useProducts";
import type { Product, ProductProgression, ProgressionAction } from "@/types/product";

interface ProductProgressionsTabProps {
  product: Product;
}

const actionLabels: Record<ProgressionAction, string> = {
  task: "Criar Tarefa",
  opportunity: "Criar Oportunidade",
  campaign: "Iniciar Campanha",
  automation: "Iniciar Automação",
};

export function ProductProgressionsTab({ product }: ProductProgressionsTabProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingProgression, setEditingProgression] = useState<ProductProgression | null>(null);
  const [formData, setFormData] = useState({
    toProductId: "",
    progressionName: "",
    timingDays: "",
    suggestedMessage: "",
    recommendedAction: "opportunity" as ProgressionAction,
  });

  const { data: progressions = [], isLoading } = useProductProgressions(product.id);
  const { data: allProducts = [] } = useProducts();
  const createProgression = useCreateProductProgression();
  const updateProgression = useUpdateProductProgression();
  const deleteProgression = useDeleteProductProgression();

  // Filter out current product from available products
  const availableProducts = allProducts.filter((p) => p.id !== product.id && p.status === "active");

  const openDialog = (progression?: ProductProgression) => {
    if (progression) {
      setEditingProgression(progression);
      setFormData({
        toProductId: progression.to_product_id,
        progressionName: progression.progression_name || "",
        timingDays: progression.timing_days?.toString() || "",
        suggestedMessage: progression.suggested_message || "",
        recommendedAction: (progression.recommended_action as ProgressionAction) || "opportunity",
      });
    } else {
      setEditingProgression(null);
      setFormData({
        toProductId: "",
        progressionName: "",
        timingDays: "",
        suggestedMessage: "",
        recommendedAction: "opportunity",
      });
    }
    setDialogOpen(true);
  };

  const handleSubmit = async () => {
    if (!formData.toProductId) return;

    if (editingProgression) {
      await updateProgression.mutateAsync({
        id: editingProgression.id,
        fromProductId: product.id,
        progressionName: formData.progressionName || null,
        timingDays: formData.timingDays ? parseInt(formData.timingDays) : null,
        suggestedMessage: formData.suggestedMessage || null,
        recommendedAction: formData.recommendedAction,
      });
    } else {
      await createProgression.mutateAsync({
        fromProductId: product.id,
        toProductId: formData.toProductId,
        progressionName: formData.progressionName || undefined,
        timingDays: formData.timingDays ? parseInt(formData.timingDays) : undefined,
        suggestedMessage: formData.suggestedMessage || undefined,
        recommendedAction: formData.recommendedAction,
      });
    }

    setDialogOpen(false);
  };

  const handleDelete = async (progression: ProductProgression) => {
    await deleteProgression.mutateAsync({
      id: progression.id,
      fromProductId: product.id,
    });
  };

  const handleToggleActive = async (progression: ProductProgression) => {
    await updateProgression.mutateAsync({
      id: progression.id,
      fromProductId: product.id,
      isActive: !progression.is_active,
    });
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
          <h3 className="font-medium">Progressões de Produto</h3>
          <p className="text-sm text-muted-foreground">
            Defina produtos seguintes recomendados para upsell/cross-sell
          </p>
        </div>
        <Button size="sm" onClick={() => openDialog()}>
          <Plus className="h-4 w-4 mr-1" />
          Nova Progressão
        </Button>
      </div>

      {progressions.length > 0 ? (
        <div className="space-y-3">
          {progressions.map((prog) => (
            <Card key={prog.id} className={`p-4 ${!prog.is_active ? "opacity-60" : ""}`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{product.name}</span>
                    <ArrowRight className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium text-primary">
                      {prog.to_product?.name || "Produto"}
                    </span>
                  </div>
                  
                  {prog.progression_name && (
                    <Badge variant="outline">{prog.progression_name}</Badge>
                  )}
                  
                  {prog.is_ai_suggested && (
                    <Badge variant="secondary" className="gap-1">
                      <Sparkles className="h-3 w-3" />
                      Sugerido pela IA
                    </Badge>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <Switch
                    checked={prog.is_active}
                    onCheckedChange={() => handleToggleActive(prog)}
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => openDialog(prog)}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDelete(prog)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div className="mt-3 flex items-center gap-4 text-sm text-muted-foreground">
                {prog.timing_days && (
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {prog.timing_days} dias após
                  </span>
                )}
                {prog.recommended_action && (
                  <span className="flex items-center gap-1">
                    <TrendingUp className="h-3 w-3" />
                    {actionLabels[prog.recommended_action as ProgressionAction]}
                  </span>
                )}
                {prog.confidence_score && (
                  <Badge variant="outline" className="text-xs">
                    {prog.confidence_score}% confiança
                  </Badge>
                )}
              </div>

              {prog.suggested_message && (
                <p className="mt-2 text-sm text-muted-foreground italic">
                  "{prog.suggested_message}"
                </p>
              )}
            </Card>
          ))}
        </div>
      ) : (
        <div className="text-center py-8 border-2 border-dashed rounded-lg">
          <TrendingUp className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
          <p className="text-muted-foreground">Sem progressões definidas</p>
          <p className="text-sm text-muted-foreground mt-1">
            Defina produtos que os clientes normalmente compram a seguir
          </p>
          <Button className="mt-4" onClick={() => openDialog()}>
            <Plus className="h-4 w-4 mr-2" />
            Criar Primeira Progressão
          </Button>
        </div>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingProgression ? "Editar Progressão" : "Nova Progressão"}
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Produto Seguinte *</Label>
              <Select
                value={formData.toProductId}
                onValueChange={(v) => setFormData({ ...formData, toProductId: v })}
                disabled={!!editingProgression}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecionar produto" />
                </SelectTrigger>
                <SelectContent>
                  {availableProducts.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Nome da Progressão (opcional)</Label>
              <Input
                value={formData.progressionName}
                onChange={(e) => setFormData({ ...formData, progressionName: e.target.value })}
                placeholder="Ex: Nível 1 → Nível 2"
              />
            </div>

            <div className="space-y-2">
              <Label>Timing (dias após compra)</Label>
              <Input
                type="number"
                value={formData.timingDays}
                onChange={(e) => setFormData({ ...formData, timingDays: e.target.value })}
                placeholder="Ex: 30"
              />
            </div>

            <div className="space-y-2">
              <Label>Ação Recomendada</Label>
              <Select
                value={formData.recommendedAction}
                onValueChange={(v) => setFormData({ ...formData, recommendedAction: v as ProgressionAction })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(actionLabels).map(([key, label]) => (
                    <SelectItem key={key} value={key}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Mensagem Sugerida (opcional)</Label>
              <Textarea
                value={formData.suggestedMessage}
                onChange={(e) => setFormData({ ...formData, suggestedMessage: e.target.value })}
                placeholder="Mensagem para usar em follow-ups..."
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={!formData.toProductId || createProgression.isPending || updateProgression.isPending}
            >
              {(createProgression.isPending || updateProgression.isPending) && (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              )}
              {editingProgression ? "Guardar" : "Criar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
