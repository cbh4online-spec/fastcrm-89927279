import { useState, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Trash2, ArrowLeft, Search, FileDown } from "lucide-react";
import { toast } from "sonner";
import { generateRentalContractPdf } from "../lib/generateRentalContractPdf";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CapabilityGuard } from "@/components/guards/CapabilityGuard";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { useCreateRentalContract } from "../hooks/useCreateRentalContract";
import type { NewRentalLineInput } from "../types";

interface CompanyOpt { id: string; name: string; tax_id: string | null; tags: string[] | null }
interface ProductOpt { id: string; name: string; base_price: number | null; sku: string | null }

function ProductSearchSelect({
  products,
  value,
  onChange,
}: {
  products: ProductOpt[];
  value: string | null;
  onChange: (productId: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const selected = products.find((p) => p.id === value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button type="button" variant="outline" className="h-10 w-full justify-between px-3 font-normal">
          <span className={selected ? "truncate text-left" : "truncate text-left text-muted-foreground"}>
            {selected ? selected.name : "Pesquisar produto…"}
          </span>
          <Search className="ml-2 h-4 w-4 shrink-0 text-muted-foreground" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-[520px] max-w-[calc(100vw-2rem)] p-0">
        <Command>
          <CommandInput placeholder="Escrever nome do produto…" />
          <CommandList className="max-h-72">
            <CommandEmpty>Sem produtos encontrados.</CommandEmpty>
            <CommandGroup>
              {products.map((p) => (
                <CommandItem
                  key={p.id}
                  value={`${p.name} ${p.sku ?? ""}`}
                  onSelect={() => {
                    onChange(p.id);
                    setOpen(false);
                  }}
                >
                  <span className="truncate">{p.name}</span>
                  {p.sku && <span className="ml-auto shrink-0 text-[10px] text-muted-foreground">{p.sku}</span>}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

export default function RentalContractNewPage() {
  const navigate = useNavigate();
  const { currentWorkspace } = useWorkspace();
  const wid = currentWorkspace?.id;
  const mutation = useCreateRentalContract();

  const [endClientId, setEndClientId] = useState("");
  const [financierId, setFinancierId] = useState("");
  const [contractRef, setContractRef] = useState("");
  const [startDate, setStartDate] = useState(new Date().toISOString().split("T")[0]);
  const [months, setMonths] = useState(36);
  const [notes, setNotes] = useState("");
  const [emitFinancier, setEmitFinancier] = useState(true);
  const [emitClientNote, setEmitClientNote] = useState(true);
  const [billingFreq, setBillingFreq] = useState<"monthly" | "quarterly">("monthly");
  const [manualAmount, setManualAmount] = useState(false);
  const [manualInstallment, setManualInstallment] = useState<number>(0);
  const [items, setItems] = useState<NewRentalLineInput[]>([
    { product_id: null, description: "", quantity: 1, unit_price: 0, serial_numbers: [""], track_serials: false },
  ]);
  const [prefilledFromProposal, setPrefilledFromProposal] = useState(false);
  const [linesLocked, setLinesLocked] = useState(false);

  // Pré-preencher a partir de proposta aceite (via sessionStorage)
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem("rental:prefillFromProposal");
      if (!raw) return;
      sessionStorage.removeItem("rental:prefillFromProposal");
      const p = JSON.parse(raw) as {
        end_client_company_id?: string;
        notes?: string;
        locked?: boolean;
        items?: NewRentalLineInput[];
      };
      if (p.end_client_company_id) setEndClientId(p.end_client_company_id);
      if (p.notes) setNotes(p.notes);
      if (Array.isArray(p.items) && p.items.length > 0) {
        setItems(
          p.items.map((l) => ({
            product_id: l.product_id ?? null,
            description: l.description ?? "",
            quantity: Number(l.quantity || 1),
            unit_price: Number(l.unit_price || 0),
            cost_price: l.cost_price != null ? Number(l.cost_price) : undefined,
            serial_numbers: Array.from({ length: Math.max(1, Number(l.quantity || 1)) }, () => ""),
            track_serials: false,
          })),
        );
        setPrefilledFromProposal(true);
        setLinesLocked(p.locked !== false);
      }
    } catch {
      /* ignore */
    }
  }, []);

  const { data: companies = [] } = useQuery({
    queryKey: ["rentals-companies", wid],
    queryFn: async () => {
      const { data } = await supabase.from("companies").select("id,name,tax_id,tags").eq("workspace_id", wid!).order("name").limit(500);
      return (data ?? []) as CompanyOpt[];
    },
    enabled: !!wid,
  });
  const { data: financiers = [] } = useQuery({
    queryKey: ["rentals-financiers", wid],
    queryFn: async () => {
      const { data } = await supabase.from("companies").select("id,name,tax_id,tags").eq("workspace_id", wid!).eq("is_financier", true).order("name").limit(500);
      return (data ?? []) as CompanyOpt[];
    },
    enabled: !!wid,
  });
  const { data: products = [] } = useQuery({
    queryKey: ["rentals-products", wid],
    queryFn: async () => {
      const { data } = await supabase.from("products").select("id,name,base_price,sku").eq("workspace_id", wid!).order("name").limit(500);
      return (data ?? []) as ProductOpt[];
    },
    enabled: !!wid,
  });

  const total = useMemo(() => items.reduce((s, l) => s + Number(l.quantity || 0) * Number(l.unit_price || 0), 0), [items]);
  const periodFactor = billingFreq === "quarterly" ? 3 : 1;
  // Renda automática por período (mensal ou trimestral) calculada a partir do total
  const autoInstallment = months > 0 ? (total / months) * periodFactor : 0;
  // Renda efectiva por período (manual ou automática)
  const installment = manualAmount ? Number(manualInstallment || 0) : autoInstallment;
  // Valor sempre guardado em base mensal na BD
  const monthly = installment / periodFactor;

  const updateItem = (i: number, patch: Partial<NewRentalLineInput>) => {
    setItems((arr) => arr.map((l, idx) => (idx === i ? { ...l, ...patch } : l)));
  };
  const updateSerials = (i: number, qty: number) => {
    setItems((arr) => arr.map((l, idx) => {
      if (idx !== i) return l;
      const sn = [...l.serial_numbers];
      while (sn.length < qty) sn.push("");
      return { ...l, quantity: qty, serial_numbers: sn.slice(0, qty) };
    }));
  };

  const submit = async () => {
    if (!endClientId || !financierId) return;
    try {
      const c = await mutation.mutateAsync({
        end_client_company_id: endClientId,
        financier_company_id: financierId,
        start_date: startDate,
        duration_months: months,
        monthly_amount: monthly,
        notes,
        items: items.filter((l) => l.description.trim()),
        emit_financier_invoice: emitFinancier,
        emit_client_note: emitClientNote,
        contract_number_override: contractRef.trim() || undefined,
        billing_frequency: billingFreq,
      });
      navigate(`/dashboard/rentals/${c.id}`);
    } catch { /* toast handled in hook */ }
  };

  return (
    <CapabilityGuard need="rentals.manage">
      <div className="p-6 max-w-4xl mx-auto space-y-6">
        <Button variant="ghost" size="sm" onClick={() => navigate("/dashboard/rentals")}><ArrowLeft className="h-4 w-4 mr-2" />Voltar</Button>
        <h1 className="text-2xl font-semibold">Novo contrato de renting</h1>

        <Card className="p-6 space-y-4">
          <h2 className="font-medium">1. Partes</h2>
          <div className="grid grid-cols-2 gap-4">
            <div><Label>Cliente final</Label>
              <Select value={endClientId} onValueChange={setEndClientId}>
                <SelectTrigger><SelectValue placeholder="Escolher cliente…" /></SelectTrigger>
                <SelectContent>{companies.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Financiadora</Label>
              <Select value={financierId} onValueChange={setFinancierId}>
                <SelectTrigger><SelectValue placeholder={financiers.length ? "Escolher financiadora…" : "Sem financiadoras — criar em Renting › Financiadoras"} /></SelectTrigger>
                <SelectContent>{financiers.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground mt-1">Apenas empresas marcadas como financiadoras.</p>
            </div>
          </div>
        </Card>

        <Card className="p-6 space-y-4">
          <h2 className="font-medium">2. Equipamento e prazo</h2>
          <div className="grid grid-cols-3 gap-4">
            <div><Label>Data de início</Label><Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} /></div>
            <div><Label>Prazo (meses)</Label><Input type="number" value={months} onChange={(e) => setMonths(Number(e.target.value))} /></div>
            <div><Label>Renda mensal calculada</Label><Input value={`${monthly.toFixed(2)} €`} disabled /></div>
          </div>

          {prefilledFromProposal && (
            <div className="flex items-center justify-between gap-3 rounded-md border border-blue-200 bg-blue-50 px-3 py-2 text-sm dark:border-blue-900 dark:bg-blue-950/40">
              <span className="text-blue-800 dark:text-blue-300">
                {linesLocked
                  ? "Linhas pré-preenchidas a partir da proposta — bloqueadas para evitar alterações acidentais."
                  : "Linhas pré-preenchidas a partir da proposta — modo edição activo."}
              </span>
              <Button
                type="button"
                size="sm"
                variant={linesLocked ? "outline" : "secondary"}
                onClick={() => setLinesLocked((v) => !v)}
              >
                {linesLocked ? "Editar linhas" : "Bloquear linhas"}
              </Button>
            </div>
          )}

          <div className="space-y-3">
            {items.map((line, i) => {
              const lineTotal = Number(line.quantity || 0) * Number(line.unit_price || 0);
              const lineCost = line.cost_price != null ? Number(line.cost_price) * Number(line.quantity || 0) : null;
              const marginPct = lineCost != null && lineTotal > 0 ? ((lineTotal - lineCost) / lineTotal) * 100 : null;
              return (
              <div key={i} className="border rounded-md p-3 space-y-2">
                <div className="grid grid-cols-12 gap-2">
                  <div className="col-span-4">
                    <Label className="text-xs">Produto</Label>
                    <ProductSearchSelect
                      products={products}
                      value={line.product_id}
                      onChange={(v) => {
                        if (linesLocked) return;
                        const p = products.find((x) => x.id === v);
                        updateItem(i, { product_id: v, description: p?.name ?? line.description, unit_price: p?.base_price ?? line.unit_price });
                      }}
                    />
                  </div>
                  <div className="col-span-3"><Label className="text-xs">Descrição</Label><Input value={line.description} disabled={linesLocked} onChange={(e) => updateItem(i, { description: e.target.value })} /></div>
                  <div className="col-span-1"><Label className="text-xs">Qtd</Label><Input type="number" min={1} value={line.quantity} disabled={linesLocked} onChange={(e) => updateSerials(i, Number(e.target.value))} /></div>
                  <div className="col-span-2"><Label className="text-xs">Preço unit.</Label><Input type="number" step="0.01" value={line.unit_price} disabled={linesLocked} onChange={(e) => updateItem(i, { unit_price: Number(e.target.value) })} /></div>
                  <div className="col-span-1 text-right pt-6 text-sm">{lineTotal.toFixed(2)} €</div>
                  <div className="col-span-1 pt-5">
                    <Button
                      variant="ghost"
                      size="icon"
                      disabled={linesLocked}
                      onClick={() => setItems((a) => a.filter((_, idx) => idx !== i))}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                {lineCost != null && (
                  <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                    <span>Custo unit.: <b>{Number(line.cost_price).toFixed(2)} €</b></span>
                    <span>Custo total: <b>{lineCost.toFixed(2)} €</b></span>
                    {marginPct != null && (
                      <span className={marginPct < 0 ? "text-destructive" : marginPct < 15 ? "text-amber-600" : "text-emerald-600"}>
                        Margem: <b>{marginPct.toFixed(1)}%</b>
                      </span>
                    )}
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id={`track-${i}`}
                    checked={line.track_serials ?? false}
                    onChange={(e) => updateItem(i, { track_serials: e.target.checked })}
                  />
                  <Label htmlFor={`track-${i}`} className="text-xs cursor-pointer">
                    Equipamento físico (registar Nºs de série)
                  </Label>
                </div>
                {line.track_serials && (
                  <div className="grid grid-cols-1 gap-1">
                    <Label className="text-xs">Nºs de série ({line.quantity})</Label>
                    <div className="grid grid-cols-3 gap-2">
                      {line.serial_numbers.map((sn, sIdx) => (
                        <Input key={sIdx} placeholder={`Nº série ${sIdx + 1}`} value={sn} onChange={(e) => {
                          const arr = [...line.serial_numbers]; arr[sIdx] = e.target.value;
                          updateItem(i, { serial_numbers: arr });
                        }} />
                      ))}
                    </div>
                  </div>
                )}
              </div>
              );
            })}
            <Button
              variant="outline"
              size="sm"
              disabled={linesLocked}
              onClick={() => setItems((a) => [...a, { product_id: null, description: "", quantity: 1, unit_price: 0, serial_numbers: [""], track_serials: false }])}
            >
              <Plus className="h-4 w-4 mr-2" />Adicionar linha
            </Button>
          </div>
          <div className="flex justify-end text-lg font-semibold">Total financiado: {total.toFixed(2)} €</div>
        </Card>

        <Card className="p-6 space-y-4">
          <h2 className="font-medium">3. Faturação e notas</h2>
          <div className="flex items-center gap-2"><Checkbox checked={emitFinancier} onCheckedChange={(v) => setEmitFinancier(!!v)} id="ef" /><Label htmlFor="ef">Emitir fatura à financiadora agora</Label></div>
          <div className="flex items-center gap-2"><Checkbox checked={emitClientNote} onCheckedChange={(v) => setEmitClientNote(!!v)} id="ec" /><Label htmlFor="ec">Gerar nota informativa (proforma) ao cliente final</Label></div>
          <div><Label>Notas internas</Label><Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} /></div>
        </Card>

        <div className="flex flex-wrap justify-end gap-2">
          <Button variant="ghost" onClick={() => navigate("/dashboard/rentals")}>Cancelar</Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              const validItems = items.filter((l) => l.description.trim());
              if (validItems.length === 0) {
                toast.error("Adiciona pelo menos uma linha com descrição.");
                return;
              }
              const client = companies.find((c) => c.id === endClientId);
              const fin = financiers.find((c) => c.id === financierId);
              const doc = generateRentalContractPdf({
                end_client_name: client?.name,
                end_client_tax_id: client?.tax_id ?? null,
                financier_name: fin?.name,
                financier_tax_id: fin?.tax_id ?? null,
                start_date: startDate,
                duration_months: months,
                monthly_amount: monthly,
                total_financed: total,
                notes,
                items: validItems,
              });
              const fname = `pre-renting_${client?.name?.replace(/\s+/g, "-").toLowerCase() ?? "cliente"}_${startDate}.pdf`;
              doc.save(fname);
            }}
          >
            <FileDown className="h-4 w-4 mr-2" />Pré-visualizar PDF
          </Button>
          <Button onClick={submit} disabled={mutation.isPending || !endClientId || !financierId}>{mutation.isPending ? "A criar…" : "Criar contrato"}</Button>
        </div>
      </div>
    </CapabilityGuard>
  );
}
