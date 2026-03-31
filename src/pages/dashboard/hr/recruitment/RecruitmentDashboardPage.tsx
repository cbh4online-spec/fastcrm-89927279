import { useJobPostings } from "@/hooks/hr/useJobPostings";
import { useCandidates } from "@/hooks/hr/useCandidates";
import { useInterviews } from "@/hooks/hr/useInterviews";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Briefcase, Users, Calendar, TrendingUp, UserCheck, ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";

const STAGE_LABELS: Record<string, string> = {
  new: "Novo", screening: "Triagem", phone_interview: "Telefone",
  technical_interview: "Técnica", onsite_interview: "Presencial",
  offer: "Oferta", hired: "Contratado", rejected: "Rejeitado",
};

const STAGE_COLORS: Record<string, string> = {
  new: "bg-blue-500", screening: "bg-amber-500", phone_interview: "bg-purple-500",
  technical_interview: "bg-cyan-500", onsite_interview: "bg-indigo-500",
  offer: "bg-emerald-500", hired: "bg-green-600", rejected: "bg-red-500",
};

export default function RecruitmentDashboardPage() {
  const { data: jobs } = useJobPostings();
  const { data: candidates } = useCandidates();
  const { data: interviews } = useInterviews();
  const navigate = useNavigate();

  const activeJobs = jobs?.filter(j => j.status === "active").length || 0;
  const totalCandidates = candidates?.length || 0;
  const hiredCount = candidates?.filter(c => c.stage === "hired").length || 0;
  const upcomingInterviews = interviews?.filter(i => i.status === "scheduled" && new Date(i.scheduled_at) >= new Date()).length || 0;

  // Funnel data
  const stageCounts = (candidates || []).reduce((acc, c) => {
    acc[c.stage] = (acc[c.stage] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const stages = ["new", "screening", "phone_interview", "technical_interview", "onsite_interview", "offer", "hired"];
  const maxCount = Math.max(...stages.map(s => stageCounts[s] || 0), 1);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Recrutamento</h1>
          <p className="text-muted-foreground">Visão geral dos processos de recrutamento</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => navigate("/dashboard/hr/recruitment/jobs")}><Briefcase className="h-4 w-4 mr-2" />Vagas</Button>
          <Button variant="outline" onClick={() => navigate("/dashboard/hr/recruitment/candidates")}><Users className="h-4 w-4 mr-2" />Candidatos</Button>
          <Button variant="outline" onClick={() => navigate("/dashboard/hr/recruitment/interviews")}><Calendar className="h-4 w-4 mr-2" />Entrevistas</Button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate("/dashboard/hr/recruitment/jobs")}>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Vagas Activas</p>
                <p className="text-3xl font-bold mt-1">{activeJobs}</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                <Briefcase className="h-6 w-6 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate("/dashboard/hr/recruitment/candidates")}>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Candidatos</p>
                <p className="text-3xl font-bold mt-1">{totalCandidates}</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-blue-500/10 flex items-center justify-center">
                <Users className="h-6 w-6 text-blue-500" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Contratados</p>
                <p className="text-3xl font-bold mt-1">{hiredCount}</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-green-500/10 flex items-center justify-center">
                <UserCheck className="h-6 w-6 text-green-500" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate("/dashboard/hr/recruitment/interviews")}>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Entrevistas Agendadas</p>
                <p className="text-3xl font-bold mt-1">{upcomingInterviews}</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-purple-500/10 flex items-center justify-center">
                <Calendar className="h-6 w-6 text-purple-500" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Funnel */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2"><TrendingUp className="h-4 w-4" /> Funil de Recrutamento</CardTitle>
        </CardHeader>
        <CardContent>
          {totalCandidates === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">Sem candidatos para mostrar o funil.</p>
          ) : (
            <div className="space-y-3">
              {stages.map(stage => {
                const count = stageCounts[stage] || 0;
                const pct = Math.round((count / maxCount) * 100);
                return (
                  <div key={stage} className="flex items-center gap-3">
                    <span className="text-sm w-28 text-right text-muted-foreground">{STAGE_LABELS[stage]}</span>
                    <div className="flex-1 h-8 bg-muted rounded-full overflow-hidden">
                      <div className={`h-full ${STAGE_COLORS[stage]} rounded-full transition-all duration-500 flex items-center justify-end pr-3`} style={{ width: `${Math.max(pct, 5)}%` }}>
                        <span className="text-xs font-medium text-white">{count}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent jobs */}
      {jobs && jobs.length > 0 && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Vagas Recentes</CardTitle>
            <Button variant="ghost" size="sm" onClick={() => navigate("/dashboard/hr/recruitment/jobs")}>Ver todas <ArrowRight className="h-4 w-4 ml-1" /></Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {jobs.slice(0, 5).map(job => (
                <div key={job.id} className="flex items-center justify-between p-3 rounded-lg hover:bg-muted/50 cursor-pointer" onClick={() => navigate(`/dashboard/hr/recruitment/jobs/${job.id}`)}>
                  <div>
                    <p className="font-medium text-sm">{job.title}</p>
                    <p className="text-xs text-muted-foreground">{job.location || "Sem localização"}</p>
                  </div>
                  <Badge variant={job.status === "active" ? "default" : "secondary"}>
                    {job.status === "active" ? "Activa" : job.status === "draft" ? "Rascunho" : job.status}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
