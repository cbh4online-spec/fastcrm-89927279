// Profile Recommendations Card - Shows TOP 3 course recommendations

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";
import { 
  Sparkles, 
  RefreshCw, 
  ChevronDown, 
  ChevronUp,
  MessageSquare,
  Calendar,
  X,
  Info,
  AlertCircle,
  GraduationCap,
  Target,
  Clock,
  TrendingUp,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useSJRecommendations } from "@/hooks/useSJRecommendations";
import { LEVEL_CONFIG, RECOMMENDATION_STATUS_CONFIG } from "@/types/sjRecommendation";
import type { SJCourseRecommendation, MatchReason, CourseLevel } from "@/types/sjRecommendation";
import { DismissRecommendationDialog } from "./DismissRecommendationDialog";
import { RecommendationMessageDialog } from "./RecommendationMessageDialog";

interface ProfileRecommendationsCardProps {
  profileId: string;
  profileName: string;
  onScheduleFollowUp?: (courseId: string, courseName: string) => void;
  onCreateEnrollment?: (courseId: string) => void;
}

const REASON_ICONS: Record<MatchReason["type"], React.ReactNode> = {
  progression: <TrendingUp className="h-3 w-3" />,
  interest: <Target className="h-3 w-3" />,
  timing: <Clock className="h-3 w-3" />,
  level: <GraduationCap className="h-3 w-3" />,
  specialty: <Sparkles className="h-3 w-3" />,
  urgency: <AlertCircle className="h-3 w-3" />,
  similarity: <Target className="h-3 w-3" />,
};

