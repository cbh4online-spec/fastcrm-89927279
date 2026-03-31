import { useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { HRBreadcrumb } from "@/components/hr/HRBreadcrumb";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import {
  Plus, Star, Sparkles, ChevronDown, ChevronRight, Users, Award,
  CheckCircle2, Clock, MessageSquare, Trash2, Calendar,
} from "lucide-react";
import { useWorkspace } from "@/hooks/useWorkspace";
import {
  useReviewCycles, useCreateReviewCycle, usePerformanceReviews,
  useReviewCycleStats, useSubmitSelfReview, useSubmitManagerReview,
  useSuggestRatingAI, useCompetencies, useCreateCompetency,
  useDeleteCompetency, useCalibrationSessions, useCreateCalibrationSession,
  useFinalizeReview,
} from "@/hooks/hr/usePerformanceReviews";
import { ReviewCycleManager } from "@/components/hr/ReviewCycleManager";

const REVIEW_STATUS_MAP: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  pending_self: { label: "Pendente Auto", variant: "secondary" },
  pending_manager: { label: "Pendente Manager", variant: "default" },
  pending_calibration: { label: "Calibração", variant: "outline" },
  completed: { label: "Concluída", variant: "default" },
};

function RatingStars({ value, onChange, readOnly = false }: { value: number; onChange?: (v: number) => void; readOnly?: boolean }) {
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          disabled={readOnly}
          onClick={() => onChange?.(star)}
          className={`${readOnly ? "cursor-default" : "cursor-pointer hover:scale-110"} transition-transform`}
        >
          <Star
            className={`h-5 w-5 ${star <= value ? "fill-amber-400 text-amber-400" : "text-muted-foreground/30"}`}
          />
        </button>
      ))}
    </div>
  );
}

// ─── Cycles Tab ─────────────────────────────────────────────────────────────

function CyclesTab() {
  const { currentWorkspace } = useWorkspace();
  const wid = currentWorkspace?.id;
  const { data: cycles, isLoading } = useReviewCycles(wid);
  const createCycle = useCreateReviewCycle();
  const [expandedCycle, setExpandedCycle] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newYear, setNewYear] = useState(new Date().getFullYear());
  const [newType, setNewType] = useState("annual");

  const handleCreate = () => {
    if (!wid) return;
    createCycle.mutate({ workspace_id: wid, year: newYear, cycle_type: newType }, {
      onSuccess: () => setDialogOpen(false),
    });
  };

  if (isLoading) return <div className="space-y-4">{[1, 2].map((i) => <Skeleton key={i} className="h-40 w-full" />)}</div>;

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold">Ciclos de Avaliação</h2>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm"><Plus className="h-4 w-4 mr-1" />Criar Ciclo</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Novo Ciclo de Avaliação</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Ano</Label>
                <Input type="number" value={newYear} onChange={(e) => setNewYear(Number(e.target.value))} />
              </div>
              <div>
                <Label>Tipo</Label>
                <Select value={newType} onValueChange={setNewType}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="annual">Anual</SelectItem>
                    <SelectItem value="semi_annual">Semestral</SelectItem>
                    <SelectItem value="quarterly">Trimestral</SelectItem>
                    <SelectItem value="probation">Probatório</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button onClick={handleCreate} disabled={createCycle.isPending}>
                {createCycle.isPending ? "A criar…" : "Criar Ciclo"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {(!cycles || cycles.length === 0) ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <Award className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p>Nenhum ciclo de avaliação criado.</p>
            <p className="text-sm">Crie o primeiro ciclo para iniciar as avaliações de desempenho.</p>
          </CardContent>
        </Card>
      ) : (
        cycles.map((cycle) => (
          <div key={cycle.id} className="space-y-2">
            <div
              className="cursor-pointer"
              onClick={() => setExpandedCycle(expandedCycle === cycle.id ? null : cycle.id)}
            >
              <CycleCard cycleId={cycle.id} cycle={cycle} />
            </div>
            {expandedCycle === cycle.id && <CycleReviews cycleId={cycle.id} />}
          </div>
        ))
      )}
    </div>
  );
}

