import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { 
  Instagram, 
  Users, 
  Image as ImageIcon, 
  UserPlus, 
  ExternalLink,
  CheckCircle2,
  Building2
} from "lucide-react";
import { Lead } from "@/hooks/useLeads";
import { cn } from "@/lib/utils";

interface InstagramDataSectionProps {
  lead: Lead;
}

export function InstagramDataSection({ lead }: InstagramDataSectionProps) {
  // Verificar se há dados Instagram para mostrar
  const hasData = lead.instagram_bio || 
                  lead.instagram_followers_count || 
                  lead.instagram_posts_count ||
                  lead.instagram_category;

  if (!hasData) return null;

  const formatNumber = (num: number | null) => {
    if (!num) return "0";
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toLocaleString('pt-PT');
  };

  return (
    <Card className="border-pink-500/20 bg-gradient-to-br from-pink-500/5 via-purple-500/5 to-transparent">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Instagram className="w-4 h-4 text-pink-500" />
          Dados Instagram
          <div className="flex items-center gap-1 ml-auto">
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
        {/* Métricas */}
        <div className="grid grid-cols-3 gap-3">
          <div className="text-center p-3 rounded-lg bg-pink-500/10 border border-pink-500/20">
            <div className="flex items-center justify-center gap-1 text-pink-600 mb-1">
              <ImageIcon className="w-4 h-4" />
            </div>
            <div className="text-lg font-bold text-foreground">
              {formatNumber(lead.instagram_posts_count)}
            </div>
            <div className="text-xs text-muted-foreground">Publicações</div>
          </div>
          <div className="text-center p-3 rounded-lg bg-purple-500/10 border border-purple-500/20">
            <div className="flex items-center justify-center gap-1 text-purple-600 mb-1">
              <Users className="w-4 h-4" />
            </div>
            <div className="text-lg font-bold text-foreground">
              {formatNumber(lead.instagram_followers_count)}
            </div>
            <div className="text-xs text-muted-foreground">Seguidores</div>
          </div>
          <div className="text-center p-3 rounded-lg bg-fuchsia-500/10 border border-fuchsia-500/20">
            <div className="flex items-center justify-center gap-1 text-fuchsia-600 mb-1">
              <UserPlus className="w-4 h-4" />
            </div>
            <div className="text-lg font-bold text-foreground">
              {formatNumber(lead.instagram_following_count)}
            </div>
            <div className="text-xs text-muted-foreground">A Seguir</div>
          </div>
        </div>

        {/* Bio */}
        {lead.instagram_bio && (
          <div className="p-3 rounded-lg bg-muted/50 border">
            <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">
              {lead.instagram_bio}
            </p>
          </div>
        )}

        {/* Categoria e Link */}
        <div className="flex items-center justify-between gap-2 flex-wrap">
          {lead.instagram_category && (
            <Badge variant="outline" className="text-xs">
              {lead.instagram_category}
            </Badge>
          )}
          
          <div className="flex items-center gap-2 ml-auto">
            {lead.instagram_external_url && (
              <Button
                variant="ghost"
                size="sm"
                asChild
                className="text-xs h-7 px-2"
              >
                <a 
                  href={lead.instagram_external_url.startsWith('http') 
                    ? lead.instagram_external_url 
                    : `https://${lead.instagram_external_url}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <ExternalLink className="w-3 h-3 mr-1" />
                  {lead.instagram_external_url.replace(/^https?:\/\//, '').slice(0, 25)}
                  {lead.instagram_external_url.replace(/^https?:\/\//, '').length > 25 ? '...' : ''}
                </a>
              </Button>
            )}
            
            {lead.instagram_url && (
              <Button
                variant="outline"
                size="sm"
                asChild
                className="text-xs h-7 gap-1 border-pink-500/30 text-pink-600 hover:bg-pink-500/10"
              >
                <a 
                  href={lead.instagram_url}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Instagram className="w-3 h-3" />
                  Ver Perfil
                </a>
              </Button>
            )}
          </div>
        </div>

        {/* Data de enriquecimento */}
        {lead.instagram_enriched_at && (
          <p className="text-xs text-muted-foreground text-right">
            Dados atualizados em {new Date(lead.instagram_enriched_at).toLocaleDateString('pt-PT')}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
