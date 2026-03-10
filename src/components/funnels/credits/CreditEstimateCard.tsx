import { Coins, Sparkles, Zap } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useCreditWallet } from "@/hooks/useCreditWallet";

interface Props {
  complexity?: "essential" | "advanced";
}

export function CreditEstimateCard({ complexity = "essential" }: Props) {
  const { getCost, balance } = useCreditWallet();
  
  const essentialCost = getCost("ai_funnel_essential");
  const advancedCost = getCost("ai_funnel_advanced");
  const selectedCost = complexity === "essential" ? essentialCost : advancedCost;
  const affordable = balance >= selectedCost;

  return (
    <Card className="border-primary/20 bg-primary/5">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" />
          <span className="text-sm font-semibold">Estimativa de Créditos</span>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className={`p-3 rounded-lg border transition-colors ${
            complexity === "essential" 
              ? "border-primary bg-primary/10" 
              : "border-border/50 bg-muted/30"
          }`}>
            <div className="flex items-center gap-1.5 mb-1">
              <Zap className="h-3.5 w-3.5" />
              <span className="text-xs font-medium">Essential</span>
            </div>
            <div className="flex items-center gap-1">
              <Coins className="h-3.5 w-3.5 text-primary" />
              <span className="text-lg font-bold">{essentialCost}</span>
              <span className="text-xs text-muted-foreground">créditos</span>
            </div>
            <p className="text-[10px] text-muted-foreground mt-1">
              Landing + Captura + Obrigado
            </p>
          </div>

          <div className={`p-3 rounded-lg border transition-colors ${
            complexity === "advanced" 
              ? "border-primary bg-primary/10" 
              : "border-border/50 bg-muted/30"
          }`}>
            <div className="flex items-center gap-1.5 mb-1">
              <Sparkles className="h-3.5 w-3.5" />
              <span className="text-xs font-medium">Advanced</span>
            </div>
            <div className="flex items-center gap-1">
              <Coins className="h-3.5 w-3.5 text-primary" />
              <span className="text-lg font-bold">{advancedCost}</span>
              <span className="text-xs text-muted-foreground">créditos</span>
            </div>
            <p className="text-[10px] text-muted-foreground mt-1">
              Full funnel + Automações + Copy + Routing
            </p>
          </div>
        </div>

        <Separator />

        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Saldo disponível</span>
          <Badge variant={affordable ? "outline" : "destructive"} className="font-bold">
            <Coins className="h-3 w-3 mr-1" />
            {balance}
          </Badge>
        </div>
      </CardContent>
    </Card>
  );
}
