import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  BarChart3, 
  Linkedin, 
  Instagram, 
  Facebook, 
  Users, 
  Target,
  MessageCircle,
  RefreshCw,
  AlertCircle,
  Lightbulb,
  ExternalLink,
  Star,
  TrendingUp
} from "lucide-react";
import { useSocialMediaAnalysis, SocialMediaAnalysis } from "@/hooks/useSocialMediaAnalysis";

interface SocialMediaAnalysisSectionProps {
  companyId: string;
  companyName: string;
  linkedinUrl?: string | null;
  instagramUrl?: string | null;
  facebookUrl?: string | null;
}

const maturityColors = {
  low: "bg-red-500/10 text-red-600 border-red-500/30",
  medium: "bg-yellow-500/10 text-yellow-600 border-yellow-500/30",
  high: "bg-green-500/10 text-green-600 border-green-500/30"
};

const maturityLabels = {
  low: "Baixa",
  medium: "Média",
  high: "Alta"
};

const channelIcons = {
  linkedin: Linkedin,
  email: MessageCircle,
  phone: MessageCircle,
  instagram: Instagram
};

const channelLabels = {
  linkedin: "LinkedIn",
  email: "Email",
  phone: "Telefone",
  instagram: "Instagram"
};

export function SocialMediaAnalysisSection({
  companyId,
  companyName,
  linkedinUrl,
  instagramUrl,
  facebookUrl
}: SocialMediaAnalysisSectionProps) {
  const [analysis, setAnalysis] = useState<SocialMediaAnalysis | null>(null);
  const analyzeMutation = useSocialMediaAnalysis();

  const hasSocialUrls = linkedinUrl || instagramUrl || facebookUrl;

  const handleAnalyze = async () => {
    const result = await analyzeMutation.mutateAsync({
      companyId,
      companyName,
      linkedinUrl,
      instagramUrl,
      facebookUrl
    });
    setAnalysis(result);
  };

  if (!hasSocialUrls) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-primary" />
            Análise de Redes Sociais
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-6 text-center">
            <AlertCircle className="w-8 h-8 text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground">
              Sem URLs de redes sociais para analisar.
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Enriqueça os dados para obter links de LinkedIn, Instagram ou Facebook.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (analyzeMutation.isPending) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-primary animate-pulse" />
            A analisar redes sociais...
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
            <BarChart3 className="w-4 h-4 text-primary" />
            Análise de Redes Sociais
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-6 text-center">
            <div className="flex gap-3 mb-4">
              {linkedinUrl && <Linkedin className="w-6 h-6 text-[#0A66C2]" />}
              {instagramUrl && <Instagram className="w-6 h-6 text-[#E4405F]" />}
              {facebookUrl && <Facebook className="w-6 h-6 text-[#1877F2]" />}
            </div>
            <p className="text-sm text-muted-foreground mb-4">
              Analisa os perfis de redes sociais para obter insights comerciais
            </p>
            <Button onClick={handleAnalyze} className="gap-2">
              <BarChart3 className="w-4 h-4" />
              Analisar Redes Sociais
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  const ChannelIcon = channelIcons[analysis.salesInsights.preferredChannel];

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-primary" />
            Análise de Redes Sociais
          </CardTitle>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={handleAnalyze}
            disabled={analyzeMutation.isPending}
          >
            <RefreshCw className="w-4 h-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* Digital Maturity */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Maturidade Digital</span>
            <Badge variant="outline" className={maturityColors[analysis.digitalMaturity]}>
              {maturityLabels[analysis.digitalMaturity]}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground">
            {analysis.digitalMaturityReason}
          </p>
        </div>

        {/* Social Platform Stats */}
        <div className="grid grid-cols-3 gap-2">
          {analysis.linkedinData && (
            <div className="bg-[#0A66C2]/10 rounded-lg p-3 text-center">
              <Linkedin className="w-5 h-5 text-[#0A66C2] mx-auto mb-1" />
              <div className="text-lg font-semibold">
                {analysis.linkedinData.followers?.toLocaleString() || "?"}
              </div>
              <div className="text-[10px] text-muted-foreground">seguidores</div>
              {analysis.linkedinData.employeeCount && (
                <div className="text-[10px] text-muted-foreground mt-1">
                  {analysis.linkedinData.employeeCount} funcionários
                </div>
              )}
            </div>
          )}
          {analysis.instagramData && (
            <div className="bg-[#E4405F]/10 rounded-lg p-3 text-center">
              <Instagram className="w-5 h-5 text-[#E4405F] mx-auto mb-1" />
              <div className="text-lg font-semibold">
                {analysis.instagramData.followers?.toLocaleString() || "?"}
              </div>
              <div className="text-[10px] text-muted-foreground">seguidores</div>
              <div className="text-[10px] text-muted-foreground mt-1">
                {analysis.instagramData.contentType}
              </div>
            </div>
          )}
          {analysis.facebookData && (
            <div className="bg-[#1877F2]/10 rounded-lg p-3 text-center">
              <Facebook className="w-5 h-5 text-[#1877F2] mx-auto mb-1" />
              <div className="text-lg font-semibold">
                {analysis.facebookData.followers?.toLocaleString() || "?"}
              </div>
              <div className="text-[10px] text-muted-foreground">seguidores</div>
              {analysis.facebookData.rating && (
                <div className="flex items-center justify-center gap-1 mt-1">
                  <Star className="w-3 h-3 text-yellow-500 fill-yellow-500" />
                  <span className="text-[10px]">{analysis.facebookData.rating}/5</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Key Decision Makers */}
        {analysis.salesInsights.keyDecisionMakers.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Users className="w-4 h-4 text-primary" />
              Decisores Identificados
            </div>
            <div className="space-y-1.5">
              {analysis.salesInsights.keyDecisionMakers.slice(0, 4).map((person, i) => (
                <div 
                  key={i} 
                  className="flex items-center justify-between bg-muted/50 rounded-md px-3 py-2"
                >
                  <div>
                    <div className="text-sm font-medium">{person.name}</div>
                    <div className="text-xs text-muted-foreground">{person.role}</div>
                  </div>
                  {person.linkedinUrl && (
                    <Button variant="ghost" size="sm" asChild className="h-7">
                      <a href={person.linkedinUrl} target="_blank" rel="noopener noreferrer">
                        <Linkedin className="w-3.5 h-3.5 text-[#0A66C2]" />
                      </a>
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Approach Strategy */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm font-medium">
            <Target className="w-4 h-4 text-primary" />
            Estratégia de Abordagem
          </div>
          <div className="bg-primary/5 border border-primary/20 rounded-lg p-3">
            <div className="flex items-center gap-2 mb-2">
              <Badge variant="outline" className="bg-primary/10 text-primary border-primary/30 gap-1">
                <ChannelIcon className="w-3 h-3" />
                {channelLabels[analysis.salesInsights.preferredChannel]}
              </Badge>
              {analysis.salesInsights.bestTimeToContact && (
                <span className="text-xs text-muted-foreground">
                  • {analysis.salesInsights.bestTimeToContact}
                </span>
              )}
            </div>
            <p className="text-sm">
              {analysis.salesInsights.approachStrategy}
            </p>
          </div>
        </div>

        {/* Engagement Opportunities */}
        {analysis.salesInsights.engagementOpportunities.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Lightbulb className="w-4 h-4 text-yellow-500" />
              Oportunidades de Engagement
            </div>
            <ul className="space-y-1.5">
              {analysis.salesInsights.engagementOpportunities.slice(0, 4).map((opp, i) => (
                <li key={i} className="flex items-start gap-2 text-sm">
                  <TrendingUp className="w-3.5 h-3.5 text-green-500 mt-0.5 shrink-0" />
                  <span className="text-muted-foreground">{opp}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Warnings */}
        {analysis.warnings.length > 0 && (
          <div className="text-xs text-muted-foreground space-y-1">
            {analysis.warnings.map((warning, i) => (
              <div key={i} className="flex items-center gap-1.5">
                <AlertCircle className="w-3 h-3 text-yellow-500" />
                {warning}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
