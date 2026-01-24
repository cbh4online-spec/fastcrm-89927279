import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  TrendingUp, 
  ArrowRight, 
  GraduationCap, 
  Phone, 
  Mail, 
  MessageCircle,
  ChevronRight,
  Sparkles
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Link } from "react-router-dom";
import { PROGRESSION_TYPE_CONFIG, PRIORITY_CONFIG } from "@/types/sjActivation";
import type { ProgressionCandidate } from "@/types/sjActivation";
import { format, parseISO } from "date-fns";
import { pt } from "date-fns/locale";

interface ProgressionCandidatesListProps {
  candidates: ProgressionCandidate[];
  maxItems?: number;
}

export function ProgressionCandidatesList({ candidates, maxItems = 8 }: ProgressionCandidatesListProps) {
  const displayedCandidates = candidates.slice(0, maxItems);

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-green-600";
    if (score >= 60) return "text-blue-600";
    if (score >= 40) return "text-amber-600";
    return "text-gray-600";
  };

  const getScoreBg = (score: number) => {
    if (score >= 80) return "bg-green-100 dark:bg-green-900/30";
    if (score >= 60) return "bg-blue-100 dark:bg-blue-900/30";
    if (score >= 40) return "bg-amber-100 dark:bg-amber-900/30";
    return "bg-gray-100 dark:bg-gray-900/30";
  };

  const getChannelIcon = (channel: string) => {
    switch (channel) {
      case 'phone': return Phone;
      case 'whatsapp': return MessageCircle;
      default: return Mail;
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-medium flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-emerald-500" />
            Prontos para Progressão
          </CardTitle>
          <Badge variant="secondary" className="bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700">
            {candidates.length} alumni
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <ScrollArea className="h-[360px]">
          {displayedCandidates.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <GraduationCap className="h-10 w-10 mb-3 opacity-50" />
              <p className="text-sm font-medium">Sem candidatos de progressão</p>
              <p className="text-xs">Alumni que completaram cursos aparecerão aqui</p>
            </div>
          ) : (
            <div className="space-y-2">
              {displayedCandidates.map((candidate) => {
                const typeConfig = PROGRESSION_TYPE_CONFIG[candidate.progressionType];
                const ChannelIcon = getChannelIcon(candidate.preferredChannel);
                
                return (
                  <Link 
                    key={candidate.profile.id} 
                    to={`/dashboard/student-journey/profiles/${candidate.profile.id}`}
                    className="block"
                  >
                    <div className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors group">
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        {/* Score Badge */}
                        <div className={cn(
                          "h-10 w-10 rounded-full flex items-center justify-center font-bold text-sm shrink-0",
                          getScoreBg(candidate.progressionScore),
                          getScoreColor(candidate.progressionScore)
                        )}>
                          {candidate.progressionScore}
                        </div>
                        
                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="font-medium text-sm truncate">{candidate.profile.full_name}</p>
                            <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                              {typeConfig.label}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                            <span className="flex items-center gap-1">
                              <GraduationCap className="h-3 w-3" />
                              {candidate.totalCoursesCompleted} curso(s)
                            </span>
                            <span>•</span>
                            <span>há {candidate.daysSinceCompletion}d</span>
                          </div>
                        </div>
                      </div>
                      
                      {/* Right side */}
                      <div className="flex items-center gap-2 shrink-0">
                        {/* Preferred channel */}
                        <div className="h-7 w-7 rounded-full bg-muted flex items-center justify-center">
                          <ChannelIcon className="h-3.5 w-3.5 text-muted-foreground" />
                        </div>
                        
                        {/* Next course suggestion */}
                        {candidate.suggestedNextCourses[0] && (
                          <div className="hidden md:flex items-center gap-1 text-xs text-muted-foreground max-w-[120px]">
                            <ArrowRight className="h-3 w-3 shrink-0" />
                            <span className="truncate">{candidate.suggestedNextCourses[0].name}</span>
                          </div>
                        )}
                        
                        <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </ScrollArea>
        
        {candidates.length > maxItems && (
          <div className="mt-3 pt-3 border-t">
            <Link to="/dashboard/student-journey/profiles?stage=completed">
              <Button variant="ghost" size="sm" className="w-full text-xs">
                Ver todos os {candidates.length} candidatos
                <ArrowRight className="h-3 w-3 ml-1" />
              </Button>
            </Link>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
