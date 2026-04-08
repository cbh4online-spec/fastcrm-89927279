import { useParams, Link } from "react-router-dom";
import { usePublicWorkspace, usePublicJob } from "@/hooks/hr/usePublicJobs";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, MapPin, Calendar, Briefcase, Building2 } from "lucide-react";
import { ApplicationForm } from "@/components/hr/recruitment/ApplicationForm";
import Skeleton from "react-loading-skeleton";
import { format } from "date-fns";
import { pt } from "date-fns/locale";
import { Helmet } from "react-helmet-async";

const EMPLOYMENT_LABELS: Record<string, string> = {
  full_time: "Tempo inteiro", part_time: "Part-time", contract: "Prestador", intern: "Estágio",
};

const REMOTE_LABELS: Record<string, string> = {
  office: "Presencial", remote: "Remoto", hybrid: "Híbrido",
};

export default function JobDetailPublicPage() {
  const { workspaceSlug, jobSlug } = useParams<{ workspaceSlug: string; jobSlug: string }>();
  const { data: workspace } = usePublicWorkspace(workspaceSlug);
  const { data: job, isLoading } = usePublicJob(workspaceSlug, jobSlug);

  const companyName = workspace?.company_name || workspace?.name || "";

  if (isLoading) return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <Skeleton height={60} />
      <Skeleton height={300} />
    </div>
  );

  if (!job) return (
    <div className="flex items-center justify-center min-h-screen flex-col gap-4">
      <Briefcase className="h-12 w-12 text-muted-foreground" />
      <p className="text-muted-foreground">Vaga não encontrada</p>
      <Link to={`/careers/${workspaceSlug}`}>
        <Button variant="outline"><ArrowLeft className="h-4 w-4 mr-2" /> Ver todas as vagas</Button>
      </Link>
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>{job.title} — {companyName}</title>
        <meta name="description" content={`${job.title} em ${companyName}. ${job.description?.slice(0, 140)}`} />
      </Helmet>

      {/* Header */}
      <div className="border-b bg-muted/30">
        <div className="max-w-4xl mx-auto px-6 py-6">
          <Link to={`/careers/${workspaceSlug}`} className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4">
            <ArrowLeft className="h-3 w-3" /> Todas as vagas
          </Link>
          <div className="flex items-start gap-4">
            {workspace?.logo_url && (
              <img src={workspace.logo_url} alt={companyName} className="h-12 w-12 rounded-lg object-contain border bg-background p-1" />
            )}
            <div className="space-y-2">
              <h1 className="text-2xl font-bold tracking-tight">{job.title}</h1>
              <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                <span className="flex items-center gap-1"><Building2 className="h-3 w-3" />{companyName}</span>
                {job.location && <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{job.location}</span>}
                {job.published_at && (
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />{format(new Date(job.published_at), "d MMM yyyy", { locale: pt })}
                  </span>
                )}
              </div>
              <div className="flex flex-wrap gap-2 pt-1">
                {job.employment_type && <Badge variant="secondary">{EMPLOYMENT_LABELS[job.employment_type] || job.employment_type}</Badge>}
                {job.remote_option && <Badge variant="outline">{REMOTE_LABELS[job.remote_option] || job.remote_option}</Badge>}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-6 py-8 grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          {job.description && (
            <Card>
              <CardHeader><CardTitle className="text-base">Sobre a posição</CardTitle></CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">{job.description}</p>
              </CardContent>
            </Card>
          )}

          {job.requirements && job.requirements.length > 0 && (
            <Card>
              <CardHeader><CardTitle className="text-base">Requisitos</CardTitle></CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {job.requirements.map((r, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                      <span className="text-primary mt-0.5">•</span>{r}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          {job.nice_to_have && job.nice_to_have.length > 0 && (
            <Card>
              <CardHeader><CardTitle className="text-base">Nice to Have</CardTitle></CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {job.nice_to_have.map((r, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                      <span className="text-muted-foreground/50 mt-0.5">•</span>{r}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}
        </div>

        <div>
          <ApplicationForm jobId={job.id} workspaceId={job.workspace_id} jobTitle={job.title} />
        </div>
      </div>

      <div className="text-center text-xs text-muted-foreground py-8 border-t">
        Powered by FastCRM
      </div>
    </div>
  );
}
