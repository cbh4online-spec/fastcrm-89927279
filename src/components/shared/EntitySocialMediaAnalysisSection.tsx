import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  BarChart3, 
  Linkedin,
  Users, 
  Target,
  RefreshCw,
  AlertCircle,
  Lightbulb,
  ExternalLink,
  TrendingUp,
  CheckCircle2,
  Briefcase,
  MessageSquare
} from "lucide-react";
import { useEntityLinkedInData, useAnalyzeEntityLinkedIn, LinkedInAnalysisData } from "@/hooks/useEntitySocialMediaAnalysis";
import { formatDistanceToNow } from "date-fns";
import { pt } from "date-fns/locale";

interface EntitySocialMediaAnalysisSectionProps {
  entityType: 'contact' | 'lead';
  entityId: string;
  entityName: string;
  linkedinUrl?: string | null;
}

const engagementColors = {
  low: "bg-red-500/10 text-red-600 border-red-500/30",
  medium: "bg-yellow-500/10 text-yellow-600 border-yellow-500/30",
  high: "bg-green-500/10 text-green-600 border-green-500/30"
};

const engagementLabels = {
  low: "Baixo",
  medium: "Médio",
  high: "Alto"
};

function getEngagementLevel(score: number | null): 'low' | 'medium' | 'high' {
  if (!score) return 'low';
  if (score >= 50) return 'high';
  if (score >= 20) return 'medium';
  return 'low';
}

const postingFrequencyLabels: Record<string, string> = {
  very_active: 'Muito ativo',
  active: 'Ativo',
  occasional: 'Ocasional',
  inactive: 'Inativo',
  unknown: 'Desconhecido',
};

