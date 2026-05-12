import { useState } from "react";
import { Loader2, Plus, Workflow } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { LeadChefMobileShell } from "@/components/leadchef/LeadChefMobileShell";
import {
  useLeadChefSequences,
  useToggleLeadChefSequence,
} from "@/hooks/leadchef/useLeadChefSequences";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";

export default function LeadChefSequenciasPage() {
  const { data: sequences, isLoading } = useLeadChefSequences();
  const toggle = useToggleLeadChefSequence();
  const { currentWorkspace } = useWorkspace();
  const { user } = useAuth();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [creating, setCreating] = useState(false);

  const createDefault = async () => {
    if (!currentWorkspace?.id || !name.trim()) return;
    setCreating(true);
    try {
      const { data: seq, error } = await (supabase as any)
        .from("leadchef_sequences")
        .insert({
          workspace_id: currentWorkspace.id,
          name: name.trim(),
          description: description.trim() || null,
          is_enabled: false,
          trigger_event: "manual",
          created_by: user?.id ?? null,
        })
        .select("id")
        .single();
      if (error) throw error;

      // Default 3 follow-ups in 7 days
      const steps = [
        { step_order: 1, delay_days: 0, action_type: "next_action", title: "Primeiro contacto", message_template: "Olá {nome}, obrigado pelo interesse. Quando podemos falar?" },
        { step_order: 2, delay_days: 3, action_type: "draft_message", title: "Segundo follow-up (dia 3)", message_template: "Olá {nome}, ainda interessado? Posso ajudar em algo?" },
        { step_order: 3, delay_days: 4, action_type: "alert", title: "Último follow-up (dia 7)", message_template: "Lead frio — última tentativa antes de marcar como perdido." },
      ];
      await (supabase as any).from("leadchef_sequence_steps").insert(
        steps.map((s) => ({ ...s, sequence_id: seq.id }))
      );

      toast.success("Sequência criada.");
      qc.invalidateQueries({ queryKey: ["leadchef-sequences"] });
      setOpen(false);
      setName("");
      setDescription("");
    } catch (e: any) {
      toast.error(e?.message || "Falha ao criar sequência.");
    } finally {
      setCreating(false);
    }
  };

  return (
    <LeadChefMobileShell
      title="Sequências"
      subtitle="Follow-ups multi-passo. Pausam automaticamente se a referência responder."
    >
      <div className="flex justify-end">
        <Button size="sm" onClick={() => setOpen(true)} className="bg-emerald-600 hover:bg-emerald-700">
          <Plus className="h-4 w-4 mr-1" /> Nova sequência
        </Button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-emerald-600" />
        </div>
      ) : !sequences || sequences.length === 0 ? (
        <div className="rounded-2xl bg-white border border-dashed border-slate-300 p-8 text-center">
          <div className="mx-auto h-12 w-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-3">
            <Workflow className="h-6 w-6" />
          </div>
          <h3 className="text-sm font-semibold text-slate-900">Sem sequências</h3>
          <p className="text-xs text-slate-500 mt-1">
            Cria a tua primeira sequência de follow-up.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {sequences.map((s) => (
            <div key={s.id} className="rounded-2xl bg-white border border-slate-200 p-4 shadow-sm flex items-start gap-3">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-slate-900">{s.name}</p>
                {s.description && <p className="text-xs text-slate-600 mt-0.5">{s.description}</p>}
                <p className="text-[11px] text-slate-400 mt-2">Trigger: {s.trigger_event}</p>
              </div>
              <Switch
                checked={s.is_enabled}
                onCheckedChange={(checked) => toggle.mutate({ id: s.id, is_enabled: checked })}
                disabled={toggle.isPending}
              />
            </div>
          ))}
        </div>
      )}

      <p className="text-[11px] text-slate-500 text-center pt-4">
        As sequências criam alertas, próximas ações ou rascunhos. Não enviam mensagens automaticamente.
      </p>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nova sequência</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Input placeholder="Nome (ex: Pós-demo)" value={name} onChange={(e) => setName(e.target.value)} />
            <Textarea placeholder="Descrição (opcional)" value={description} onChange={(e) => setDescription(e.target.value)} />
            <p className="text-xs text-slate-500">
              Será criada com 3 passos predefinidos (dia 0, 3, 7). Podes editar via SQL ou UI dedicada.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={createDefault} disabled={creating || !name.trim()} className="bg-emerald-600 hover:bg-emerald-700">
              {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : "Criar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </LeadChefMobileShell>
  );
}
