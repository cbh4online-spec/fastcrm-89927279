import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Star, ArrowRight, Building2, Globe, Briefcase } from "lucide-react";
import { FounderBadge } from "./FounderBadge";
import { VerifiedBadge } from "./VerifiedBadge";
import type { FastMatchProfile } from "@/hooks/useFastMatchProfile";

const industryColors: Record<string, string> = {
  "Tecnologia": "bg-blue-500/10 text-blue-600",
  "Marketing": "bg-pink-500/10 text-pink-600",
  "Consultoria": "bg-violet-500/10 text-violet-600",
  "E-commerce": "bg-orange-500/10 text-orange-600",
  "Saúde": "bg-emerald-500/10 text-emerald-600",
  "Educação": "bg-cyan-500/10 text-cyan-600",
  "Imobiliário": "bg-amber-500/10 text-amber-600",
};

interface MatchProfileCardProps {
  profile: FastMatchProfile;
  hasInterest?: boolean;
  onInterest: (profileId: string) => void;
  isLoading?: boolean;
}

export function MatchProfileCard({ profile, hasInterest, onInterest, isLoading }: MatchProfileCardProps) {
  const isFounderActive = profile.is_founder &&
    profile.founder_expiry_date &&
    new Date(profile.founder_expiry_date) > new Date();

  const scoreColor = (profile.strategic_score ?? 0) >= 75
    ? "text-emerald-600 bg-emerald-500/10 border-emerald-500/20"
    : (profile.strategic_score ?? 0) >= 50
      ? "text-amber-600 bg-amber-500/10 border-amber-500/20"
      : "text-muted-foreground bg-muted border-border";

  const industryColor = industryColors[profile.industry || ""] || "bg-muted text-muted-foreground";

  return (
    <Card className="border-border/60 hover:border-primary/30 hover:shadow-lg hover:scale-[1.01] transition-all duration-300 group overflow-hidden">
      <CardContent className="p-0">
        {/* Score ribbon */}
        {profile.strategic_score !== null && (
          <div className={`px-4 py-2 flex items-center justify-between border-b ${scoreColor} border-current/10`}>
            <span className="text-[10px] uppercase tracking-wider font-medium">Compatibilidade</span>
            <span className="text-lg font-bold">{profile.strategic_score}%</span>
          </div>
        )}

        <div className="p-5 space-y-4">
          {/* Header */}
          <div className="flex items-start gap-3">
            <div className={`p-2.5 rounded-xl ${industryColor} transition-colors`}>
              <Building2 className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors truncate">
                {profile.company_name || "Empresa"}
              </h3>
              {profile.industry && (
                <Badge variant="outline" className="text-[10px] mt-1 font-normal">{profile.industry}</Badge>
              )}
            </div>
            <div className="flex items-center gap-1">
              {profile.is_verified && <VerifiedBadge />}
              {isFounderActive && <FounderBadge />}
            </div>
          </div>

          {/* Services tags */}
          {profile.services_offered && profile.services_offered.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {profile.services_offered.slice(0, 3).map((service, i) => (
                <Badge key={i} variant="secondary" className="text-[10px] font-normal px-2 py-0.5">
                  {service}
                </Badge>
              ))}
              {profile.services_offered.length > 3 && (
                <Badge variant="outline" className="text-[10px] font-normal px-2 py-0.5">
                  +{profile.services_offered.length - 3}
                </Badge>
              )}
            </div>
          )}

          {/* Info */}
          <div className="space-y-1.5 text-sm">
            {profile.target_audience && (
              <p className="text-muted-foreground flex items-center gap-1.5">
                <Briefcase className="w-3.5 h-3.5 flex-shrink-0" />
                <span className="truncate">{profile.target_audience}</span>
              </p>
            )}
            {profile.ticket_range && (
              <p className="text-muted-foreground flex items-center gap-1.5">
                <Globe className="w-3.5 h-3.5 flex-shrink-0" />
                <span>Ticket: {profile.ticket_range}</span>
              </p>
            )}
          </div>

          {/* Strategic Reasons */}
          {profile.strategic_reasons && (
            <div className="space-y-1 bg-muted/30 rounded-lg p-2.5">
              {Object.values(profile.strategic_reasons as Record<string, string>).slice(0, 2).map((reason, i) => (
                <p key={i} className="text-xs text-muted-foreground flex items-center gap-1.5">
                  <span className="w-1 h-1 rounded-full bg-primary/60 flex-shrink-0" />
                  {reason}
                </p>
              ))}
            </div>
          )}

          {/* Footer */}
          <div className="flex items-center justify-between pt-2 border-t border-border/40">
            <div className="flex items-center gap-1.5 text-sm">
              <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
              <span className="font-medium text-foreground">{Number(profile.reputation_score).toFixed(1)}</span>
              <span className="text-xs text-muted-foreground">({profile.reputation_count})</span>
            </div>
            <Button
              size="sm"
              variant={hasInterest ? "secondary" : "default"}
              disabled={hasInterest || isLoading}
              onClick={() => onInterest(profile.id)}
              className="gap-1.5 text-xs"
            >
              {hasInterest ? "Interesse Enviado" : "Demonstrar Interesse"}
              {!hasInterest && <ArrowRight className="w-3.5 h-3.5" />}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
