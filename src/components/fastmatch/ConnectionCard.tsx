import { useState } from "react";
import { Building2, Star, Calendar, ExternalLink, MessageSquare, ChevronDown, ChevronUp, Globe, Briefcase, Linkedin } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
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
  bio?: string | null;
  services_offered?: string[] | null;
  services_needed?: string[] | null;
  ticket_range?: string | null;
  website_url?: string | null;
  linkedin_url?: string | null;
  target_audience?: string | null;
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
  const [expanded, setExpanded] = useState(false);
  const { data: existingReview } = useConnectionReviews(connectionId);

  const isFounderActive =
    profile.is_founder &&
    (!profile.founder_expiry_date || new Date(profile.founder_expiry_date) > new Date());

  const hasExtendedInfo = profile.bio || profile.services_offered?.length || profile.website_url || profile.linkedin_url || profile.target_audience;

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

          {/* Expandable detail */}
          {hasExtendedInfo && (
            <Collapsible open={expanded} onOpenChange={setExpanded}>
              <CollapsibleTrigger asChild>
                <Button variant="ghost" size="sm" className="w-full gap-1.5 text-xs text-muted-foreground hover:text-foreground">
                  {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                  {expanded ? "Menos detalhes" : "Ver detalhes"}
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="space-y-3 pt-2 border-t border-border/40 mt-2">
                {profile.bio && (
                  <p className="text-sm text-muted-foreground">{profile.bio}</p>
                )}
                {profile.target_audience && (
                  <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                    <Briefcase className="w-3.5 h-3.5 flex-shrink-0" />
                    <span>Público-alvo: {profile.target_audience}</span>
                  </div>
                )}
                {profile.ticket_range && (
                  <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                    <Globe className="w-3.5 h-3.5 flex-shrink-0" />
                    <span>Ticket: {profile.ticket_range}</span>
                  </div>
                )}
                {profile.services_offered && profile.services_offered.length > 0 && (
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-foreground/80">Serviços Oferecidos</p>
                    <div className="flex flex-wrap gap-1">
                      {profile.services_offered.map((s, i) => (
                        <Badge key={i} variant="secondary" className="text-[10px]">{s}</Badge>
                      ))}
                    </div>
                  </div>
                )}
                {profile.services_needed && profile.services_needed.length > 0 && (
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-foreground/80">Serviços Procurados</p>
                    <div className="flex flex-wrap gap-1">
                      {profile.services_needed.map((s, i) => (
                        <Badge key={i} variant="outline" className="text-[10px]">{s}</Badge>
                      ))}
                    </div>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  {profile.website_url && (
                    <Button variant="outline" size="sm" className="text-xs gap-1" asChild>
                      <a href={profile.website_url} target="_blank" rel="noopener noreferrer">
                        <Globe className="w-3 h-3" /> Website
                      </a>
                    </Button>
                  )}
                  {profile.linkedin_url && (
                    <Button variant="outline" size="sm" className="text-xs gap-1" asChild>
                      <a href={profile.linkedin_url} target="_blank" rel="noopener noreferrer">
                        <Linkedin className="w-3 h-3" /> LinkedIn
                      </a>
                    </Button>
                  )}
                </div>
              </CollapsibleContent>
            </Collapsible>
          )}

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
