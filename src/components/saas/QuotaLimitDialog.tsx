import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  AlertTriangle, 
  Crown, 
  TrendingUp, 
  ArrowRight,
  Sparkles,
  Check
} from "lucide-react";
import { useSubscription } from "@/contexts/SubscriptionContext";
import { PLAN_DISPLAY_INFO, RESOURCE_TYPES } from "@/types/saas";
import { cn } from "@/lib/utils";

interface QuotaLimitDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  resourceType: keyof typeof RESOURCE_TYPES;
  current: number;
  limit: number;
  onUpgrade?: () => void;
}

// Microcopy baseado nas diretrizes UX - nunca usar "erro" ou linguagem técnica
const getMicrocopy = (resourceName: string, current: number, limit: number, isAtLimit: boolean, suggestedPlanName: string) => {
  if (isAtLimit) {
    return {
      title: "Limite atingido",
      description: `Este plano permite até ${limit} ${resourceName.toLowerCase()}. Já usaste ${current === limit ? "todas" : "o limite"}.`,
      suggestion: `O plano ${suggestedPlanName} desbloqueia mais ${resourceName.toLowerCase()}.`,
      primaryAction: "Fazer upgrade",
      secondaryAction: "Talvez mais tarde",
    };
  }
  
  const percent = Math.round((current / limit) * 100);
  return {
    title: "Estás quase a atingir o limite",
    description: `Tens usado bastante ${resourceName.toLowerCase()}. Estás a ${percent}% do teu plano atual.`,
    suggestion: `Para não interromper o trabalho, considera o plano ${suggestedPlanName}.`,
    primaryAction: "Ver planos",
    secondaryAction: "Continuar assim",
  };
};

export function QuotaLimitDialog({
  open,
  onOpenChange,
  resourceType,
  current,
  limit,
  onUpgrade,
}: QuotaLimitDialogProps) {
  const { plan, createCheckout } = useSubscription();
  const resource = RESOURCE_TYPES[resourceType];
  const percent = Math.min((current / limit) * 100, 100);
  const isAtLimit = percent >= 100;

  const getSuggestedPlan = () => {
    if (plan === "starter") return "growth";
    return "scale";
  };

  const suggestedPlan = getSuggestedPlan();
  const suggestedPlanInfo = PLAN_DISPLAY_INFO[suggestedPlan as keyof typeof PLAN_DISPLAY_INFO];
  const microcopy = getMicrocopy(resource.name, current, limit, isAtLimit, suggestedPlanInfo.name);

  const handleUpgrade = () => {
    if (onUpgrade) {
      onUpgrade();
    } else {
      createCheckout(suggestedPlan as "growth" | "scale");
    }
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className={cn(
            "mx-auto mb-4 w-14 h-14 rounded-full flex items-center justify-center",
            isAtLimit ? "bg-destructive/10" : "bg-amber-500/10"
          )}>
            {isAtLimit ? (
              <AlertTriangle className="w-7 h-7 text-destructive" />
            ) : (
              <TrendingUp className="w-7 h-7 text-amber-600" />
            )}
          </div>
          
          <DialogTitle className="text-center text-xl">
            {microcopy.title}
          </DialogTitle>
          
          <DialogDescription className="text-center text-base">
            {microcopy.description}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Current usage - visual claro */}
          <div className="space-y-3 p-4 rounded-lg bg-muted/50">
            <div className="flex justify-between text-sm">
              <span className="font-medium">{resource.name}</span>
              <span className={cn(
                "font-medium",
                isAtLimit && "text-destructive"
              )}>
                {current.toLocaleString()} / {limit.toLocaleString()}
              </span>
            </div>
            <Progress 
              value={percent} 
              className={cn(
                "h-3",
                isAtLimit && "[&>div]:bg-destructive",
                !isAtLimit && "[&>div]:bg-amber-500"
              )}
            />
          </div>

          {/* Upgrade suggestion - orientado a valor */}
          <div className="p-4 rounded-lg border-2 border-primary/30 bg-gradient-to-br from-primary/5 to-primary/10">
            <div className="flex items-start gap-3">
              <div className="p-2.5 rounded-xl bg-primary/10">
                <Sparkles className="w-5 h-5 text-primary" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-semibold text-lg">Plano {suggestedPlanInfo.name}</span>
                  <Badge className="bg-primary/10 text-primary border-0">
                    €{suggestedPlanInfo.price}/mês
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground mb-3">
                  {microcopy.suggestion}
                </p>
                {/* Benefícios - não só limites */}
                <ul className="space-y-1.5">
                  {suggestedPlanInfo.features.slice(0, 3).map((feature, i) => (
                    <li key={i} className="text-sm flex items-center gap-2">
                      <Check className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button 
            variant="ghost" 
            onClick={() => onOpenChange(false)} 
            className="flex-1 text-muted-foreground"
          >
            {microcopy.secondaryAction}
          </Button>
          <Button 
            onClick={handleUpgrade} 
            className="flex-1 gap-2 bg-gradient-to-r from-primary to-primary/80"
            size="lg"
          >
            <Crown className="w-4 h-4" />
            {microcopy.primaryAction}
            <ArrowRight className="w-4 h-4" />
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
