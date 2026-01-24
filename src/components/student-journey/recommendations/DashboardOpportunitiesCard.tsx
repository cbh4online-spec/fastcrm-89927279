// Dashboard Opportunities Card - Best recommendations this week

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Sparkles, 
  TrendingUp, 
  User, 
  GraduationCap,
  ChevronRight,
  RefreshCw,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useSJOpportunities, useSJBatchRecommendations } from "@/hooks/useSJRecommendations";
import { useProfiles } from "@/hooks/useStudentJourney";
import { Link } from "react-router-dom";
import { LEVEL_CONFIG } from "@/types/sjRecommendation";
import type { CourseLevel } from "@/types/sjRecommendation";

interface DashboardOpportunitiesCardProps {
  minScore?: number;
  maxItems?: number;
}

export function DashboardOpportunitiesCard({
  minScore = 70,
  maxItems = 6,
}: DashboardOpportunitiesCardProps) {
  const { data: opportunities, isLoading } = useSJOpportunities(minScore);
  const { profiles } = useProfiles();
  const batchGenerate = useSJBatchRecommendations();

  const handleRefreshAll = () => {
    // Get eligible profile IDs
    const eligibleProfiles = profiles
      .filter(p => 
        p.lifecycle_stage !== "churned" && 
        p.lifecycle_stage !== "inactive"
      )
      .slice(0, 20)
      .map(p => p.id);

    if (eligibleProfiles.length > 0) {
      batchGenerate.mutate(eligibleProfiles);
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 85) return "text-green-600 bg-green-100 dark:bg-green-900/30";
    if (score >= 70) return "text-amber-600 bg-amber-100 dark:bg-amber-900/30";
    return "text-gray-600 bg-gray-100 dark:bg-gray-800/50";
  };

  const displayOpportunities = (opportunities || []).slice(0, maxItems);

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-md bg-purple-100 dark:bg-purple-900/30">
              <Sparkles className="h-4 w-4 text-purple-600" />
            </div>
            <div>
              <CardTitle className="text-base">Melhores Oportunidades</CardTitle>
              <p className="text-xs text-muted-foreground">
                Recomendações IA com score ≥{minScore}%
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleRefreshAll}
            disabled={batchGenerate.isPending}
            className="gap-1 text-xs"
          >
            <RefreshCw className={cn(
              "h-3 w-3",
              batchGenerate.isPending && "animate-spin"
            )} />
            {batchGenerate.isPending ? "A gerar..." : "Atualizar Todos"}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <RefreshCw className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : displayOpportunities.length === 0 ? (
          <div className="text-center py-8">
            <TrendingUp className="h-10 w-10 mx-auto text-muted-foreground/50 mb-2" />
            <p className="text-sm text-muted-foreground mb-3">
              Nenhuma oportunidade com score ≥{minScore}%
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefreshAll}
              disabled={batchGenerate.isPending}
            >
              <Sparkles className="h-4 w-4 mr-2" />
              Gerar Recomendações
            </Button>
          </div>
        ) : (
          <ScrollArea className="max-h-[350px]">
            <div className="space-y-2">
              {displayOpportunities.map((opp: any) => {
                const profile = opp.profile;
                const course = opp.course;
                const levelConfig = LEVEL_CONFIG[(course?.level as CourseLevel) || "foundation"];

                return (
                  <Link
                    key={opp.id}
                    to={`/dashboard/student-journey/profiles/${opp.profile_id}`}
                    className="block"
                  >
                    <div className="flex items-center gap-3 p-3 rounded-lg border hover:border-purple-200 hover:bg-purple-50/50 dark:hover:bg-purple-900/10 transition-colors">
                      {/* Score */}
                      <div className={cn(
                        "flex items-center justify-center w-12 h-12 rounded-full font-bold text-lg",
                        getScoreColor(opp.match_score)
                      )}>
                        {opp.match_score}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <User className="h-3 w-3 text-muted-foreground" />
                          <span className="font-medium text-sm truncate">
                            {profile?.full_name || "Aluno"}
                          </span>
                          {profile?.activation_potential === "high" && (
                            <Badge variant="outline" className="text-xs bg-green-50 text-green-600 border-green-200">
                              Alto Potencial
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <GraduationCap className="h-3 w-3 text-muted-foreground" />
                          <span className="text-xs text-muted-foreground truncate">
                            {course?.name || "Curso"}
                          </span>
                          <Badge 
                            variant="outline" 
                            className={cn("text-xs", levelConfig.color, levelConfig.bgColor)}
                          >
                            {levelConfig.label}
                          </Badge>
                        </div>
                        {/* Top reason */}
                        {opp.match_reasons?.[0] && (
                          <p className="text-xs text-muted-foreground mt-1 truncate">
                            💡 {(opp.match_reasons[0] as any).text}
                          </p>
                        )}
                      </div>

                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    </div>
                  </Link>
                );
              })}
            </div>
          </ScrollArea>
        )}

        {displayOpportunities.length > 0 && (
          <div className="mt-3 pt-3 border-t">
            <Button
              variant="ghost"
              size="sm"
              className="w-full text-xs text-muted-foreground"
              asChild
            >
              <Link to="/dashboard/student-journey/profiles?recommendations=true">
                Ver todas as recomendações
                <ChevronRight className="h-3 w-3 ml-1" />
              </Link>
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
