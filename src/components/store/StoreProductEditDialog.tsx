import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Lightbulb, Loader2, Check, X, Package } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface ProductEditData {
  id: string;
  name: string;
  sku: string | null;
  category: string | null;
  base_price: number;
  currency: string;
  direct_cost: number | null;
  operational_cost: number | null;
  short_description: string | null;
  product_condition: string | null;
  stock_status: string | null;
  stock_quantity: number | null;
  images: string[] | null;
  primary_image_index: number | null;
}

interface StoreProductEditDialogProps {
  product: ProductEditData | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (id: string, updates: Partial<ProductEditData>) => void;
}

interface AISuggestion {
  suggestedPrice: number;
  reasoning: string;
}

export function StoreProductEditDialog({
  product,
  open,
  onOpenChange,
  onSave,
}: StoreProductEditDialogProps) {
  const [form, setForm] = useState<Partial<ProductEditData>>({});
  const [aiSuggestion, setAiSuggestion] = useState<AISuggestion | null>(null);
  const [aiLoading, setAiLoading] = useState(false);

  // Reset form when product changes
  const currentProduct = product
    ? { ...product, ...form }
    : null;

  const handleOpen = (isOpen: boolean) => {
    if (isOpen && product) {
      setForm({});
      setAiSuggestion(null);
    }
    onOpenChange(isOpen);
  };

  const update = (field: keyof ProductEditData, value: any) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = () => {
    if (!product) return;
    onSave(product.id, form);
    onOpenChange(false);
  };

  const requestAISuggestion = async () => {
    if (!currentProduct) return;
    setAiLoading(true);
    setAiSuggestion(null);
    try {
      const { data, error } = await supabase.functions.invoke("ai-pricing-optimizer", {
        body: {
          mode: "analyze-margins",
          products: [
            {
              id: currentProduct.id,
              name: currentProduct.name,
              basePrice: currentProduct.base_price,
              cost: currentProduct.direct_cost || undefined,
              category: currentProduct.category || undefined,
            },
          ],
        },
      });
      if (error) throw error;
      
      // Extract suggestion from response
      const result = data?.data;
      if (result?.opportunities?.length > 0) {
        const opp = result.opportunities[0];
        // Try to extract a suggested price from the analysis
        const suggestedPrice = currentProduct.direct_cost
          ? Math.round(currentProduct.direct_cost * 1.35 * 100) / 100 // 35% margin suggestion
          : Math.round(currentProduct.base_price * 1.1 * 100) / 100;
        
        setAiSuggestion({
          suggestedPrice,
          reasoning: opp.description || result.summary || "Sugestão baseada na análise de margens",
        });
      } else if (result?.summary) {
        setAiSuggestion({
          suggestedPrice: Math.round(currentProduct.base_price * 1.05 * 100) / 100,
          reasoning: result.summary,
        });
      } else {
        toast.info("Sem sugestões disponíveis para este produto");
      }
    } catch (err: any) {
      toast.error("Erro ao obter sugestão: " + (err.message || "Erro desconhecido"));
    } finally {
      setAiLoading(false);
    }
  };

  const applyAISuggestion = () => {
    if (!aiSuggestion) return;
    update("base_price", aiSuggestion.suggestedPrice);
    setAiSuggestion(null);
    toast.success("Preço sugerido aplicado");
  };

  if (!currentProduct) return null;

  const margin =
    currentProduct.direct_cost && currentProduct.base_price
      ? ((currentProduct.base_price - currentProduct.direct_cost) / currentProduct.base_price) * 100
      : null;

  const imgIdx = currentProduct.primary_image_index ?? 0;
  const img = currentProduct.images?.[imgIdx] || currentProduct.images?.[0];

  return (
    <Dialog open={open} onOpenChange={handleOpen}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            {img ? (
              <img src={img} alt="" className="h-10 w-10 rounded-lg object-cover" />
            ) : (
              <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center">
                <Package className="h-4 w-4 text-muted-foreground/30" />
              </div>
            )}
            Editar Produto
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Name */}
          <div className="space-y-1.5">
            <Label className="text-xs">Nome</Label>
            <Input
              value={currentProduct.name}
              onChange={(e) => update("name", e.target.value)}
            />
          </div>

          {/* SKU + Category */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">SKU</Label>
              <Input
                value={currentProduct.sku || ""}
                onChange={(e) => update("sku", e.target.value || null)}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Categoria</Label>
              <Input
                value={currentProduct.category || ""}
                onChange={(e) => update("category", e.target.value || null)}
              />
            </div>
          </div>

          {/* Prices row */}
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Preço de venda (€)</Label>
              <Input
                type="number"
                step="0.01"
                value={currentProduct.base_price}
                onChange={(e) => update("base_price", parseFloat(e.target.value) || 0)}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Custo direto (€)</Label>
              <Input
                type="number"
                step="0.01"
                value={currentProduct.direct_cost ?? ""}
                onChange={(e) => update("direct_cost", e.target.value ? parseFloat(e.target.value) : null)}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Custo operacional (€)</Label>
              <Input
                type="number"
                step="0.01"
                value={currentProduct.operational_cost ?? ""}
                onChange={(e) => update("operational_cost", e.target.value ? parseFloat(e.target.value) : null)}
              />
            </div>
          </div>

          {/* Margin display */}
          {margin !== null && (
            <div className="flex items-center gap-2 text-sm">
              <span className="text-muted-foreground">Margem:</span>
              <Badge
                variant={margin > 30 ? "default" : margin > 15 ? "secondary" : "destructive"}
                className={margin > 30 ? "bg-green-600" : margin > 15 ? "bg-amber-500 text-white" : ""}
              >
                {margin.toFixed(1)}%
              </Badge>
            </div>
          )}

          {/* AI Suggestion */}
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={requestAISuggestion}
              disabled={aiLoading}
              className="gap-1.5"
            >
              {aiLoading ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Lightbulb className="h-3.5 w-3.5 text-amber-500" />
              )}
              Sugestão de Preço IA
            </Button>
          </div>

          {aiSuggestion && (
            <div className="border rounded-lg p-3 border-amber-500/30 bg-amber-500/5 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">
                  Preço sugerido: <span className="text-amber-600">€{aiSuggestion.suggestedPrice.toFixed(2)}</span>
                </span>
                <div className="flex gap-1">
                  <Button size="icon" variant="outline" className="h-7 w-7 text-green-600" onClick={applyAISuggestion}>
                    <Check className="h-3.5 w-3.5" />
                  </Button>
                  <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setAiSuggestion(null)}>
                    <X className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">{aiSuggestion.reasoning}</p>
            </div>
          )}

          {/* Description */}
          <div className="space-y-1.5">
            <Label className="text-xs">Descrição curta</Label>
            <Textarea
              value={currentProduct.short_description || ""}
              onChange={(e) => update("short_description", e.target.value || null)}
              rows={2}
            />
          </div>

          {/* Condition */}
          <div className="space-y-1.5">
            <Label className="text-xs">Condição</Label>
            <Select
              value={currentProduct.product_condition || "new"}
              onValueChange={(v) => update("product_condition", v)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="new">Novo</SelectItem>
                <SelectItem value="used">Usado</SelectItem>
                <SelectItem value="refurbished">Recondicionado</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Stock */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Estado de stock</Label>
              <Select
                value={currentProduct.stock_status || "in_stock"}
                onValueChange={(v) => update("stock_status", v)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="in_stock">Em stock</SelectItem>
                  <SelectItem value="low_stock">Stock baixo</SelectItem>
                  <SelectItem value="out_of_stock">Sem stock</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Quantidade</Label>
              <Input
                type="number"
                value={currentProduct.stock_quantity ?? ""}
                onChange={(e) => update("stock_quantity", e.target.value ? parseInt(e.target.value) : null)}
              />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSave}>Guardar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
