import { useParams, useNavigate } from "react-router-dom";
import { useJobPosting, useUpdateJobPosting } from "@/hooks/hr/useJobPostings";
import { useCandidates, useUpdateCandidateStage } from "@/hooks/hr/useCandidates";
import type { CandidateStage } from "@/hooks/hr/useCandidates";
import { CandidateKanban } from "@/components/hr/recruitment/CandidateKanban";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, MapPin, Calendar } from "lucide-react";
import { format } from "date-fns";
import { pt } from "date-fns/locale";
import Skeleton from "react-loading-skeleton";

const STATUS_LABELS: Record<string, string> = {
  draft: "Rascunho", active: "Activa", closed: "Fechada", cancelled: "Cancelada",
};

const EMPLOYMENT_TYPES: Record<string, string> = {
  full_time: "Tempo inteiro", part_time: "Part-time", contract: "Prestador", intern: "Estágio",
};

const REMOTE_OPTIONS: Record<string, string> = {
  office: "Presencial", remote: "Remoto", hybrid: "Híbrido",
};

export default function JobPostingDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: job, isLoading } = useJobPosting(id);
  const { data: candidates, isLoading: candidatesLoading } = useCandidates(id);
  const updateJob = useUpdateJobPosting();
  const updateStage = useUpdateCandidateStage();

  const handleStageChange = (candidateId: string, newStage: CandidateStage) => {
    updateStage.mutate({ id: candidateId, stage: newStage });
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
            {job.location && <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{job.location}</span>}
            <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />{format(new Date(job.created_at), "d MMM yyyy", { locale: pt })}</span>
          </div>
        </div>
        <Badge variant={job.status === "active" ? "default" : "secondary"}>{STATUS_LABELS[job.status]}</Badge>
        {job.status === "draft" && (
          <Button onClick={() => updateJob.mutate({ id: job.id, status: "active", published_at: new Date().toISOString() })}>
            Publicar Vaga
          </Button>
        )}
      </div>

      <Tabs defaultValue="pipeline">
        <TabsList>
          <TabsTrigger value="pipeline">Pipeline ({candidates?.length || 0})</TabsTrigger>
          <TabsTrigger value="details">Detalhes</TabsTrigger>
        </TabsList>

        <TabsContent value="pipeline" className="mt-4">
          <CandidateKanban
            candidates={candidates || []}
            isLoading={candidatesLoading}
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
            {job.requirements?.length > 0 && (
              <Card>
                <CardHeader><CardTitle className="text-base">Requisitos</CardTitle></CardHeader>
                <CardContent>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    {job.requirements.map((r, i) => <li key={i}>• {r}</li>)}
                  </ul>
                </CardContent>
              </Card>
            )}
            {job.nice_to_have?.length > 0 && (
              <Card>
                <CardHeader><CardTitle className="text-base">Nice to have</CardTitle></CardHeader>
                <CardContent>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    {job.nice_to_have.map((r, i) => <li key={i}>• {r}</li>)}
                  </ul>
                </CardContent>
              </Card>
            )}
            <Card>
              <CardHeader><CardTitle className="text-base">Informações</CardTitle></CardHeader>
              <CardContent className="space-y-2 text-sm">
                {job.employment_type && <div><span className="text-muted-foreground">Tipo:</span> {EMPLOYMENT_TYPES[job.employment_type] || job.employment_type}</div>}
                {job.remote_option && <div><span className="text-muted-foreground">Modalidade:</span> {REMOTE_OPTIONS[job.remote_option] || job.remote_option}</div>}
                {(job.salary_min || job.salary_max) && (
                  <div><span className="text-muted-foreground">Salário:</span> {job.salary_min && `${job.currency}${job.salary_min.toLocaleString()}`} {job.salary_min && job.salary_max && "–"} {job.salary_max && `${job.currency}${job.salary_max.toLocaleString()}`}</div>
                )}
                {job.published_at && <div><span className="text-muted-foreground">Publicada em:</span> {format(new Date(job.published_at), "d MMM yyyy", { locale: pt })}</div>}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