function CycleCard({ cycleId, cycle }: { cycleId: string; cycle: any }) {
  const { data: stats, isLoading } = useReviewCycleStats(cycleId);
  return <ReviewCycleManager cycle={cycle} stats={stats} isLoading={isLoading} />;
}

function CycleReviews({ cycleId }: { cycleId: string }) {
  const { data: reviews, isLoading } = usePerformanceReviews(cycleId);
  const [selectedReview, setSelectedReview] = useState<string | null>(null);

  if (isLoading) return <Skeleton className="h-20 w-full" />;

  return (
    <div className="ml-4 space-y-2">
      {reviews?.map((review) => {
        const statusInfo = REVIEW_STATUS_MAP[review.status] || REVIEW_STATUS_MAP.pending_self;
        const isExpanded = selectedReview === review.id;
        return (
          <div key={review.id}>
            <Card
              className="cursor-pointer hover:bg-accent/50 transition-colors"
              onClick={() => setSelectedReview(isExpanded ? null : review.id)}
            >
              <CardContent className="py-3 px-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                  <div>
                    <p className="font-medium text-sm">{(review as any).employee?.full_name || "—"}</p>
                    <p className="text-xs text-muted-foreground">{(review as any).employee?.job_title || ""}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {review.self_rating && <RatingStars value={review.self_rating} readOnly />}
                  <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>
                </div>
              </CardContent>
            </Card>
            {isExpanded && <ReviewDetail reviewId={review.id} review={review} />}
          </div>
        );
      })}
    </div>
  );
}

// ─── Review Detail ──────────────────────────────────────────────────────────

