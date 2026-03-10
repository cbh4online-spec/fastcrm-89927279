import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Plus, CheckCircle, Clock, Circle, Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useVisionSprints, useCreateSprint, useUpdateSprint } from "@/hooks/useVision";

interface Props {
  visionId: string;
}

const statusConfig: Record<string, { label: string; icon: any; color: string }> = {
  completed: { label: "Concluído", icon: CheckCircle, color: "text-green-500" },
  active: { label: "Em Curso", icon: Clock, color: "text-amber-500" },
  planned: { label: "Planeado", icon: Circle, color: "text-muted-foreground" },
};

export function VisionSprintTimeline({ visionId }: Props) {
  const { data: sprints = [], isLoading } = useVisionSprints(visionId);
  const createSprint = useCreateSprint();
  const updateSprint = useUpdateSprint();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [goal, setGoal] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const handleCreate = () => {
    if (!title.trim() || !startDate || !endDate) return;
    createSprint.mutate({ vision_id: visionId, title, goal, start_date: startDate, end_date: endDate }, {
      onSuccess: () => { setOpen(false); setTitle(""); setGoal(""); setStartDate(""); setEndDate(""); },
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-foreground">Sprints Quinzenais</h2>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-2"><Plus className="h-4 w-4" />Novo Sprint</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Novo Sprint</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2"><Label className="text-xs">Título *</Label><Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Sprint X — Tema" className="bg-background" /></div>
              <div className="space-y-2"><Label className="text-xs">Objetivo</Label><Textarea value={goal} onChange={(e) => setGoal(e.target.value)} placeholder="Objetivo do sprint..." className="bg-background" /></div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2"><Label className="text-xs">Início *</Label><Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="bg-background" /></div>
                <div className="space-y-2"><Label className="text-xs">Fim *</Label><Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="bg-background" /></div>
              </div>
              <Button onClick={handleCreate} disabled={!title.trim() || !startDate || !endDate || createSprint.isPending} className="w-full gap-2">
                {createSprint.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}Criar Sprint
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="text-center py-12 text-muted-foreground">A carregar...</div>
      ) : sprints.length === 0 ? (
        <Card className="border-dashed border-border/50"><CardContent className="p-8 text-center"><p className="text-sm text-muted-foreground">Ainda sem sprints. Cria o primeiro!</p></CardContent></Card>
      ) : (
        <div className="space-y-4">
          {sprints.map((sprint) => {
            const cfg = statusConfig[sprint.status] || statusConfig.planned;
            const Icon = cfg.icon;
            const m = (sprint.metrics as any) || { tasks_done: 0, tasks_total: 0, leads_generated: 0 };
            const progress = m.tasks_total > 0 ? Math.round((m.tasks_done / m.tasks_total) * 100) : 0;

            return (
              <Card key={sprint.id} className={`border-border/50 ${sprint.status === "active" ? "ring-1 ring-amber-500/30" : ""}`}>
                <CardContent className="p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <Icon className={`h-5 w-5 ${cfg.color}`} />
                      <div>
                        <h3 className="text-sm font-semibold text-foreground">{sprint.title}</h3>
                        <p className="text-xs text-muted-foreground">{sprint.goal}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {sprint.status === "planned" && (
                        <Button variant="outline" size="sm" className="text-xs" onClick={() => updateSprint.mutate({ id: sprint.id, status: "active" })}>Iniciar</Button>
                      )}
                      {sprint.status === "active" && (
                        <Button variant="outline" size="sm" className="text-xs" onClick={() => updateSprint.mutate({ id: sprint.id, status: "completed", closed_at: new Date().toISOString() })}>Fechar</Button>
                      )}
                      <Badge variant={sprint.status === "active" ? "default" : "outline"} className="text-xs">{cfg.label}</Badge>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Progress value={progress} className="h-1.5" />
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>{sprint.start_date} → {sprint.end_date}</span>
                      <span>{m.tasks_done}/{m.tasks_total} tarefas</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
