import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Package, Pencil, Plus, RefreshCw, Trash2, Loader2 } from "lucide-react";
import { IXCard } from "@/components/entity/ix/IXCard";
import {
  CURRENCIES, DEFAULT_TAX_RATE, FunnelDiscount, FunnelProduct,
  funnelProductsSchema, funnelTotals,
} from "@/schemas/checkout/funnelSchema";
import { ProductPickerDialog, CatalogProduct, catalogGrossPrice, catalogTaxRate } from "./ProductPickerDialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Props {
  products: FunnelProduct[];
  currency: string;
  discount: FunnelDiscount;
  saving: boolean;
  onSave: (products: FunnelProduct[], currency: string, discount: FunnelDiscount) => void;
}

export function FunnelProductsEditor({ products, currency, discount, saving, onSave }: Props) {
  const [rows, setRows] = useState<FunnelProduct[]>(products);
  const [curr, setCurr] = useState(currency);
  const [disc, setDisc] = useState<FunnelDiscount>(discount);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [pickerOpen, setPickerOpen] = useState(false);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => { setRows(products); setCurr(currency); setDisc(discount); }, [products, currency, discount]);

  function update(index: number, patch: Partial<FunnelProduct>) {
    setRows((prev) => prev.map((r, i) => (i === index ? { ...r, ...patch } : r)));
  }

  function addFromCatalog(product: CatalogProduct) {
    if (rows.some((r) => r.product_id === product.id)) {
      toast.info("Este produto já está no funil");
      return;
    }
    const price = catalogGrossPrice(product);
    setRows((prev) => [...prev, {
      name: product.name,
      quantity: 1,
      price,
      product_id: product.id,
      sku: product.sku ?? null,
      image_url: product.image_url ?? null,
      tax_rate: catalogTaxRate(product),
      compare_at_price: null,
      catalog_price: price,
    }]);
    if (product.currency && CURRENCIES.includes(product.currency as any)) setCurr(product.currency);
  }

  async function syncCatalogPrices() {
    const ids = rows.map((r) => r.product_id).filter(Boolean) as string[];
    if (!ids.length) { toast.info("Nenhuma linha ligada ao catálogo"); return; }
    setSyncing(true);
    try {
      const { data, error } = await (supabase as any)
        .from("products")
        .select("id, name, sku, base_price, currency, tax_included, tax_rate_estimate_pct, status, product_images(url)")
        .in("id", ids);
      if (error) throw error;
      const map = new Map<string, any>((data ?? []).map((p: any) => [p.id, p]));
      let updated = 0;
      setRows((prev) => prev.map((r) => {
        if (!r.product_id) return r;
        const p = map.get(r.product_id);
        if (!p) return r;
        const price = catalogGrossPrice({ ...p, image_url: p.product_images?.[0]?.url ?? null });
        if (price !== r.price || p.name !== r.name) updated += 1;
        return {
          ...r,
          name: p.name,
          sku: p.sku ?? null,
          image_url: p.product_images?.[0]?.url ?? r.image_url ?? null,
          tax_rate: catalogTaxRate(p),
          price,
          catalog_price: price,
        };
      }));
      toast.success(updated ? `${updated} linha(s) atualizada(s) — guarde para confirmar` : "Preços já estavam sincronizados");
    } catch (e: any) {
      toast.error(e.message || "Erro ao sincronizar com o catálogo");
    } finally {
      setSyncing(false);
    }
  }

  function handleSave() {
    const parsed = funnelProductsSchema.safeParse(rows);
    if (!parsed.success) {
      const next: Record<string, string> = {};
      parsed.error.issues.forEach((issue) => { next[issue.path.join(".")] = issue.message; });
      setErrors(next);
      toast.error(parsed.error.issues[0]?.message ?? "Verifique os produtos");
      return;
    }
    if (disc.type !== "none") {
      if (!Number.isFinite(disc.value) || disc.value <= 0) { toast.error("Indique um valor de desconto válido"); return; }
      if (disc.type === "percent" && disc.value > 100) { toast.error("O desconto em % não pode exceder 100"); return; }
    }
    setErrors({});
    onSave(parsed.data, curr, disc.type === "none" ? { type: "none", value: 0, label: null } : disc);
  }

  const totals = funnelTotals(rows, disc);

  return (
    <>
      <IXCard
        title="Produtos & preço"
        description="Itens apresentados ao cliente no checkout. Ligue-os ao catálogo para herdar preço, SKU, imagem e IVA."
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={syncCatalogPrices} disabled={syncing || saving}>
              {syncing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
              Sincronizar catálogo
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Guardar
            </Button>
          </div>
        }
      >
        <div className="space-y-5">
          <div className="max-w-[200px] space-y-2">
            <Label htmlFor="funnel-currency">Moeda</Label>
            <Select value={curr} onValueChange={setCurr}>
              <SelectTrigger id="funnel-currency"><SelectValue /></SelectTrigger>
              <SelectContent>
                {CURRENCIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {rows.length === 0 && (
            <p className="text-sm text-muted-foreground">
              Sem produtos configurados — o checkout não pode cobrar nada. Adicione pelo menos um.
            </p>
          )}

          <div className="divide-y divide-border">
            {rows.map((row, index) => {
              const linked = !!row.product_id;
              const drift = linked && row.catalog_price != null && Number(row.catalog_price) !== Number(row.price);
              return (
                <div key={index} className="space-y-3 py-4 first:pt-0">
                  <div className="grid gap-3 sm:grid-cols-[auto_1fr_90px_130px_110px_auto] sm:items-end">
                    <div className="hidden h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-muted sm:flex">
                      {row.image_url
                        ? <img src={row.image_url} alt="" className="h-full w-full object-cover" loading="lazy" />
                        : <Package className="h-4 w-4 text-muted-foreground" />}
                    </div>

                    <div className="space-y-1">
                      <Label htmlFor={`prod-name-${index}`} className="text-xs text-muted-foreground">Nome</Label>
                      <Input
                        id={`prod-name-${index}`}
                        value={row.name}
                        maxLength={120}
                        onChange={(e) => update(index, { name: e.target.value })}
                        placeholder="Curso completo"
                      />
                      {errors[`${index}.name`] && <p className="text-xs text-destructive">{errors[`${index}.name`]}</p>}
                    </div>

                    <div className="space-y-1">
                      <Label htmlFor={`prod-qty-${index}`} className="text-xs text-muted-foreground">Qtd.</Label>
                      <Input
                        id={`prod-qty-${index}`}
                        type="number"
                        min={1}
                        value={row.quantity}
                        onChange={(e) => update(index, { quantity: Number(e.target.value) })}
                      />
                    </div>

                    <div className="space-y-1">
                      <Label htmlFor={`prod-price-${index}`} className="text-xs text-muted-foreground">Preço c/ IVA ({curr})</Label>
                      <Input
                        id={`prod-price-${index}`}
                        type="number"
                        min={0}
                        step="0.01"
                        value={row.price}
                        onChange={(e) => update(index, { price: Number(e.target.value) })}
                      />
                      {errors[`${index}.price`] && <p className="text-xs text-destructive">{errors[`${index}.price`]}</p>}
                    </div>

                    <div className="space-y-1">
                      <Label htmlFor={`prod-tax-${index}`} className="text-xs text-muted-foreground">IVA %</Label>
                      <Input
                        id={`prod-tax-${index}`}
                        type="number"
                        min={0}
                        max={100}
                        step="0.5"
                        value={row.tax_rate ?? DEFAULT_TAX_RATE}
                        onChange={(e) => update(index, { tax_rate: Number(e.target.value) })}
                      />
                    </div>

                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label={`Remover produto ${row.name || index + 1}`}
                      onClick={() => setRows((prev) => prev.filter((_, i) => i !== index))}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground sm:pl-14">
                    {linked ? (
                      <Badge variant="secondary">Catálogo{row.sku ? ` · SKU ${row.sku}` : ""}</Badge>
                    ) : (
                      <Badge variant="outline"><Pencil className="mr-1 h-3 w-3" /> Linha manual</Badge>
                    )}
                    {drift && (
                      <span className="text-amber-600 dark:text-amber-500">
                        Preço alterado face ao catálogo ({Number(row.catalog_price).toFixed(2)} {curr})
                      </span>
                    )}
                    <span>Linha: {((Number(row.price) || 0) * (Number(row.quantity) || 1)).toFixed(2)} {curr}</span>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex flex-wrap gap-2 border-t border-border pt-4">
            <Button variant="default" onClick={() => setPickerOpen(true)} disabled={rows.length >= 20}>
              <Plus className="mr-2 h-4 w-4" /> Adicionar do catálogo
            </Button>
            <Button
              variant="outline"
              onClick={() => setRows((prev) => [...prev, { name: "", quantity: 1, price: 0, product_id: null, tax_rate: DEFAULT_TAX_RATE }])}
              disabled={rows.length >= 20}
            >
              <Plus className="mr-2 h-4 w-4" /> Linha manual
            </Button>
          </div>

          <div className="grid gap-5 border-t border-border pt-4 sm:grid-cols-[1fr_auto]">
            <div className="space-y-3">
              <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Desconto do funil</p>
              <div className="flex flex-wrap items-end gap-3">
                <div className="w-[160px] space-y-1">
                  <Label htmlFor="discount-type" className="text-xs text-muted-foreground">Tipo</Label>
                  <Select value={disc.type} onValueChange={(v) => setDisc((p) => ({ ...p, type: v as FunnelDiscount["type"] }))}>
                    <SelectTrigger id="discount-type"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Sem desconto</SelectItem>
                      <SelectItem value="percent">Percentagem</SelectItem>
                      <SelectItem value="fixed">Valor fixo</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {disc.type !== "none" && (
                  <>
                    <div className="w-[120px] space-y-1">
                      <Label htmlFor="discount-value" className="text-xs text-muted-foreground">
                        {disc.type === "percent" ? "%" : curr}
                      </Label>
                      <Input
                        id="discount-value"
                        type="number"
                        min={0}
                        step="0.01"
                        value={disc.value}
                        onChange={(e) => setDisc((p) => ({ ...p, value: Number(e.target.value) }))}
                      />
                    </div>
                    <div className="w-[200px] space-y-1">
                      <Label htmlFor="discount-label" className="text-xs text-muted-foreground">Etiqueta</Label>
                      <Input
                        id="discount-label"
                        maxLength={60}
                        value={disc.label ?? ""}
                        onChange={(e) => setDisc((p) => ({ ...p, label: e.target.value }))}
                        placeholder="Desconto de lançamento"
                      />
                    </div>
                  </>
                )}
              </div>
            </div>

            <div className="space-y-1 text-right">
              <div className="flex justify-between gap-8 text-sm text-muted-foreground">
                <span>Base tributável</span><span>{totals.net.toFixed(2)} {curr}</span>
              </div>
              <div className="flex justify-between gap-8 text-sm text-muted-foreground">
                <span>IVA</span><span>{totals.tax.toFixed(2)} {curr}</span>
              </div>
              {totals.discount > 0 && (
                <div className="flex justify-between gap-8 text-sm text-muted-foreground">
                  <span>Desconto</span><span>-{totals.discount.toFixed(2)} {curr}</span>
                </div>
              )}
              <p className="pt-1 text-[11px] uppercase tracking-wider text-muted-foreground">Total a pagar</p>
              <p className="text-2xl font-bold">{totals.total.toFixed(2)} {curr}</p>
            </div>
          </div>
        </div>
      </IXCard>

      <ProductPickerDialog open={pickerOpen} onOpenChange={setPickerOpen} onSelect={addFromCatalog} />
    </>
  );
}
