import { useState, useMemo } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, Search, Loader2, Send, MessageCircle } from "lucide-react";
import { useProducts } from "@/hooks/useProducts";
import { useCreateQuickProposal, type QuickProposalLine } from "@/hooks/proposals/useQuickProposal";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  opportunityId: string;
  opportunityTitle: string;
  contactId?: string | null;
  companyId?: string | null;
  defaultCurrency?: string;
}

const fmt = (v: number, c = "EUR") =>
  new Intl.NumberFormat("pt-PT", { style: "currency", currency: c }).format(v);

export function QuickProposalDrawer({
  open,
  onOpenChange,
  opportunityId,
  opportunityTitle,
  contactId,
  companyId,
  defaultCurrency = "EUR",
}: Props) {
  const [title, setTitle] = useState(`Proposta — ${opportunityTitle}`);
  const [validityDays, setValidityDays] = useState(7);
  const [paymentConditions, setPaymentConditions] = useState("Pronto pagamento");
  const [sendWhatsApp, setSendWhatsApp] = useState(true);
  const [lines, setLines] = useState<QuickProposalLine[]>([]);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [search, setSearch] = useState("");

  const { data: products = [], isLoading: loadingProducts } = useProducts({ status: "active", search });
  const create = useCreateQuickProposal();

  const subtotal = useMemo(() => lines.reduce((a, l) => a + l.quantity * l.unit_price, 0), [lines]);
  const tax = subtotal * 0.23;
  const total = subtotal + tax;

  const addProduct = (p: any) => {
    setLines((prev) => [
      ...prev,
      { product_id: p.id, name: p.name, quantity: 1, unit_price: Number(p.base_price || 0) },
    ]);
    setPickerOpen(false);
    setSearch("");
  };

  const addCustom = () => {
    setLines((prev) => [...prev, { product_id: null, name: "", quantity: 1, unit_price: 0 }]);
  };

  const updateLine = (idx: number, patch: Partial<QuickProposalLine>) => {
    setLines((prev) => prev.map((l, i) => (i === idx ? { ...l, ...patch } : l)));
  };

  const removeLine = (idx: number) => setLines((prev) => prev.filter((_, i) => i !== idx));

  const handleSubmit = async () => {
    const cleanLines = lines
      .filter((l) => l.name.trim() && l.quantity > 0)
      .map((l) => ({ ...l, name: l.name.trim() }));
    if (cleanLines.length === 0) return;

    await create.mutateAsync({
      opportunity_id: opportunityId,
      title: title.trim() || opportunityTitle,
      contact_id: contactId ?? null,
      company_id: companyId ?? null,
      currency: defaultCurrency,
      validity_days: validityDays,
      payment_conditions: paymentConditions,
      lines: cleanLines,
      send_whatsapp: sendWhatsApp && !!contactId,
    });
    onOpenChange(false);
    setLines([]);
  };

  const canSubmit =
    lines.length > 0 &&
    lines.every((l) => l.name.trim() && l.quantity > 0 && l.unit_price >= 0) &&
    !create.isPending;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-2xl flex flex-col p-0">
        <SheetHeader className="px-6 pt-6 pb-3">
          <SheetTitle>Proposta rápida</SheetTitle>
          <SheetDescription>
            Adicione produtos do catálogo, gere a proposta e envie por WhatsApp num clique.
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-6 space-y-5">
          {/* Título */}
          <div className="space-y-1.5">
            <Label htmlFor="qp-title">Título</Label>
            <Input id="qp-title" value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>

          {/* Linhas */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Itens</Label>
              <div className="flex gap-2">
                <Popover open={pickerOpen} onOpenChange={setPickerOpen}>
                  <PopoverTrigger asChild>
                    <Button size="sm" variant="outline" className="gap-1.5">
                      <Search className="h-3.5 w-3.5" />
                      Catálogo
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[420px] p-0" align="end">
                    <Command shouldFilter={false}>
                      <CommandInput
                        placeholder="Pesquisar produto…"
                        value={search}
                        onValueChange={setSearch}
                      />
                      <CommandList>
                        {loadingProducts ? (
                          <div className="p-4 text-sm text-muted-foreground flex items-center gap-2">
                            <Loader2 className="h-3.5 w-3.5 animate-spin" /> A carregar…
                          </div>
                        ) : products.length === 0 ? (
                          <CommandEmpty>Sem produtos.</CommandEmpty>
                        ) : (
                          <CommandGroup>
                            {products.slice(0, 100).map((p: any) => (
                              <CommandItem
                                key={p.id}
                                value={p.id}
                                onSelect={() => addProduct(p)}
                                className="flex justify-between gap-2"
                              >
                                <span className="truncate">{p.name}</span>
                                <span className="text-xs text-muted-foreground shrink-0">
                                  {fmt(Number(p.base_price || 0), p.currency || defaultCurrency)}
                                </span>
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        )}
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
                <Button size="sm" variant="ghost" className="gap-1.5" onClick={addCustom}>
                  <Plus className="h-3.5 w-3.5" />
                  Linha livre
                </Button>
              </div>
            </div>

            {lines.length === 0 ? (
              <div className="border border-dashed rounded-md p-6 text-center text-sm text-muted-foreground">
                Sem itens. Adicione do catálogo ou crie uma linha livre.
              </div>
            ) : (
              <div className="space-y-2">
                {lines.map((line, idx) => (
                  <div
                    key={idx}
                    className="grid grid-cols-[1fr_70px_110px_110px_32px] gap-2 items-center"
                  >
                    <Input
                      placeholder="Descrição"
                      value={line.name}
                      onChange={(e) => updateLine(idx, { name: e.target.value })}
                      className="h-9"
                    />
                    <Input
                      type="number"
                      min={0}
                      step="0.01"
                      value={line.quantity}
                      onChange={(e) => updateLine(idx, { quantity: Number(e.target.value) || 0 })}
                      className="h-9 text-right"
                    />
                    <Input
                      type="number"
                      min={0}
                      step="0.01"
                      value={line.unit_price}
                      onChange={(e) => updateLine(idx, { unit_price: Number(e.target.value) || 0 })}
                      className="h-9 text-right"
                    />
                    <div className="text-right text-sm font-medium tabular-nums">
                      {fmt(line.quantity * line.unit_price, defaultCurrency)}
                    </div>
                    <Button size="icon" variant="ghost" onClick={() => removeLine(idx)} className="h-8 w-8">
                      <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <Separator />

          {/* Condições */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="qp-validity">Validade (dias)</Label>
              <Input
                id="qp-validity"
                type="number"
                min={1}
                value={validityDays}
                onChange={(e) => setValidityDays(Math.max(1, Number(e.target.value) || 7))}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="qp-pay">Condições de pagamento</Label>
              <Input
                id="qp-pay"
                value={paymentConditions}
                onChange={(e) => setPaymentConditions(e.target.value)}
              />
            </div>
          </div>

          <div className="flex items-center justify-between rounded-md border bg-muted/30 px-4 py-3">
            <div className="flex items-center gap-2">
              <MessageCircle className="h-4 w-4 text-muted-foreground" />
              <Label htmlFor="qp-wa" className="cursor-pointer">
                Enviar por WhatsApp ao criar
              </Label>
              {!contactId && (
                <Badge variant="outline" className="text-xs">
                  Sem contacto
                </Badge>
              )}
            </div>
            <Switch
              id="qp-wa"
              checked={sendWhatsApp && !!contactId}
              disabled={!contactId}
              onCheckedChange={setSendWhatsApp}
            />
          </div>

          {/* Totais */}
          <div className="rounded-md border p-4 space-y-1.5 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Subtotal</span>
              <span className="tabular-nums">{fmt(subtotal, defaultCurrency)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">IVA (23%)</span>
              <span className="tabular-nums">{fmt(tax, defaultCurrency)}</span>
            </div>
            <Separator className="my-1" />
            <div className="flex justify-between text-base font-semibold">
              <span>Total</span>
              <span className="tabular-nums">{fmt(total, defaultCurrency)}</span>
            </div>
          </div>
        </div>

        <SheetFooter className="px-6 py-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={create.isPending}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={!canSubmit} className="gap-2">
            {create.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            {sendWhatsApp && contactId ? "Criar e enviar WhatsApp" : "Criar proposta"}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
