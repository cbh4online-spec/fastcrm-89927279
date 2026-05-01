import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { ShieldCheck, Plus, Edit, Trash2, Loader2, Target, Calculator, Wand2 } from "lucide-react";
import { toast } from "sonner";
import {
  usePricingRules,
  useUpsertPricingRule,
  type PricingRule,
} from "@/hooks/useProductPricingIntelligence";
import { useProductCategoriesList } from "@/hooks/useProductCategories";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useQueryClient } from "@tanstack/react-query";

const PRESETS = [
  { label: "Eletrónica", category: "Eletrónica", min: 15, target: 25, max: 40 },
  { label: "Acessórios", category: "Acessórios", min: 30, target: 45, max: 60 },
  { label: "Alimentar", category: "Alimentar", min: 25, target: 35, max: 50 },
  { label: "Serviços", category: "Serviços", min: 40, target: 55, max: 70 },
];

interface RuleFormState {
  id?: string;
  applies_to: "all" | "category" | "product";
  category: string;
  min_margin_pct: string;
  target_margin_pct: string;
  max_margin_pct: string;
  default_operational_cost_pct: string;
  is_active: boolean;
}

const emptyForm: RuleFormState = {
  applies_to: "category",
  category: "",
  min_margin_pct: "10",
  target_margin_pct: "25",
  max_margin_pct: "50",
  default_operational_cost_pct: "",
  is_active: true,
};

