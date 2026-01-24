import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { 
  ArrowRight, Phone, MessageCircle, Mail, 
  Calendar, TrendingUp, Zap, Clock 
} from "lucide-react";
import type { JourneyProfile, JourneyState } from "@/types/sjJourney";
import { JOURNEY_STATE_CONFIG } from "@/types/sjJourney";

interface NextBestActionCardProps {
  journeyProfile: JourneyProfile | undefined;
  onScheduleFollowUp?: () => void;
  onCreateEnrollment?: () => void;
  onOpenCopilot?: () => void;
}

export function NextBestActionCard({ 
  journeyProfile,
  onScheduleFollowUp,
  onCreateEnrollment,
  onOpenCopilot
}: NextBestActionCardProps) {
  if (!journeyProfile) {
    return null;
  }

  const { currentState, nextBestAction, activationScore, isActivationCandidate } = journeyProfile;
  const stateConfig = JOURNEY_STATE_CONFIG[currentState];

  const getActionButton = () => {
    switch (currentState) {
      case 'external_lead':
        return (
          <Button onClick={onScheduleFollowUp} className="gap-2">
            <Phone className="h-4 w-4" />
            Agendar Contacto
          </Button>
        );
      case 'completed_active':
      case 'eligible_progression':
        return (
          <Button onClick={onCreateEnrollment} className="gap-2 bg-emerald-600 hover:bg-emerald-700">
            <TrendingUp className="h-4 w-4" />
            Propor Nova Formação
          </Button>
        );
      case 'inactive':
        return (
          <Button onClick={onOpenCopilot} variant="outline" className="gap-2">
            <Zap className="h-4 w-4" />
            Campanha de Reativação
          </Button>
        );
      case 'strategic_alumni':
        return (
          <Button onClick={onScheduleFollowUp} variant="outline" className="gap-2">
            <Calendar className="h-4 w-4" />
            Manter Relacionamento
          </Button>
        );
      default:
        return (
          <Button onClick={onScheduleFollowUp} variant="outline" className="gap-2">
            <Calendar className="h-4 w-4" />
            Agendar Follow-up
          </Button>
        );
    }
  };

  return (
    <Card className={cn(
      "border-2 transition-all",
      isActivationCandidate 
        ? "border-emerald-300 dark:border-emerald-700 bg-gradient-to-br from-emerald-50/50 to-transparent dark:from-emerald-900/20"
        : "border-primary/20"
    )}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              {isActivationCandidate && (
                <Badge className="bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 border-0">
                  🎯 Candidato para Ativação
                </Badge>
              )}
              <Badge className={cn(stateConfig.bgColor, stateConfig.color, "border-0")}>
                {stateConfig.label}
              </Badge>
            </div>
            
            <h3 className="text-lg font-semibold mb-1 flex items-center gap-2">
              <ArrowRight className="h-5 w-5 text-primary" />
              Próxima Melhor Ação
            </h3>
            
            <p className="text-muted-foreground mb-3">
              {nextBestAction}
            </p>

            <div className="flex items-center gap-4 text-sm">
              <div className="flex items-center gap-1">
                <span className="text-muted-foreground">Score:</span>
                <span className={cn(
                  "font-bold",
                  activationScore >= 80 ? "text-emerald-600" :
                  activationScore >= 60 ? "text-amber-600" : "text-gray-600"
                )}>
                  {activationScore}%
                </span>
              </div>
              <div className="flex items-center gap-1">
                <span className="text-muted-foreground">Estado:</span>
                <span className={cn("font-medium", stateConfig.color)}>
                  {stateConfig.label}
                </span>
              </div>
            </div>
          </div>

          <div className="shrink-0">
            {getActionButton()}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
