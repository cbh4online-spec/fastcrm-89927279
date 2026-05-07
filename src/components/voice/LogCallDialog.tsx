/**
 * Log Call Dialog — registar manual + click-to-call (Fase 1P.3)
 */
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useLogVoiceCall, useClickToCall, useVoiceOutcomes, useVoiceProviders } from "@/hooks/useVoiceHub";
import { Phone, PhoneOutgoing } from "lucide-react";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  defaultContactId?: string;
  defaultToNumber?: string;
}

export function LogCallDialog({ open, onOpenChange, defaultContactId, defaultToNumber }: Props) {
  const log = useLogVoiceCall();
  const click = useClickToCall();
  const { data: outcomes } = useVoiceOutcomes();
  const { data: providers } = useVoiceProviders();

  const [mode, setMode] = useState<"manual" | "click">("manual");
  const [form, setForm] = useState({
    direction: "outbound" as "inbound" | "outbound" | "missed",
    from_number: "",
    to_number: defaultToNumber ?? "",
    duration_seconds: 0,
    outcome: "",
    notes: "",
    subject: "",
    provider_instance_id: "",
    record: false,
  });

  const reset = () => onOpenChange(false);

  const submit = async () => {
    if (mode === "click") {
      await click.mutateAsync({
        to_number: form.to_number,
        from_number: form.from_number || undefined,
        contact_id: defaultContactId,
        provider_instance_id: form.provider_instance_id || undefined,
        record: form.record,
      });
    } else {
      await log.mutateAsync({
        direction: form.direction,
        from_number: form.from_number || undefined,
        to_number: form.to_number || undefined,
        contact_id: defaultContactId,
        duration_seconds: form.duration_seconds || undefined,
        outcome: form.outcome || undefined,
        notes: form.notes || undefined,
        subject: form.subject || undefined,
        provider_instance_id: form.provider_instance_id || undefined,
      });
    }
    reset();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>VoiceHub — Chamada</DialogTitle>
        </DialogHeader>

        <Tabs value={mode} onValueChange={(v) => setMode(v as "manual" | "click")}>
          <TabsList className="grid grid-cols-2">
            <TabsTrigger value="click"><PhoneOutgoing className="h-4 w-4 mr-2" />Click-to-Call</TabsTrigger>
            <TabsTrigger value="manual"><Phone className="h-4 w-4 mr-2" />Registar manual</TabsTrigger>
          </TabsList>

          <div className="grid grid-cols-2 gap-4 mt-4">
            <div className="col-span-2 space-y-2">
              <Label>Para</Label>
              <Input value={form.to_number} onChange={(e) => setForm({ ...form, to_number: e.target.value })} placeholder="+351 91 000 0000" />
            </div>
            <div className="col-span-2 space-y-2">
              <Label>De</Label>
              <Input value={form.from_number} onChange={(e) => setForm({ ...form, from_number: e.target.value })} placeholder="número VoiceHub" />
            </div>
            <div className="col-span-2 space-y-2">
              <Label>Provider</Label>
              <Select value={form.provider_instance_id || "auto"} onValueChange={(v) => setForm({ ...form, provider_instance_id: v === "auto" ? "" : v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="auto">Automático</SelectItem>
                  {(providers ?? []).map((p) => (
                    <SelectItem key={p.id} value={p.id}>{p.display_name || p.provider_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <TabsContent value="manual" className="col-span-2 space-y-4 m-0">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Sentido</Label>
                  <Select value={form.direction} onValueChange={(v) => setForm({ ...form, direction: v as never })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="outbound">Saída</SelectItem>
                      <SelectItem value="inbound">Entrada</SelectItem>
                      <SelectItem value="missed">Perdida</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Duração (s)</Label>
                  <Input type="number" min={0} value={form.duration_seconds}
                    onChange={(e) => setForm({ ...form, duration_seconds: Number(e.target.value) })} />
                </div>
                <div className="col-span-2 space-y-2">
                  <Label>Resultado</Label>
                  <Select value={form.outcome || "none"} onValueChange={(v) => setForm({ ...form, outcome: v === "none" ? "" : v })}>
                    <SelectTrigger><SelectValue placeholder="Selecionar" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">—</SelectItem>
                      {(outcomes ?? []).map((o) => (
                        <SelectItem key={o.id} value={o.slug}>{o.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="col-span-2 space-y-2">
                  <Label>Assunto</Label>
                  <Input value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} />
                </div>
                <div className="col-span-2 space-y-2">
                  <Label>Notas</Label>
                  <Textarea rows={3} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
                </div>
              </div>
            </TabsContent>

            <TabsContent value="click" className="col-span-2 m-0">
              <div className="flex items-center justify-between">
                <Label>Gravar chamada</Label>
                <input type="checkbox" checked={form.record} onChange={(e) => setForm({ ...form, record: e.target.checked })} />
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Em modo demonstração a chamada é simulada com duração aleatória.
              </p>
            </TabsContent>
          </div>
        </Tabs>

        <DialogFooter>
          <Button variant="ghost" onClick={reset}>Cancelar</Button>
          <Button onClick={submit} disabled={log.isPending || click.isPending || !form.to_number}>
            {mode === "click" ? "Iniciar chamada" : "Registar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
