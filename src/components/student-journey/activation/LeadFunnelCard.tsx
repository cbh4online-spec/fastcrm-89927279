import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  UserPlus, 
  ArrowRight, 
  Clock, 
  Phone,
  Target,
  AlertCircle,
  ChevronRight
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Link } from "react-router-dom";
import type { LeadFunnelItem } from "@/types/sjActivation";
import { LIFECYCLE_STAGE_CONFIG } from "@/types/studentJourney";

interface LeadFunnelCardProps {
  leads: LeadFunnelItem[];
  maxItems?: number;
}

const FUNNEL_STAGE_CONFIG = {
  new: { label: "Novo", color: "text-blue-600", bgColor: "bg-blue-100 dark:bg-blue-900/30" },
  contacted: { label: "Contactado", color: "text-cyan-600", bgColor: "bg-cyan-100 dark:bg-cyan-900/30" },
  qualified: { label: "Qualificado", color: "text-purple-600", bgColor: "bg-purple-100 dark:bg-purple-900/30" },
  proposal: { label: "Proposta", color: "text-amber-600", bgColor: "bg-amber-100 dark:bg-amber-900/30" },
  negotiation: { label: "Negociação", color: "text-green-600", bgColor: "bg-green-100 dark:bg-green-900/30" },
};

export function LeadFunnelCard({ leads, maxItems = 8 }: LeadFunnelCardProps) {
  const displayedLeads = leads.slice(0, maxItems);
  const staleLeads = leads.filter(l => l.daysInFunnel > 7 && l.stage === 'new').length;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-medium flex items-center gap-2">
            <UserPlus className="h-4 w-4 text-purple-500" />
            Funil de Leads
          </CardTitle>
          <div className="flex items-center gap-2">
            {staleLeads > 0 && (
              <Badge variant="destructive" className="text-[10px] px-1.5">
                {staleLeads} parados
              </Badge>
            )}
            <Badge variant="secondary" className="bg-purple-100 dark:bg-purple-900/30 text-purple-700">
              {leads.length} leads
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <ScrollArea className="h-[360px]">
          {displayedLeads.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <Target className="h-10 w-10 mb-3 opacity-50" />
              <p className="text-sm font-medium">Sem leads ativos</p>
              <p className="text-xs">Novos leads aparecerão aqui</p>
            </div>
          ) : (
            <div className="space-y-2">
              {displayedLeads.map((lead) => {
                const stageConfig = FUNNEL_STAGE_CONFIG[lead.stage];
                const isStale = lead.daysInFunnel > 7 && lead.stage === 'new';
                
                return (
                  <Link 
                    key={lead.profile.id} 
                    to={`/dashboard/student-journey/profiles/${lead.profile.id}`}
                    className="block"
                  >
                    <div className={cn(
                      "flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors group",
                      isStale && "border-red-200 dark:border-red-900/50"
                    )}>
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        {/* Score/Initial */}
                        <div className={cn(
                          "h-10 w-10 rounded-full flex items-center justify-center font-medium text-sm shrink-0",
                          stageConfig.bgColor,
                          stageConfig.color
                        )}>
                          {lead.profile.full_name.charAt(0).toUpperCase()}
                        </div>
                        
                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="font-medium text-sm truncate">{lead.profile.full_name}</p>
                            {isStale && (
                              <AlertCircle className="h-3.5 w-3.5 text-red-500 shrink-0" />
                            )}
                          </div>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                            <Badge 
                              variant="outline" 
                              className={cn("text-[10px] px-1.5 py-0 border-0", stageConfig.bgColor, stageConfig.color)}
                            >
                              {stageConfig.label}
                            </Badge>
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {lead.daysInFunnel}d
                            </span>
                            {lead.interestedIn.length > 0 && (
                              <>
                                <span>•</span>
                                <span className="truncate max-w-[100px]">{lead.interestedIn[0]}</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                      
                      {/* Right side */}
                      <div className="flex items-center gap-2 shrink-0">
                        {/* Score */}
                        <div className={cn(
                          "text-xs font-medium px-2 py-0.5 rounded-full",
                          lead.qualificationScore >= 60 
                            ? "bg-green-100 text-green-700 dark:bg-green-900/30" 
                            : "bg-muted text-muted-foreground"
                        )}>
                          {lead.qualificationScore}%
                        </div>
                        
                        <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </ScrollArea>
        
        {leads.length > maxItems && (
          <div className="mt-3 pt-3 border-t">
            <Link to="/dashboard/student-journey/profiles?stage=lead">
              <Button variant="ghost" size="sm" className="w-full text-xs">
                Ver todos os {leads.length} leads
                <ArrowRight className="h-3 w-3 ml-1" />
              </Button>
            </Link>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
