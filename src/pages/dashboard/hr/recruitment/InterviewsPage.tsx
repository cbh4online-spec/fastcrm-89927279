import { useInterviews, useCreateInterview } from "@/hooks/hr/useInterviews";
import { useApplications } from "@/hooks/hr/useApplications";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Calendar, Video, MapPin, Phone, Clock } from "lucide-react";
import { format } from "date-fns";
import { pt } from "date-fns/locale";
import { toast } from "sonner";

const TYPE_ICONS: Record<string, any> = { remote: Video, in_person: MapPin, phone: Phone };
const TYPE_LABELS: Record<string, string> = { remote: "Remota", in_person: "Presencial", phone: "Telefone" };
const STATUS_LABELS: Record<string, string> = { scheduled: "Agendada", completed: "Concluída", cancelled: "Cancelada" };

export default function InterviewsPage() {
  const { data: interviews, isLoading } = useInterviews();
  const { data: applications } = useApplications();
  const createInterview = useCreateInterview();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({
    application_id: "",
    interview_type: "remote" as const,
    scheduled_at: "",
    duration_minutes: 60,
    location: "",
    meeting_url: "",
    notes: "",
  });

  const handleCreate = async () => {
    if (!form.application_id || !form.scheduled_at) { toast.error("Candidatura e data são obrigatórias"); return; }
    await createInterview.mutateAsync(form);
    setDialogOpen(false);
    setForm({ application_id: "", interview_type: "remote", scheduled_at: "", duration_minutes: 60, location: "", meeting_url: "", notes: "" });
  };

  const upcomingInterviews = interviews?.filter(i => i.status === "scheduled" && new Date(i.scheduled_at) >= new Date()) || [];
  const pastInterviews = interviews?.filter(i => i.status !== "scheduled" || new Date(i.scheduled_at) < new Date()) || [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Entrevistas</h1>
          <p className="text-muted-foreground">Agenda de entrevistas de recrutamento</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 mr-2" /> Agendar Entrevista</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Agendar Entrevista</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Candidatura *</Label>
                <Select value={form.application_id} onValueChange={v => setForm(p => ({ ...p, application_id: v }))}>
                  <SelectTrigger><SelectValue placeholder="Selecionar candidatura" /></SelectTrigger>
                  <SelectContent>
                    {applications?.filter(a => !["hired", "rejected"].includes(a.stage)).map(a => (
                      <SelectItem key={a.id} value={a.id}>{a.candidate?.full_name} — {a.job_opening?.title}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Data e hora *</Label>
                  <Input type="datetime-local" value={form.scheduled_at} onChange={e => setForm(p => ({ ...p, scheduled_at: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label>Tipo</Label>
                  <Select value={form.interview_type} onValueChange={v => setForm(p => ({ ...p, interview_type: v as any }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="remote">Remota</SelectItem>
                      <SelectItem value="in_person">Presencial</SelectItem>
                      <SelectItem value="phone">Telefone</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Duração (min)</Label>
                  <Input type="number" value={form.duration_minutes} onChange={e => setForm(p => ({ ...p, duration_minutes: Number(e.target.value) }))} />
                </div>
                <div className="space-y-2">
                  <Label>{form.interview_type === "remote" ? "Link da reunião" : "Localização"}</Label>
                  <Input
                    value={form.interview_type === "remote" ? form.meeting_url : form.location}
                    onChange={e => setForm(p => ({
                      ...p,
                      ...(form.interview_type === "remote" ? { meeting_url: e.target.value } : { location: e.target.value }),
                    }))}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Notas</Label>
                <Textarea value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} rows={3} />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
                <Button onClick={handleCreate} disabled={createInterview.isPending}>Agendar</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="space-y-3">{[1, 2, 3].map(i => <Card key={i} className="animate-pulse h-24" />)}</div>
      ) : (
        <>
          {upcomingInterviews.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-lg font-semibold">Próximas</h2>
              {upcomingInterviews.map(interview => {
                const Icon = TYPE_ICONS[interview.interview_type] || Calendar;
                return (
                  <Card key={interview.id}>
                    <CardContent className="flex items-center justify-between p-4">
                      <div className="flex items-center gap-4">
                        <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                          <Icon className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <p className="font-medium">{interview.application?.candidate?.full_name || "Candidato"}</p>
                          <p className="text-sm text-muted-foreground">{interview.application?.job_opening?.title || "Vaga"}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-medium">{format(new Date(interview.scheduled_at), "d MMM yyyy, HH:mm", { locale: pt })}</p>
                        <div className="flex items-center gap-2 justify-end mt-1">
                          <Badge variant="outline">{TYPE_LABELS[interview.interview_type]}</Badge>
                          <span className="text-xs text-muted-foreground flex items-center gap-1"><Clock className="h-3 w-3" />{interview.duration_minutes}min</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
          {pastInterviews.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-lg font-semibold text-muted-foreground">Anteriores</h2>
              {pastInterviews.map(interview => {
                const Icon = TYPE_ICONS[interview.interview_type] || Calendar;
                return (
                  <Card key={interview.id} className="opacity-60">
                    <CardContent className="flex items-center justify-between p-4">
                      <div className="flex items-center gap-4">
                        <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
                          <Icon className="h-5 w-5 text-muted-foreground" />
                        </div>
                        <div>
                          <p className="font-medium">{interview.application?.candidate?.full_name || "Candidato"}</p>
                          <p className="text-sm text-muted-foreground">{interview.application?.job_opening?.title || "Vaga"}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm">{format(new Date(interview.scheduled_at), "d MMM yyyy, HH:mm", { locale: pt })}</p>
                        <Badge variant="secondary" className="mt-1">{STATUS_LABELS[interview.status] || interview.status}</Badge>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
          {!interviews?.length && (
            <Card className="p-12 text-center">
              <Calendar className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold">Sem entrevistas</h3>
              <p className="text-muted-foreground mt-1">Agende a primeira entrevista a partir do pipeline de candidatos.</p>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
