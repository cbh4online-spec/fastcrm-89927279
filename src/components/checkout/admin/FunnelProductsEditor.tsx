import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, Loader2 } from "lucide-react";
import { IXCard } from "@/components/entity/ix/IXCard";
import { CURRENCIES, FunnelProduct, funnelProductsSchema, funnelTotal } from "@/schemas/checkout/funnelSchema";
import { toast } from "sonner";

interface Props {
  products: FunnelProduct[];
  currency: string;
  saving: boolean;
  onSave: (products: FunnelProduct[], currency: string) => void;
}

export function FunnelProductsEditor({ products, currency, saving, onSave }: Props) {
  const [rows, setRows] = useState<FunnelProduct[]>(products);
  const [curr, setCurr] = useState(currency);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => { setRows(products); setCurr(currency); }, [products, currency]);

  function update(index: number, patch: Partial<FunnelProduct>) {
    setRows((prev) => prev.map((r, i) => (i === index ? { ...r, ...patch } : r)));
  }

  function handleSave() {
    const parsed = funnelProductsSchema.safeParse(rows);
    if (!parsed.success) {
      const next: Record<string, string> = {};
      parsed.error.issues.forEach((issue) => {
        next[issue.path.join(".")] = issue.message;
      });
      setErrors(next);
      toast.error(parsed.error.issues[0]?.message ?? "Verifique os produtos");
      return;
    }
    setErrors({});
    onSave(parsed.data, curr);
  }

  const total = funnelTotal(rows);

  return (
    <IXCard
      title="Produtos & preço"
      description="Itens apresentados ao cliente no checkout."
      actions={
        <Button onClick={handleSave} disabled={saving}>
          {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Guardar
        </Button>
      }
    >
      <div className="space-y-4">
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

        <div className="space-y-3">
          {rows.map((row, index) => (
            <div key={index} className="grid gap-3 sm:grid-cols-[1fr_100px_140px_auto] sm:items-end">
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
                <Label htmlFor={`prod-price-${index}`} className="text-xs text-muted-foreground">Preço ({curr})</Label>
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
              <Button
                variant="ghost"
                size="icon"
                aria-label={`Remover produto ${row.name || index + 1}`}
                onClick={() => setRows((prev) => prev.filter((_, i) => i !== index))}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
          <Button
            variant="outline"
            onClick={() => setRows((prev) => [...prev, { name: "", quantity: 1, price: 0 }])}
            disabled={rows.length >= 20}
          >
            <Plus className="mr-2 h-4 w-4" /> Adicionar produto
          </Button>
          <div className="text-right">
            <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Total</p>
            <p className="text-2xl font-bold">{total.toFixed(2)} {curr}</p>
          </div>
        </div>
      </div>
    </IXCard>
  );
}
