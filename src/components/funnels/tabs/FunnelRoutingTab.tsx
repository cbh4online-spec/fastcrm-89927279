import { useState } from "react";
import { Plus, Trash2, GitBranch, Clock, Tag, Users, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { toast } from "sonner";

interface Props {
  funnelId: string;
}

interface RoutingRule {
  id: string;
  funnel_instance_id: string;
  trigger_event: string;
  pipeline_id: string | null;
  stage_id: string | null;
  owner_id: string | null;
  team_id: string | null;
  tags_json: string[] | null;
  sla_minutes: number | null;
  round_robin: boolean | null;
  priority: number | null;
  conditions_json: Record<string, unknown> | null;
}

const TRIGGER_EVENTS = [
  { value: "lead_submit", label: "Lead Submetido" },
  { value: "quiz_complete", label: "Quiz Completo" },
  { value: "purchase", label: "Compra Realizada" },
  { value: "page_view", label: "Page View" },
  { value: "cta_click", label: "CTA Clicado" },
  { value: "form_abandon", label: "Formulário Abandonado" },
];

export function FunnelRoutingTab({ funnelId }: Props) {
  const queryClient = useQueryClient();
  const [addOpen, setAddOpen] = useState(false);
  const [triggerEvent, setTriggerEvent] = useState("lead_submit");
  const [slaMinutes, setSlaMinutes] = useState("1440");
  const [roundRobin, setRoundRobin] = useState(false);
  const [tags, setTags] = useState("");

  const { data: rules = [], isLoading } = useQuery({
    queryKey: ["funnel-routing", funnelId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("funnel_routing_rules")
        .select("*")
        .eq("funnel_instance_id", funnelId)
        .order("priority", { ascending: true });
      if (error) throw error;
      return (data || []) as unknown as RoutingRule[];
    },
  });

  const createRule = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("funnel_routing_rules").insert({
        funnel_instance_id: funnelId,
        trigger_event: triggerEvent,
        sla_minutes: parseInt(slaMinutes) || 1440,
        round_robin: roundRobin,
        tags_json: tags ? tags.split(",").map((t) => t.trim()) : null,
        priority: (rules.length + 1) * 10,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["funnel-routing", funnelId] });
      setAddOpen(false);
      setTriggerEvent("lead_submit");
      setSlaMinutes("1440");
      setRoundRobin(false);
      setTags("");
      toast.success("Regra de routing criada");
    },
    onError: () => toast.error("Erro ao criar regra"),
  });

  const deleteRule = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("funnel_routing_rules").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["funnel-routing", funnelId] });
      toast.success("Regra removida");
    },
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold">Routing de Leads</h3>
          <p className="text-sm text-muted-foreground">
            Define para onde e como os leads são encaminhados quando interagem com o funil
          </p>
        </div>
        <Button onClick={() => setAddOpen(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          Nova Regra
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2].map((i) => (
            <Card key={i} className="animate-pulse"><CardContent className="h-20" /></Card>
          ))}
        </div>
      ) : rules.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center gap-3">
            <GitBranch className="h-12 w-12 text-muted-foreground/50" />
            <div>
              <h4 className="font-medium">Sem regras de routing</h4>
              <p className="text-sm text-muted-foreground">
                Adiciona regras para encaminhar leads automaticamente para pipelines, equipas ou owners.
              </p>
            </div>
            <Button onClick={() => setAddOpen(true)} className="gap-2">
              <Plus className="h-4 w-4" />
              Criar Primeira Regra
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {rules.map((rule, index) => {
            const trigger = TRIGGER_EVENTS.find((e) => e.value === rule.trigger_event);
            return (
              <Card key={rule.id} className="border-border/50">
                <CardContent className="flex items-center gap-4 py-4">
                  <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <GitBranch className="h-4 w-4 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant="outline" className="text-xs">{trigger?.label || rule.trigger_event}</Badge>
                      <ArrowRight className="h-3 w-3 text-muted-foreground" />
                      {rule.round_robin && (
                        <Badge variant="secondary" className="text-xs gap-1">
                          <Users className="h-3 w-3" />
                          Round Robin
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      {rule.sla_minutes && (
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          SLA: {rule.sla_minutes < 60 ? `${rule.sla_minutes}m` : `${Math.round(rule.sla_minutes / 60)}h`}
                        </span>
                      )}
                      {rule.tags_json && (rule.tags_json as string[]).length > 0 && (
                        <span className="flex items-center gap-1">
                          <Tag className="h-3 w-3" />
                          {(rule.tags_json as string[]).join(", ")}
                        </span>
                      )}
                      <span>Prioridade: {rule.priority}</span>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => deleteRule.mutate(rule.id)}
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
            <DialogTitle>Nova Regra de Routing</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Evento Trigger</Label>
              <Select value={triggerEvent} onValueChange={setTriggerEvent}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {TRIGGER_EVENTS.map((e) => (
                    <SelectItem key={e.value} value={e.value}>{e.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>SLA (minutos)</Label>
              <Input
                type="number"
                value={slaMinutes}
                onChange={(e) => setSlaMinutes(e.target.value)}
                placeholder="1440 (24h)"
              />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <Label>Round Robin</Label>
                <p className="text-xs text-muted-foreground">Distribuir leads entre a equipa</p>
              </div>
              <Switch checked={roundRobin} onCheckedChange={setRoundRobin} />
            </div>
            <div>
              <Label>Tags (separadas por vírgula)</Label>
              <Input
                value={tags}
                onChange={(e) => setTags(e.target.value)}
                placeholder="Ex: hot-lead, masterclass"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)}>Cancelar</Button>
            <Button onClick={() => createRule.mutate()} disabled={createRule.isPending}>
              Criar Regra
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
