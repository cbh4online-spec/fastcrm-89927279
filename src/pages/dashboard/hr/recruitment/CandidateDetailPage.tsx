import { useParams, useNavigate } from "react-router-dom";
import { useCandidate, useScoreCandidate, useParseCV } from "@/hooks/hr/useCandidates";
import { useCandidateActivities, useCreateCandidateActivity } from "@/hooks/hr/useCandidateActivities";
import { useInterviews } from "@/hooks/hr/useInterviews";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Mail, Phone, Linkedin, Globe, Sparkles, FileText, Github, MapPin, Calendar, MessageSquare } from "lucide-react";
import { format } from "date-fns";
import { pt } from "date-fns/locale";
import Skeleton from "react-loading-skeleton";
import { toast } from "sonner";

const STAGE_LABELS: Record<string, string> = {
  new: "Novo", screening: "Triagem", phone_interview: "Telefone",
  technical_interview: "Técnica", onsite_interview: "Presencial",
  offer: "Oferta", hired: "Contratado", rejected: "Rejeitado",
};

const ACTIVITY_LABELS: Record<string, string> = {
  note: "Nota", email_sent: "Email enviado", email_received: "Email recebido",
  stage_changed: "Etapa alterada", interview_scheduled: "Entrevista agendada",
  interview_completed: "Entrevista concluída", offer_sent: "Oferta enviada",
};