export function PricingRulesSettings() {
  const { data: rules = [], isLoading } = usePricingRules();
  const upsert = useUpsertPricingRule();
  const { data: categories = [] } = useProductCategoriesList();
  const { currentWorkspace } = useWorkspace();
  const qc = useQueryClient();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState<RuleFormState>(emptyForm);

  const openNew = () => {
    setForm(emptyForm);
    setDialogOpen(true);
  };

  const openEdit = (rule: PricingRule) => {
    setForm({
      id: rule.id,
      applies_to: rule.applies_to,
      category: rule.category || "",
      min_margin_pct: String(rule.min_margin_pct),
      target_margin_pct: String(rule.target_margin_pct ?? ""),
      max_margin_pct: String(rule.max_margin_pct ?? ""),
      is_active: rule.is_active,
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    const min = parseFloat(form.min_margin_pct);
    if (isNaN(min) || min < 0) {
      toast.error("Margem mínima inválida");
      return;
    }

    await upsert.mutateAsync({
      ...(form.id ? { id: form.id } : {}),
      applies_to: form.applies_to,
      category: form.applies_to === "category" ? form.category : null,
      product_id: null,
      min_margin_pct: min,
      target_margin_pct: form.target_margin_pct ? parseFloat(form.target_margin_pct) : null,
      max_margin_pct: form.max_margin_pct ? parseFloat(form.max_margin_pct) : null,
      is_active: form.is_active,
    });
    setDialogOpen(false);
  };

  const handleDelete = async (id: string) => {
    const sb = supabase as any;
    await sb.from("product_pricing_rules").update({ is_active: false }).eq("id", id);
    qc.invalidateQueries({ queryKey: ["pricing-rules"] });
    toast.success("Regra desactivada");
  };

  const handleToggle = async (rule: PricingRule) => {
    await upsert.mutateAsync({ id: rule.id, is_active: !rule.is_active });
  };

  const applyPreset = (preset: typeof PRESETS[0]) => {
    setForm({
      ...emptyForm,
      applies_to: "category",
      category: preset.category,
      min_margin_pct: String(preset.min),
      target_margin_pct: String(preset.target),
      max_margin_pct: String(preset.max),
    });
    setDialogOpen(true);
  };

  const globalRule = rules.find(r => r.applies_to === "all");

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5" />
            Regras de Margem
          </CardTitle>
          <CardDescription>
            Defina margens mínimas por categoria para proteger a rentabilidade. As regras por categoria prevalecem sobre a regra global.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Global rule info */}
          <div className="flex items-center justify-between p-3 rounded-lg border bg-muted/30">
            <div>
              <p className="text-sm font-medium">Margem mínima global (fallback)</p>
              <p className="text-xs text-muted-foreground">
                {globalRule ? `${globalRule.min_margin_pct}%` : "10% (padrão)"}
                {globalRule?.target_margin_pct && ` · Target: ${globalRule.target_margin_pct}%`}
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                if (globalRule) {
                  openEdit(globalRule);
                } else {
                  setForm({ ...emptyForm, applies_to: "all", category: "" });
                  setDialogOpen(true);
                }
              }}
            >
              {globalRule ? "Editar" : "Definir"}
            </Button>
          </div>

          {/* Quick presets */}
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-2">Presets rápidos</p>
            <div className="flex flex-wrap gap-2">
              {PRESETS.map(p => (
                <Button key={p.label} variant="outline" size="sm" onClick={() => applyPreset(p)} className="gap-1.5">
                  <Target className="h-3.5 w-3.5" />
                  {p.label} ({p.min}%)
                </Button>
              ))}
            </div>
          </div>

          {/* Rules table */}
          {isLoading ? (
            <div className="flex justify-center p-6">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : rules.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <ShieldCheck className="h-10 w-10 mx-auto mb-2 opacity-30" />
              <p className="text-sm">Nenhuma regra definida. Crie a primeira regra para proteger as margens.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Âmbito</TableHead>
                  <TableHead>Margem Mín.</TableHead>
                  <TableHead>Target</TableHead>
                  <TableHead>Máx.</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="w-[100px]">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rules.map(rule => (
                  <TableRow key={rule.id}>
                    <TableCell>
                      {rule.applies_to === "all" ? (
                        <Badge variant="secondary">Global</Badge>
                      ) : (
                        <Badge variant="outline">{rule.category || "—"}</Badge>
                      )}
                    </TableCell>
                    <TableCell className="font-medium">{rule.min_margin_pct}%</TableCell>
                    <TableCell>{rule.target_margin_pct ? `${rule.target_margin_pct}%` : "—"}</TableCell>
                    <TableCell>{rule.max_margin_pct ? `${rule.max_margin_pct}%` : "—"}</TableCell>
                    <TableCell>
                      <Switch checked={rule.is_active} onCheckedChange={() => handleToggle(rule)} />
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(rule)}>
                          <Edit className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => handleDelete(rule.id)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}

          <Button onClick={openNew} className="gap-2">
            <Plus className="h-4 w-4" /> Nova Regra
          </Button>
        </CardContent>
      </Card>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{form.id ? "Editar Regra" : "Nova Regra de Margem"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Âmbito</Label>
              <Select
                value={form.applies_to}
                onValueChange={(v) => setForm({ ...form, applies_to: v as any })}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Global (todas as categorias)</SelectItem>
                  <SelectItem value="category">Por categoria</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {form.applies_to === "category" && (
              <div>
                <Label>Categoria</Label>
                <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                  <SelectTrigger><SelectValue placeholder="Selecionar categoria" /></SelectTrigger>
                  <SelectContent>
                    {categories.map(c => (
                      <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label>Mínima %</Label>
                <Input
                  type="number"
                  min="0"
                  max="100"
                  value={form.min_margin_pct}
                  onChange={(e) => setForm({ ...form, min_margin_pct: e.target.value })}
                />
              </div>
              <div>
                <Label>Target %</Label>
                <Input
                  type="number"
                  min="0"
                  max="100"
                  value={form.target_margin_pct}
                  onChange={(e) => setForm({ ...form, target_margin_pct: e.target.value })}
                />
              </div>
              <div>
                <Label>Máxima %</Label>
                <Input
                  type="number"
                  min="0"
                  max="100"
                  value={form.max_margin_pct}
                  onChange={(e) => setForm({ ...form, max_margin_pct: e.target.value })}
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Switch
                checked={form.is_active}
                onCheckedChange={(v) => setForm({ ...form, is_active: v })}
              />
              <Label>Regra ativa</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={upsert.isPending}>
              {upsert.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Guardar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
