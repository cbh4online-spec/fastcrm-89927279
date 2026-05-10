import { useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, Plus, Trash2, Clock, Users, Activity } from "lucide-react";
import {
  useWhatsAppSequences,
  useWhatsAppSequenceSteps,
  useWhatsAppSequenceEnrollments,
  useUpsertWhatsAppSequence,
  useUpsertWhatsAppSequenceStep,
  useDeleteWhatsAppSequenceStep,
} from "@/hooks/useWhatsAppSequences";

export default function WhatsAppSequenceEditorPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: sequences } = useWhatsAppSequences();
  const sequence = sequences?.find((s) => s.id === id);
  const { data: steps } = useWhatsAppSequenceSteps(id);
  const { data: enrollments } = useWhatsAppSequenceEnrollments(id);
  const upsertSeq = useUpsertWhatsAppSequence();
  const upsertStep = useUpsertWhatsAppSequenceStep();
  const deleteStep = useDeleteWhatsAppSequenceStep();

  const [newStep, setNewStep] = useState({ delay_minutes: 60, message_body: "" });

  if (!sequence) {
    return (
      <DashboardLayout>
        <div className="p-6">A carregar...</div>
      </DashboardLayout>
    );
  }

  const stats = {
    active: enrollments?.filter((e) => e.status === "active").length ?? 0,
    completed: enrollments?.filter((e) => e.status === "completed").length ?? 0,
    optouts: enrollments?.filter((e) => e.status === "opted_out").length ?? 0,
  };

  return (
    <DashboardLayout>
      <div className="p-6 max-w-5xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard/whatsapp-pro/sequences")}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold">{sequence.name}</h1>
              <p className="text-sm text-muted-foreground">{sequence.description || "Sem descrição"}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Switch
              checked={sequence.is_enabled}
              onCheckedChange={(v) => upsertSeq.mutate({ id: sequence.id, is_enabled: v })}
            />
            <Label>{sequence.is_enabled ? "Activa" : "Inactiva"}</Label>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <Card><CardContent className="p-4"><div className="flex items-center gap-2"><Activity className="h-4 w-4 text-primary" /><div><p className="text-xs text-muted-foreground">Activos</p><p className="text-2xl font-bold">{stats.active}</p></div></div></CardContent></Card>
          <Card><CardContent className="p-4"><div className="flex items-center gap-2"><Users className="h-4 w-4 text-primary" /><div><p className="text-xs text-muted-foreground">Concluídos</p><p className="text-2xl font-bold">{stats.completed}</p></div></div></CardContent></Card>
          <Card><CardContent className="p-4"><div className="flex items-center gap-2"><Trash2 className="h-4 w-4 text-destructive" /><div><p className="text-xs text-muted-foreground">Opt-outs</p><p className="text-2xl font-bold">{stats.optouts}</p></div></div></CardContent></Card>
        </div>

        <Card>
          <CardHeader><CardTitle>Configuração</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Nome</Label>
                <Input defaultValue={sequence.name} onBlur={(e) => e.target.value !== sequence.name && upsertSeq.mutate({ id: sequence.id, name: e.target.value })} />
              </div>
              <div>
                <Label>Evento gatilho</Label>
                <Select value={sequence.trigger_event} onValueChange={(v) => upsertSeq.mutate({ id: sequence.id, trigger_event: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="manual">Manual</SelectItem>
                    <SelectItem value="tag_added">Tag adicionada</SelectItem>
                    <SelectItem value="lead_created">Lead criado</SelectItem>
                    <SelectItem value="deal_stage_changed">Mudança de etapa de negócio</SelectItem>
                    <SelectItem value="optin">Opt-in recebido</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Janela início (UTC)</Label>
                <Input type="time" defaultValue={sequence.send_window_start || "09:00"} onBlur={(e) => upsertSeq.mutate({ id: sequence.id, send_window_start: e.target.value })} />
              </div>
              <div>
                <Label>Janela fim (UTC)</Label>
                <Input type="time" defaultValue={sequence.send_window_end || "20:00"} onBlur={(e) => upsertSeq.mutate({ id: sequence.id, send_window_end: e.target.value })} />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={sequence.stop_on_reply} onCheckedChange={(v) => upsertSeq.mutate({ id: sequence.id, stop_on_reply: v })} />
              <Label>Parar quando o contacto responder</Label>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Passos da sequência ({steps?.length ?? 0})</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {steps?.map((s) => (
              <div key={s.id} className="border rounded-lg p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <Badge variant="outline">Passo {s.step_order}</Badge>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Clock className="h-3 w-3" /> {s.delay_minutes} min após anterior
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => deleteStep.mutate({ id: s.id, sequence_id: sequence.id })}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
                <Textarea
                  defaultValue={s.message_body}
                  onBlur={(e) => e.target.value !== s.message_body && upsertStep.mutate({ id: s.id, sequence_id: sequence.id, message_body: e.target.value })}
                  rows={3}
                />
              </div>
            ))}

            <Separator />

            <div className="space-y-2 border rounded-lg p-3 bg-muted/30">
              <p className="text-sm font-medium">Adicionar novo passo</p>
              <div className="grid grid-cols-4 gap-2">
                <div>
                  <Label className="text-xs">Atraso (min)</Label>
                  <Input type="number" value={newStep.delay_minutes} onChange={(e) => setNewStep({ ...newStep, delay_minutes: Number(e.target.value) })} />
                </div>
                <div className="col-span-3">
                  <Label className="text-xs">Mensagem (suporta {"{{name}}"})</Label>
                  <Textarea value={newStep.message_body} onChange={(e) => setNewStep({ ...newStep, message_body: e.target.value })} rows={2} />
                </div>
              </div>
              <Button
                size="sm"
                onClick={() => {
                  if (!newStep.message_body.trim()) return;
                  upsertStep.mutate({
                    sequence_id: sequence.id,
                    step_order: (steps?.length ?? 0) + 1,
                    delay_minutes: newStep.delay_minutes,
                    message_body: newStep.message_body,
                  });
                  setNewStep({ delay_minutes: 60, message_body: "" });
                }}
              >
                <Plus className="h-4 w-4 mr-1" /> Adicionar passo
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Inscrições recentes</CardTitle></CardHeader>
          <CardContent>
            {(!enrollments || enrollments.length === 0) ? (
              <p className="text-sm text-muted-foreground">Sem inscrições ainda.</p>
            ) : (
              <div className="space-y-2">
                {enrollments.slice(0, 30).map((e) => (
                  <div key={e.id} className="flex items-center justify-between text-sm border-b pb-2">
                    <span className="font-mono">{e.phone}</span>
                    <Badge variant={e.status === "active" ? "default" : "secondary"}>{e.status}</Badge>
                    <span className="text-xs text-muted-foreground">passo {e.current_step_order}</span>
                    <span className="text-xs text-muted-foreground">{new Date(e.next_run_at).toLocaleString("pt-PT")}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
