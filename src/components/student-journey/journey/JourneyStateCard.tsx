import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { 
  UserPlus, UserCheck, BookOpen, GraduationCap, 
  TrendingUp, Pause, Crown, ChevronRight, MoreHorizontal,
  ArrowRightCircle, Phone, MessageCircle, Mail
} from "lucide-react";
import { Link } from "react-router-dom";
import type { JourneyProfile, JourneyState } from "@/types/sjJourney";
import { JOURNEY_STATE_CONFIG } from "@/types/sjJourney";

interface JourneyStateCardProps {
  journeyProfile: JourneyProfile;
  onTransition?: (profileId: string, newState: JourneyState) => void;
  compact?: boolean;
}

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  UserPlus,
  UserCheck,
  BookOpen,
  GraduationCap,
  TrendingUp,
  Pause,
  Crown
};

const CHANNEL_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  phone: Phone,
  whatsapp: MessageCircle,
  email: Mail
};

export function JourneyStateCard({ 
  journeyProfile, 
  onTransition,
  compact = false 
}: JourneyStateCardProps) {
  const { profile, currentState, activationScore, nextBestAction, suggestedTransitions } = journeyProfile;
  const config = JOURNEY_STATE_CONFIG[currentState];
  const StateIcon = ICON_MAP[config.icon] || UserPlus;
  const ChannelIcon = CHANNEL_ICONS[profile.preferred_channel] || Mail;

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-emerald-600';
    if (score >= 60) return 'text-amber-600';
    return 'text-gray-600';
  };

  const getScoreBg = (score: number) => {
    if (score >= 80) return 'bg-emerald-100 dark:bg-emerald-900/30';
    if (score >= 60) return 'bg-amber-100 dark:bg-amber-900/30';
    return 'bg-gray-100 dark:bg-gray-800/50';
  };

  if (compact) {
    return (
      <div className={cn(
        "flex items-center justify-between p-3 rounded-lg border transition-all hover:shadow-sm",
        config.bgColor,
        config.borderColor
      )}>
        <div className="flex items-center gap-3">
          <div className={cn("p-1.5 rounded-full bg-background/50", config.color)}>
            <StateIcon className="h-3.5 w-3.5" />
          </div>
          <div>
            <Link 
              to={`/dashboard/student-journey/profiles/${profile.id}`}
              className="font-medium hover:underline"
            >
              {profile.full_name}
            </Link>
            <p className="text-xs text-muted-foreground">{config.label}</p>
          </div>
        </div>
        <Badge className={cn(getScoreBg(activationScore), getScoreColor(activationScore), "border-0")}>
          {activationScore}%
        </Badge>
      </div>
    );
  }

  return (
    <Card className={cn("border-l-4 transition-all hover:shadow-md", config.borderColor)}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-4">
          {/* Left: Profile info */}
          <div className="flex items-start gap-3 flex-1">
            <div className={cn(
              "p-2 rounded-full shrink-0",
              config.bgColor,
              config.color
            )}>
              <StateIcon className="h-5 w-5" />
            </div>
            
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <Link 
                  to={`/dashboard/student-journey/profiles/${profile.id}`}
                  className="font-semibold hover:underline truncate"
                >
                  {profile.full_name}
                </Link>
                <Badge className={cn(config.bgColor, config.color, "border-0 text-xs")}>
                  {config.label}
                </Badge>
                {journeyProfile.isActivationCandidate && (
                  <Badge className="bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 border-0 text-xs">
                    🎯 Ativar
                  </Badge>
                )}
              </div>
              
              <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                {profile.email && <span className="truncate">{profile.email}</span>}
                <span className="flex items-center gap-1">
                  <ChannelIcon className="h-3 w-3" />
                  {profile.preferred_channel}
                </span>
              </div>

              {/* Stats row */}
              <div className="flex items-center gap-4 mt-2 text-xs">
                <span>
                  <span className="text-muted-foreground">Cursos:</span>{" "}
                  <span className="font-medium">{journeyProfile.completedEnrollments}</span>
                </span>
                <span>
                  <span className="text-muted-foreground">Dias no estado:</span>{" "}
                  <span className="font-medium">{journeyProfile.daysInCurrentState}</span>
                </span>
                {journeyProfile.daysSinceLastActivity !== null && (
                  <span>
                    <span className="text-muted-foreground">Última atividade:</span>{" "}
                    <span className={cn(
                      "font-medium",
                      journeyProfile.daysSinceLastActivity > 60 && "text-amber-600"
                    )}>
                      {journeyProfile.daysSinceLastActivity}d
                    </span>
                  </span>
                )}
              </div>

              {/* Next action */}
              {nextBestAction && (
                <div className="mt-2 flex items-center gap-2 text-sm">
                  <ArrowRightCircle className="h-4 w-4 text-primary" />
                  <span className="text-primary font-medium">{nextBestAction}</span>
                </div>
              )}
            </div>
          </div>

          {/* Right: Score & Actions */}
          <div className="flex flex-col items-end gap-2">
            <div className={cn(
              "px-3 py-1 rounded-full font-bold text-lg",
              getScoreBg(activationScore),
              getScoreColor(activationScore)
            )}>
              {activationScore}
            </div>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>Transições</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {suggestedTransitions.map(targetState => {
                  const targetConfig = JOURNEY_STATE_CONFIG[targetState];
                  const TargetIcon = ICON_MAP[targetConfig.icon] || UserPlus;
                  return (
                    <DropdownMenuItem 
                      key={targetState}
                      onClick={() => onTransition?.(profile.id, targetState)}
                      className="gap-2"
                    >
                      <TargetIcon className={cn("h-4 w-4", targetConfig.color)} />
                      <span>Mover para {targetConfig.label}</span>
                    </DropdownMenuItem>
                  );
                })}
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link to={`/dashboard/student-journey/profiles/${profile.id}`} className="gap-2">
                    <ChevronRight className="h-4 w-4" />
                    Ver perfil completo
                  </Link>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
