import { useState } from "react";
import { useTicketSLARules } from "@/hooks/tickets/useTicketSLARules";
import { useTicketCannedResponses } from "@/hooks/tickets/useTicketCannedResponses";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Settings, Clock, Zap, Trash2, Plus } from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";

const PRIORITIES = [
  { key: "urgent", label: "Urgente" },
  { key: "high", label: "Alta" },
  { key: "medium", label: "Média" },
  { key: "low", label: "Baixa" },
];

export default function TicketsSettings() {
  const { rules, isLoading: slaLoading, upsert } = useTicketSLARules();
  const { responses, isLoading: cannedLoading, create, remove } = useTicketCannedResponses();
  const [showCannedDialog, setShowCannedDialog] = useState(false);
  const [newCanned, setNewCanned] = useState({ title: "", content: "", category: "" });

  const getRuleForPriority = (priority: string) =>
    rules.find((r) => r.priority === priority);

  const handleSLAUpdate = async (priority: string, field: string, value: number) => {
    try {
      const existing = getRuleForPriority(priority);
      await upsert.mutateAsync({
        ...(existing || {}),
        priority,
        first_response_hours: existing?.first_response_hours || 4,
        resolution_hours: existing?.resolution_hours || 24,
        [field]: value,
      });
      toast.success("Regra SLA atualizada");
    } catch {
      toast.error("Erro ao atualizar SLA");
    }
  };

  const handleCreateCanned = async () => {
    if (!newCanned.title.trim() || !newCanned.content.trim()) return;
    try {
      await create.mutateAsync(newCanned);
      toast.success("Resposta rápida criada");
      setShowCannedDialog(false);
      setNewCanned({ title: "", content: "", category: "" });
    } catch {
      toast.error("Erro ao criar resposta");
    }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-6 space-y-6 max-w-4xl">
      <div className="flex items-center gap-3">
        <Settings className="h-6 w-6 text-primary" />
        <div>
          <h1 className="text-2xl font-bold text-foreground">Configurações de Tickets</h1>
          <p className="text-sm text-muted-foreground">SLA e respostas rápidas</p>
        </div>
      </div>

      {/* SLA Rules */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Clock className="h-4 w-4" />
            Regras SLA por Prioridade
          </CardTitle>
        </CardHeader>
        <CardContent>
          {slaLoading ? (
            <div className="space-y-3">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-12" />)}</div>
          ) : (
            <div className="rounded-lg border overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-muted/50 border-b">
                    <th className="text-left p-3 font-medium text-muted-foreground">Prioridade</th>
                    <th className="text-left p-3 font-medium text-muted-foreground">1ª Resposta (h)</th>
                    <th className="text-left p-3 font-medium text-muted-foreground">Resolução (h)</th>
                    <th className="text-left p-3 font-medium text-muted-foreground">Escalação (h)</th>
                  </tr>
                </thead>
                <tbody>
                  {PRIORITIES.map(({ key, label }) => {
                    const rule = getRuleForPriority(key);
                    return (
                      <tr key={key} className="border-b last:border-0">
                        <td className="p-3 font-medium text-foreground">{label}</td>
                        <td className="p-3">
                          <Input
                            type="number"
                            className="w-20 h-8"
                            defaultValue={rule?.first_response_hours || ""}
                            placeholder="—"
                            onBlur={(e) => e.target.value && handleSLAUpdate(key, "first_response_hours", Number(e.target.value))}
                          />
                        </td>
                        <td className="p-3">
                          <Input
                            type="number"
                            className="w-20 h-8"
                            defaultValue={rule?.resolution_hours || ""}
                            placeholder="—"
                            onBlur={(e) => e.target.value && handleSLAUpdate(key, "resolution_hours", Number(e.target.value))}
                          />
                        </td>
                        <td className="p-3">
                          <Input
                            type="number"
                            className="w-20 h-8"
                            defaultValue={rule?.escalation_after_hours || ""}
                            placeholder="—"
                            onBlur={(e) => e.target.value && handleSLAUpdate(key, "escalation_after_hours", Number(e.target.value))}
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Canned Responses */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <Zap className="h-4 w-4" />
            Respostas Rápidas
          </CardTitle>
          <Button size="sm" onClick={() => setShowCannedDialog(true)}>
            <Plus className="h-3.5 w-3.5 mr-1" />
            Nova Resposta
          </Button>
        </CardHeader>
        <CardContent>
          {cannedLoading ? (
            <div className="space-y-2">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-16" />)}</div>
          ) : responses.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">Nenhuma resposta rápida configurada</p>
          ) : (
            <div className="space-y-2">
              {responses.map((r) => (
                <div key={r.id} className="flex items-start justify-between p-3 rounded-lg border bg-card hover:bg-muted/30 transition-colors">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground">{r.title}</p>
                    <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{r.content}</p>
                    <span className="text-[10px] text-muted-foreground mt-1 block">Usado {r.usage_count}x</span>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive hover:text-destructive"
                    onClick={() => {
                      remove.mutate(r.id);
                      toast.success("Resposta removida");
                    }}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create Canned Dialog */}
      <Dialog open={showCannedDialog} onOpenChange={setShowCannedDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>Nova Resposta Rápida</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Título *</Label>
              <Input value={newCanned.title} onChange={(e) => setNewCanned((c) => ({ ...c, title: e.target.value }))} placeholder="Ex: Boas-vindas" />
            </div>
            <div>
              <Label>Conteúdo *</Label>
              <Textarea value={newCanned.content} onChange={(e) => setNewCanned((c) => ({ ...c, content: e.target.value }))} rows={4} placeholder="Escreva o template da resposta..." />
            </div>
            <div>
              <Label>Categoria</Label>
              <Input value={newCanned.category} onChange={(e) => setNewCanned((c) => ({ ...c, category: e.target.value }))} placeholder="Ex: Geral" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCannedDialog(false)}>Cancelar</Button>
            <Button onClick={handleCreateCanned} disabled={create.isPending}>Criar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}
