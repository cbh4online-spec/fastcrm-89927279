import { useState } from "react";
import { Link } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Workflow, ChevronRight } from "lucide-react";
import { useWhatsAppSequences, useUpsertWhatsAppSequence } from "@/hooks/useWhatsAppSequences";

const TRIGGER_LABELS: Record<string, string> = {
  manual: "Manual",
  tag_added: "Tag adicionada",
  lead_created: "Lead criado",
  deal_stage_changed: "Mudança de etapa",
  optin: "Opt-in",
};

export default function WhatsAppSequencesPage() {
  const { data: sequences, isLoading } = useWhatsAppSequences();
  const upsert = useUpsertWhatsAppSequence();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", description: "", trigger_event: "manual" });

  const handleCreate = async () => {
    if (!form.name.trim()) return;
    await upsert.mutateAsync(form as any);
    setForm({ name: "", description: "", trigger_event: "manual" });
    setOpen(false);
  };

  return (
    <DashboardLayout>
      <div className="p-6 max-w-6xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2"><Workflow className="h-6 w-6" /> Sequências WhatsApp</h1>
            <p className="text-sm text-muted-foreground">Drips automáticos baseados em eventos do CRM.</p>
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button><Plus className="h-4 w-4 mr-1" /> Nova sequência</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Nova sequência</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <div>
                  <Label>Nome</Label>
                  <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Ex: Boas-vindas a novos leads" />
                </div>
                <div>
                  <Label>Descrição</Label>
                  <Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
                </div>
                <div>
                  <Label>Evento gatilho</Label>
                  <Select value={form.trigger_event} onValueChange={(v) => setForm({ ...form, trigger_event: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(TRIGGER_LABELS).map(([k, l]) => (
                        <SelectItem key={k} value={k}>{l}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
                <Button onClick={handleCreate} disabled={upsert.isPending}>Criar</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {isLoading ? (
          <p className="text-sm text-muted-foreground">A carregar...</p>
        ) : !sequences || sequences.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <Workflow className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-lg font-medium mb-2">Sem sequências ainda</p>
              <p className="text-sm text-muted-foreground mb-4">Cria a tua primeira sequência para automatizar drips de WhatsApp.</p>
              <Button onClick={() => setOpen(true)}><Plus className="h-4 w-4 mr-1" /> Nova sequência</Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-3">
            {sequences.map((s) => (
              <Link key={s.id} to={`/dashboard/whatsapp-pro/sequences/${s.id}`}>
                <Card className="hover:bg-muted/40 transition-colors">
                  <CardContent className="p-4 flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold">{s.name}</h3>
                        <Badge variant={s.is_enabled ? "default" : "secondary"}>{s.is_enabled ? "Activa" : "Inactiva"}</Badge>
                        <Badge variant="outline">{TRIGGER_LABELS[s.trigger_event] || s.trigger_event}</Badge>
                      </div>
                      {s.description && <p className="text-sm text-muted-foreground mt-1">{s.description}</p>}
                    </div>
                    <ChevronRight className="h-5 w-5 text-muted-foreground" />
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
