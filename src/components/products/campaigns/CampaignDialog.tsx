import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2 } from "lucide-react";
import { useCreateCampaign, useUpdateCampaign, type Campaign, type CampaignMechanic, type CampaignStatus, type CampaignChannel, type CampaignAudience } from "@/hooks/useCampaigns";
import { MECHANIC_META } from "./CampaignsManager";

interface Props {
  open: boolean;
  campaign?: Campaign | null;
  onClose: () => void;
}

const CHANNELS: { value: CampaignChannel; label: string }[] = [
  { value: "store_b2c", label: "Loja B2C" },
  { value: "marketplace_c2c", label: "Marketplace C2C" },
  { value: "b2b", label: "Portal B2B" },
  { value: "crm", label: "CRM / Propostas" },
  { value: "all", label: "Todos os canais" },
];

const AUDIENCES: { value: CampaignAudience; label: string }[] = [
  { value: "all", label: "Todos os clientes" },
  { value: "new_customers", label: "Novos clientes" },
  { value: "returning", label: "Clientes recorrentes" },
  { value: "vip", label: "Clientes VIP" },
  { value: "segment", label: "Segmento específico" },
  { value: "b2b_tier", label: "Tier B2B (START/GROW/PRO)" },
  { value: "geo", label: "Geo (país/região)" },
  { value: "birthday", label: "Aniversariantes" },
  { value: "referral", label: "Via referral/afiliado" },
  { value: "custom", label: "Personalizado" },
];

const STATUSES: CampaignStatus[] = ["draft", "scheduled", "active", "paused", "archived"];

const WEEKDAYS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

const MECHANIC_GROUPS = {
  basic: "Básicas (Desconto / Frete grátis)",
  advanced: "Avançadas (BOGO / Bundle / Volume / Brinde)",
  temporal: "Temporais (Flash / Happy Hour / Sazonal)",
  segment: "Segmentação (Cupão / 1ª compra / VIP / Aniversário)",
} as const;

