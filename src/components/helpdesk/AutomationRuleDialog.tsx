import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useAgentMembers } from "@/hooks/useWorkspaceMembers";
import {
  type HelpdeskTrigger,
  type HelpdeskActionType,
  type HelpdeskAutomation,
  TRIGGER_LABELS,
  ACTION_LABELS,
} from "@/hooks/useHelpdeskAutomations";
import { Zap, Filter, Play, ChevronRight } from "lucide-react";

interface AutomationRuleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (rule: {
    name: string;
    trigger_event: HelpdeskTrigger;
    conditions: Record<string, unknown>;
    action_type: HelpdeskActionType;
    action_config: Record<string, unknown>;
    is_active: boolean;
  }) => void;
  editRule?: HelpdeskAutomation | null;
}

const PRIORITIES = [
  { value: "low", label: "Baixa" },
  { value: "medium", label: "Média" },
  { value: "high", label: "Alta" },
  { value: "urgent", label: "Urgente" },
];

const STATUSES = [
  { value: "open", label: "Aberto" },
  { value: "in_progress", label: "Em progresso" },
  { value: "waiting_client", label: "Aguarda cliente" },
  { value: "waiting_internal", label: "Aguarda interno" },
  { value: "resolved", label: "Resolvido" },
  { value: "closed", label: "Fechado" },
];

