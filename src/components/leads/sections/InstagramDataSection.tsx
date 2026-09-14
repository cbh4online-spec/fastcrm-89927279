import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Instagram,
  Users,
  Image as ImageIcon,
  UserPlus,
  ExternalLink,
  CheckCircle2,
  Building2,
  RefreshCw,
  Sparkles,
  Copy,
  MessageCircle,
  MapPin,
  Activity,
} from "lucide-react";
import { Lead } from "@/hooks/useLeads";
import { toast } from "sonner";
import { parseSocialProfile } from "@/lib/social/socialProfiles";
import { useLeadInstagramEnrichment } from "@/hooks/useLeadInstagramEnrichment";

interface InstagramDataSectionProps {
  lead: Lead;
}

const formatNumber = (num: number | null | undefined) => {
  if (!num) return "0";
  if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(1)}M`;
  if (num >= 1_000) return `${(num / 1_000).toFixed(1)}K`;
  return num.toLocaleString("pt-PT");
};

const externalHref = (url: string) => (url.startsWith("http") ? url : `https://${url}`);

export function InstagramDataSection({ lead }: InstagramDataSectionProps) {
  const parsedProfile = lead.instagram_url ? parseSocialProfile("instagram", lead.instagram_url) : null;
  const username = parsedProfile?.handle ?? null;

  const { enrich, isEnriching, analyze, isAnalyzing, analysis } = useLeadInstagramEnrichment();
  const [enrichedPicUrl, setEnrichedPicUrl] = useState<string | null>(null);

  const hasData = Boolean(
    lead.instagram_bio ||
      lead.instagram_followers_count ||
      lead.instagram_posts_count ||
      lead.instagram_category
  );

  const handleEnrich = async () => {
    if (!username) return;
    const result = await enrich({ leadId: lead.id, username });
    setEnrichedPicUrl(result.profilePicUrl ?? null);
  };

  const handleAnalyze = () => {
    if (!username) return;
    void analyze({
      username,
      full_name: lead.name,
      biography: lead.instagram_bio,
      external_url: lead.instagram_external_url,
      followers_count: lead.instagram_followers_count,
      following_count: lead.instagram_following_count,
      media_count: lead.instagram_posts_count,
      is_business: lead.instagram_is_business,
      is_verified: lead.instagram_is_verified,
      category: lead.instagram_category,
    });
  };

  const copyHandle = async () => {
    if (!parsedProfile) return;
    await navigator.clipboard.writeText(parsedProfile.displayHandle);
    toast.success("Perfil copiado");
  };

  // Sem perfil associado
  if (!parsedProfile) {
    return (
      <Card className="border-pink-500/20 bg-gradient-to-br from-pink-500/5 via-purple-500/5 to-transparent">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Instagram className="w-4 h-4 text-pink-500" />
            Instagram
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Sem perfil de Instagram associado. Adicione o perfil (por exemplo, @utilizador) nos
            dados sociais desta lead para recolher métricas e abrir conversas.
          </p>
        </CardContent>
      </Card>
    );
  }

  const followersRatio =
    lead.instagram_followers_count && lead.instagram_following_count
      ? lead.instagram_followers_count / lead.instagram_following_count
      : null;

  return (
    <Card className="border-pink-500/20 bg-gradient-to-br from-pink-500/5 via-purple-500/5 to-transparent">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Instagram className="w-4 h-4 text-pink-500" />
          Instagram
          <div className="flex items-center gap-1 ml-auto flex-wrap justify-end">
            {lead.instagram_is_verified && (
              <Badge variant="secondary" className="text-xs gap-1 bg-blue-500/10 text-blue-600 border-blue-500/20">
                <CheckCircle2 className="w-3 h-3" />
                Verificado
              </Badge>
            )}
            {lead.instagram_is_business && (
              <Badge variant="secondary" className="text-xs gap-1 bg-purple-500/10 text-purple-600 border-purple-500/20">
                <Building2 className="w-3 h-3" />
                Profissional
              </Badge>
            )}
          </div>
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Cartão de perfil */}
        <div className="flex items-center gap-3">
          <Avatar className="h-12 w-12 border border-pink-500/30">
            <AvatarImage src={enrichedPicUrl ?? lead.avatar_url ?? undefined} alt={parsedProfile.displayHandle} />
            <AvatarFallback className="bg-pink-500/10 text-pink-600">
              <Instagram className="w-5 h-5" />
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <p className="text-sm font-semibold truncate">{lead.name}</p>
            <p className="text-xs text-muted-foreground truncate">{parsedProfile.displayHandle}</p>
            {lead.instagram_category && (
              <Badge variant="outline" className="mt-1 text-[11px]">
                {lead.instagram_category}
              </Badge>
            )}
          </div>
          <div className="ml-auto flex items-center gap-1">
            <Button variant="ghost" size="sm" className="h-7 px-2 text-xs gap-1" onClick={copyHandle}>
              <Copy className="w-3 h-3" />
              Copiar
            </Button>
            <Button variant="ghost" size="sm" asChild className="h-7 px-2 text-xs gap-1">
              <a href={parsedProfile.messageUrl} target="_blank" rel="noopener noreferrer">
                <MessageCircle className="w-3 h-3" />
                Mensagens
              </a>
            </Button>
            <Button
              variant="outline"
              size="sm"
              asChild
              className="h-7 px-2 text-xs gap-1 border-pink-500/30 text-pink-600 hover:bg-pink-500/10"
            >
              <a href={parsedProfile.profileUrl} target="_blank" rel="noopener noreferrer">
                <Instagram className="w-3 h-3" />
                Perfil
              </a>
            </Button>
          </div>
        </div>

        <Separator />

        {hasData ? (
          <>
            {/* Métricas */}
            <div className="grid grid-cols-3 gap-3">
              <div className="text-center p-3 rounded-lg bg-pink-500/10 border border-pink-500/20">
                <div className="flex items-center justify-center gap-1 text-pink-600 mb-1">
                  <ImageIcon className="w-4 h-4" />
                </div>
                <div className="text-lg font-bold text-foreground">{formatNumber(lead.instagram_posts_count)}</div>
                <div className="text-xs text-muted-foreground">Publicações</div>
              </div>
              <div className="text-center p-3 rounded-lg bg-purple-500/10 border border-purple-500/20">
                <div className="flex items-center justify-center gap-1 text-purple-600 mb-1">
                  <Users className="w-4 h-4" />
                </div>
                <div className="text-lg font-bold text-foreground">{formatNumber(lead.instagram_followers_count)}</div>
                <div className="text-xs text-muted-foreground">Seguidores</div>
              </div>
              <div className="text-center p-3 rounded-lg bg-fuchsia-500/10 border border-fuchsia-500/20">
                <div className="flex items-center justify-center gap-1 text-fuchsia-600 mb-1">
                  <UserPlus className="w-4 h-4" />
                </div>
                <div className="text-lg font-bold text-foreground">{formatNumber(lead.instagram_following_count)}</div>
                <div className="text-xs text-muted-foreground">A Seguir</div>
              </div>
            </div>

            {followersRatio !== null && (
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <Activity className="w-3 h-3" />
                Rácio seguidores / a seguir: {followersRatio.toFixed(1)}x
              </p>
            )}

            {/* Bio */}
            {lead.instagram_bio && (
              <div className="p-3 rounded-lg bg-muted/50 border">
                <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">{lead.instagram_bio}</p>
              </div>
            )}

            {lead.instagram_external_url && (
              <Button variant="ghost" size="sm" asChild className="text-xs h-7 px-2">
                <a href={externalHref(lead.instagram_external_url)} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="w-3 h-3 mr-1" />
                  {lead.instagram_external_url.replace(/^https?:\/\//, "").slice(0, 40)}
                </a>
              </Button>
            )}
          </>
        ) : (
          <p className="text-sm text-muted-foreground">
            Ainda não existem métricas recolhidas para este perfil. Use “Recolher dados” para obter
            seguidores, publicações, biografia e categoria.
          </p>
        )}

        <Separator />

        {/* Ações de recolha e IA */}
        <div className="flex items-center gap-2 flex-wrap">
          <Button size="sm" className="h-8 text-xs gap-1" onClick={handleEnrich} disabled={isEnriching}>
            <RefreshCw className={`w-3 h-3 ${isEnriching ? "animate-spin" : ""}`} />
            {isEnriching ? "A recolher..." : hasData ? "Atualizar dados" : "Recolher dados"}
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="h-8 text-xs gap-1"
            onClick={handleAnalyze}
            disabled={isAnalyzing || !hasData}
            title={!hasData ? "Recolha os dados primeiro" : undefined}
          >
            <Sparkles className={`w-3 h-3 ${isAnalyzing ? "animate-pulse" : ""}`} />
            {isAnalyzing ? "A analisar..." : "Analisar com IA"}
          </Button>
          {lead.instagram_enriched_at && (
            <span className="text-xs text-muted-foreground ml-auto">
              Atualizado em {new Date(lead.instagram_enriched_at).toLocaleDateString("pt-PT")}
            </span>
          )}
        </div>

        {/* Leitura por IA */}
        {analysis && (
          <div className="space-y-3 p-3 rounded-lg border bg-muted/40">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-primary" />
              <p className="text-sm font-medium">Leitura por IA</p>
              <Badge variant="secondary" className="ml-auto text-xs">
                Pontuação {analysis.lead_score}/100
              </Badge>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              {analysis.category_guess && (
                <p>
                  <span className="text-muted-foreground">Tipo: </span>
                  {analysis.category_guess}
                </p>
              )}
              {analysis.specialty_guess && (
                <p>
                  <span className="text-muted-foreground">Especialidade: </span>
                  {analysis.specialty_guess}
                </p>
              )}
              {analysis.city_guess && (
                <p className="flex items-center gap-1">
                  <MapPin className="w-3 h-3 text-muted-foreground" />
                  {analysis.city_guess}
                </p>
              )}
              {analysis.works_at && (
                <p>
                  <span className="text-muted-foreground">Trabalha em: </span>
                  {analysis.works_at}
                </p>
              )}
            </div>

            {analysis.contact_signals?.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {analysis.contact_signals.map((signal) => (
                  <Badge key={signal} variant="outline" className="text-[11px]">
                    {signal}
                  </Badge>
                ))}
              </div>
            )}

            {analysis.reasons?.length > 0 && (
              <ul className="text-xs text-muted-foreground list-disc pl-4 space-y-0.5">
                {analysis.reasons.map((reason) => (
                  <li key={reason}>{reason}</li>
                ))}
              </ul>
            )}

            {analysis.red_flags?.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {analysis.red_flags.map((flag) => (
                  <Badge key={flag} variant="destructive" className="text-[11px]">
                    {flag}
                  </Badge>
                ))}
              </div>
            )}

            <p className="text-[11px] text-muted-foreground">
              Análise gerada nesta sessão, com base nos dados públicos recolhidos.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
