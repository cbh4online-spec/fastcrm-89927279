import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft, ChevronRight, Check, Sparkles } from "lucide-react";
import { useCreateCompositeProduct, type CompositionType, type PricingMode } from "@/hooks/useCompositeProducts";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onCreated?: (id: string) => void;
}

const STEPS = [
  "Dados principais",
  "Tipo de composição",
  "Preço & margem",
  "Disponibilidade",
  "Confirmação",
];

const compositionLabels: Record<CompositionType, string> = {
  fixed_kit: "Kit fixo (componentes obrigatórios)",
  configurable_kit: "Kit configurável (com escolhas)",
  dynamic_bundle: "Bundle dinâmico",
  assembled_product: "Produto montado",
  campaign_bundle: "Pack de campanha",
  replenishment_pack: "Pack de reabastecimento",
  ai_suggested_pack: "Sugerido por IA",
};

const pricingLabels: Record<PricingMode, string> = {
  sum_components: "Soma dos componentes",
  fixed_price: "Preço fixo manual",
  discount_on_sum: "Desconto sobre a soma",
  min_margin: "Margem mínima garantida",
  per_channel: "Por canal de venda",
  per_segment: "Por segmento de cliente",
  per_tier: "Por escalão",
};

export function CompositeProductWizard({ open, onOpenChange, onCreated }: Props) {
  const create = useCreateCompositeProduct();
  const [step, setStep] = useState(0);
  const [form, setForm] = useState({
    name: "",
    sku: "",
    description: "",
    category: "",
    composition_type: "fixed_kit" as CompositionType,
    pricing_mode: "sum_components" as PricingMode,
    fixed_price: "" as string,
    discount_pct: "0",
    min_margin_pct: "20",
    visibility_b2b: false,
    requires_approval: true,
    sales_channels: ["internal"] as string[],
  });

  const set = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) => setForm((p) => ({ ...p, [k]: v }));

  const reset = () => {
    setStep(0);
    setForm({
      name: "", sku: "", description: "", category: "",
      composition_type: "fixed_kit", pricing_mode: "sum_components",
      fixed_price: "", discount_pct: "0", min_margin_pct: "20",
      visibility_b2b: false, requires_approval: true, sales_channels: ["internal"],
    });
  };

  const canNext = () => {
    if (step === 0) return form.name.trim().length >= 2;
    return true;
  };

  const handleSubmit = async () => {
    const result = await create.mutateAsync({
      name: form.name.trim(),
      sku: form.sku.trim() || undefined,
      description: form.description.trim() || undefined,
      category: form.category.trim() || undefined,
      composition_type: form.composition_type,
      pricing_mode: form.pricing_mode,
      fixed_price: form.pricing_mode === "fixed_price" && form.fixed_price ? Number(form.fixed_price) : null,
      discount_pct: Number(form.discount_pct) || 0,
      min_margin_pct: Number(form.min_margin_pct) || 0,
      visibility_b2b: form.visibility_b2b,
      requires_approval: form.requires_approval,
      sales_channels: form.sales_channels,
      status: "draft",
    });
    if (result?.id) {
      onCreated?.(result.id);
      onOpenChange(false);
      reset();
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) reset(); }}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Novo produto composto</DialogTitle>
          <div className="flex items-center gap-2 mt-2 flex-wrap">
            {STEPS.map((label, i) => (
              <Badge key={i} variant={i === step ? "default" : i < step ? "secondary" : "outline"} className="text-xs">
                {i < step && <Check className="h-3 w-3 mr-1" />}
                {i + 1}. {label}
              </Badge>
            ))}
          </div>
        </DialogHeader>

        <div className="py-4 space-y-4 min-h-[280px]">
          {step === 0 && (
            <>
              <div className="space-y-2">
                <Label>Nome *</Label>
                <Input value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="Ex: Kit Café Premium" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>SKU</Label>
                  <Input value={form.sku} onChange={(e) => set("sku", e.target.value)} placeholder="KIT-001" />
                </div>
                <div className="space-y-2">
                  <Label>Categoria</Label>
                  <Input value={form.category} onChange={(e) => set("category", e.target.value)} />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Descrição</Label>
                <Textarea value={form.description} onChange={(e) => set("description", e.target.value)} rows={3} />
              </div>
            </>
          )}

          {step === 1 && (
            <div className="space-y-3">
              <Label>Tipo de composição</Label>
              <div className="grid gap-2">
                {(Object.keys(compositionLabels) as CompositionType[]).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => set("composition_type", t)}
                    className={`text-left p-3 rounded-md border transition-colors ${form.composition_type === t ? "border-primary bg-primary/5" : "border-border hover:bg-muted/50"}`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-sm">{compositionLabels[t]}</span>
                      {t === "ai_suggested_pack" && <Sparkles className="h-4 w-4 text-violet-500" />}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-3">
              <div className="space-y-2">
                <Label>Modo de preço</Label>
                <Select value={form.pricing_mode} onValueChange={(v) => set("pricing_mode", v as PricingMode)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {(Object.keys(pricingLabels) as PricingMode[]).map((m) => (
                      <SelectItem key={m} value={m}>{pricingLabels[m]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {form.pricing_mode === "fixed_price" && (
                <div className="space-y-2">
                  <Label>Preço fixo (€)</Label>
                  <Input type="number" step="0.01" value={form.fixed_price} onChange={(e) => set("fixed_price", e.target.value)} />
                </div>
              )}
              {form.pricing_mode === "discount_on_sum" && (
                <div className="space-y-2">
                  <Label>Desconto (%)</Label>
                  <Input type="number" step="0.1" value={form.discount_pct} onChange={(e) => set("discount_pct", e.target.value)} />
                </div>
              )}
              <div className="space-y-2">
                <Label>Margem mínima (%)</Label>
                <Input type="number" step="0.1" value={form.min_margin_pct} onChange={(e) => set("min_margin_pct", e.target.value)} />
                <p className="text-xs text-muted-foreground">O sistema bloqueia a ativação se a margem real ficar abaixo deste valor.</p>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 border rounded-md">
                <div>
                  <Label>Visível no Portal B2B</Label>
                  <p className="text-xs text-muted-foreground">Disponível para clientes B2B autorizados</p>
                </div>
                <Switch checked={form.visibility_b2b} onCheckedChange={(v) => set("visibility_b2b", v)} />
              </div>
              <div className="flex items-center justify-between p-3 border rounded-md">
                <div>
                  <Label>Requer aprovação</Label>
                  <p className="text-xs text-muted-foreground">Recomendado quando há risco de margem</p>
                </div>
                <Switch checked={form.requires_approval} onCheckedChange={(v) => set("requires_approval", v)} />
              </div>
              <div className="space-y-2">
                <Label>Canais de venda</Label>
                <div className="flex flex-wrap gap-2">
                  {["internal", "b2b", "online_store", "marketplace"].map((c) => (
                    <Badge
                      key={c}
                      variant={form.sales_channels.includes(c) ? "default" : "outline"}
                      className="cursor-pointer"
                      onClick={() => set("sales_channels", form.sales_channels.includes(c) ? form.sales_channels.filter((x) => x !== c) : [...form.sales_channels, c])}
                    >
                      {c}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">Confirme os dados antes de criar. Poderá adicionar componentes, grupos, substitutos e simular margens já no detalhe.</p>
              <div className="border rounded-md p-3 space-y-1 text-sm">
                <div className="flex justify-between"><span className="text-muted-foreground">Nome</span><span className="font-medium">{form.name}</span></div>
                {form.sku && <div className="flex justify-between"><span className="text-muted-foreground">SKU</span><span>{form.sku}</span></div>}
                <div className="flex justify-between"><span className="text-muted-foreground">Tipo</span><span>{compositionLabels[form.composition_type]}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Preço</span><span>{pricingLabels[form.pricing_mode]}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Margem mín.</span><span>{form.min_margin_pct}%</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">B2B</span><span>{form.visibility_b2b ? "Sim" : "Não"}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Aprovação</span><span>{form.requires_approval ? "Obrigatória" : "Não"}</span></div>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="flex !justify-between gap-2">
          <Button variant="outline" onClick={() => setStep((s) => Math.max(0, s - 1))} disabled={step === 0}>
            <ChevronLeft className="h-4 w-4 mr-1" /> Anterior
          </Button>
          {step < STEPS.length - 1 ? (
            <Button onClick={() => setStep((s) => s + 1)} disabled={!canNext()}>
              Seguinte <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          ) : (
            <Button onClick={handleSubmit} disabled={create.isPending}>
              {create.isPending ? "A criar..." : "Criar produto composto"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