export function ProfileRecommendationsCard({
  profileId,
  profileName,
  onScheduleFollowUp,
  onCreateEnrollment,
}: ProfileRecommendationsCardProps) {
  const {
    recommendations,
    isLoading,
    generateRecommendations,
    updateStatus,
    markAsShown,
    getExplanation,
  } = useSJRecommendations(profileId);

  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [dismissDialogOpen, setDismissDialogOpen] = useState(false);
  const [messageDialogOpen, setMessageDialogOpen] = useState(false);
  const [selectedRecommendation, setSelectedRecommendation] = useState<SJCourseRecommendation | null>(null);
  const [explanation, setExplanation] = useState<string | null>(null);
  const [isLoadingExplanation, setIsLoadingExplanation] = useState(false);

  const handleGenerate = () => {
    generateRecommendations.mutate(profileId);
  };

  const handleExpand = async (rec: SJCourseRecommendation) => {
    if (expandedId === rec.id) {
      setExpandedId(null);
      setExplanation(null);
      return;
    }

    setExpandedId(rec.id);
    
    // Mark as shown if new
    if (rec.status === "new") {
      markAsShown.mutate(rec.id);
    }

    // Fetch explanation
    setIsLoadingExplanation(true);
    try {
      const result = await getExplanation.mutateAsync({
        targetProfileId: profileId,
        courseId: rec.course_id,
      });
      setExplanation(result?.explanation || null);
    } catch (e) {
      console.error("Error fetching explanation:", e);
    } finally {
      setIsLoadingExplanation(false);
    }
  };

  const handleContact = (rec: SJCourseRecommendation) => {
    setSelectedRecommendation(rec);
    setMessageDialogOpen(true);
  };

  const handleDismiss = (rec: SJCourseRecommendation) => {
    setSelectedRecommendation(rec);
    setDismissDialogOpen(true);
  };

  const handleDismissConfirm = (reason: string) => {
    if (selectedRecommendation) {
      updateStatus.mutate({
        recommendationId: selectedRecommendation.id,
        status: "dismissed",
        dismissReason: reason as any,
      });
    }
    setDismissDialogOpen(false);
    setSelectedRecommendation(null);
  };

  const handleMessageSent = () => {
    if (selectedRecommendation) {
      updateStatus.mutate({
        recommendationId: selectedRecommendation.id,
        status: "contacted",
      });
    }
    setMessageDialogOpen(false);
    setSelectedRecommendation(null);
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-green-600";
    if (score >= 60) return "text-amber-600";
    return "text-gray-600";
  };

  const getScoreBgColor = (score: number) => {
    if (score >= 80) return "bg-green-500";
    if (score >= 60) return "bg-amber-500";
    return "bg-gray-500";
  };

  return (
    <TooltipProvider>
      <Card className="border-purple-200 dark:border-purple-800/50 bg-gradient-to-br from-purple-50/50 to-indigo-50/50 dark:from-purple-900/10 dark:to-indigo-900/10">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-purple-600" />
              <CardTitle className="text-lg">Recomendado pela IA</CardTitle>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleGenerate}
              disabled={generateRecommendations.isPending}
              className="gap-1"
            >
              <RefreshCw className={cn(
                "h-4 w-4",
                generateRecommendations.isPending && "animate-spin"
              )} />
              {generateRecommendations.isPending ? "A gerar..." : "Atualizar"}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : recommendations.length === 0 ? (
            <div className="text-center py-8">
              <GraduationCap className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
              <p className="text-muted-foreground text-sm mb-3">
                Nenhuma recomendação disponível
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={handleGenerate}
                disabled={generateRecommendations.isPending}
              >
                <Sparkles className="h-4 w-4 mr-2" />
                Gerar Recomendações
              </Button>
            </div>
          ) : (
            <ScrollArea className="max-h-[500px]">
              <div className="space-y-3">
                {recommendations.slice(0, 3).map((rec, index) => {
                  const course = rec.course;
                  const isExpanded = expandedId === rec.id;
                  const levelConfig = LEVEL_CONFIG[(course?.level as CourseLevel) || "foundation"];
                  const statusConfig = RECOMMENDATION_STATUS_CONFIG[rec.status];

                  return (
                    <div
                      key={rec.id}
                      className={cn(
                        "border rounded-lg p-4 transition-all",
                        isExpanded 
                          ? "border-purple-300 bg-white dark:bg-gray-900" 
                          : "border-border bg-card hover:border-purple-200"
                      )}
                    >
                      {/* Header */}
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs font-medium text-muted-foreground">
                              #{index + 1}
                            </span>
                            <Badge 
                              variant="outline" 
                              className={cn("text-xs", levelConfig.color, levelConfig.bgColor)}
                            >
                              {levelConfig.label}
                            </Badge>
                            {rec.status !== "new" && (
                              <Badge 
                                variant="outline" 
                                className={cn("text-xs", statusConfig.color, statusConfig.bgColor)}
                              >
                                {statusConfig.label}
                              </Badge>
                            )}
                          </div>
                          <h4 className="font-medium text-sm truncate">
                            {course?.name || "Curso"}
                          </h4>
                        </div>

                        {/* Score */}
                        <div className="flex flex-col items-end gap-1">
                          <span className={cn("text-2xl font-bold", getScoreColor(rec.match_score))}>
                            {rec.match_score}%
                          </span>
                          <Progress 
                            value={rec.match_score} 
                            className="w-16 h-1.5"
                          />
                        </div>
                      </div>

                      {/* Reasons */}
                      <div className="mt-3 flex flex-wrap gap-1.5">
                        {(rec.match_reasons as MatchReason[]).slice(0, 3).map((reason, i) => (
                          <Tooltip key={i}>
                            <TooltipTrigger asChild>
                              <div className="flex items-center gap-1 text-xs text-muted-foreground bg-muted/50 px-2 py-1 rounded">
                                {REASON_ICONS[reason.type]}
                                <span className="truncate max-w-[150px]">{reason.text}</span>
                              </div>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>{reason.text}</p>
                              <p className="text-xs text-muted-foreground">Peso: +{reason.weight} pts</p>
                            </TooltipContent>
                          </Tooltip>
                        ))}
                      </div>

                      {/* Expanded Content */}
                      {isExpanded && (
                        <div className="mt-4 pt-4 border-t space-y-4">
                          {/* Explanation */}
                          <div>
                            <h5 className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1">
                              <Info className="h-3 w-3" />
                              Explicação da IA
                            </h5>
                            {isLoadingExplanation ? (
                              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <RefreshCw className="h-4 w-4 animate-spin" />
                                A gerar explicação...
                              </div>
                            ) : explanation ? (
                              <div className="text-sm text-muted-foreground prose prose-sm max-w-none">
                                {explanation.split('\n').map((line, i) => (
                                  <p key={i} className="mb-1">{line}</p>
                                ))}
                              </div>
                            ) : (
                              <p className="text-sm text-muted-foreground italic">
                                Explicação não disponível
                              </p>
                            )}
                          </div>

                          {/* Score Breakdown */}
                          <div>
                            <h5 className="text-xs font-medium text-muted-foreground mb-2">
                              Decomposição do Score
                            </h5>
                            <div className="grid grid-cols-2 gap-2 text-xs">
                              {Object.entries(rec.score_breakdown as unknown as Record<string, number>)
                                .filter(([key]) => key !== "total" && key !== "penalties")
                                .map(([key, value]) => (
                                  <div key={key} className="flex justify-between">
                                    <span className="text-muted-foreground capitalize">
                                      {key.replace(/_/g, " ")}:
                                    </span>
                                    <span className="font-medium">{value}</span>
                                  </div>
                                ))}
                            </div>
                          </div>

                          {/* Actions */}
                          <div className="flex items-center gap-2 pt-2">
                            <Button
                              size="sm"
                              className="flex-1 gap-1"
                              onClick={() => handleContact(rec)}
                            >
                              <MessageSquare className="h-4 w-4" />
                              Contactar
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="flex-1 gap-1"
                              onClick={() => onScheduleFollowUp?.(rec.course_id, course?.name || "")}
                            >
                              <Calendar className="h-4 w-4" />
                              Agendar
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-muted-foreground hover:text-destructive"
                              onClick={() => handleDismiss(rec)}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      )}

                      {/* Expand Toggle */}
                      <Button
                        variant="ghost"
                        size="sm"
                        className="w-full mt-2 h-6"
                        onClick={() => handleExpand(rec)}
                      >
                        {isExpanded ? (
                          <>
                            <ChevronUp className="h-4 w-4 mr-1" />
                            Menos detalhes
                          </>
                        ) : (
                          <>
                            <ChevronDown className="h-4 w-4 mr-1" />
                            Ver detalhes
                          </>
                        )}
                      </Button>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      {/* Dialogs */}
      <DismissRecommendationDialog
        open={dismissDialogOpen}
        onOpenChange={setDismissDialogOpen}
        onConfirm={handleDismissConfirm}
        courseName={selectedRecommendation?.course?.name || ""}
      />

      <RecommendationMessageDialog
        open={messageDialogOpen}
        onOpenChange={setMessageDialogOpen}
        profileId={profileId}
        profileName={profileName}
        courseId={selectedRecommendation?.course_id || ""}
        courseName={selectedRecommendation?.course?.name || ""}
        onMessageSent={handleMessageSent}
      />
    </TooltipProvider>
  );
}
