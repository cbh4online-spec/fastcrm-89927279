import { useState, useRef, useEffect } from "react";
import { useCreateRenewalItem } from "@/hooks/useRenewals";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useDebounce } from "@/hooks/use-debounce";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Search, Package } from "lucide-react";
import type { RenewalItemType, RenewalPricingModel, RenewalIntervalType, CreateRenewalItemInput } from "@/types/renewal";
import { RENEWAL_ITEM_TYPE_LABELS, PRICING_MODEL_LABELS, RENEWAL_INTERVAL_LABELS } from "@/types/renewal";

interface Props {
  contractId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateRenewalItemDialog({ contractId, open, onOpenChange }: Props) {
  const createItem = useCreateRenewalItem();
  const { currentWorkspace } = useWorkspace();
  const [form, setForm] = useState<Partial<CreateRenewalItemInput> & { product_id?: string }>({
    item_type: "subscription",
    pricing_model: "fixed",
    renewal_interval: "yearly",
    qty: 1,
    unit_price: 0,
    name: "",
  });

  const [nameInput, setNameInput] = useState("");
  const [popoverOpen, setPopoverOpen] = useState(false);
  const debouncedSearch = useDebounce(nameInput, 300);
  const inputRef = useRef<HTMLInputElement>(null);

  const { data: products = [], isLoading } = useQuery({
    queryKey: ["products-search-renewal", currentWorkspace?.id, debouncedSearch],
    queryFn: async () => {
      if (!currentWorkspace?.id) return [];
      let query = supabase
        .from("products")
        .select("id, name, sku, base_price")
        .eq("workspace_id", currentWorkspace.id)
        .eq("status", "active")
        .order("name")
        .limit(10);

      if (debouncedSearch.trim()) {
        query = query.or(`name.ilike.%${debouncedSearch}%,sku.ilike.%${debouncedSearch}%`);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
    enabled: open && !!currentWorkspace?.id && nameInput.trim().length > 0,
  });

  // Show popover when there are results or loading
  useEffect(() => {
    if (nameInput.trim().length > 0 && (products.length > 0 || isLoading)) {
      setPopoverOpen(true);
    } else {
      setPopoverOpen(false);
    }
  }, [products, isLoading, nameInput]);

  const handleSelectProduct = (product: { id: string; name: string; sku: string | null; base_price: number | null }) => {
    setNameInput(product.name);
    setForm({
      ...form,
      name: product.name,
      unit_price: product.base_price || 0,
      product_id: product.id,
    });
    setPopoverOpen(false);
  };

  const handleNameChange = (value: string) => {
    setNameInput(value);
    setForm({ ...form, name: value, product_id: undefined });
  };

  const handleSubmit = () => {
    if (!form.name || !form.unit_price) return;

    const meta: Record<string, unknown> = {};
    if (form.item_type === "hours_pack") {
      meta.hours_included = form.qty || 0;
      meta.hours_remaining = form.qty || 0;
    }
    if (form.product_id) {
      meta.product_id = form.product_id;
    }

    createItem.mutate(
      {
        contract_id: contractId,
        item_type: form.item_type as RenewalItemType,
        name: form.name!,
        qty: form.qty,
        unit_price: form.unit_price!,
        pricing_model: form.pricing_model as RenewalPricingModel,
        renewal_interval: form.renewal_interval as RenewalIntervalType,
        next_renewal_date: form.next_renewal_date,
        meta_json: meta,
      },
      {
        onSuccess: () => {
          onOpenChange(false);
          setForm({ item_type: "subscription", pricing_model: "fixed", renewal_interval: "yearly", qty: 1, unit_price: 0, name: "" });
          setNameInput("");
        },
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Adicionar Item</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Nome</Label>
            <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
              <PopoverTrigger asChild>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    ref={inputRef}
                    value={nameInput}
                    onChange={(e) => handleNameChange(e.target.value)}
                    placeholder="Pesquisar produto ou escrever nome..."
                    className="pl-9"
                  />
                </div>
              </PopoverTrigger>
              <PopoverContent
                className="p-0 w-[var(--radix-popover-trigger-width)]"
                align="start"
                sideOffset={4}
                onOpenAutoFocus={(e) => e.preventDefault()}
              >
                <div className="max-h-48 overflow-y-auto">
                  {isLoading ? (
                    <p className="text-sm text-muted-foreground text-center py-3">A pesquisar...</p>
                  ) : products.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-3">Nenhum produto encontrado</p>
                  ) : (
                    products.map((p) => (
                      <div
                        key={p.id}
                        className="flex items-center gap-3 px-3 py-2 hover:bg-muted/50 cursor-pointer"
                        onClick={() => handleSelectProduct(p)}
                      >
                        <Package className="h-4 w-4 text-muted-foreground shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{p.name}</p>
                          {p.sku && <p className="text-xs text-muted-foreground">SKU: {p.sku}</p>}
                        </div>
                        <span className="text-sm font-medium text-muted-foreground">
                          €{(p.base_price || 0).toFixed(2)}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </PopoverContent>
            </Popover>
            {form.product_id && (
              <p className="text-xs text-muted-foreground mt-1">Produto selecionado do catálogo</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Tipo</Label>
              <Select value={form.item_type} onValueChange={(v) => setForm({ ...form, item_type: v as RenewalItemType })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(RENEWAL_ITEM_TYPE_LABELS).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Modelo Preço</Label>
              <Select value={form.pricing_model} onValueChange={(v) => setForm({ ...form, pricing_model: v as RenewalPricingModel })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(PRICING_MODEL_LABELS).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label>{form.item_type === "hours_pack" ? "Horas" : "Quantidade"}</Label>
              <Input type="number" min="0" value={form.qty || ""} onChange={(e) => setForm({ ...form, qty: parseFloat(e.target.value) })} />
            </div>
            <div>
              <Label>Preço Unit. (€)</Label>
              <Input type="number" min="0" step="0.01" value={form.unit_price || ""} onChange={(e) => setForm({ ...form, unit_price: parseFloat(e.target.value) })} />
            </div>
            <div>
              <Label>Intervalo</Label>
              <Select value={form.renewal_interval} onValueChange={(v) => setForm({ ...form, renewal_interval: v as RenewalIntervalType })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(RENEWAL_INTERVAL_LABELS).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label>Próxima Renovação</Label>
            <Input type="date" value={form.next_renewal_date || ""} onChange={(e) => setForm({ ...form, next_renewal_date: e.target.value })} />
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button onClick={handleSubmit} disabled={createItem.isPending || !form.name}>
              {createItem.isPending ? "A adicionar..." : "Adicionar"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
