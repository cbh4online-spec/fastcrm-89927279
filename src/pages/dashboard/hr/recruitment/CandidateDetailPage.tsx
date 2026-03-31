import { useParams, useNavigate } from "react-router-dom";
import { useCandidate } from "@/hooks/hr/useCandidates";
import { useApplications } from "@/hooks/hr/useApplications";
import { useRecruitmentAI } from "@/hooks/hr/useRecruitmentAI";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Mail, Phone, Linkedin, Globe, Sparkles, FileText, Star } from "lucide-react";
import { format } from "date-fns";
import { pt } from "date-fns/locale";
import Skeleton from "react-loading-skeleton";
import { toast } from "sonner";

const STAGE_LABELS: Record<string, string> = {
  new: "Novo", screening: "Triagem", interview: "Entrevista", test: "Teste", offer: "Oferta", hired: "Contratado", rejected: "Rejeitado",
};

export default function CandidateDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: candidate, isLoading } = useCandidate(id);
  const { data: applications } = useApplications();
  const { summarizeCandidate, generateQuestions, loading: aiLoading } = useRecruitmentAI();
  const [aiSummary, setAiSummary] = useState<any>(null);
  const [aiQuestions, setAiQuestions] = useState<any>(null);

  const candidateApps = applications?.filter(a => a.candidate_id === id);

  const handleSummarize = async () => {
    if (!candidate) return;
    const res = await summarizeCandidate({ full_name: candidate.full_name, email: candidate.email, notes: candidate.notes, tags: candidate.tags });
    if (res.result) {
      setAiSummary(res.result);
      toast.success("Resumo gerado");
    }
  };

  const handleQuestions = async () => {
    if (!candidate) return;
    const res = await generateQuestions(
      `${candidate.full_name}. Notas: ${candidate.notes || "N/A"}. Tags: ${(candidate.tags || []).join(", ")}`,
      "Genérico — avaliar competências gerais, motivação e fit cultural"
    );
    if (res.result) {
      setAiQuestions(res.result);
      toast.success("Perguntas geradas");
    }
  };

  if (isLoading) return <div className="space-y-4"><Skeleton height={200} /><Skeleton height={300} /></div>;
  if (!candidate) return <div className="text-center py-12 text-muted-foreground">Candidato não encontrado</div>;

  const initials = candidate.full_name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase();

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
          <h1 className="text-2xl font-bold text-foreground">{candidate.full_name}</h1>
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            {candidate.email && <span className="flex items-center gap-1"><Mail className="h-3 w-3" />{candidate.email}</span>}
            {candidate.phone && <span className="flex items-center gap-1"><Phone className="h-3 w-3" />{candidate.phone}</span>}
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleSummarize} disabled={aiLoading}>
            <Sparkles className="h-4 w-4 mr-1" /> Resumo IA
          </Button>
          <Button variant="outline" size="sm" onClick={handleQuestions} disabled={aiLoading}>
            <FileText className="h-4 w-4 mr-1" /> Perguntas IA
          </Button>
        </div>
      </div>

      <Tabs defaultValue="profile">
        <TabsList>
          <TabsTrigger value="profile">Perfil</TabsTrigger>
          <TabsTrigger value="applications">Candidaturas ({candidateApps?.length || 0})</TabsTrigger>
          <TabsTrigger value="ai">Inteligência Artificial</TabsTrigger>
        </TabsList>

        <TabsContent value="profile" className="mt-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader><CardTitle className="text-base">Informações</CardTitle></CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div><span className="text-muted-foreground">Fonte:</span> <Badge variant="outline">{candidate.source}</Badge></div>
                {candidate.linkedin_url && (
                  <div className="flex items-center gap-2">
                    <Linkedin className="h-4 w-4 text-muted-foreground" />
                    <a href={candidate.linkedin_url} target="_blank" rel="noopener" className="text-primary hover:underline">{candidate.linkedin_url}</a>
                  </div>
                )}
                {candidate.portfolio_url && (
                  <div className="flex items-center gap-2">
                    <Globe className="h-4 w-4 text-muted-foreground" />
                    <a href={candidate.portfolio_url} target="_blank" rel="noopener" className="text-primary hover:underline">{candidate.portfolio_url}</a>
                  </div>
                )}
                {candidate.tags?.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {candidate.tags.map(t => <Badge key={t} variant="secondary" className="text-xs">{t}</Badge>)}
                  </div>
                )}
                <div className="text-muted-foreground">Criado em {format(new Date(candidate.created_at), "d MMM yyyy", { locale: pt })}</div>
              </CardContent>
            </Card>
            {candidate.notes && (
              <Card>
                <CardHeader><CardTitle className="text-base">Notas</CardTitle></CardHeader>
                <CardContent><p className="text-sm text-muted-foreground whitespace-pre-wrap">{candidate.notes}</p></CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        <TabsContent value="applications" className="mt-4">
          {!candidateApps?.length ? (
            <Card className="p-8 text-center text-muted-foreground">Sem candidaturas registadas</Card>
          ) : (
            <div className="space-y-3">
              {candidateApps.map(app => (
                <Card key={app.id} className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">{app.job_opening?.title || "Vaga"}</p>
                      <p className="text-sm text-muted-foreground">Candidatura: {format(new Date(app.applied_at), "d MMM yyyy", { locale: pt })}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge>{STAGE_LABELS[app.stage] || app.stage}</Badge>
                      {app.rating && (
                        <div className="flex items-center gap-1 text-sm">
                          <Star className="h-3 w-3 text-amber-500 fill-amber-500" /> {app.rating}
                        </div>
                      )}
                      {app.ai_score != null && (
                        <Badge variant="outline" className="text-xs">IA: {app.ai_score}%</Badge>
                      )}
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="ai" className="mt-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {aiSummary && (
              <Card>
                <CardHeader><CardTitle className="text-base flex items-center gap-2"><Sparkles className="h-4 w-4" /> Resumo IA</CardTitle></CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <p>{aiSummary.summary}</p>
                  {aiSummary.key_skills && (
                    <div>
                      <p className="font-medium mb-1">Competências:</p>
                      <div className="flex flex-wrap gap-1">{aiSummary.key_skills.map((s: string) => <Badge key={s} variant="secondary" className="text-xs">{s}</Badge>)}</div>
                    </div>
                  )}
                  {aiSummary.experience_level && <div><span className="text-muted-foreground">Nível:</span> {aiSummary.experience_level}</div>}
                  {aiSummary.overall_impression && <div><span className="text-muted-foreground">Impressão:</span> {aiSummary.overall_impression}</div>}
                </CardContent>
              </Card>
            )}
            {aiQuestions && (
              <Card>
                <CardHeader><CardTitle className="text-base flex items-center gap-2"><FileText className="h-4 w-4" /> Perguntas de Entrevista</CardTitle></CardHeader>
                <CardContent>
                  <ol className="space-y-3 text-sm list-decimal list-inside">
                    {(aiQuestions.questions || []).map((q: any, i: number) => (
                      <li key={i}>
                        <span className="font-medium">{q.question}</span>
                        <p className="text-muted-foreground ml-5 mt-0.5 text-xs">Avaliar: {q.what_to_look_for}</p>
                        <Badge variant="outline" className="ml-5 mt-1 text-xs">{q.category}</Badge>
                      </li>
                    ))}
                  </ol>
                </CardContent>
              </Card>
            )}
            {!aiSummary && !aiQuestions && (
              <Card className="p-8 text-center text-muted-foreground col-span-full">
                Use os botões "Resumo IA" e "Perguntas IA" para gerar conteúdo inteligente.
              </Card>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
