import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Linkedin,
  RefreshCw,
  Building2,
  Users,
  MapPin,
  Calendar,
  Globe,
  TrendingUp,
  MessageSquare,
  Heart,
  Clock,
  ExternalLink,
  Sparkles,
  AlertCircle,
} from "lucide-react";
import { useLinkedInData, useAnalyzeLinkedIn, LinkedInData } from "@/hooks/useLinkedInData";
import { formatDistanceToNow } from "date-fns";
import { pt } from "date-fns/locale";
import { cn } from "@/lib/utils";

interface LinkedInAnalysisCardProps {
  companyId: string;
  linkedinUrl?: string | null;
}

export function LinkedInAnalysisCard({ companyId, linkedinUrl }: LinkedInAnalysisCardProps) {
  const { data: linkedInData, isLoading } = useLinkedInData(companyId);
  const analyzeLinkedIn = useAnalyzeLinkedIn();

  const handleAnalyze = () => {
    if (!linkedinUrl) return;
    analyzeLinkedIn.mutate({ companyId, linkedinUrl });
  };

  if (!linkedinUrl) {
    return (
      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center justify-center py-8 text-center">
          <Linkedin className="h-10 w-10 text-muted-foreground/50 mb-3" />
          <p className="text-sm text-muted-foreground">
            Adicione o URL do LinkedIn para analisar
          </p>
        </CardContent>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-4 w-48" />
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-16 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (!linkedInData) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Linkedin className="h-5 w-5 text-[#0A66C2]" />
              <CardTitle className="text-lg">LinkedIn</CardTitle>
            </div>
            <Button
              size="sm"
              onClick={handleAnalyze}
              disabled={analyzeLinkedIn.isPending}
              className="gap-2"
            >
              {analyzeLinkedIn.isPending ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  A analisar...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                  Analisar LinkedIn
                </>
              )}
            </Button>
          </div>
          <CardDescription>
            Extrair dados da empresa, funcionários e publicações
          </CardDescription>
        </CardHeader>
        <CardContent>
          <a
            href={linkedinUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-primary"
          >
            <ExternalLink className="h-3 w-3" />
            {linkedinUrl.replace('https://www.linkedin.com/company/', '').replace(/\/$/, '')}
          </a>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Linkedin className="h-5 w-5 text-[#0A66C2]" />
            <CardTitle className="text-lg">LinkedIn</CardTitle>
            <Badge variant="outline" className="text-xs">
              <Clock className="h-3 w-3 mr-1" />
              {formatDistanceToNow(new Date(linkedInData.analyzed_at), { addSuffix: true, locale: pt })}
            </Badge>
          </div>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleAnalyze}
                  disabled={analyzeLinkedIn.isPending}
                >
                  {analyzeLinkedIn.isPending ? (
                    <RefreshCw className="h-4 w-4 animate-spin" />
                  ) : (
                    <RefreshCw className="h-4 w-4" />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent>Atualizar análise</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Company Info */}
        {linkedInData.description && (
          <div>
            <p className="text-sm text-muted-foreground line-clamp-3">
              {linkedInData.description}
            </p>
          </div>
        )}

        {/* Quick Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {linkedInData.company_size_range && (
            <div className="flex items-center gap-2 text-sm">
              <Users className="h-4 w-4 text-muted-foreground" />
              <span>{linkedInData.company_size_range}</span>
            </div>
          )}
          {linkedInData.linkedin_industry && (
            <div className="flex items-center gap-2 text-sm">
              <Building2 className="h-4 w-4 text-muted-foreground" />
              <span className="truncate">{linkedInData.linkedin_industry}</span>
            </div>
          )}
          {linkedInData.headquarters && (
            <div className="flex items-center gap-2 text-sm">
              <MapPin className="h-4 w-4 text-muted-foreground" />
              <span className="truncate">{linkedInData.headquarters}</span>
            </div>
          )}
          {linkedInData.founded_year && (
            <div className="flex items-center gap-2 text-sm">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span>Fundada {linkedInData.founded_year}</span>
            </div>
          )}
        </div>

        {/* Specialties */}
        {linkedInData.specialties && linkedInData.specialties.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {linkedInData.specialties.slice(0, 5).map((spec, i) => (
              <Badge key={i} variant="secondary" className="text-xs">
                {spec}
              </Badge>
            ))}
            {linkedInData.specialties.length > 5 && (
              <Badge variant="outline" className="text-xs">
                +{linkedInData.specialties.length - 5}
              </Badge>
            )}
          </div>
        )}

        <Separator />

        {/* Engagement Stats */}
        <div className="space-y-2">
          <h4 className="text-sm font-medium flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
            Engagement
          </h4>
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center p-2 rounded-lg bg-muted/50">
              <div className="flex items-center justify-center gap-1 text-lg font-semibold">
                <Heart className="h-4 w-4 text-red-500" />
                {linkedInData.avg_likes_per_post || 0}
              </div>
              <p className="text-xs text-muted-foreground">Média likes</p>
            </div>
            <div className="text-center p-2 rounded-lg bg-muted/50">
              <div className="flex items-center justify-center gap-1 text-lg font-semibold">
                <MessageSquare className="h-4 w-4 text-blue-500" />
                {linkedInData.avg_comments_per_post || 0}
              </div>
              <p className="text-xs text-muted-foreground">Média comentários</p>
            </div>
            <div className="text-center p-2 rounded-lg bg-muted/50">
              <div className={cn(
                "text-lg font-semibold",
                (linkedInData.engagement_score || 0) >= 70 ? "text-emerald-600" :
                (linkedInData.engagement_score || 0) >= 40 ? "text-amber-600" : "text-muted-foreground"
              )}>
                {linkedInData.engagement_score || 0}
              </div>
              <p className="text-xs text-muted-foreground">Score</p>
            </div>
          </div>
        </div>

        {/* Key People */}
        {linkedInData.key_people && linkedInData.key_people.length > 0 && (
          <>
            <Separator />
            <div className="space-y-2">
              <h4 className="text-sm font-medium flex items-center gap-2">
                <Users className="h-4 w-4 text-muted-foreground" />
                Pessoas Chave
              </h4>
              <div className="space-y-2">
                {linkedInData.key_people.slice(0, 4).map((person, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <Avatar className="h-7 w-7">
                      <AvatarFallback className="text-xs">
                        {person.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">{person.name}</p>
                      <p className="text-xs text-muted-foreground truncate">{person.title}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {/* Recent Posts Preview */}
        {linkedInData.recent_posts && linkedInData.recent_posts.length > 0 && (
          <>
            <Separator />
            <div className="space-y-2">
              <h4 className="text-sm font-medium flex items-center gap-2">
                <MessageSquare className="h-4 w-4 text-muted-foreground" />
                Últimas Publicações
              </h4>
              <div className="space-y-2">
                {linkedInData.recent_posts.slice(0, 2).map((post, i) => (
                  <div key={i} className="p-2 rounded-lg bg-muted/50 text-sm">
                    <p className="text-muted-foreground line-clamp-2">{post.content}</p>
                    {(post.likes || post.comments) && (
                      <div className="flex items-center gap-3 mt-1 text-xs">
                        {post.likes && (
                          <span className="flex items-center gap-1">
                            <Heart className="h-3 w-3" /> {post.likes}
                          </span>
                        )}
                        {post.comments && (
                          <span className="flex items-center gap-1">
                            <MessageSquare className="h-3 w-3" /> {post.comments}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {/* Link to LinkedIn */}
        <a
          href={linkedInData.linkedin_url || linkedinUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 text-xs text-muted-foreground hover:text-primary"
        >
          <ExternalLink className="h-3 w-3" />
          Ver no LinkedIn
        </a>
      </CardContent>
    </Card>
  );
}
