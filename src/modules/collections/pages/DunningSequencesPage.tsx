import { useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { IXCard } from "@/components/entity/ix/IXCard";
import { Plus, Trash2, Play, Pencil, MoreHorizontal } from "lucide-react";
import {
  useDunningSequences,
  useCreateSequence,
  useUpdateSequence,
  useDeleteSequence,
  useUpsertStep,
  useDeleteStep,
  useRunAutoExecutor,
  type SequenceWithSteps,
  type DunningStep,
} from "../hooks/useDunningSequences";

const channels: DunningStep["channel"][] = ["email", "whatsapp", "sms", "phone", "portal", "system"];
const actionTypes: DunningStep["action_type"][] = [
  "email_sent", "whatsapp_sent", "sms_sent", "call_logged", "note", "escalation",
];

export default function DunningSequencesPage() {
  const { data: sequences = [], isLoading } = useDunningSequences();
  const createSeq = useCreateSequence();
  const updateSeq = useUpdateSequence();
  const deleteSeq = useDeleteSequence();
  const runExecutor = useRunAutoExecutor();

  const [newOpen, setNewOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [editingSeq, setEditingSeq] = useState<SequenceWithSteps | null>(null);

  return (
    <DashboardLayout>
      <div className="space-y-6 p-4 md:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Sequências de cobrança</h1>
            <p className="text-sm text-muted-foreground">Define os passos automáticos de dunning aplicados aos casos.</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => runExecutor.mutate()} disabled={runExecutor.isPending}>
              <Play className="h-4 w-4 mr-1" /> Executar agora
            </Button>
            <Button onClick={() => setNewOpen(true)}>
              <Plus className="h-4 w-4 mr-1" /> Nova sequência
            </Button>
          </div>
        </div>

        {isLoading ? (
          <p className="text-sm text-muted-foreground">A carregar…</p>
        ) : sequences.length === 0 ? (
          <Card>
            <CardContent className="p-10 text-center text-sm text-muted-foreground">
              Ainda não existem sequências. Cria a primeira para automatizar cobranças.
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {sequences.map((seq) => (
              <Card key={seq.id}>
                <CardHeader className="flex flex-row items-start justify-between space-y-0">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <CardTitle className="text-base">{seq.name}</CardTitle>
                      {seq.is_default && <Badge variant="secondary">Padrão</Badge>}
                      {!seq.is_active && <Badge variant="outline">Inativa</Badge>}
                    </div>
                    {seq.description && (
                      <p className="text-xs text-muted-foreground">{seq.description}</p>
                    )}
                  </div>
                  <div className="flex gap-1">
                    <Button size="sm" variant="ghost" onClick={() => setEditingSeq(seq)}>
                      <Pencil className="h-4 w-4 mr-1" /> Passos
                    </Button>
                    <Button size="sm" variant="ghost"
                      onClick={() => updateSeq.mutate({ id: seq.id, patch: { is_active: !seq.is_active } })}>
                      {seq.is_active ? "Desativar" : "Ativar"}
                    </Button>
                    <Button size="sm" variant="ghost"
                      onClick={() => { if (confirm("Remover sequência?")) deleteSeq.mutate(seq.id); }}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {seq.steps.length === 0 ? (
                    <p className="text-xs text-muted-foreground">Sem passos definidos.</p>
                  ) : (
                    <div className="space-y-1 text-sm">
                      {seq.steps.map((s) => (
                        <div key={s.id} className="flex items-center gap-3 rounded-md border p-2">
                          <span className="font-mono text-xs text-muted-foreground">#{s.step_order}</span>
                          <span className="font-medium">D+{s.days_after_due}</span>
                          <Badge variant="outline">{s.channel}</Badge>
                          <span className="flex-1 truncate text-muted-foreground">
                            {s.template_subject || "(sem assunto)"}
                          </span>
                          {!s.is_active && <Badge variant="outline">off</Badge>}
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* New sequence */}
      <Dialog open={newOpen} onOpenChange={setNewOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Nova sequência</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <div>
              <Label>Nome</Label>
              <Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Ex: Standard B2B" />
            </div>
            <div>
              <Label>Descrição</Label>
              <Textarea rows={2} value={newDescription} onChange={(e) => setNewDescription(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setNewOpen(false)}>Cancelar</Button>
            <Button
              disabled={!newName || createSeq.isPending}
              onClick={() => createSeq.mutate(
                { name: newName, description: newDescription || undefined },
                { onSuccess: () => { setNewOpen(false); setNewName(""); setNewDescription(""); } },
              )}
            >Criar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {editingSeq && (
        <StepsEditorDialog sequence={editingSeq} onClose={() => setEditingSeq(null)} />
      )}
    </DashboardLayout>
  );
}

function StepsEditorDialog({ sequence, onClose }: { sequence: SequenceWithSteps; onClose: () => void }) {
  const upsert = useUpsertStep();
  const del = useDeleteStep();
  const nextOrder = (sequence.steps.at(-1)?.step_order ?? 0) + 1;

  const [order, setOrder] = useState<number>(nextOrder);
  const [days, setDays] = useState<number>(7);
  const [channel, setChannel] = useState<DunningStep["channel"]>("email");
  const [actionType, setActionType] = useState<DunningStep["action_type"]>("email_sent");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");

  const add = () => {
    upsert.mutate({
      sequence_id: sequence.id,
      step_order: order,
      days_after_due: days,
      channel,
      action_type: actionType,
      template_subject: subject || null,
      template_body: body || null,
    }, {
      onSuccess: () => {
        setOrder((o) => o + 1);
        setSubject(""); setBody("");
      },
    });
  };

  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader><DialogTitle>Passos · {sequence.name}</DialogTitle></DialogHeader>

        <div className="space-y-3 py-2">
          {sequence.steps.length === 0 ? (
            <p className="text-xs text-muted-foreground">Sem passos. Adiciona o primeiro abaixo.</p>
          ) : (
            <div className="space-y-1">
              {sequence.steps.map((s) => (
                <div key={s.id} className="flex items-center gap-2 rounded-md border p-2 text-sm">
                  <span className="font-mono text-xs">#{s.step_order}</span>
                  <span className="font-medium">D+{s.days_after_due}</span>
                  <Badge variant="outline">{s.channel}</Badge>
                  <span className="flex-1 truncate text-muted-foreground">{s.template_subject || "—"}</span>
                  <Button size="icon" variant="ghost" className="h-7 w-7"
                    onClick={() => { if (confirm("Remover passo?")) del.mutate(s.id); }}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ))}
            </div>
          )}

          <div className="rounded-md border p-3 space-y-2">
            <div className="text-xs font-medium uppercase text-muted-foreground">Adicionar passo</div>
            <div className="grid grid-cols-4 gap-2">
              <div>
                <Label className="text-xs">Ordem</Label>
                <Input type="number" min={1} value={order} onChange={(e) => setOrder(Number(e.target.value))} />
              </div>
              <div>
                <Label className="text-xs">D+ dias</Label>
                <Input type="number" min={0} value={days} onChange={(e) => setDays(Number(e.target.value))} />
              </div>
              <div>
                <Label className="text-xs">Canal</Label>
                <Select value={channel} onValueChange={(v) => setChannel(v as DunningStep["channel"])}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {channels.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Tipo de ação</Label>
                <Select value={actionType} onValueChange={(v) => setActionType(v as DunningStep["action_type"])}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {actionTypes.map((a) => <SelectItem key={a} value={a}>{a}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label className="text-xs">Assunto (template)</Label>
              <Input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Ex: Lembrete: fatura {{invoice_number}}" />
            </div>
            <div>
              <Label className="text-xs">Mensagem (template)</Label>
              <Textarea rows={4} value={body} onChange={(e) => setBody(e.target.value)}
                placeholder="Olá {{debtor_name}}, a fatura {{invoice_number}} encontra-se em atraso há {{days_overdue}} dias…" />
            </div>
            <div className="flex justify-end">
              <Button size="sm" onClick={add} disabled={upsert.isPending}>
                <Plus className="h-4 w-4 mr-1" /> Adicionar
              </Button>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>Fechar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