export default function CandidateDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: candidate, isLoading } = useCandidate(id);
  const { data: activities } = useCandidateActivities(id);
  const { data: interviews } = useInterviews(id);
  const scoreCandidate = useScoreCandidate();
  const parseCV = useParseCV();
  const createActivity = useCreateCandidateActivity();
  const [noteText, setNoteText] = useState("");

  const handleScore = () => {
    if (!id) return;
    scoreCandidate.mutate(id);
  };

  const handleAddNote = async () => {
    if (!noteText.trim() || !id) return;
    await createActivity.mutateAsync({ candidate_id: id, activity_type: "note", content: noteText });
    setNoteText("");
    toast.success("Nota adicionada");
  };

  if (isLoading) return <div className="space-y-4"><Skeleton height={200} /><Skeleton height={300} /></div>;
  if (!candidate) return <div className="text-center py-12 text-muted-foreground">Candidato não encontrado</div>;

  const initials = `${candidate.first_name?.[0] || ""}${candidate.last_name?.[0] || ""}`.toUpperCase();
  const fullName = `${candidate.first_name} ${candidate.last_name}`;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard/hr/recruitment/candidates")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <Avatar className="h-12 w-12">
          <AvatarFallback className="text-lg">{initials}</AvatarFallback>
        </Avatar>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-foreground">{fullName}</h1>
          <div className="flex items-center gap-3 text-sm text-muted-foreground flex-wrap">
            <span className="flex items-center gap-1"><Mail className="h-3 w-3" />{candidate.email}</span>
            {candidate.phone && <span className="flex items-center gap-1"><Phone className="h-3 w-3" />{candidate.phone}</span>}
            {candidate.location && <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{candidate.location}</span>}
            <Badge variant="outline">{STAGE_LABELS[candidate.stage] || candidate.stage}</Badge>
            {candidate.ai_score != null && (
              <Badge variant="secondary" className="gap-1"><Sparkles className="h-3 w-3" /> IA {candidate.ai_score}%</Badge>
            )}
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleScore} disabled={scoreCandidate.isPending}>
            <Sparkles className="h-4 w-4 mr-1" /> {scoreCandidate.isPending ? "A calcular..." : "Score IA"}
          </Button>
        </div>
      </div>

      <Tabs defaultValue="profile">
        <TabsList>
          <TabsTrigger value="profile">Perfil</TabsTrigger>
          <TabsTrigger value="cv">CV Parsed</TabsTrigger>
          <TabsTrigger value="ai">IA Analysis</TabsTrigger>
          <TabsTrigger value="activities">Actividades ({activities?.length || 0})</TabsTrigger>
          <TabsTrigger value="interviews">Entrevistas ({interviews?.length || 0})</TabsTrigger>
        </TabsList>

        <TabsContent value="profile" className="mt-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader><CardTitle className="text-base">Informações</CardTitle></CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div><span className="text-muted-foreground">Fonte:</span> <Badge variant="outline">{candidate.source}</Badge></div>
                {candidate.job_posting && <div><span className="text-muted-foreground">Vaga:</span> {candidate.job_posting.title}</div>}
                {candidate.linkedin_url && (
                  <div className="flex items-center gap-2">
                    <Linkedin className="h-4 w-4 text-muted-foreground" />
                    <a href={candidate.linkedin_url} target="_blank" rel="noopener" className="text-primary hover:underline truncate">{candidate.linkedin_url}</a>
                  </div>
                )}
                {candidate.github_url && (
                  <div className="flex items-center gap-2">
                    <Github className="h-4 w-4 text-muted-foreground" />
                    <a href={candidate.github_url} target="_blank" rel="noopener" className="text-primary hover:underline truncate">{candidate.github_url}</a>
                  </div>
                )}
                {candidate.portfolio_url && (
                  <div className="flex items-center gap-2">
                    <Globe className="h-4 w-4 text-muted-foreground" />
                    <a href={candidate.portfolio_url} target="_blank" rel="noopener" className="text-primary hover:underline truncate">{candidate.portfolio_url}</a>
                  </div>
                )}
                <div className="text-muted-foreground">Candidatura: {format(new Date(candidate.applied_at), "d MMM yyyy", { locale: pt })}</div>
              </CardContent>
            </Card>

            {/* Quick note */}
            <Card>
              <CardHeader><CardTitle className="text-base flex items-center gap-2"><MessageSquare className="h-4 w-4" /> Adicionar Nota</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <Textarea value={noteText} onChange={e => setNoteText(e.target.value)} rows={3} placeholder="Escreva uma nota..." />
                <Button size="sm" onClick={handleAddNote} disabled={!noteText.trim() || createActivity.isPending}>Guardar Nota</Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="cv" className="mt-4">
          {candidate.cv_parsed_data ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {candidate.cv_parsed_data.experience?.length > 0 && (
                <Card>
                  <CardHeader><CardTitle className="text-base">Experiência</CardTitle></CardHeader>
                  <CardContent className="space-y-4">
                    {candidate.cv_parsed_data.experience.map((exp: any, i: number) => (
                      <div key={i} className="border-l-2 border-primary/30 pl-3">
                        <p className="font-medium text-sm">{exp.title}</p>
                        <p className="text-sm text-muted-foreground">{exp.company}</p>
                        <p className="text-xs text-muted-foreground">{exp.start_date} — {exp.end_date || "Presente"}</p>
                        {exp.description && <p className="text-xs mt-1">{exp.description}</p>}
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}
              {candidate.cv_parsed_data.education?.length > 0 && (
                <Card>
                  <CardHeader><CardTitle className="text-base">Educação</CardTitle></CardHeader>
                  <CardContent className="space-y-3">
                    {candidate.cv_parsed_data.education.map((edu: any, i: number) => (
                      <div key={i}>
                        <p className="font-medium text-sm">{edu.degree} — {edu.field}</p>
                        <p className="text-sm text-muted-foreground">{edu.institution} ({edu.graduation_year})</p>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}
              {candidate.cv_parsed_data.skills?.length > 0 && (
                <Card>
                  <CardHeader><CardTitle className="text-base">Competências</CardTitle></CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-1">
                      {candidate.cv_parsed_data.skills.map((s: string) => <Badge key={s} variant="secondary" className="text-xs">{s}</Badge>)}
                    </div>
                  </CardContent>
                </Card>
              )}
              {candidate.cv_parsed_data.summary && (
                <Card>
                  <CardHeader><CardTitle className="text-base">Resumo</CardTitle></CardHeader>
                  <CardContent><p className="text-sm text-muted-foreground">{candidate.cv_parsed_data.summary}</p></CardContent>
                </Card>
              )}
            </div>
          ) : (
            <Card className="p-8 text-center text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
              <p>Nenhum CV analisado ainda.</p>
              <p className="text-sm mt-1">Use a funcionalidade "Parse CV" para extrair dados estruturados.</p>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="ai" className="mt-4">
          {candidate.ai_analysis ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader><CardTitle className="text-base flex items-center gap-2"><Sparkles className="h-4 w-4" /> Score: {candidate.ai_score}%</CardTitle></CardHeader>
                <CardContent className="space-y-3 text-sm">
                  {candidate.ai_analysis.recommendation && <p className="font-medium">{candidate.ai_analysis.recommendation}</p>}
                  {candidate.ai_analysis.strengths?.length > 0 && (
                    <div>
                      <p className="font-medium text-green-600 mb-1">Pontos Fortes:</p>
                      <ul className="space-y-1">{candidate.ai_analysis.strengths.map((s: string, i: number) => <li key={i}>• {s}</li>)}</ul>
                    </div>
                  )}
                  {candidate.ai_analysis.concerns?.length > 0 && (
                    <div>
                      <p className="font-medium text-amber-600 mb-1">Preocupações:</p>
                      <ul className="space-y-1">{candidate.ai_analysis.concerns.map((s: string, i: number) => <li key={i}>• {s}</li>)}</ul>
                    </div>
                  )}
                  {candidate.ai_analysis.key_matches?.length > 0 && (
                    <div>
                      <p className="font-medium mb-1">Matches:</p>
                      <div className="flex flex-wrap gap-1">{candidate.ai_analysis.key_matches.map((s: string) => <Badge key={s} variant="secondary" className="text-xs">{s}</Badge>)}</div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          ) : (
            <Card className="p-8 text-center text-muted-foreground">
              <Sparkles className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
              <p>Nenhuma análise IA disponível.</p>
              <p className="text-sm mt-1">Clique em "Score IA" para gerar uma avaliação automática.</p>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="activities" className="mt-4">
          {!activities?.length ? (
            <Card className="p-8 text-center text-muted-foreground">Sem actividades registadas</Card>
          ) : (
            <div className="space-y-3">
              {activities.map(a => (
                <Card key={a.id} className="p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <Badge variant="outline" className="text-xs mb-1">{ACTIVITY_LABELS[a.activity_type] || a.activity_type}</Badge>
                      {a.content && <p className="text-sm mt-1">{a.content}</p>}
                    </div>
                    <span className="text-xs text-muted-foreground">{format(new Date(a.created_at), "d MMM yyyy HH:mm", { locale: pt })}</span>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="interviews" className="mt-4">
          {!interviews?.length ? (
            <Card className="p-8 text-center text-muted-foreground">Sem entrevistas registadas</Card>
          ) : (
            <div className="space-y-3">
              {interviews.map(i => (
                <Card key={i.id} className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-sm">{i.interview_type}</p>
                      <p className="text-sm text-muted-foreground flex items-center gap-1">
                        <Calendar className="h-3 w-3" /> {format(new Date(i.scheduled_at), "d MMM yyyy, HH:mm", { locale: pt })}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={i.status === "scheduled" ? "default" : "secondary"}>{i.status}</Badge>
                      {i.overall_rating && <Badge variant="outline">{i.overall_rating}/5</Badge>}
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