export function EntitySocialMediaAnalysisSection({
  entityType,
  entityId,
  entityName,
  linkedinUrl,
}: EntitySocialMediaAnalysisSectionProps) {
  const { data: persistedData, isLoading } = useEntityLinkedInData(entityType, entityId);
  const analyzeMutation = useAnalyzeEntityLinkedIn(entityType);

  const hasSocialUrls = !!linkedinUrl;
  const analysis = persistedData;

  const handleAnalyze = async () => {
    if (!linkedinUrl) return;
    await analyzeMutation.mutateAsync({
      entityId,
      entityName,
      linkedinUrl,
    });
  };

  if (!hasSocialUrls) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Linkedin className="w-4 h-4 text-[#0A66C2]" />
            Análise LinkedIn
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-6 text-center">
            <AlertCircle className="w-8 h-8 text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground">
              Sem URL de LinkedIn para analisar.
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Adicione o URL do LinkedIn para obter insights detalhados.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Linkedin className="w-4 h-4 text-[#0A66C2]" />
            Análise LinkedIn
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-12 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (analyzeMutation.isPending) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Linkedin className="w-4 h-4 text-[#0A66C2] animate-pulse" />
            A analisar LinkedIn...
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-32 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (!analysis) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Linkedin className="w-4 h-4 text-[#0A66C2]" />
            Análise LinkedIn
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-6 text-center">
            <Linkedin className="w-8 h-8 text-[#0A66C2] mb-3" />
            <p className="text-sm text-muted-foreground mb-4">
              Analisa o perfil LinkedIn para obter insights detalhados
            </p>
            <Button onClick={handleAnalyze} className="gap-2">
              <BarChart3 className="w-4 h-4" />
              Analisar LinkedIn
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  const engagementLevel = getEngagementLevel(analysis.engagement_score);

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Linkedin className="w-4 h-4 text-[#0A66C2]" />
              Análise LinkedIn
            </CardTitle>
            {analysis.analyzed_at && (
              <Badge variant="outline" className="text-xs gap-1">
                <CheckCircle2 className="w-3 h-3 text-green-500" />
                {formatDistanceToNow(new Date(analysis.analyzed_at), { addSuffix: true, locale: pt })}
              </Badge>
            )}
          </div>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={handleAnalyze}
            disabled={analyzeMutation.isPending}
            title="Atualizar análise"
          >
            <RefreshCw className="w-4 h-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* Description */}
        {analysis.description && (
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground line-clamp-3">
              {analysis.description}
            </p>
          </div>
        )}

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-3">
          {analysis.linkedin_industry && (
            <div className="bg-muted/50 rounded-lg p-3">
              <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                <Briefcase className="w-3 h-3" />
                Indústria
              </div>
              <div className="text-sm font-medium">{analysis.linkedin_industry}</div>
            </div>
          )}
          
          {analysis.employee_count_linkedin && (
            <div className="bg-muted/50 rounded-lg p-3">
              <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                <Users className="w-3 h-3" />
                Funcionários
              </div>
              <div className="text-sm font-medium">{analysis.employee_count_linkedin.toLocaleString()}</div>
            </div>
          )}
          
          {analysis.headquarters && (
            <div className="bg-muted/50 rounded-lg p-3">
              <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                <Target className="w-3 h-3" />
                Localização
              </div>
              <div className="text-sm font-medium truncate">{analysis.headquarters}</div>
            </div>
          )}
          
          {analysis.posting_frequency && (
            <div className="bg-muted/50 rounded-lg p-3">
              <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                <MessageSquare className="w-3 h-3" />
                Atividade
              </div>
              <div className="text-sm font-medium">
                {postingFrequencyLabels[analysis.posting_frequency] || analysis.posting_frequency}
              </div>
            </div>
          )}
        </div>

        {/* Engagement Score */}
        {analysis.engagement_score !== null && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Engagement</span>
              <Badge variant="outline" className={engagementColors[engagementLevel]}>
                {engagementLabels[engagementLevel]} ({analysis.engagement_score})
              </Badge>
            </div>
            <div className="flex gap-4 text-xs text-muted-foreground">
              {analysis.avg_likes_per_post !== null && (
                <span>~{analysis.avg_likes_per_post} likes/post</span>
              )}
              {analysis.avg_comments_per_post !== null && (
                <span>~{analysis.avg_comments_per_post} comentários/post</span>
              )}
            </div>
          </div>
        )}

        {/* Key People */}
        {analysis.key_people && analysis.key_people.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Users className="w-4 h-4 text-primary" />
              Pessoas Chave
            </div>
            <div className="space-y-1.5">
              {analysis.key_people.slice(0, 4).map((person, i) => (
                <div 
                  key={i} 
                  className="flex items-center justify-between bg-muted/50 rounded-md px-3 py-2"
                >
                  <div>
                    <div className="text-sm font-medium">{person.name}</div>
                    <div className="text-xs text-muted-foreground">{person.title}</div>
                  </div>
                  {person.linkedin_url && (
                    <Button variant="ghost" size="sm" asChild className="h-7">
                      <a href={person.linkedin_url} target="_blank" rel="noopener noreferrer">
                        <Linkedin className="w-3.5 h-3.5 text-[#0A66C2]" />
                      </a>
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Specialties */}
        {analysis.specialties && analysis.specialties.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Lightbulb className="w-4 h-4 text-yellow-500" />
              Especialidades
            </div>
            <div className="flex flex-wrap gap-1.5">
              {analysis.specialties.slice(0, 6).map((spec, i) => (
                <Badge key={i} variant="secondary" className="text-xs">
                  {spec}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Recent Posts */}
        {analysis.recent_posts && analysis.recent_posts.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium">
              <TrendingUp className="w-4 h-4 text-green-500" />
              Posts Recentes
            </div>
            <div className="space-y-2">
              {analysis.recent_posts.slice(0, 2).map((post, i) => (
                <div key={i} className="bg-muted/30 rounded-lg p-3 text-xs">
                  <p className="text-muted-foreground line-clamp-2">{post.content}</p>
                  <div className="flex gap-3 mt-2 text-muted-foreground/70">
                    {post.likes !== undefined && <span>{post.likes} likes</span>}
                    {post.comments !== undefined && <span>{post.comments} comments</span>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Link to LinkedIn */}
        {linkedinUrl && (
          <a
            href={linkedinUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-xs text-muted-foreground hover:text-primary"
          >
            <ExternalLink className="h-3 w-3" />
            Ver no LinkedIn
          </a>
        )}
      </CardContent>
    </Card>
  );
}