export function CampaignDialog({ open, campaign, onClose }: Props) {
  const create = useCreateCampaign();
  const update = useUpdateCampaign();
  const [tab, setTab] = useState("basics");

  const [form, setForm] = useState<any>(() => buildInitial(campaign));

  useEffect(() => { if (open) { setForm(buildInitial(campaign)); setTab("basics"); } }, [open, campaign?.id]);

  const setField = (k: string, v: any) => setForm((f: any) => ({ ...f, [k]: v }));

  const handleSave = () => {
    const payload = { ...form };
    // sanitize
    if (!payload.starts_at) payload.starts_at = null;
    if (!payload.ends_at) payload.ends_at = null;
    if (campaign) update.mutate({ id: campaign.id, ...payload }, { onSuccess: onClose });
    else create.mutate(payload, { onSuccess: onClose });
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{campaign ? "Editar campanha" : "Nova campanha"}</DialogTitle>
          <DialogDescription>Configure mecânica, alvo, janela temporal, cupões e limites.</DialogDescription>
        </DialogHeader>

        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="grid grid-cols-5 w-full">
            <TabsTrigger value="basics">Básico</TabsTrigger>
            <TabsTrigger value="mechanic">Mecânica</TabsTrigger>
            <TabsTrigger value="targeting">Alvo</TabsTrigger>
            <TabsTrigger value="schedule">Calendário</TabsTrigger>
            <TabsTrigger value="limits">Limites</TabsTrigger>
          </TabsList>

          {/* BÁSICO */}
          <TabsContent value="basics" className="space-y-4 pt-4">
            <div>
              <Label>Nome *</Label>
              <Input value={form.name} onChange={e => setField("name", e.target.value)} placeholder="ex: Black Friday 2026" />
            </div>
            <div>
              <Label>Descrição</Label>
              <Textarea value={form.description ?? ""} onChange={e => setField("description", e.target.value)} placeholder="Descrição interna" rows={2} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Código interno</Label>
                <Input value={form.internal_code ?? ""} onChange={e => setField("internal_code", e.target.value)} placeholder="ex: BF2026" />
              </div>
              <div>
                <Label>Estado</Label>
                <Select value={form.status} onValueChange={v => setField("status", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Canais aplicáveis</Label>
              <div className="flex flex-wrap gap-2 mt-1">
                {CHANNELS.map(ch => {
                  const active = form.channels?.includes(ch.value);
                  return (
                    <Badge key={ch.value} variant={active ? "default" : "outline"} className="cursor-pointer"
                      onClick={() => {
                        const cur = new Set(form.channels ?? []);
                        if (cur.has(ch.value)) cur.delete(ch.value); else cur.add(ch.value);
                        setField("channels", Array.from(cur));
                      }}>{ch.label}</Badge>
                  );
                })}
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="flex items-center gap-2"><Switch checked={form.requires_coupon} onCheckedChange={v => setField("requires_coupon", v)} /><Label>Requer cupão</Label></div>
              <div className="flex items-center gap-2"><Switch checked={form.stackable} onCheckedChange={v => setField("stackable", v)} /><Label>Acumulável</Label></div>
              <div className="flex items-center gap-2"><Switch checked={form.enforce_omnibus} onCheckedChange={v => setField("enforce_omnibus", v)} /><Label>Omnibus PT</Label></div>
            </div>
          </TabsContent>

          {/* MECÂNICA */}
          <TabsContent value="mechanic" className="space-y-4 pt-4">
            <div>
              <Label>Tipo de mecânica</Label>
              <Select value={form.mechanic} onValueChange={v => setField("mechanic", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(Object.keys(MECHANIC_GROUPS) as Array<keyof typeof MECHANIC_GROUPS>).map(group => (
                    <div key={group}>
                      <div className="px-2 py-1 text-xs font-semibold text-muted-foreground">{MECHANIC_GROUPS[group]}</div>
                      {Object.entries(MECHANIC_META).filter(([, m]) => m.group === group).map(([k, m]) => (
                        <SelectItem key={k} value={k}>{m.label}</SelectItem>
                      ))}
                    </div>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <MechanicConfig mechanic={form.mechanic} config={form.mechanic_config} onChange={cfg => setField("mechanic_config", cfg)} />
          </TabsContent>

          {/* ALVO */}
          <TabsContent value="targeting" className="space-y-4 pt-4">
            <div>
              <Label>Audiência</Label>
              <Select value={form.audience} onValueChange={v => setField("audience", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{AUDIENCES.map(a => <SelectItem key={a.value} value={a.value}>{a.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>Âmbito de produtos</Label>
              <Select value={form.target_scope} onValueChange={v => setField("target_scope", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os produtos</SelectItem>
                  <SelectItem value="category">Por categoria</SelectItem>
                  <SelectItem value="product">Produtos específicos</SelectItem>
                  <SelectItem value="brand">Por marca</SelectItem>
                  <SelectItem value="tag">Por tag</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {form.target_scope === "category" && (
              <div>
                <Label>Slugs de categoria (separados por vírgula)</Label>
                <Input value={(form.category_slugs ?? []).join(", ")} onChange={e => setField("category_slugs", e.target.value.split(",").map((s: string) => s.trim()).filter(Boolean))} />
              </div>
            )}
            {form.target_scope === "brand" && (
              <div>
                <Label>Marcas (separadas por vírgula)</Label>
                <Input value={(form.brand_slugs ?? []).join(", ")} onChange={e => setField("brand_slugs", e.target.value.split(",").map((s: string) => s.trim()).filter(Boolean))} />
              </div>
            )}
            {form.target_scope === "tag" && (
              <div>
                <Label>Tags (separadas por vírgula)</Label>
                <Input value={(form.tag_slugs ?? []).join(", ")} onChange={e => setField("tag_slugs", e.target.value.split(",").map((s: string) => s.trim()).filter(Boolean))} />
              </div>
            )}
            {form.audience === "geo" && (
              <div>
                <Label>Países/regiões (ex: PT, ES, FR)</Label>
                <Input value={form.audience_config?.countries?.join(", ") ?? ""}
                  onChange={e => setField("audience_config", { ...form.audience_config, countries: e.target.value.split(",").map((s: string) => s.trim().toUpperCase()).filter(Boolean) })} />
              </div>
            )}
            {form.audience === "b2b_tier" && (
              <div>
                <Label>Tiers B2B</Label>
                <div className="flex gap-2 mt-1">
                  {["START", "GROW", "PRO"].map(t => {
                    const active = (form.audience_config?.tiers ?? []).includes(t);
                    return <Badge key={t} variant={active ? "default" : "outline"} className="cursor-pointer"
                      onClick={() => {
                        const cur = new Set(form.audience_config?.tiers ?? []);
                        if (cur.has(t)) cur.delete(t); else cur.add(t);
                        setField("audience_config", { ...form.audience_config, tiers: Array.from(cur) });
                      }}>{t}</Badge>;
                  })}
                </div>
              </div>
            )}
          </TabsContent>

          {/* CALENDÁRIO */}
          <TabsContent value="schedule" className="space-y-4 pt-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Início</Label>
                <Input type="datetime-local" value={form.starts_at ?? ""} onChange={e => setField("starts_at", e.target.value || null)} />
              </div>
              <div>
                <Label>Fim</Label>
                <Input type="datetime-local" value={form.ends_at ?? ""} onChange={e => setField("ends_at", e.target.value || null)} />
              </div>
            </div>
            <div>
              <Label>Dias da semana (vazio = todos)</Label>
              <div className="flex gap-1 mt-1">
                {WEEKDAYS.map((d, i) => {
                  const active = (form.weekdays ?? []).includes(i);
                  return <Badge key={i} variant={active ? "default" : "outline"} className="cursor-pointer"
                    onClick={() => {
                      const cur = new Set(form.weekdays ?? []);
                      if (cur.has(i)) cur.delete(i); else cur.add(i);
                      setField("weekdays", Array.from(cur).sort());
                    }}>{d}</Badge>;
                })}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Hora início (Happy Hour)</Label>
                <Input type="number" min={0} max={23} value={form.hour_start ?? ""} onChange={e => setField("hour_start", e.target.value ? parseInt(e.target.value) : null)} />
              </div>
              <div>
                <Label>Hora fim</Label>
                <Input type="number" min={0} max={23} value={form.hour_end ?? ""} onChange={e => setField("hour_end", e.target.value ? parseInt(e.target.value) : null)} />
              </div>
            </div>
            <div>
              <Label>Grupo exclusivo (apenas 1 activa do grupo)</Label>
              <Input value={form.exclusive_group ?? ""} onChange={e => setField("exclusive_group", e.target.value || null)} placeholder="ex: black_friday" />
            </div>
          </TabsContent>

          {/* LIMITES */}
          <TabsContent value="limits" className="space-y-4 pt-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Prioridade (maior = primeiro)</Label>
                <Input type="number" value={form.priority ?? 0} onChange={e => setField("priority", parseInt(e.target.value) || 0)} />
              </div>
              <div>
                <Label>Carrinho mínimo (€)</Label>
                <Input type="number" step="0.01" value={form.min_cart_value ?? ""} onChange={e => setField("min_cart_value", e.target.value ? parseFloat(e.target.value) : null)} />
              </div>
              <div>
                <Label>Quantidade mínima</Label>
                <Input type="number" value={form.min_quantity ?? ""} onChange={e => setField("min_quantity", e.target.value ? parseInt(e.target.value) : null)} />
              </div>
              <div>
                <Label>Máx. usos totais</Label>
                <Input type="number" value={form.max_total_uses ?? ""} onChange={e => setField("max_total_uses", e.target.value ? parseInt(e.target.value) : null)} />
              </div>
              <div>
                <Label>Máx. usos por cliente</Label>
                <Input type="number" value={form.max_uses_per_customer ?? ""} onChange={e => setField("max_uses_per_customer", e.target.value ? parseInt(e.target.value) : null)} />
              </div>
              <div>
                <Label>Orçamento máx. desconto (€)</Label>
                <Input type="number" step="0.01" value={form.max_total_budget ?? ""} onChange={e => setField("max_total_budget", e.target.value ? parseFloat(e.target.value) : null)} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>A/B Variante</Label>
                <Select value={form.ab_variant ?? "none"} onValueChange={v => setField("ab_variant", v === "none" ? null : v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Sem A/B</SelectItem>
                    <SelectItem value="A">Variante A</SelectItem>
                    <SelectItem value="B">Variante B</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>% tráfego A/B</Label>
                <Input type="number" min={0} max={100} value={form.ab_traffic_pct ?? 100} onChange={e => setField("ab_traffic_pct", parseInt(e.target.value) || 100)} />
              </div>
            </div>
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleSave} disabled={!form.name || create.isPending || update.isPending}>
            {campaign ? "Guardar" : "Criar campanha"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function buildInitial(c?: Campaign | null) {
  return {
    name: c?.name ?? "",
    description: c?.description ?? "",
    internal_code: c?.internal_code ?? "",
    mechanic: c?.mechanic ?? "percentage_discount",
    status: c?.status ?? "draft",
    starts_at: c?.starts_at ? c.starts_at.slice(0, 16) : "",
    ends_at: c?.ends_at ? c.ends_at.slice(0, 16) : "",
    weekdays: c?.weekdays ?? [],
    hour_start: c?.hour_start ?? null,
    hour_end: c?.hour_end ?? null,
    priority: c?.priority ?? 0,
    stackable: c?.stackable ?? false,
    exclusive_group: c?.exclusive_group ?? "",
    channels: c?.channels ?? ["all"],
    audience: c?.audience ?? "all",
    audience_config: c?.audience_config ?? {},
    requires_coupon: c?.requires_coupon ?? false,
    mechanic_config: c?.mechanic_config ?? {},
    target_scope: c?.target_scope ?? "all",
    product_ids: c?.product_ids ?? [],
    category_slugs: c?.category_slugs ?? [],
    brand_slugs: c?.brand_slugs ?? [],
    tag_slugs: c?.tag_slugs ?? [],
    excluded_product_ids: c?.excluded_product_ids ?? [],
    max_total_uses: c?.max_total_uses ?? null,
    max_uses_per_customer: c?.max_uses_per_customer ?? null,
    max_total_budget: c?.max_total_budget ?? null,
    min_cart_value: c?.min_cart_value ?? null,
    min_quantity: c?.min_quantity ?? null,
    ab_variant: c?.ab_variant ?? null,
    ab_traffic_pct: c?.ab_traffic_pct ?? 100,
    enforce_omnibus: c?.enforce_omnibus ?? true,
  };
}

// ============================================================
// Configurador específico por mecânica
// ============================================================
function MechanicConfig({ mechanic, config, onChange }: { mechanic: CampaignMechanic; config: any; onChange: (c: any) => void }) {
  const set = (patch: any) => onChange({ ...config, ...patch });

  switch (mechanic) {
    case "percentage_discount":
      return <div><Label>Percentagem de desconto</Label><Input type="number" min={0} max={100} value={config.percent ?? ""} onChange={e => set({ percent: parseFloat(e.target.value) || 0 })} placeholder="ex: 10" /></div>;

    case "fixed_amount_discount":
      return <div><Label>Valor de desconto (€)</Label><Input type="number" step="0.01" value={config.amount ?? ""} onChange={e => set({ amount: parseFloat(e.target.value) || 0 })} /></div>;

    case "fixed_price":
      return <div><Label>Preço fixo final (€)</Label><Input type="number" step="0.01" value={config.price ?? ""} onChange={e => set({ price: parseFloat(e.target.value) || 0 })} /></div>;

    case "free_shipping":
      return <div><Label>Carrinho mínimo para portes grátis (€)</Label><Input type="number" step="0.01" value={config.min_cart ?? ""} onChange={e => set({ min_cart: parseFloat(e.target.value) || 0 })} placeholder="0 = sempre" /></div>;

    case "bogo":
      return <div className="grid grid-cols-3 gap-3">
        <div><Label>Compra (qtd)</Label><Input type="number" min={1} value={config.buy_qty ?? 1} onChange={e => set({ buy_qty: parseInt(e.target.value) || 1 })} /></div>
        <div><Label>Leva (qtd)</Label><Input type="number" min={1} value={config.get_qty ?? 1} onChange={e => set({ get_qty: parseInt(e.target.value) || 1 })} /></div>
        <div><Label>Desconto na 2ª (%)</Label><Input type="number" min={0} max={100} value={config.get_discount_pct ?? 100} onChange={e => set({ get_discount_pct: parseFloat(e.target.value) || 100 })} /></div>
      </div>;

    case "buy_n_get_n_pct":
      return <div className="grid grid-cols-2 gap-3">
        <div><Label>Compre N unidades</Label><Input type="number" min={1} value={config.buy_qty ?? 2} onChange={e => set({ buy_qty: parseInt(e.target.value) || 2 })} /></div>
        <div><Label>Recebe % off no total</Label><Input type="number" min={0} max={100} value={config.percent ?? 10} onChange={e => set({ percent: parseFloat(e.target.value) || 10 })} /></div>
      </div>;

    case "bundle":
      return <div className="space-y-3">
        <Label>Composição do bundle (IDs de produto separados por vírgula)</Label>
        <Input value={(config.product_ids ?? []).join(", ")} onChange={e => set({ product_ids: e.target.value.split(",").map((s: string) => s.trim()).filter(Boolean) })} />
        <Label>Preço final do bundle (€)</Label>
        <Input type="number" step="0.01" value={config.bundle_price ?? ""} onChange={e => set({ bundle_price: parseFloat(e.target.value) || 0 })} />
      </div>;

    case "volume_tiered": {
      const tiers = config.tiers ?? [];
      return <div className="space-y-2">
        <Label>Tiers de volume</Label>
        {tiers.map((t: any, i: number) => (
          <div key={i} className="grid grid-cols-[1fr_1fr_auto] gap-2">
            <Input type="number" placeholder="Qtd mínima" value={t.min_qty ?? ""} onChange={e => { const nt = [...tiers]; nt[i] = { ...t, min_qty: parseInt(e.target.value) || 0 }; set({ tiers: nt }); }} />
            <Input type="number" placeholder="% desconto" value={t.discount_pct ?? ""} onChange={e => { const nt = [...tiers]; nt[i] = { ...t, discount_pct: parseFloat(e.target.value) || 0 }; set({ tiers: nt }); }} />
            <Button size="icon" variant="ghost" onClick={() => set({ tiers: tiers.filter((_: any, idx: number) => idx !== i) })}><Trash2 className="w-4 h-4" /></Button>
          </div>
        ))}
        <Button size="sm" variant="outline" onClick={() => set({ tiers: [...tiers, { min_qty: 0, discount_pct: 0 }] })}><Plus className="w-4 h-4 mr-1" />Adicionar tier</Button>
      </div>;
    }

    case "gift_product":
      return <div className="space-y-2">
        <Label>ID do produto brinde</Label>
        <Input value={config.product_id ?? ""} onChange={e => set({ product_id: e.target.value })} />
        <Label>Quantidade</Label>
        <Input type="number" min={1} value={config.qty ?? 1} onChange={e => set({ qty: parseInt(e.target.value) || 1 })} />
        <Label>Carrinho mínimo (€)</Label>
        <Input type="number" step="0.01" value={config.min_cart ?? ""} onChange={e => set({ min_cart: parseFloat(e.target.value) || 0 })} />
      </div>;

    case "cashback":
    case "store_credit":
      return <div><Label>{mechanic === "cashback" ? "% Cashback" : "% Crédito loja"}</Label><Input type="number" min={0} max={100} value={config.percent ?? ""} onChange={e => set({ percent: parseFloat(e.target.value) || 0 })} /></div>;

    case "cart_progressive": {
      const steps = config.steps ?? [];
      return <div className="space-y-2">
        <Label>Patamares progressivos</Label>
        {steps.map((s: any, i: number) => (
          <div key={i} className="grid grid-cols-[1fr_1fr_auto] gap-2">
            <Input type="number" placeholder="Carrinho ≥ €" value={s.min_cart ?? ""} onChange={e => { const ns = [...steps]; ns[i] = { ...s, min_cart: parseFloat(e.target.value) || 0 }; set({ steps: ns }); }} />
            <Input type="number" placeholder="Desconto €" value={s.discount ?? ""} onChange={e => { const ns = [...steps]; ns[i] = { ...s, discount: parseFloat(e.target.value) || 0 }; set({ steps: ns }); }} />
            <Button size="icon" variant="ghost" onClick={() => set({ steps: steps.filter((_: any, idx: number) => idx !== i) })}><Trash2 className="w-4 h-4" /></Button>
          </div>
        ))}
        <Button size="sm" variant="outline" onClick={() => set({ steps: [...steps, { min_cart: 0, discount: 0 }] })}><Plus className="w-4 h-4 mr-1" />Adicionar patamar</Button>
      </div>;
    }

    case "flash_sale":
    case "happy_hour":
    case "seasonal":
    case "launch_price":
    case "clearance":
      return <div className="space-y-2">
        <Label>Tipo de desconto</Label>
        <Select value={config.discount_type ?? "percent"} onValueChange={v => set({ discount_type: v })}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="percent">Percentagem (%)</SelectItem>
            <SelectItem value="fixed">Valor fixo (€)</SelectItem>
            <SelectItem value="price">Preço final (€)</SelectItem>
          </SelectContent>
        </Select>
        <Label>Valor</Label>
        <Input type="number" step="0.01" value={config.value ?? ""} onChange={e => set({ value: parseFloat(e.target.value) || 0 })} />
        <p className="text-xs text-muted-foreground">⏰ Lembre-se de definir a janela em "Calendário".</p>
      </div>;

    case "first_purchase":
    case "birthday":
    case "referral":
    case "loyalty":
      return <div className="space-y-2">
        <Label>Tipo de prémio</Label>
        <Select value={config.reward_type ?? "percent"} onValueChange={v => set({ reward_type: v })}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="percent">% desconto</SelectItem>
            <SelectItem value="fixed">€ desconto</SelectItem>
            <SelectItem value="credit">Crédito loja</SelectItem>
            <SelectItem value="gift">Brinde</SelectItem>
          </SelectContent>
        </Select>
        <Label>Valor</Label>
        <Input type="number" step="0.01" value={config.value ?? ""} onChange={e => set({ value: parseFloat(e.target.value) || 0 })} />
      </div>;

    default:
      return <p className="text-sm text-muted-foreground">Sem configuração adicional.</p>;
  }
}
