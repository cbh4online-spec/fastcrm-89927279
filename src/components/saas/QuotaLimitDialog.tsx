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
  Sparkles 
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
    if (plan === "free") return "basic";
    if (plan === "basic") return "pro";
    return "agency";
  };

  const suggestedPlan = getSuggestedPlan();
  const suggestedPlanInfo = PLAN_DISPLAY_INFO[suggestedPlan as keyof typeof PLAN_DISPLAY_INFO];

  const handleUpgrade = () => {
    if (onUpgrade) {
      onUpgrade();
    } else {
      createCheckout(suggestedPlan as "basic" | "pro" | "agency");
    }
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className={cn(
            "mx-auto mb-4 w-12 h-12 rounded-full flex items-center justify-center",
            isAtLimit ? "bg-destructive/10" : "bg-amber-500/10"
          )}>
            {isAtLimit ? (
              <AlertTriangle className="w-6 h-6 text-destructive" />
            ) : (
              <TrendingUp className="w-6 h-6 text-amber-600" />
            )}
          </div>
          
          <DialogTitle className="text-center">
            {isAtLimit ? "Limite Atingido" : "Perto do Limite"}
          </DialogTitle>
          
          <DialogDescription className="text-center">
            {isAtLimit 
              ? `Atingiu o limite de ${resource.name.toLowerCase()} do seu plano.`
              : `Está a usar ${Math.round(percent)}% do limite de ${resource.name.toLowerCase()}.`
            }
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Current usage */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">{resource.name}</span>
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

          {/* Upgrade suggestion */}
          <div className="p-4 rounded-lg border border-primary/30 bg-primary/5">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Sparkles className="w-5 h-5 text-primary" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-medium">Plano {suggestedPlanInfo.name}</span>
                  <Badge variant="outline" className="text-xs">
                    €{suggestedPlanInfo.price}/mês
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  {suggestedPlanInfo.description}
                </p>
                <ul className="mt-2 space-y-1">
                  {suggestedPlanInfo.features.slice(0, 3).map((feature, i) => (
                    <li key={i} className="text-xs text-muted-foreground flex items-center gap-1">
                      <span className="w-1 h-1 rounded-full bg-primary" />
                      {feature}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} className="flex-1">
            Mais tarde
          </Button>
          <Button onClick={handleUpgrade} className="flex-1 gap-2">
            <Crown className="w-4 h-4" />
            Fazer Upgrade
            <ArrowRight className="w-4 h-4" />
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
