import { useState } from "react";
import { Plus, Zap, Play, Pause, Trash2, Mail, MessageSquare, Bell, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter
} from "@/components/ui/dialog";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { toast } from "sonner";

interface Props {
  funnelId: string;
}

interface FunnelAutomation {
  id: string;
  name: string;
  trigger_type: string;
  action_type: string;
  channel: string;
  is_active: boolean;
  delay_minutes: number;
  conditions: Record<string, unknown> | null;
  created_at: string;
}

const TRIGGERS = [
  { value: "lead_submit", label: "Lead Submetido" },
  { value: "quiz_complete", label: "Quiz Completo" },
  { value: "page_view", label: "Page View" },
  { value: "purchase", label: "Compra" },
  { value: "no_purchase_24h", label: "Sem compra 24h" },
  { value: "no_purchase_48h", label: "Sem compra 48h" },
  { value: "cta_click", label: "CTA Clicado" },
  { value: "form_abandon", label: "Abandono de Formulário" },
];

const ACTIONS = [
  { value: "send_email", label: "Enviar Email", icon: Mail },
  { value: "send_whatsapp", label: "Enviar WhatsApp", icon: MessageSquare },
  { value: "notify_team", label: "Notificar Equipa", icon: Bell },
  { value: "add_tag", label: "Adicionar Tag" },
  { value: "move_stage", label: "Mover de Etapa" },
  { value: "create_task", label: "Criar Tarefa" },
];

const CHANNELS = [
  { value: "email", label: "Email" },
  { value: "whatsapp", label: "WhatsApp" },
  { value: "sms", label: "SMS" },
  { value: "notification", label: "Notificação" },
];

export function FunnelAutomationsTab({ funnelId }: Props) {
  const { currentWorkspace } = useWorkspace();
  const queryClient = useQueryClient();
  const [addOpen, setAddOpen] = useState(false);
  const [name, setName] = useState("");
  const [trigger, setTrigger] = useState("lead_submit");
  const [action, setAction] = useState("send_email");
  const [channel, setChannel] = useState("email");
  const [delayMinutes, setDelayMinutes] = useState("0");

  const { data: automations = [], isLoading } = useQuery({
    queryKey: ["funnel-automations", funnelId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("automation_rules")
        .select("*")
        .eq("workspace_id", currentWorkspace?.id)
        .eq("module", "funnels")
        .contains("metadata", { funnel_id: funnelId })
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []).map((r: Record<string, unknown>) => ({
        id: r.id as string,
        name: r.name as string,
        trigger_type: r.trigger_type as string,
        action_type: r.action_type as string,
        channel: (r.metadata as Record<string, unknown>)?.channel as string || "email",
        is_active: r.is_active as boolean,
        delay_minutes: (r.metadata as Record<string, unknown>)?.delay_minutes as number || 0,
        conditions: r.conditions as Record<string, unknown> | null,
        created_at: r.created_at as string,
      })) as FunnelAutomation[];
    },
    enabled: !!currentWorkspace?.id,
  });

  const createAutomation = useMutation({
    mutationFn: async () => {
      if (!currentWorkspace?.id) throw new Error("No workspace");
      const { error } = await supabase.from("automation_rules").insert({
        workspace_id: currentWorkspace.id,
        name: name || `${TRIGGERS.find((t) => t.value === trigger)?.label} → ${ACTIONS.find((a) => a.value === action)?.label}`,
        trigger_type: trigger,
        action_type: action,
        module: "funnels",
        is_active: true,
        metadata: {
          funnel_id: funnelId,
          channel,
          delay_minutes: parseInt(delayMinutes) || 0,
        },
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["funnel-automations", funnelId] });
      setAddOpen(false);
      setName("");
      setTrigger("lead_submit");
      setAction("send_email");
      setChannel("email");
      setDelayMinutes("0");
      toast.success("Automação criada");
    },
    onError: () => toast.error("Erro ao criar automação"),
  });

  const toggleActive = useMutation({
    mutationFn: async ({ id, active }: { id: string; active: boolean }) => {
      const { error } = await supabase
        .from("automation_rules")
        .update({ is_active: active })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["funnel-automations", funnelId] }),
  });

  const deleteAutomation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("automation_rules").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["funnel-automations", funnelId] });
      toast.success("Automação removida");
    },
  });

  const getChannelIcon = (ch: string) => {
    switch (ch) {
      case "email": return Mail;
      case "whatsapp": return MessageSquare;
      default: return Bell;
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold">Automações do Funil</h3>
          <p className="text-sm text-muted-foreground">
            Configura ações automáticas baseadas no comportamento dos visitantes
          </p>
        </div>
        <Button onClick={() => setAddOpen(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          Nova Automação
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2].map((i) => (
            <Card key={i} className="animate-pulse"><CardContent className="h-20" /></Card>
          ))}
        </div>
      ) : automations.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center gap-3">
            <Zap className="h-12 w-12 text-muted-foreground/50" />
            <div>
              <h4 className="font-medium">Sem automações</h4>
              <p className="text-sm text-muted-foreground">
                Cria automações para enviar emails, notificar a equipa ou mover leads automaticamente.
              </p>
            </div>
            <Button onClick={() => setAddOpen(true)} className="gap-2">
              <Plus className="h-4 w-4" />
              Criar Primeira Automação
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {automations.map((auto) => {
            const ChannelIcon = getChannelIcon(auto.channel);
            const triggerLabel = TRIGGERS.find((t) => t.value === auto.trigger_type)?.label || auto.trigger_type;
            const actionLabel = ACTIONS.find((a) => a.value === auto.action_type)?.label || auto.action_type;

            return (
              <Card key={auto.id} className={`border-border/50 transition-opacity ${!auto.is_active ? "opacity-50" : ""}`}>
                <CardContent className="flex items-center gap-4 py-4">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                    auto.is_active ? "bg-primary/10" : "bg-muted"
                  }`}>
                    <Zap className={`h-4 w-4 ${auto.is_active ? "text-primary" : "text-muted-foreground"}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{auto.name}</p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                      <Badge variant="outline" className="text-[10px]">{triggerLabel}</Badge>
                      <ArrowRight className="h-3 w-3" />
                      <Badge variant="secondary" className="text-[10px] gap-1">
                        <ChannelIcon className="h-3 w-3" />
                        {actionLabel}
                      </Badge>
                      {auto.delay_minutes > 0 && (
                        <span>delay {auto.delay_minutes}min</span>
                      )}
                    </div>
                  </div>
                  <Switch
                    checked={auto.is_active}
                    onCheckedChange={(checked) => toggleActive.mutate({ id: auto.id, active: checked })}
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => deleteAutomation.mutate(auto.id)}
                    className="text-destructive shrink-0"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nova Automação</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Nome (opcional)</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex: Email de boas-vindas" />
            </div>
            <div>
              <Label>Quando (Trigger)</Label>
              <Select value={trigger} onValueChange={setTrigger}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {TRIGGERS.map((t) => (
                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Ação</Label>
              <Select value={action} onValueChange={setAction}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ACTIONS.map((a) => (
                    <SelectItem key={a.value} value={a.value}>{a.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Canal</Label>
              <Select value={channel} onValueChange={setChannel}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CHANNELS.map((c) => (
                    <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Delay (minutos)</Label>
              <Input
                type="number"
                value={delayMinutes}
                onChange={(e) => setDelayMinutes(e.target.value)}
                placeholder="0 = imediato"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)}>Cancelar</Button>
            <Button onClick={() => createAutomation.mutate()} disabled={createAutomation.isPending}>
              Criar Automação
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
