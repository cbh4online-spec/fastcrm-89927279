import { useState } from "react";
import {
  useLeadRoutingRules,
  useCreateRoutingRule,
  useUpdateRoutingRule,
  useDeleteRoutingRule,
} from "@/hooks/useLeadRoutingRules";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Plus, Trash2, Route, Zap } from "lucide-react";

const ACTION_TYPES = [
  { value: "assign_owner", label: "Atribuir a vendedor" },
  { value: "create_task", label: "Criar tarefa" },
  { value: "add_to_campaign", label: "Adicionar a campanha" },
  { value: "move_stage", label: "Mover etapa" },
  { value: "add_tag", label: "Adicionar tag" },
];

export function LeadRoutingConfig() {
  const { data: rules, isLoading } = useLeadRoutingRules();
  const createRule = useCreateRoutingRule();
  const updateRule = useUpdateRoutingRule();
  const deleteRule = useDeleteRoutingRule();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({
    name: "",
    score_min: 0,
    score_max: 100,
    action_type: "assign_owner",
    action_config: {} as Record<string, unknown>,
    priority: 0,
    is_active: true,
  });

  const handleCreate = () => {
    createRule.mutate(form, {
      onSuccess: () => {
        setDialogOpen(false);
        setForm({ name: "", score_min: 0, score_max: 100, action_type: "assign_owner", action_config: {}, priority: 0, is_active: true });
      },
    });
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Route className="h-5 w-5 text-primary" />
              Lead Routing Rules
            </CardTitle>
            <CardDescription className="mt-1">
              Defina regras automáticas para encaminhar leads com base no score.
            </CardDescription>
          </div>
          <Button size="sm" onClick={() => setDialogOpen(true)} className="gap-1.5">
            <Plus className="h-4 w-4" /> Nova Regra
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2].map((i) => (
              <div key={i} className="h-16 bg-muted/50 rounded animate-pulse" />
            ))}
          </div>
        ) : !rules || rules.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Zap className="h-8 w-8 mx-auto mb-2 opacity-30" />
            <p className="text-sm">Sem regras de routing configuradas.</p>
            <p className="text-xs mt-1">Crie regras para encaminhar leads automaticamente.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {rules.map((rule) => (
              <div
                key={rule.id}
                className="flex items-center justify-between p-3 rounded-lg border border-border bg-muted/20"
              >
                <div className="flex items-center gap-3">
                  <Switch
                    checked={rule.is_active}
                    onCheckedChange={(checked) =>
                      updateRule.mutate({ id: rule.id, is_active: checked })
                    }
                  />
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">{rule.name}</span>
                      <Badge variant="outline" className="text-[10px]">
                        Score {rule.score_min}–{rule.score_max}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {ACTION_TYPES.find((a) => a.value === rule.action_type)?.label || rule.action_type}
                    </p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-muted-foreground hover:text-destructive"
                  onClick={() => deleteRule.mutate(rule.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>

      {/* Create dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Nova Regra de Routing</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Nome da regra</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Ex: High-score → Sales"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Score mínimo</Label>
                <Input
                  type="number"
                  min={0}
                  max={100}
                  value={form.score_min}
                  onChange={(e) => setForm({ ...form, score_min: Number(e.target.value) })}
                />
              </div>
              <div>
                <Label>Score máximo</Label>
                <Input
                  type="number"
                  min={0}
                  max={100}
                  value={form.score_max}
                  onChange={(e) => setForm({ ...form, score_max: Number(e.target.value) })}
                />
              </div>
            </div>
            <div>
              <Label>Ação</Label>
              <Select
                value={form.action_type}
                onValueChange={(v) => setForm({ ...form, action_type: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ACTION_TYPES.map((a) => (
                    <SelectItem key={a.value} value={a.value}>
                      {a.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {form.action_type === "create_task" && (
              <div>
                <Label>Título da tarefa</Label>
                <Input
                  value={(form.action_config.title as string) || ""}
                  onChange={(e) =>
                    setForm({ ...form, action_config: { ...form.action_config, title: e.target.value } })
                  }
                  placeholder="Ex: Follow up com lead de alto score"
                />
              </div>
            )}
            {form.action_type === "add_tag" && (
              <div>
                <Label>Tag</Label>
                <Input
                  value={(form.action_config.tag as string) || ""}
                  onChange={(e) =>
                    setForm({ ...form, action_config: { ...form.action_config, tag: e.target.value } })
                  }
                  placeholder="Ex: marketing-qualified"
                />
              </div>
            )}
            <div>
              <Label>Prioridade</Label>
              <Input
                type="number"
                value={form.priority}
                onChange={(e) => setForm({ ...form, priority: Number(e.target.value) })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleCreate} disabled={!form.name || createRule.isPending}>
              Criar Regra
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
