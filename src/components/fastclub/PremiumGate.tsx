import { ReactNode } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Shield, ArrowRight } from "lucide-react";
import { useFastClubMembership } from "@/hooks/useFastClubMembership";
import { cn } from "@/lib/utils";

interface PremiumGateProps {
  children: ReactNode;
  featureLabel?: string;
  className?: string;
}

export function PremiumGate({ children, featureLabel, className }: PremiumGateProps) {
  const { tier } = useFastClubMembership();

  if (tier === "premium") {
    return <>{children}</>;
  }

  return (
    <div className={cn("relative", className)}>
      <div className="opacity-30 pointer-events-none select-none blur-[2px]">
        {children}
      </div>
      <div className="absolute inset-0 flex items-center justify-center">
        <Card className="max-w-md w-full border-border/60 bg-card/95 backdrop-blur-sm shadow-xl">
          <CardContent className="p-8 text-center space-y-5">
            <div className="inline-flex p-4 rounded-2xl bg-muted">
              <Shield className="w-8 h-8 text-muted-foreground" />
            </div>
            <div className="space-y-2">
              <h3 className="text-lg font-semibold text-foreground">
                Conteúdo Exclusivo para Membros Premium
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {featureLabel
                  ? `"${featureLabel}" está disponível apenas para membros premium do FastClub.`
                  : "Esta secção está disponível apenas para membros premium do FastClub."}
              </p>
            </div>
            <Button className="gap-2 px-6" size="lg">
              Fazer Upgrade
              <ArrowRight className="w-4 h-4" />
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
