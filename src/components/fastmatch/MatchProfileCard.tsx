import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Star, ArrowRight, Building2 } from "lucide-react";
import { FounderBadge } from "./FounderBadge";
import { VerifiedBadge } from "./VerifiedBadge";
import type { FastMatchProfile } from "@/hooks/useFastMatchProfile";

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

  return (
    <Card className="border-border/60 hover:border-primary/30 hover:shadow-md transition-all duration-200 group">
      <CardContent className="p-5 space-y-4">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <Building2 className="w-4 h-4 text-muted-foreground" />
              <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors">
                {profile.company_name || "Empresa"}
              </h3>
            </div>
            {profile.industry && (
              <p className="text-xs text-muted-foreground">{profile.industry}</p>
            )}
          </div>
          {profile.strategic_score !== null && (
            <div className="text-right">
              <div className="text-lg font-bold text-primary">{profile.strategic_score}%</div>
              <div className="text-[10px] text-muted-foreground uppercase tracking-wider">Score</div>
            </div>
          )}
        </div>

        {/* Badges */}
        <div className="flex flex-wrap gap-1.5">
          {profile.is_verified && <VerifiedBadge />}
          {isFounderActive && <FounderBadge />}
        </div>

        {/* Info */}
        <div className="space-y-1.5 text-sm">
          {profile.target_audience && (
            <p className="text-muted-foreground">
              <span className="text-foreground/80 font-medium">Público-alvo:</span> {profile.target_audience}
            </p>
          )}
          {profile.ticket_range && (
            <p className="text-muted-foreground">
              <span className="text-foreground/80 font-medium">Ticket:</span> {profile.ticket_range}
            </p>
          )}
          {profile.services_offered && profile.services_offered.length > 0 && (
            <p className="text-muted-foreground">
              <span className="text-foreground/80 font-medium">Oferece:</span>{" "}
              {profile.services_offered.slice(0, 3).join(", ")}
              {profile.services_offered.length > 3 && ` +${profile.services_offered.length - 3}`}
            </p>
          )}
        </div>

        {/* Strategic Reasons */}
        {profile.strategic_reasons && (
          <div className="space-y-1">
            {Object.values(profile.strategic_reasons as Record<string, string>).slice(0, 2).map((reason, i) => (
              <p key={i} className="text-xs text-muted-foreground flex items-center gap-1.5">
                <span className="w-1 h-1 rounded-full bg-primary/60 flex-shrink-0" />
                {reason}
              </p>
            ))}
          </div>
        )}

        {/* Reputation + Action */}
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
            {hasInterest ? "Interesse Demonstrado" : "Demonstrar Interesse"}
            {!hasInterest && <ArrowRight className="w-3.5 h-3.5" />}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
