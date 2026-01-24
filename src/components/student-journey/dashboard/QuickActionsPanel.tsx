/**
 * Quick Actions Panel
 * Action-oriented component for immediate team actions
 */

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Phone,
  MessageSquare,
  Calendar,
  ArrowRight,
  TrendingUp,
  Clock,
  Star,
} from "lucide-react";
import { useJourneyTransitions } from "@/hooks/useJourneyTransitions";
import { Link } from "react-router-dom";
import { JOURNEY_STATE_CONFIG } from "@/types/sjJourney";

export function QuickActionsPanel() {
  const { 
    activationCandidates, 
    readyForContact,
    atRiskProfiles,
  } = useJourneyTransitions();

  // Top 3 priority actions
  const priorityActions = [
    ...activationCandidates.slice(0, 2).map(jp => ({
      type: "activation" as const,
      profile: jp,
      action: "Propor nova formação",
      reason: `Score ${jp.activationScore}% - Período de reflexão concluído`,
      urgency: "high",
    })),
    ...readyForContact.slice(0, 2).map(jp => ({
      type: "contact" as const,
      profile: jp,
      action: "Contactar agora",
      reason: jp.suggestedTransitions[0] || "Follow-up agendado",
      urgency: "medium",
    })),
    ...atRiskProfiles.slice(0, 1).map(jp => ({
      type: "risk" as const,
      profile: jp,
      action: "Prevenir inativação",
      reason: `${jp.daysSinceLastActivity} dias sem atividade`,
      urgency: "high",
    })),
  ].slice(0, 5);

  if (priorityActions.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Phone className="h-5 w-5" />
            Ações Prioritárias
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <Star className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>Nenhuma ação prioritária pendente</p>
            <p className="text-xs mt-1">A base está bem acompanhada!</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Phone className="h-5 w-5" />
            Quem Abordar Agora
          </CardTitle>
          <Badge variant="secondary">{priorityActions.length} ações</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {priorityActions.map((item, idx) => {
          const stateConfig = JOURNEY_STATE_CONFIG[item.profile.currentState];
          
          return (
            <div
              key={item.profile.profile.id + idx}
              className="p-3 rounded-lg border hover:border-primary/30 transition-all group"
            >
              <div className="flex items-start gap-3">
                <Avatar className="h-10 w-10">
                  <AvatarFallback className="bg-gradient-to-br from-primary/60 to-primary text-primary-foreground text-sm">
                    {item.profile.profile.full_name.charAt(0)}
                  </AvatarFallback>
                </Avatar>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <Link 
                      to={`/dashboard/student-journey/profiles/${item.profile.profile.id}`}
                      className="font-medium hover:underline truncate"
                    >
                      {item.profile.profile.full_name}
                    </Link>
                    <Badge 
                      variant="outline" 
                      className={`text-xs ${
                        item.urgency === "high" 
                          ? "border-red-300 text-red-600 bg-red-50" 
                          : "border-amber-300 text-amber-600 bg-amber-50"
                      }`}
                    >
                      {item.urgency === "high" ? "Urgente" : "Normal"}
                    </Badge>
                  </div>
                  
                  <p className="text-sm text-muted-foreground mt-0.5 truncate">
                    {item.reason}
                  </p>
                  
                  <div className="flex items-center gap-2 mt-2">
                    <Badge variant="secondary" className="text-xs">
                      {stateConfig?.label || item.profile.currentState}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      Score: {item.profile.activationScore}%
                    </span>
                  </div>
                </div>
                
                <div className="flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button size="sm" variant="ghost" className="h-8 px-2">
                    <Phone className="h-3.5 w-3.5" />
                  </Button>
                  <Button size="sm" variant="ghost" className="h-8 px-2">
                    <MessageSquare className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
              
              <div className="mt-3 pt-2 border-t flex items-center justify-between">
                <span className={`text-xs font-medium ${
                  item.type === "activation" 
                    ? "text-emerald-600" 
                    : item.type === "risk"
                    ? "text-red-600"
                    : "text-blue-600"
                }`}>
                  → {item.action}
                </span>
                <Button 
                  size="sm" 
                  variant="ghost" 
                  className="h-7 text-xs"
                  asChild
                >
                  <Link to={`/dashboard/student-journey/profiles/${item.profile.profile.id}`}>
                    Ver perfil
                    <ArrowRight className="h-3 w-3 ml-1" />
                  </Link>
                </Button>
              </div>
            </div>
          );
        })}
        
        <Button variant="outline" className="w-full mt-2" asChild>
          <Link to="/dashboard/student-journey/profiles">
            Ver todos os perfis
            <ArrowRight className="h-4 w-4 ml-2" />
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}
