import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sparkles,
  Loader2,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Check,
  ArrowRight,
} from "lucide-react";
import { usePricingOptimizer } from "@/hooks/usePricingOptimizer";
import { toast } from "sonner";

interface AIOptimizePricingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  priceTableId: string;
  priceTableName: string;
  onApplySuggestions?: (suggestions: any[]) => void;
}

const strategyOptions = [
  { value: "competitive", label: "Competitivo", description: "Preços para ganhar mercado" },
  { value: "premium", label: "Premium", description: "Maximizar margem" },
  { value: "volume", label: "Volume", description: "Incentivar vendas em quantidade" },
  { value: "customer_value", label: "Valor Percebido", description: "Baseado no valor para o cliente" },
];

export function AIOptimizePricingDialog({
  open,
  onOpenChange,
  priceTableId,
  priceTableName,
  onApplySuggestions,
}: AIOptimizePricingDialogProps) {
  const { optimizeTable } = usePricingOptimizer();
  const [strategy, setStrategy] = useState<string>("premium");
  const [targetMargin, setTargetMargin] = useState(30);
  const [result, setResult] = useState<any>(null);
  const [selectedSuggestions, setSelectedSuggestions] = useState<string[]>([]);

  const handleOptimize = async () => {
    try {
      const data = await optimizeTable.mutateAsync({
        priceTableId,
        strategy: strategy as any,
        targetMargin,
      });
      setResult(data);
      setSelectedSuggestions(data.suggestions?.map((s: any) => s.productId) || []);
    } catch (error) {
      toast.error("Erro ao otimizar preços");
    }
  };

  const handleApply = () => {
    if (onApplySuggestions && result?.suggestions) {
      const toApply = result.suggestions.filter((s: any) => 
        selectedSuggestions.includes(s.productId)
      );
      onApplySuggestions(toApply);
      onOpenChange(false);
      toast.success(`${toApply.length} sugestões aplicadas`);
    }
  };

  const toggleSuggestion = (productId: string) => {
    setSelectedSuggestions(prev => 
      prev.includes(productId)
        ? prev.filter(id => id !== productId)
        : [...prev, productId]
    );
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-PT", {
      style: "currency",
      currency: "EUR",
    }).format(value);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Otimizar Preços com IA
          </DialogTitle>
          <DialogDescription>
            Tabela: {priceTableName}
          </DialogDescription>
        </DialogHeader>

        {!result ? (
          <div className="space-y-6">
            <div className="space-y-3">
              <label className="text-sm font-medium">Estratégia de Preços</label>
              <Select value={strategy} onValueChange={setStrategy}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {strategyOptions.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      <div>
                        <div className="font-medium">{opt.label}</div>
                        <div className="text-xs text-muted-foreground">{opt.description}</div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium">Meta de Margem</label>
                <span className="text-sm font-bold text-primary">{targetMargin}%</span>
              </div>
              <Slider
                value={[targetMargin]}
                onValueChange={([value]) => setTargetMargin(value)}
                min={10}
                max={60}
                step={5}
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>10%</span>
                <span>60%</span>
              </div>
            </div>

            <Card className="p-4 bg-muted/50">
              <div className="flex items-start gap-3">
                <Sparkles className="h-5 w-5 text-primary mt-0.5" />
                <div className="text-sm">
                  <p className="font-medium">Como funciona</p>
                  <p className="text-muted-foreground">
                    A IA irá analisar os produtos, custos e margens atuais, 
                    sugerindo ajustes de preço baseados na estratégia selecionada.
                  </p>
                </div>
              </div>
            </Card>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Summary */}
            <Card className="p-4 bg-primary/5 border-primary/20">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-full bg-primary/10">
                  <TrendingUp className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1">
                  <div className="font-medium">{result.summary}</div>
                  <div className="text-sm text-muted-foreground">
                    Melhoria de margem estimada: <span className="font-bold text-green-600">+{result.totalMarginImprovement?.toFixed(1)}%</span>
                  </div>
                </div>
              </div>
            </Card>

            {/* Suggestions List */}
            <div className="space-y-2">
              <div className="text-sm font-medium">Sugestões ({result.suggestions?.length || 0})</div>
              {result.suggestions?.map((suggestion: any) => (
                <Card 
                  key={suggestion.productId}
                  className={`p-3 cursor-pointer transition-colors ${
                    selectedSuggestions.includes(suggestion.productId)
                      ? 'border-primary bg-primary/5'
                      : 'hover:bg-muted/50'
                  }`}
                  onClick={() => toggleSuggestion(suggestion.productId)}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                      selectedSuggestions.includes(suggestion.productId)
                        ? 'border-primary bg-primary text-primary-foreground'
                        : 'border-muted-foreground/30'
                    }`}>
                      {selectedSuggestions.includes(suggestion.productId) && (
                        <Check className="h-3 w-3" />
                      )}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate">Produto</div>
                      <div className="text-sm text-muted-foreground truncate">
                        {suggestion.reasoning}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 text-sm">
                      <span className="text-muted-foreground">
                        {formatCurrency(suggestion.currentPrice)}
                      </span>
                      <ArrowRight className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium text-green-600">
                        {formatCurrency(suggestion.suggestedPrice)}
                      </span>
                    </div>

                    <Badge variant={
                      suggestion.marginAfter > suggestion.marginBefore ? "default" : "secondary"
                    }>
                      {suggestion.marginAfter > suggestion.marginBefore ? "+" : ""}
                      {(suggestion.marginAfter - suggestion.marginBefore).toFixed(1)}%
                    </Badge>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}

        <DialogFooter>
          {!result ? (
            <>
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button onClick={handleOptimize} disabled={optimizeTable.isPending}>
                {optimizeTable.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    A analisar...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4 mr-2" />
                    Otimizar Preços
                  </>
                )}
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" onClick={() => setResult(null)}>
                Voltar
              </Button>
              <Button 
                onClick={handleApply} 
                disabled={selectedSuggestions.length === 0}
              >
                <Check className="h-4 w-4 mr-2" />
                Aplicar {selectedSuggestions.length} Sugestões
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
