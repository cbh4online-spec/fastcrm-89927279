import { useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { PageHeader } from "@/components/common/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { usePerformanceChallenges, useChallengeParticipants, useCreateChallenge } from "@/hooks/usePerformanceChallenges";
import { Zap, Plus, Clock, Users, Trophy } from "lucide-react";
import { toast } from "sonner";

const CHALLENGE_TYPES = [
  { value: "revenue_sprint", label: "Revenue Sprint" },
  { value: "meeting_sprint", label: "Meeting Sprint" },
  { value: "pipeline_builder", label: "Pipeline Builder" },
  { value: "deal_closer", label: "Deal Closer" },
];

export default function PerformanceChallengesPage() {
  const { data: challenges, isLoading } = usePerformanceChallenges();
  const [selectedChallenge, setSelectedChallenge] = useState<string | null>(null);
  const { data: participants } = useChallengeParticipants(selectedChallenge);
  const createChallenge = useCreateChallenge();
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({
    challenge_name: "",
    challenge_type: "revenue_sprint",
    description: "",
    metric_type: "revenue",
    start_date: new Date().toISOString().split("T")[0],
    end_date: "",
    target_value: 0,
  });

  const handleCreate = async () => {
    if (!form.challenge_name || !form.end_date) {
      toast.error("Preenche nome e data fim");
      return;
    }
    await createChallenge.mutateAsync(form as any);
    toast.success("Desafio criado!");
    setShowCreate(false);
    setForm({ challenge_name: "", challenge_type: "revenue_sprint", description: "", metric_type: "revenue", start_date: new Date().toISOString().split("T")[0], end_date: "", target_value: 0 });
  };

  const activeChallenges = challenges?.filter(c => c.status === "active") || [];
  const pastChallenges = challenges?.filter(c => c.status !== "active") || [];

  return (
    <DashboardLayout>
      <div className="max-w-5xl mx-auto px-4 py-6 space-y-6">
        <div className="flex items-center justify-between">
          <PageHeader title="Desafios de Vendas" description="Competições para impulsionar resultados" />
          <Dialog open={showCreate} onOpenChange={setShowCreate}>
            <DialogTrigger asChild>
              <Button><Plus className="h-4 w-4 mr-2" /> Novo Desafio</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Criar Desafio</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>Nome</Label>
                  <Input value={form.challenge_name} onChange={e => setForm(f => ({ ...f, challenge_name: e.target.value }))} placeholder="ex: Closing Sprint Q1" />
                </div>
                <div>
                  <Label>Tipo</Label>
                  <Select value={form.challenge_type} onValueChange={v => setForm(f => ({ ...f, challenge_type: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {CHALLENGE_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Descrição</Label>
                  <Textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Data Início</Label>
                    <Input type="date" value={form.start_date} onChange={e => setForm(f => ({ ...f, start_date: e.target.value }))} />
                  </div>
                  <div>
                    <Label>Data Fim</Label>
                    <Input type="date" value={form.end_date} onChange={e => setForm(f => ({ ...f, end_date: e.target.value }))} />
                  </div>
                </div>
                <div>
                  <Label>Meta</Label>
                  <Input type="number" value={form.target_value} onChange={e => setForm(f => ({ ...f, target_value: Number(e.target.value) }))} />
                </div>
                <Button onClick={handleCreate} disabled={createChallenge.isPending} className="w-full">
                  Criar Desafio
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Active Challenges */}
        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Ativos</h3>
          {!activeChallenges.length ? (
            <Card><CardContent className="py-8 text-center text-muted-foreground text-sm">Nenhum desafio ativo</CardContent></Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {activeChallenges.map(ch => {
                const daysLeft = Math.max(0, Math.ceil((new Date(ch.end_date).getTime() - Date.now()) / 86400000));
                const totalDays = Math.ceil((new Date(ch.end_date).getTime() - new Date(ch.start_date).getTime()) / 86400000);
                const progress = Math.round(((totalDays - daysLeft) / totalDays) * 100);
                return (
                  <Card key={ch.id} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setSelectedChallenge(ch.id)}>
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-base">{ch.challenge_name}</CardTitle>
                        <Badge className="bg-green-500/10 text-green-600 border-green-500/20">Ativo</Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <p className="text-sm text-muted-foreground">{ch.description}</p>
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {daysLeft} dias restantes</span>
                        <span className="flex items-center gap-1"><Trophy className="h-3 w-3" /> Meta: {ch.target_value}</span>
                      </div>
                      <Progress value={progress} className="h-2" />
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>

        {/* Challenge Detail */}
        {selectedChallenge && participants && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Participantes
              </CardTitle>
            </CardHeader>
            <CardContent>
              {!participants.length ? (
                <p className="text-sm text-muted-foreground text-center py-4">Sem participantes</p>
              ) : (
                <div className="space-y-2">
                  {participants.map((p, idx) => (
                    <div key={p.id} className="flex items-center gap-3 p-3 rounded-lg bg-muted/30">
                      <span className="w-6 text-center font-bold text-sm">{idx + 1}</span>
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={p.avatar_url || undefined} />
                        <AvatarFallback>{p.user_name?.charAt(0)}</AvatarFallback>
                      </Avatar>
                      <span className="flex-1 text-sm font-medium">{p.user_name}</span>
                      <span className="text-sm font-bold">{p.current_value}</span>
                      <span className="text-xs text-muted-foreground">{p.points} pts</span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Past Challenges */}
        {pastChallenges.length > 0 && (
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Concluídos</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {pastChallenges.map(ch => (
                <Card key={ch.id} className="opacity-60">
                  <CardContent className="py-4">
                    <p className="text-sm font-medium">{ch.challenge_name}</p>
                    <p className="text-xs text-muted-foreground mt-1">{ch.start_date} — {ch.end_date}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