export function AutomationRuleDialog({ open, onOpenChange, onSave, editRule }: AutomationRuleDialogProps) {
  const { data: agents } = useAgentMembers();
  const [step, setStep] = useState(0);
  const [name, setName] = useState(editRule?.name || "");
  const [trigger, setTrigger] = useState<HelpdeskTrigger>(editRule?.trigger_event || "on_create");
  const [conditions, setConditions] = useState<Record<string, string>>(
    (editRule?.conditions as Record<string, string>) || {}
  );
  const [actionType, setActionType] = useState<HelpdeskActionType>(editRule?.action_type || "auto_assign_round_robin");
  const [actionConfig, setActionConfig] = useState<Record<string, string>>(
    (editRule?.action_config as Record<string, string>) || {}
  );

  const steps = [
    { label: "Trigger", icon: Zap },
    { label: "Condições", icon: Filter },
    { label: "Ação", icon: Play },
  ];

  const handleSave = () => {
    if (!name.trim()) return;
    onSave({
      name,
      trigger_event: trigger,
      conditions,
      action_type: actionType,
      action_config: actionConfig,
      is_active: true,
    });
    onOpenChange(false);
    resetForm();
  };

  const resetForm = () => {
    setStep(0);
    setName("");
    setTrigger("on_create");
    setConditions({});
    setActionType("auto_assign_round_robin");
    setActionConfig({});
  };

  const needsAgentSelect = actionType === "auto_assign_specific" || actionType === "escalate";
  const needsPrioritySelect = actionType === "change_priority";
  const needsStatusSelect = actionType === "change_status";
  const needsTagInput = actionType === "add_tag";

  return (
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) resetForm(); }}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{editRule ? "Editar Automação" : "Nova Automação"}</DialogTitle>
        </DialogHeader>

        {/* Step indicator */}
        <div className="flex items-center gap-2 mb-4">
          {steps.map((s, i) => (
            <div key={s.label} className="flex items-center gap-1">
              <button
                onClick={() => setStep(i)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                  step === i
                    ? "bg-primary text-primary-foreground"
                    : step > i
                    ? "bg-primary/20 text-primary"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                <s.icon className="h-3.5 w-3.5" />
                {s.label}
              </button>
              {i < steps.length - 1 && <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />}
            </div>
          ))}
        </div>

        <div className="space-y-4 min-h-[200px]">
          {/* Step 0: Trigger */}
          {step === 0 && (
            <>
              <div className="space-y-2">
                <Label>Nome da automação</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex: Auto-atribuir tickets urgentes" />
              </div>
              <div className="space-y-2">
                <Label>Quando disparar?</Label>
                <Select value={trigger} onValueChange={(v) => setTrigger(v as HelpdeskTrigger)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {(Object.entries(TRIGGER_LABELS) as [HelpdeskTrigger, string][]).map(([k, v]) => (
                      <SelectItem key={k} value={k}>{v}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </>
          )}

          {/* Step 1: Conditions */}
          {step === 1 && (
            <>
              <p className="text-sm text-muted-foreground">Filtre quando esta automação deve ser executada (opcional).</p>
              <div className="space-y-2">
                <Label>Prioridade</Label>
                <Select value={conditions.priority || ""} onValueChange={(v) => setConditions((c) => ({ ...c, priority: v }))}>
                  <SelectTrigger><SelectValue placeholder="Qualquer" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Qualquer</SelectItem>
                    {PRIORITIES.map((p) => (
                      <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Tipo</Label>
                <Select value={conditions.type || ""} onValueChange={(v) => setConditions((c) => ({ ...c, type: v }))}>
                  <SelectTrigger><SelectValue placeholder="Qualquer" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Qualquer</SelectItem>
                    <SelectItem value="support">Suporte</SelectItem>
                    <SelectItem value="commercial">Comercial</SelectItem>
                    <SelectItem value="technical">Técnico</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Canal</Label>
                <Select value={conditions.source || ""} onValueChange={(v) => setConditions((c) => ({ ...c, source: v }))}>
                  <SelectTrigger><SelectValue placeholder="Qualquer" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Qualquer</SelectItem>
                    <SelectItem value="portal">Portal</SelectItem>
                    <SelectItem value="email">Email</SelectItem>
                    <SelectItem value="whatsapp">WhatsApp</SelectItem>
                    <SelectItem value="manual">Manual</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </>
          )}

          {/* Step 2: Action */}
          {step === 2 && (
            <>
              <div className="space-y-2">
                <Label>O que fazer?</Label>
                <Select value={actionType} onValueChange={(v) => { setActionType(v as HelpdeskActionType); setActionConfig({}); }}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {(Object.entries(ACTION_LABELS) as [HelpdeskActionType, string][]).map(([k, v]) => (
                      <SelectItem key={k} value={k}>{v}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {needsAgentSelect && (
                <div className="space-y-2">
                  <Label>{actionType === "escalate" ? "Escalar para" : "Atribuir a"}</Label>
                  <Select value={actionConfig.agent_id || ""} onValueChange={(v) => setActionConfig((c) => ({ ...c, agent_id: v }))}>
                    <SelectTrigger><SelectValue placeholder="Selecionar agente..." /></SelectTrigger>
                    <SelectContent>
                      {agents?.map((a) => (
                        <SelectItem key={a.user_id} value={a.user_id}>
                          {a.profile?.full_name || a.profile?.email || "Agente"}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {needsPrioritySelect && (
                <div className="space-y-2">
                  <Label>Nova prioridade</Label>
                  <Select value={actionConfig.priority || ""} onValueChange={(v) => setActionConfig((c) => ({ ...c, priority: v }))}>
                    <SelectTrigger><SelectValue placeholder="Selecionar..." /></SelectTrigger>
                    <SelectContent>
                      {PRIORITIES.map((p) => (
                        <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {needsStatusSelect && (
                <div className="space-y-2">
                  <Label>Novo estado</Label>
                  <Select value={actionConfig.status || ""} onValueChange={(v) => setActionConfig((c) => ({ ...c, status: v }))}>
                    <SelectTrigger><SelectValue placeholder="Selecionar..." /></SelectTrigger>
                    <SelectContent>
                      {STATUSES.map((s) => (
                        <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {needsTagInput && (
                <div className="space-y-2">
                  <Label>Tag a adicionar</Label>
                  <Input value={actionConfig.tag || ""} onChange={(e) => setActionConfig((c) => ({ ...c, tag: e.target.value }))} placeholder="Ex: vip" />
                </div>
              )}

              {actionType === "send_notification" && (
                <div className="space-y-2">
                  <Label>Mensagem da notificação</Label>
                  <Input value={actionConfig.message || ""} onChange={(e) => setActionConfig((c) => ({ ...c, message: e.target.value }))} placeholder="Ex: Novo ticket urgente criado" />
                </div>
              )}

              {actionType === "auto_assign_round_robin" && (
                <div className="rounded-md border border-border bg-muted/50 p-3">
                  <p className="text-xs text-muted-foreground">
                    Os tickets serão distribuídos equitativamente entre os {agents?.length || 0} agentes ativos do workspace.
                  </p>
                </div>
              )}
            </>
          )}
        </div>

        <DialogFooter className="flex justify-between">
          <div className="flex gap-2">
            {step > 0 && (
              <Button variant="outline" size="sm" onClick={() => setStep((s) => s - 1)}>Anterior</Button>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => { onOpenChange(false); resetForm(); }}>Cancelar</Button>
            {step < 2 ? (
              <Button size="sm" onClick={() => setStep((s) => s + 1)} disabled={step === 0 && !name.trim()}>
                Seguinte
              </Button>
            ) : (
              <Button size="sm" onClick={handleSave} disabled={!name.trim()}>
                {editRule ? "Guardar" : "Criar Automação"}
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Pre-defined templates
export const AUTOMATION_TEMPLATES = [
  {
    name: "Auto-atribuir tickets urgentes ao gestor",
    trigger_event: "on_create" as HelpdeskTrigger,
    conditions: { priority: "urgent" },
    action_type: "auto_assign_specific" as HelpdeskActionType,
    action_config: {},
  },
  {
    name: "Escalar quando SLA em risco",
    trigger_event: "on_sla_warning" as HelpdeskTrigger,
    conditions: {},
    action_type: "escalate" as HelpdeskActionType,
    action_config: {},
  },
  {
    name: "Notificar equipa - ticket via WhatsApp",
    trigger_event: "on_create" as HelpdeskTrigger,
    conditions: { source: "whatsapp" },
    action_type: "send_notification" as HelpdeskActionType,
    action_config: { message: "Novo ticket recebido via WhatsApp" },
  },
  {
    name: "Round-robin para todos os tickets",
    trigger_event: "on_create" as HelpdeskTrigger,
    conditions: {},
    action_type: "auto_assign_round_robin" as HelpdeskActionType,
    action_config: {},
  },
  {
    name: "Fechar tickets resolvidos automaticamente",
    trigger_event: "on_status_change" as HelpdeskTrigger,
    conditions: {},
    action_type: "change_status" as HelpdeskActionType,
    action_config: { status: "closed" },
  },
];
