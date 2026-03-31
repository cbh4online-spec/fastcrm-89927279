import { useParams } from "react-router-dom";
import { useJobOpening, useUpdateJobOpening } from "@/hooks/hr/useJobOpenings";
import { useApplications, useUpdateApplication } from "@/hooks/hr/useApplications";
import { CandidateKanban } from "@/components/hr/recruitment/CandidateKanban";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, MapPin, Users, Calendar, Sparkles } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { pt } from "date-fns/locale";
import Skeleton from "react-loading-skeleton";

const STATUS_LABELS: Record<string, string> = {
  draft: "Rascunho", published: "Publicada", reviewing: "Em análise", closed: "Fechada", archived: "Arquivada",
};

export default function JobOpeningDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: job, isLoading } = useJobOpening(id);
  const { data: applications, isLoading: appsLoading } = useApplications(id);
  const updateJob = useUpdateJobOpening();
  const updateApp = useUpdateApplication();

  const handleStageChange = (applicationId: string, newStage: string) => {
    updateApp.mutate({ id: applicationId, stage: newStage as any });
  };

  if (isLoading) return <div className="space-y-4"><Skeleton height={200} /><Skeleton height={400} /></div>;
  if (!job) return <div className="text-center py-12 text-muted-foreground">Vaga não encontrada</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard/hr/recruitment/jobs")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-foreground">{job.title}</h1>
          <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground">
            {job.department && <span className="flex items-center gap-1"><Users className="h-3 w-3" />{job.department}</span>}
            {job.location && <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{job.location}</span>}
            <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />{format(new Date(job.created_at), "d MMM yyyy", { locale: pt })}</span>
          </div>
        </div>
        <Badge variant={job.status === "published" ? "default" : "secondary"}>{STATUS_LABELS[job.status]}</Badge>
        {job.status === "draft" && (
          <Button onClick={() => updateJob.mutate({ id: job.id, status: "published", published_at: new Date().toISOString() })}>
            Publicar Vaga
          </Button>
        )}
      </div>

      <Tabs defaultValue="pipeline">
        <TabsList>
          <TabsTrigger value="pipeline">Pipeline ({applications?.length || 0})</TabsTrigger>
          <TabsTrigger value="details">Detalhes</TabsTrigger>
        </TabsList>

        <TabsContent value="pipeline" className="mt-4">
          <CandidateKanban
            applications={applications || []}
            isLoading={appsLoading}
            onStageChange={handleStageChange}
          />
        </TabsContent>

        <TabsContent value="details" className="mt-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {job.description && (
              <Card>
                <CardHeader><CardTitle className="text-base">Descrição</CardTitle></CardHeader>
                <CardContent><p className="text-sm text-muted-foreground whitespace-pre-wrap">{job.description}</p></CardContent>
              </Card>
            )}
            {job.requirements && (
              <Card>
                <CardHeader><CardTitle className="text-base">Requisitos</CardTitle></CardHeader>
                <CardContent><p className="text-sm text-muted-foreground whitespace-pre-wrap">{job.requirements}</p></CardContent>
              </Card>
            )}
            {job.benefits && (
              <Card>
                <CardHeader><CardTitle className="text-base">Benefícios</CardTitle></CardHeader>
                <CardContent><p className="text-sm text-muted-foreground whitespace-pre-wrap">{job.benefits}</p></CardContent>
              </Card>
            )}
            <Card>
              <CardHeader><CardTitle className="text-base">Informações</CardTitle></CardHeader>
              <CardContent className="space-y-2 text-sm">
                {(job.salary_min || job.salary_max) && (
                  <div><span className="text-muted-foreground">Salário:</span> {job.salary_min && `€${job.salary_min.toLocaleString()}`} {job.salary_min && job.salary_max && "–"} {job.salary_max && `€${job.salary_max.toLocaleString()}`}</div>
                )}
                <div><span className="text-muted-foreground">Posições:</span> {job.positions_count}</div>
                {job.published_at && <div><span className="text-muted-foreground">Publicada em:</span> {format(new Date(job.published_at), "d MMM yyyy", { locale: pt })}</div>}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
