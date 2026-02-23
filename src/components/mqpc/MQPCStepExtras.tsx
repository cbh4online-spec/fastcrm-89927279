import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Sparkles, ChevronDown, Loader2, Check } from "lucide-react";
import { useProductAIAssistant } from "@/hooks/useProductAIAssistant";
import { toast } from "sonner";

interface ExtrasData {
  shortDescription: string;
  fullDescription: string;
  sku: string;
  stockQuantity: string;
}

interface MQPCStepExtrasProps {
  extras: ExtrasData;
  onExtrasChange: (extras: ExtrasData) => void;
  productName: string;
  categoryName: string;
}

export function MQPCStepExtras({ extras, onExtrasChange, productName, categoryName }: MQPCStepExtrasProps) {
  const { generateDescription } = useProductAIAssistant();
  const [aiDone, setAiDone] = useState(false);
  const [advancedOpen, setAdvancedOpen] = useState(false);

  const update = (field: keyof ExtrasData, value: string) => {
    onExtrasChange({ ...extras, [field]: value });
  };

  const handleAIImprove = async () => {
    if (!productName) {
      toast.error("Preencha o nome do produto primeiro");
      return;
    }

    try {
      const result = await generateDescription.mutateAsync({
        productName,
        category: categoryName || undefined,
      });

      onExtrasChange({
        ...extras,
        shortDescription: result.shortDescription || "",
        fullDescription: result.fullDescription || "",
      });
      setAiDone(true);
      toast.success("Descrições geradas com IA!");
    } catch (err: any) {
      toast.error("Erro ao gerar descrição: " + err.message);
    }
  };

  return (
    <div className="space-y-5">
      <div className="text-center space-y-2">
        <h2 className="text-lg font-semibold">Extras (Opcional)</h2>
        <p className="text-sm text-muted-foreground">
          Melhore o produto com IA ou adicione detalhes
        </p>
      </div>

      <Button
        onClick={handleAIImprove}
        disabled={generateDescription.isPending || !productName}
        className="w-full h-14 gap-3 text-base"
        variant={aiDone ? "secondary" : "default"}
      >
        {generateDescription.isPending ? (
          <>
            <Loader2 className="h-5 w-5 animate-spin" />
            A gerar descrições...
          </>
        ) : aiDone ? (
          <>
            <Check className="h-5 w-5" />
            Descrições geradas ✨
          </>
        ) : (
          <>
            <Sparkles className="h-5 w-5" />
            Melhorar com IA
          </>
        )}
      </Button>

      {(extras.shortDescription || extras.fullDescription) && (
        <div className="space-y-3 p-4 rounded-xl bg-muted/50 border">
          {extras.shortDescription && (
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-1">Descrição curta</p>
              <p className="text-sm">{extras.shortDescription}</p>
            </div>
          )}
          {extras.fullDescription && (
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-1">Descrição completa</p>
              <p className="text-sm whitespace-pre-line">{extras.fullDescription}</p>
            </div>
          )}
        </div>
      )}

      <Collapsible open={advancedOpen} onOpenChange={setAdvancedOpen}>
        <CollapsibleTrigger asChild>
          <Button variant="ghost" className="w-full justify-between text-muted-foreground">
            Campos avançados
            <ChevronDown className={`h-4 w-4 transition-transform ${advancedOpen ? "rotate-180" : ""}`} />
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent className="space-y-4 pt-2">
          <div className="space-y-2">
            <Label htmlFor="mqpc-sku">SKU / Referência</Label>
            <Input
              id="mqpc-sku"
              placeholder="Ex: CAM-IP-4MP-001"
              value={extras.sku}
              onChange={(e) => update("sku", e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="mqpc-stock">Quantidade em Stock</Label>
            <Input
              id="mqpc-stock"
              type="number"
              inputMode="numeric"
              min="0"
              placeholder="0"
              value={extras.stockQuantity}
              onChange={(e) => update("stockQuantity", e.target.value)}
            />
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}

export type { ExtrasData };
