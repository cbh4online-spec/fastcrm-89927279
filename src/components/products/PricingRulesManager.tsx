import { useState } from "react";
import { Tags, Plus, Trash2, ToggleLeft, ToggleRight, Calendar, Hash, Layers, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { usePricingRules, useCreatePricingRule, useDeletePricingRule, useTogglePricingRule, type PricingRule } from "@/hooks/usePricingRules";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";

const RULE_TYPE_CONFIG = {
  volume: { label: "Volume", icon: Hash, description: "Desconto por quantidade mínima" },
  customer: { label: "Cliente", icon: Users, description: "Desconto por cliente ou segmento" },
  period: { label: "Período", icon: Calendar, description: "Desconto por período de tempo" },
  category: { label: "Categoria", icon: Layers, description: "Desconto por categoria de produto" },
} as const;

export function PricingRulesManager() {
  const { data: rules, isLoading } = usePricingRules();
  const createRule = useCreatePricingRule();
  const deleteRule = useDeletePricingRule();
  const toggleRule = useTogglePricingRule();
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({
    name: "",
    rule_type: "volume" as PricingRule["rule_type"],
    condition_json: {} as Record<string, any>,
    discount_type: "percentage" as "percentage" | "fixed",
    discount_value: 0,
    priority: 0,
    is_active: true,
    starts_at: null as string | null,
    ends_at: null as string | null,
  });

  const handleCreate = () => {
    createRule.mutate(form, { onSuccess: () => { setShowCreate(false); resetForm(); } });
  };

  const resetForm = () => setForm({ name: "", rule_type: "volume", condition_json: {}, discount_type: "percentage", discount_value: 0, priority: 0, is_active: true, starts_at: null, ends_at: null });

  if (isLoading) return <div className="space-y-3">{[1, 2, 3].map(i => <Skeleton key={i} className="h-16 w-full" />)}</div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Regras de Pricing</h3>
          <p className="text-sm text-muted-foreground">Descontos automáticos por volume, período ou categoria</p>
        </div>
        <Button onClick={() => setShowCreate(true)} size="sm"><Plus className="h-4 w-4 mr-1" />Nova Regra</Button>
      </div>

      {(!rules || rules.length === 0) ? (
        <Card><CardContent className="py-8 text-center text-muted-foreground"><Tags className="h-10 w-10 mx-auto mb-2 opacity-40" />Nenhuma regra criada</CardContent></Card>
      ) : (
        <div className="space-y-2">
          {rules.map(r => {
            const cfg = RULE_TYPE_CONFIG[r.rule_type];
            const Icon = cfg.icon;
            return (
              <Card key={r.id}>
                <CardContent className="py-3 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Icon className="h-5 w-5 text-primary" />
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-sm">{r.name}</p>
                        <Badge variant="outline" className="text-xs">{cfg.label}</Badge>
                        <Badge variant="secondary" className="text-xs">P{r.priority}</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {r.discount_type === "percentage" ? `${r.discount_value}%` : `€${r.discount_value}`} desconto
                        {r.rule_type === "volume" && r.condition_json.min_qty && ` • Min. ${r.condition_json.min_qty} un.`}
                        {r.starts_at && ` • Desde ${format(new Date(r.starts_at), "dd/MM/yyyy")}`}
                        {r.ends_at && ` até ${format(new Date(r.ends_at), "dd/MM/yyyy")}`}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="icon" onClick={() => toggleRule.mutate({ id: r.id, isActive: !r.is_active })}>
                      {r.is_active ? <ToggleRight className="h-4 w-4 text-green-500" /> : <ToggleLeft className="h-4 w-4 text-muted-foreground" />}
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => deleteRule.mutate(r.id)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={showCreate} onOpenChange={v => { if (!v) resetForm(); setShowCreate(v); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Nova Regra de Pricing</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Nome</Label><Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Ex: Desconto Verão" /></div>
            <div><Label>Tipo</Label>
              <Select value={form.rule_type} onValueChange={(v: any) => setForm(f => ({ ...f, rule_type: v, condition_json: {} }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(RULE_TYPE_CONFIG).map(([k, v]) => <SelectItem key={k} value={k}>{v.label} — {v.description}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            {form.rule_type === "volume" && (
              <div><Label>Quantidade Mínima</Label><Input type="number" value={form.condition_json.min_qty || ""} onChange={e => setForm(f => ({ ...f, condition_json: { ...f.condition_json, min_qty: parseInt(e.target.value) || 0 } }))} /></div>
            )}
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Tipo Desconto</Label>
                <Select value={form.discount_type} onValueChange={(v: any) => setForm(f => ({ ...f, discount_type: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="percentage">Percentagem (%)</SelectItem>
                    <SelectItem value="fixed">Valor Fixo (€)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div><Label>Valor</Label><Input type="number" value={form.discount_value} onChange={e => setForm(f => ({ ...f, discount_value: parseFloat(e.target.value) || 0 }))} /></div>
            </div>
            <div><Label>Prioridade (menor = aplica primeiro)</Label><Input type="number" value={form.priority} onChange={e => setForm(f => ({ ...f, priority: parseInt(e.target.value) || 0 }))} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Data Início</Label><Input type="date" value={form.starts_at || ""} onChange={e => setForm(f => ({ ...f, starts_at: e.target.value || null }))} /></div>
              <div><Label>Data Fim</Label><Input type="date" value={form.ends_at || ""} onChange={e => setForm(f => ({ ...f, ends_at: e.target.value || null }))} /></div>
            </div>
            <div className="flex items-center gap-2"><Switch checked={form.is_active} onCheckedChange={v => setForm(f => ({ ...f, is_active: v }))} /><Label>Ativa</Label></div>
          </div>
          <DialogFooter><Button onClick={handleCreate} disabled={!form.name || createRule.isPending}>Criar</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
