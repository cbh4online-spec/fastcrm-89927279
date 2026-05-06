import { ReactNode } from "react";
import { useHasPlanFeature } from "@/hooks/useBillingPlans";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Crown, Lock } from "lucide-react";
import { Link } from "react-router-dom";

interface Props {
  featureKey: string;
  children: ReactNode;
  fallback?: ReactNode;
  /** Mostra o conteúdo mesmo se desactivado, mas com banner de upsell por cima. */
  blurWhenLocked?: boolean;
}

export function PlanFeatureGate({ featureKey, children, fallback, blurWhenLocked }: Props) {
  const { data, isLoading } = useHasPlanFeature(featureKey);

  if (isLoading) return null;
  if (data?.enabled) return <>{children}</>;
  if (fallback) return <>{fallback}</>;

  const upsell = (
    <Card className="border-amber-500/30 bg-gradient-to-br from-amber-500/5 via-background to-orange-500/5">
      <CardContent className="p-6 flex items-start gap-4">
        <div className="p-3 rounded-xl bg-amber-500/15">
          <Crown className="w-5 h-5 text-amber-600" />
        </div>
        <div className="flex-1">
          <h3 className="font-semibold">Funcionalidade disponível em planos superiores</h3>
          <p className="text-sm text-muted-foreground mt-1">
            Esta funcionalidade requer um upgrade. Veja a comparação de planos disponíveis.
          </p>
          <Button asChild size="sm" className="mt-3 gap-2">
            <Link to="/dashboard/plans"><Crown className="w-4 h-4" /> Ver planos</Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );

  if (blurWhenLocked) {
    return (
      <div className="relative">
        <div className="opacity-40 pointer-events-none select-none">{children}</div>
        <div className="absolute inset-0 flex items-center justify-center backdrop-blur-[2px] bg-background/50 rounded-lg">
          <div className="text-center p-4">
            <Lock className="w-5 h-5 text-muted-foreground mx-auto mb-2" />
            <Button asChild size="sm"><Link to="/dashboard/plans">Fazer upgrade</Link></Button>
          </div>
        </div>
      </div>
    );
  }

  return upsell;
}
