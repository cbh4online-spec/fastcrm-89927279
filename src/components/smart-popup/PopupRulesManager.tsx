import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Trash2, Zap, Eye } from "lucide-react";
import { toast } from "sonner";

interface PopupRule {
  id: string;
  name: string;
  trigger_type: string;
  trigger_value: any;
  popup_type: string;
  content: any;
  target_pages: string[];
  enabled: boolean;
  max_shows_per_session: number;
}

const TRIGGER_LABELS: Record<string, string> = {
  exit_intent: "Exit Intent",
  scroll_pct: "Scroll %",
  time_on_page: "Tempo na Página",
  inactivity: "Inatividade",
};

const POPUP_TYPE_LABELS: Record<string, string> = {
  cta: "CTA / Newsletter",
  discount: "Desconto",
  survey: "Survey / Pergunta",
  newsletter: "Newsletter",
};

export function PopupRulesManager() {
  const { currentWorkspace } = useWorkspace();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<PopupRule | null>(null);

  // Form state
  const [name, setName] = useState("");
  const [triggerType, setTriggerType] = useState("exit_intent");
  const [triggerValue, setTriggerValue] = useState<any>({});
  const [popupType, setPopupType] = useState("cta");
  const [content, setContent] = useState<any>({ title: "", description: "", cta_text: "" });
  const [targetPages, setTargetPages] = useState("*");
  const [maxShows, setMaxShows] = useState(1);

  const { data: rules = [], isLoading } = useQuery({
    queryKey: ["popup_rules", currentWorkspace?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("popup_rules")
        .select("*")
        .eq("workspace_id", currentWorkspace!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []) as PopupRule[];
    },
    enabled: !!currentWorkspace?.id,
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ id, enabled }: { id: string; enabled: boolean }) => {
      const { error } = await supabase
        .from("popup_rules")
        .update({ enabled })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["popup_rules"] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("popup_rules")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["popup_rules"] });
      toast.success("Regra eliminada");
    },
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        workspace_id: currentWorkspace!.id,
        name,
        trigger_type: triggerType,
        trigger_value: triggerValue,
        popup_type: popupType,
        content,
        target_pages: targetPages.split(",").map(s => s.trim()).filter(Boolean),
        max_shows_per_session: maxShows,
      };

      if (editingRule) {
        const { error } = await supabase
          .from("popup_rules")
          .update(payload)
          .eq("id", editingRule.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("popup_rules")
          .insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["popup_rules"] });
      toast.success(editingRule ? "Regra atualizada" : "Regra criada");
      resetForm();
      setDialogOpen(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const resetForm = () => {
    setEditingRule(null);
    setName("");
    setTriggerType("exit_intent");
    setTriggerValue({});
    setPopupType("cta");
    setContent({ title: "", description: "", cta_text: "" });
    setTargetPages("*");
    setMaxShows(1);
  };

  const openEdit = (rule: PopupRule) => {
    setEditingRule(rule);
    setName(rule.name);
    setTriggerType(rule.trigger_type);
    setTriggerValue(rule.trigger_value || {});
    setPopupType(rule.popup_type);
    setContent(rule.content || {});
    setTargetPages(rule.target_pages?.join(", ") || "*");
    setMaxShows(rule.max_shows_per_session);
    setDialogOpen(true);
  };

  return (
    <Card className="border-border/50">
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Zap className="h-4 w-4 text-amber-400" />
          Pop-ups Inteligentes
        </CardTitle>
        <Dialog open={dialogOpen} onOpenChange={(o) => { setDialogOpen(o); if (!o) resetForm(); }}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-1.5">
              <Plus className="h-3.5 w-3.5" /> Nova Regra
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingRule ? "Editar Regra" : "Nova Regra de Pop-up"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-2">
              <div className="space-y-1.5">
                <Label>Nome</Label>
                <Input value={name} onChange={e => setName(e.target.value)} placeholder="Ex: Exit intent desconto" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Trigger</Label>
                  <Select value={triggerType} onValueChange={setTriggerType}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(TRIGGER_LABELS).map(([k, v]) => (
                        <SelectItem key={k} value={k}>{v}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Tipo de Pop-up</Label>
                  <Select value={popupType} onValueChange={setPopupType}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(POPUP_TYPE_LABELS).map(([k, v]) => (
                        <SelectItem key={k} value={k}>{v}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Trigger-specific config */}
              {triggerType === "scroll_pct" && (
                <div className="space-y-1.5">
                  <Label>Scroll mínimo (%)</Label>
                  <Input
                    type="number" min={10} max={100}
                    value={triggerValue.pct || 50}
                    onChange={e => setTriggerValue({ ...triggerValue, pct: Number(e.target.value) })}
                  />
                </div>
              )}
              {(triggerType === "time_on_page" || triggerType === "inactivity") && (
                <div className="space-y-1.5">
                  <Label>Segundos</Label>
                  <Input
                    type="number" min={5}
                    value={triggerValue.seconds || 30}
                    onChange={e => setTriggerValue({ ...triggerValue, seconds: Number(e.target.value) })}
                  />
                </div>
              )}

              {/* Content */}
              <div className="space-y-1.5">
                <Label>Título</Label>
                <Input value={content.title || ""} onChange={e => setContent({ ...content, title: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>Descrição</Label>
                <Textarea value={content.description || ""} onChange={e => setContent({ ...content, description: e.target.value })} rows={2} />
              </div>
              <div className="space-y-1.5">
                <Label>Texto do Botão</Label>
                <Input value={content.cta_text || ""} onChange={e => setContent({ ...content, cta_text: e.target.value })} placeholder="Ex: Quero o desconto" />
              </div>

              {popupType === "discount" && (
                <div className="space-y-1.5">
                  <Label>Código de Desconto</Label>
                  <Input value={content.discount_code || ""} onChange={e => setContent({ ...content, discount_code: e.target.value })} placeholder="WELCOME10" />
                </div>
              )}
              {popupType === "survey" && (
                <>
                  <div className="space-y-1.5">
                    <Label>Pergunta</Label>
                    <Input value={content.question || ""} onChange={e => setContent({ ...content, question: e.target.value })} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Opções (separadas por vírgula)</Label>
                    <Input
                      value={(content.options || []).join(", ")}
                      onChange={e => setContent({ ...content, options: e.target.value.split(",").map((s: string) => s.trim()).filter(Boolean) })}
                      placeholder="Opção 1, Opção 2, Opção 3"
                    />
                  </div>
                </>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Páginas alvo</Label>
                  <Input value={targetPages} onChange={e => setTargetPages(e.target.value)} placeholder="* (todas)" />
                </div>
                <div className="space-y-1.5">
                  <Label>Max shows/sessão</Label>
                  <Input type="number" min={1} max={5} value={maxShows} onChange={e => setMaxShows(Number(e.target.value))} />
                </div>
              </div>

              <Button onClick={() => saveMutation.mutate()} disabled={!name || saveMutation.isPending} className="w-full">
                {saveMutation.isPending ? "A guardar..." : editingRule ? "Atualizar" : "Criar Regra"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p className="text-sm text-muted-foreground">A carregar...</p>
        ) : rules.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">
            Sem regras de pop-up. Cria a primeira para captar mais leads.
          </p>
        ) : (
          <div className="space-y-2">
            {rules.map(rule => (
              <div key={rule.id} className="flex items-center justify-between p-3 rounded-lg border border-border/50 hover:bg-muted/20 transition-colors">
                <div className="flex items-center gap-3">
                  <Switch
                    checked={rule.enabled}
                    onCheckedChange={(v) => toggleMutation.mutate({ id: rule.id, enabled: v })}
                  />
                  <div>
                    <p className="text-sm font-medium">{rule.name || "Sem nome"}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <Badge variant="outline" className="text-[10px]">
                        {TRIGGER_LABELS[rule.trigger_type] || rule.trigger_type}
                      </Badge>
                      <Badge variant="secondary" className="text-[10px]">
                        {POPUP_TYPE_LABELS[rule.popup_type] || rule.popup_type}
                      </Badge>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(rule)}>
                    <Eye className="h-3.5 w-3.5" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => deleteMutation.mutate(rule.id)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
