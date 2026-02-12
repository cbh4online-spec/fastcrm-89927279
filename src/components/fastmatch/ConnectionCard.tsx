import { useState } from "react";
import { Building2, Star, Calendar, ExternalLink, MessageSquare } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FounderBadge } from "./FounderBadge";
import { VerifiedBadge } from "./VerifiedBadge";
import { ReputationReviewDialog } from "./ReputationReviewDialog";
import { useConnectionReviews } from "@/hooks/useFastMatchReviews";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { pt } from "date-fns/locale";

interface ConnectionProfile {
  id: string;
  company_name: string | null;
  industry: string | null;
  reputation_score: number;
  reputation_count: number;
  is_verified: boolean;
  is_founder: boolean;
  founder_expiry_date: string | null;
}

interface ConnectionCardProps {
  connectionId: string;
  profile: ConnectionProfile;
  unlockedAt: string;
  crmOpportunityId?: string | null;
  crmContactId?: string | null;
  crmCompanyId?: string | null;
}

export function ConnectionCard({
  connectionId,
  profile,
  unlockedAt,
  crmOpportunityId,
  crmContactId,
  crmCompanyId,
}: ConnectionCardProps) {
  const navigate = useNavigate();
  const [reviewOpen, setReviewOpen] = useState(false);
  const { data: existingReview } = useConnectionReviews(connectionId);

  const isFounderActive =
    profile.is_founder &&
    (!profile.founder_expiry_date || new Date(profile.founder_expiry_date) > new Date());

  return (
    <>
      <Card className="border-border/60 hover:border-primary/20 transition-colors">
        <CardContent className="p-5 space-y-3">
          {/* Header */}
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-muted">
                <Building2 className="w-5 h-5 text-muted-foreground" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground">
                  {profile.company_name || "Empresa"}
                </h3>
                {profile.industry && (
                  <p className="text-xs text-muted-foreground">{profile.industry}</p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              {profile.is_verified && <VerifiedBadge />}
              {isFounderActive && <FounderBadge />}
            </div>
          </div>

          {/* Meta */}
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              {format(new Date(unlockedAt), "d MMM yyyy", { locale: pt })}
            </span>
            <span className="flex items-center gap-1">
              <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
              {profile.reputation_score.toFixed(1)} ({profile.reputation_count})
            </span>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 flex-wrap pt-1">
            {crmOpportunityId && (
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5 text-xs"
                onClick={() => navigate(`/dashboard/opportunities/${crmOpportunityId}`)}
              >
                <ExternalLink className="w-3 h-3" />
                Ver no CRM
              </Button>
            )}
            {crmContactId && (
              <Button
                variant="ghost"
                size="sm"
                className="gap-1.5 text-xs"
                onClick={() => navigate(`/dashboard/contacts/${crmContactId}`)}
              >
                Ver Contacto
              </Button>
            )}
            {crmCompanyId && (
              <Button
                variant="ghost"
                size="sm"
                className="gap-1.5 text-xs"
                onClick={() => navigate(`/dashboard/companies/${crmCompanyId}`)}
              >
                Ver Empresa
              </Button>
            )}
            {!existingReview && (
              <Button
                variant="secondary"
                size="sm"
                className="gap-1.5 text-xs ml-auto"
                onClick={() => setReviewOpen(true)}
              >
                <MessageSquare className="w-3 h-3" />
                Avaliar
              </Button>
            )}
            {existingReview && (
              <Badge variant="secondary" className="ml-auto text-[10px] gap-1">
                <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                Avaliado
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>

      <ReputationReviewDialog
        open={reviewOpen}
        onOpenChange={setReviewOpen}
        connectionId={connectionId}
        reviewedProfileId={profile.id}
        companyName={profile.company_name || "Empresa"}
      />
    </>
  );
}