function ReviewDetail({ reviewId, review }: { reviewId: string; review: any }) {
  const suggestAI = useSuggestRatingAI();
  const submitSelf = useSubmitSelfReview();
  const submitManager = useSubmitManagerReview();
  const finalize = useFinalizeReview();

  const [selfRating, setSelfRating] = useState(review.self_rating || 0);
  const [selfAchievements, setSelfAchievements] = useState((review.self_achievements || []).join("\n"));
  const [selfChallenges, setSelfChallenges] = useState(review.self_challenges || "");
  const [selfComments, setSelfComments] = useState(review.self_comments || "");

  const [mgrRating, setMgrRating] = useState(review.manager_rating || 0);
  const [mgrStrengths, setMgrStrengths] = useState(review.manager_strengths || "");
  const [mgrAreas, setMgrAreas] = useState(review.manager_areas_improvement || "");
  const [mgrComments, setMgrComments] = useState(review.manager_comments || "");
  const [promoRec, setPromoRec] = useState(review.promotion_recommended || false);
  const [salaryRec, setSalaryRec] = useState(review.salary_adjustment_recommended || false);

  const [finalRating, setFinalRating] = useState(review.final_rating || 0);
  const [finalComments, setFinalComments] = useState(review.final_comments || "");

  const aiAnalysis = review.ai_analysis as any;

  return (
    <Card className="ml-6 mt-1">
      <CardContent className="py-4 space-y-6">
        {/* Self Assessment */}
        <div className="space-y-3">
          <h4 className="font-semibold flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-blue-500" />Auto-avaliação</h4>
          <div className="space-y-2">
            <Label>Rating</Label>
            <RatingStars value={selfRating} onChange={setSelfRating} readOnly={review.status !== "pending_self"} />
          </div>
          <div>
            <Label>Conquistas (uma por linha)</Label>
            <Textarea value={selfAchievements} onChange={(e) => setSelfAchievements(e.target.value)}
              disabled={review.status !== "pending_self"} rows={3} placeholder="Principais conquistas do período…" />
          </div>
          <div>
            <Label>Desafios</Label>
            <Textarea value={selfChallenges} onChange={(e) => setSelfChallenges(e.target.value)}
              disabled={review.status !== "pending_self"} rows={2} />
          </div>
          <div>
            <Label>Comentários</Label>
            <Textarea value={selfComments} onChange={(e) => setSelfComments(e.target.value)}
              disabled={review.status !== "pending_self"} rows={2} />
          </div>
          {review.status === "pending_self" && (
            <Button size="sm" onClick={() => submitSelf.mutate({
              reviewId,
              self_rating: selfRating,
              self_achievements: selfAchievements.split("\n").filter(Boolean),
              self_challenges: selfChallenges,
              self_comments: selfComments,
            })} disabled={submitSelf.isPending || selfRating === 0}>
              {submitSelf.isPending ? "A submeter…" : "Submeter Auto-avaliação"}
            </Button>
          )}
        </div>

        <Separator />

        {/* Manager Assessment */}
        <div className="space-y-3">
          <h4 className="font-semibold flex items-center gap-2"><Users className="h-4 w-4 text-amber-500" />Avaliação do Manager</h4>
          <div className="space-y-2">
            <Label>Rating</Label>
            <RatingStars value={mgrRating} onChange={setMgrRating} readOnly={review.status !== "pending_manager"} />
          </div>
          <div>
            <Label>Pontos Fortes</Label>
            <Textarea value={mgrStrengths} onChange={(e) => setMgrStrengths(e.target.value)}
              disabled={review.status !== "pending_manager"} rows={2} />
          </div>
          <div>
            <Label>Áreas de Melhoria</Label>
            <Textarea value={mgrAreas} onChange={(e) => setMgrAreas(e.target.value)}
              disabled={review.status !== "pending_manager"} rows={2} />
          </div>
          <div>
            <Label>Comentários</Label>
            <Textarea value={mgrComments} onChange={(e) => setMgrComments(e.target.value)}
              disabled={review.status !== "pending_manager"} rows={2} />
          </div>
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <Switch checked={promoRec} onCheckedChange={setPromoRec} disabled={review.status !== "pending_manager"} />
              <Label>Recomendar Promoção</Label>
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={salaryRec} onCheckedChange={setSalaryRec} disabled={review.status !== "pending_manager"} />
              <Label>Ajuste Salarial</Label>
            </div>
          </div>
          {review.status === "pending_manager" && (
            <Button size="sm" onClick={() => submitManager.mutate({
              reviewId,
              manager_rating: mgrRating,
              manager_strengths: mgrStrengths,
              manager_areas_improvement: mgrAreas,
              manager_comments: mgrComments,
              promotion_recommended: promoRec,
              salary_adjustment_recommended: salaryRec,
            })} disabled={submitManager.isPending || mgrRating === 0}>
              {submitManager.isPending ? "A submeter…" : "Submeter Avaliação Manager"}
            </Button>
          )}
        </div>

        <Separator />

        {/* AI Suggestion */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="font-semibold flex items-center gap-2"><Sparkles className="h-4 w-4 text-purple-500" />Sugestão IA</h4>
            <Button variant="outline" size="sm" onClick={() => suggestAI.mutate(reviewId)}
              disabled={suggestAI.isPending}>
              <Sparkles className="h-3.5 w-3.5 mr-1" />
              {suggestAI.isPending ? "A analisar…" : "Sugerir Rating IA"}
            </Button>
          </div>
          {aiAnalysis && (
            <div className="bg-muted/50 rounded-lg p-4 space-y-2 text-sm">
              <div className="flex items-center gap-3">
                <RatingStars value={aiAnalysis.suggested_rating || 0} readOnly />
                <Badge variant="secondary">{aiAnalysis.rating_label}</Badge>
                <span className="text-muted-foreground">Confiança: {Math.round((aiAnalysis.confidence || 0) * 100)}%</span>
              </div>
              <p className="text-muted-foreground">{aiAnalysis.summary}</p>
              {aiAnalysis.strengths?.length > 0 && (
                <div><span className="font-medium">Pontos fortes:</span> {aiAnalysis.strengths.join(", ")}</div>
              )}
              {aiAnalysis.areas_for_improvement?.length > 0 && (
                <div><span className="font-medium">Áreas de melhoria:</span> {aiAnalysis.areas_for_improvement.join(", ")}</div>
              )}
            </div>
          )}
        </div>

        <Separator />

        {/* Final Rating (calibration) */}
        {(review.status === "pending_calibration" || review.status === "completed") && (
          <div className="space-y-3">
            <h4 className="font-semibold flex items-center gap-2"><Award className="h-4 w-4 text-green-500" />Rating Final</h4>
            <RatingStars value={finalRating} onChange={setFinalRating} readOnly={review.status === "completed"} />
            <Textarea value={finalComments} onChange={(e) => setFinalComments(e.target.value)}
              disabled={review.status === "completed"} rows={2} placeholder="Comentários finais…" />
            {review.status === "pending_calibration" && (
              <Button size="sm" onClick={() => finalize.mutate({ reviewId, final_rating: finalRating, final_comments: finalComments })}
                disabled={finalize.isPending || finalRating === 0}>
                {finalize.isPending ? "A finalizar…" : "Finalizar Avaliação"}
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Competencies Tab ───────────────────────────────────────────────────────

function CompetenciesTab() {
  const { currentWorkspace } = useWorkspace();
  const wid = currentWorkspace?.id;
  const { data: competencies, isLoading } = useCompetencies(wid);
  const createComp = useCreateCompetency();
  const deleteComp = useDeleteCompetency();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [level, setLevel] = useState("");

  const handleCreate = () => {
    if (!wid || !name) return;
    createComp.mutate({ workspace_id: wid, name, description: description || undefined, category: category || undefined, level: level || undefined }, {
      onSuccess: () => { setDialogOpen(false); setName(""); setDescription(""); setCategory(""); setLevel(""); },
    });
  };

  if (isLoading) return <Skeleton className="h-40 w-full" />;

  const grouped = (competencies || []).reduce<Record<string, typeof competencies>>((acc, c) => {
    const cat = c.category || "Geral";
    if (!acc[cat]) acc[cat] = [];
    acc[cat]!.push(c);
    return acc;
  }, {});

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold">Framework de Competências</h2>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm"><Plus className="h-4 w-4 mr-1" />Nova Competência</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Nova Competência</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div><Label>Nome *</Label><Input value={name} onChange={(e) => setName(e.target.value)} /></div>
              <div><Label>Descrição</Label><Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} /></div>
              <div><Label>Categoria</Label><Input value={category} onChange={(e) => setCategory(e.target.value)} placeholder="Ex: Técnica, Liderança, Comunicação" /></div>
              <div><Label>Nível</Label><Input value={level} onChange={(e) => setLevel(e.target.value)} placeholder="Ex: Junior, Mid, Senior" /></div>
            </div>
            <DialogFooter>
              <Button onClick={handleCreate} disabled={!name || createComp.isPending}>
                {createComp.isPending ? "A criar…" : "Criar"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {Object.keys(grouped).length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <Award className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p>Nenhuma competência definida.</p>
          </CardContent>
        </Card>
      ) : (
        Object.entries(grouped).map(([cat, comps]) => (
          <Card key={cat}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground uppercase tracking-wide">{cat}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {comps!.map((comp) => (
                <div key={comp.id} className="flex items-center justify-between py-2 border-b last:border-0">
                  <div>
                    <p className="font-medium text-sm">{comp.name}</p>
                    {comp.description && <p className="text-xs text-muted-foreground">{comp.description}</p>}
                  </div>
                  <div className="flex items-center gap-2">
                    {comp.level && <Badge variant="outline">{comp.level}</Badge>}
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => deleteComp.mutate(comp.id)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
}

// ─── Calibration Tab ────────────────────────────────────────────────────────

function CalibrationTab() {
  const { currentWorkspace } = useWorkspace();
  const wid = currentWorkspace?.id;
  const { data: cycles } = useReviewCycles(wid);
  const [selectedCycleId, setSelectedCycleId] = useState<string>("");
  const { data: sessions, isLoading } = useCalibrationSessions(selectedCycleId || undefined);
  const createSession = useCreateCalibrationSession();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [sessionName, setSessionName] = useState("");
  const [sessionDate, setSessionDate] = useState("");

  const handleCreate = () => {
    if (!wid || !selectedCycleId || !sessionName) return;
    createSession.mutate({
      workspace_id: wid,
      review_cycle_id: selectedCycleId,
      name: sessionName,
      scheduled_date: sessionDate || new Date().toISOString(),
    }, { onSuccess: () => { setDialogOpen(false); setSessionName(""); setSessionDate(""); } });
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold">Sessões de Calibração</h2>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm" disabled={!selectedCycleId}><Plus className="h-4 w-4 mr-1" />Nova Sessão</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Nova Sessão de Calibração</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div><Label>Nome</Label><Input value={sessionName} onChange={(e) => setSessionName(e.target.value)} /></div>
              <div><Label>Data</Label><Input type="datetime-local" value={sessionDate} onChange={(e) => setSessionDate(e.target.value)} /></div>
            </div>
            <DialogFooter>
              <Button onClick={handleCreate} disabled={!sessionName || createSession.isPending}>
                {createSession.isPending ? "A criar…" : "Criar Sessão"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div>
        <Label>Ciclo</Label>
        <Select value={selectedCycleId} onValueChange={setSelectedCycleId}>
          <SelectTrigger><SelectValue placeholder="Selecione um ciclo" /></SelectTrigger>
          <SelectContent>
            {(cycles || []).map((c) => (
              <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {!selectedCycleId ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground">Selecione um ciclo para ver as sessões de calibração.</CardContent></Card>
      ) : isLoading ? (
        <Skeleton className="h-20 w-full" />
      ) : sessions && sessions.length > 0 ? (
        sessions.map((session) => (
          <Card key={session.id}>
            <CardContent className="py-4 flex items-center justify-between">
              <div>
                <p className="font-medium">{session.name}</p>
                <p className="text-sm text-muted-foreground">
                  <Calendar className="h-3.5 w-3.5 inline mr-1" />
                  {session.scheduled_date ? new Date(session.scheduled_date).toLocaleDateString("pt-PT") : "—"}
                </p>
              </div>
              <Badge variant={session.status === "completed" ? "default" : "secondary"}>
                {session.status === "scheduled" ? "Agendada" : session.status === "in_progress" ? "Em Curso" : "Concluída"}
              </Badge>
            </CardContent>
          </Card>
        ))
      ) : (
        <Card><CardContent className="py-12 text-center text-muted-foreground">Nenhuma sessão de calibração.</CardContent></Card>
      )}
    </div>
  );
}

// ─── Main Page ──────────────────────────────────────────────────────────────

export default function HRPerformanceReviewsPage() {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <HRBreadcrumb />
        <div>
          <h1 className="text-2xl font-bold">Avaliações de Desempenho</h1>
          <p className="text-muted-foreground">Ciclos de avaliação, competências e calibração</p>
        </div>

        <Tabs defaultValue="cycles">
          <TabsList>
            <TabsTrigger value="cycles"><Clock className="h-4 w-4 mr-1" />Ciclos</TabsTrigger>
            <TabsTrigger value="competencies"><Award className="h-4 w-4 mr-1" />Competências</TabsTrigger>
            <TabsTrigger value="calibration"><Users className="h-4 w-4 mr-1" />Calibração</TabsTrigger>
          </TabsList>
          <TabsContent value="cycles"><CyclesTab /></TabsContent>
          <TabsContent value="competencies"><CompetenciesTab /></TabsContent>
          <TabsContent value="calibration"><CalibrationTab /></TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
