import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Loader2, Sparkles, Weight, Check, AlertTriangle, Info } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

interface ProductWeightAIPanelProps {
  productId: string;
  productName: string;
  sku?: string | null;
  category?: string | null;
  description?: string | null;
  currentWeight?: number | null;
}

interface WeightEstimation {
  weight_kg: number;
  confidence: "high" | "medium" | "low";
  reasoning: string;
  source_hint: string;
}

const confidenceConfig = {
  high: { label: "Alta", color: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400", icon: Check },
  medium: { label: "Média", color: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400", icon: Info },
  low: { label: "Baixa", color: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400", icon: AlertTriangle },
};

export function ProductWeightAIPanel({
  productId,
  productName,
  sku,
  category,
  description,
  currentWeight,
}: ProductWeightAIPanelProps) {
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [estimation, setEstimation] = useState<WeightEstimation | null>(null);
  const [manualWeight, setManualWeight] = useState<string>(currentWeight?.toString() || "");
  const updateProduct = useUpdateProduct();

  const handleEstimate = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("ai-product-assistant", {
        body: {
          mode: "estimate-weight",
          productName,
          sku: sku || undefined,
          category: category || undefined,
          context: description?.substring(0, 300) || undefined,
        },
      });

      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || "Erro na estimativa");

      setEstimation(data.data);
      setManualWeight(data.data.weight_kg.toString());
    } catch (err) {
      toast.error("Erro ao estimar peso");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleApply = async (weight: number) => {
    try {
      await updateProduct.mutateAsync({ id: productId, weight });
      toast.success(`Peso atualizado para ${weight} kg`);
      setEstimation(null);
    } catch {
      toast.error("Erro ao guardar peso");
    }
  };

  const conf = estimation ? confidenceConfig[estimation.confidence] : null;
  const ConfIcon = conf?.icon || Info;

  return (
    <Card className="p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Weight className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">Peso do Produto</span>
        </div>
        {currentWeight ? (
          <Badge variant="secondary" className="text-xs">{currentWeight} kg</Badge>
        ) : (
          <Badge variant="outline" className="text-xs text-amber-600 border-amber-300">Não definido</Badge>
        )}
      </div>

      {/* Manual input */}
      <div className="flex items-center gap-2">
        <Input
          type="number"
          step="0.01"
          min="0"
          placeholder="Peso em kg"
          value={manualWeight}
          onChange={(e) => setManualWeight(e.target.value)}
          className="h-8 text-sm w-28"
        />
        <span className="text-xs text-muted-foreground">kg</span>
        <Button
          size="sm"
          variant="outline"
          className="h-8"
          disabled={!manualWeight || updateProduct.isPending}
          onClick={() => handleApply(parseFloat(manualWeight))}
        >
          {updateProduct.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : "Guardar"}
        </Button>
        <Button
          size="sm"
          variant="secondary"
          className="h-8 gap-1.5"
          disabled={loading}
          onClick={handleEstimate}
        >
          {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
          Estimar com IA
        </Button>
      </div>

      {/* AI Estimation result */}
      {estimation && conf && (
        <div className="rounded-lg border p-3 space-y-2 bg-muted/30">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-lg font-bold">{estimation.weight_kg} kg</span>
              <Badge className={`text-[10px] border-0 ${conf.color}`}>
                <ConfIcon className="h-3 w-3 mr-0.5" />
                Confiança {conf.label}
              </Badge>
            </div>
            <Button
              size="sm"
              className="h-7 gap-1"
              onClick={() => handleApply(estimation.weight_kg)}
              disabled={updateProduct.isPending}
            >
              <Check className="h-3 w-3" /> Aplicar
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">{estimation.reasoning}</p>
          {estimation.source_hint && (
            <p className="text-[10px] text-muted-foreground/70 italic">{estimation.source_hint}</p>
          )}
        </div>
      )}
    </Card>
  );
}
