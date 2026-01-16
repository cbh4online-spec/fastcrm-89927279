import { useState } from "react";
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
import { Separator } from "@/components/ui/separator";
import { Check, Clock, Sparkles, Zap, TrendingUp, Loader2 } from "lucide-react";
import { TrialStatus } from "@/hooks/useModuleTrial";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface ModuleUpgradeModalProps {
  open: boolean;
  onClose: () => void;
  moduleId: string;
  moduleName: string;
  modulePrice?: number;
  trialStatus: TrialStatus | null;
}

export function ModuleUpgradeModal({
  open,
  onClose,
  moduleId,
  moduleName,
  modulePrice = 9.99,
  trialStatus,
}: ModuleUpgradeModalProps) {
  const [isLoading, setIsLoading] = useState(false);

  const handleUpgrade = async () => {
    try {
      setIsLoading(true);
      
      const { data, error } = await supabase.functions.invoke("module-checkout", {
        body: { moduleId, moduleName },
      });

      if (error) {
        console.error("Checkout error:", error);
        toast.error("Erro ao iniciar checkout");
        return;
      }

      if (data?.url) {
        window.open(data.url, "_blank");
        onClose();
      } else {
        toast.error("Erro ao criar sessão de pagamento");
      }
    } catch (err) {
      console.error("Upgrade error:", err);
      toast.error("Erro ao processar upgrade");
    } finally {
      setIsLoading(false);
    }
  };

  const usesConsumed = trialStatus?.uses_consumed || 0;
  const valueGenerated = trialStatus?.value_generated || {};

  // Calculate estimated value (mock - in real app this would come from actual data)
  const estimatedTimeSaved = Math.round(usesConsumed * 5); // 5 min per action
  const estimatedHoursSaved = (estimatedTimeSaved / 60).toFixed(1);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2 mb-2">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-primary" />
            </div>
            <div>
              <DialogTitle className="text-lg">{moduleName}</DialogTitle>
              <DialogDescription>Continuar a usar sem limites</DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4">
          {/* Value Generated Section */}
          <div className="p-4 rounded-xl bg-gradient-to-br from-emerald-50 to-emerald-100/50 dark:from-emerald-950/30 dark:to-emerald-900/20 border border-emerald-200 dark:border-emerald-800">
            <div className="flex items-center gap-2 mb-3">
              <TrendingUp className="w-5 h-5 text-emerald-600" />
              <span className="font-medium text-emerald-800 dark:text-emerald-200">
                Valor que já geraste
              </span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="text-center p-2 bg-white/50 dark:bg-black/20 rounded-lg">
                <p className="text-2xl font-bold text-emerald-700 dark:text-emerald-300">
                  {usesConsumed}
                </p>
                <p className="text-xs text-emerald-600 dark:text-emerald-400">
                  ações executadas
                </p>
              </div>
              <div className="text-center p-2 bg-white/50 dark:bg-black/20 rounded-lg">
                <p className="text-2xl font-bold text-emerald-700 dark:text-emerald-300">
                  ~{estimatedHoursSaved}h
                </p>
                <p className="text-xs text-emerald-600 dark:text-emerald-400">
                  tempo poupado
                </p>
              </div>
            </div>
          </div>

          {/* Trial Exhausted Warning */}
          {trialStatus?.uses_remaining === 0 && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800">
              <Clock className="w-4 h-4 text-amber-600 flex-shrink-0" />
              <p className="text-sm text-amber-700 dark:text-amber-300">
                O teu trial terminou. Ativa para continuar a usar.
              </p>
            </div>
          )}

          <Separator />

          {/* Pricing */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Preço mensal</p>
              <p className="text-2xl font-bold">{modulePrice}€<span className="text-sm font-normal text-muted-foreground">/mês</span></p>
            </div>
            <Badge variant="outline" className="bg-primary/10 text-primary border-primary/30">
              Sem limites
            </Badge>
          </div>

          {/* Benefits */}
          <div className="space-y-2">
            <p className="text-sm font-medium text-muted-foreground">Inclui:</p>
            <ul className="space-y-1.5">
              {[
                "Utilizações ilimitadas",
                "Suporte prioritário",
                "Atualizações automáticas",
                "Dados históricos mantidos",
              ].map((benefit) => (
                <li key={benefit} className="flex items-center gap-2 text-sm">
                  <Check className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                  {benefit}
                </li>
              ))}
            </ul>
          </div>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2 mt-4">
          <Button variant="outline" onClick={onClose} disabled={isLoading}>
            Mais tarde
          </Button>
          <Button onClick={handleUpgrade} disabled={isLoading} className="gap-2">
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                A processar...
              </>
            ) : (
              <>
                <Zap className="w-4 h-4" />
                Ativar por {modulePrice}€/mês
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
