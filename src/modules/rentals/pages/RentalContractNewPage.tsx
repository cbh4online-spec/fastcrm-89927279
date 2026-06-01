import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Trash2, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CapabilityGuard } from "@/components/guards/CapabilityGuard";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { useCreateRentalContract } from "../hooks/useCreateRentalContract";
import type { NewRentalLineInput } from "../types";

interface CompanyOpt { id: string; name: string; tax_id: string | null; tags: string[] | null }
interface ProductOpt { id: string; name: string; base_price: number | null; sku: string | null }

export default function RentalContractNewPage() {
  const navigate = useNavigate();
  const { currentWorkspace } = useWorkspace();
  const wid = currentWorkspace?.id;
  const mutation = useCreateRentalContract();

  const [endClientId, setEndClientId] = useState("");
  const [financierId, setFinancierId] = useState("");
  const [startDate, setStartDate] = useState(new Date().toISOString().split("T")[0]);
  const [months, setMonths] = useState(36);
  const [notes, setNotes] = useState("");
  const [emitFinancier, setEmitFinancier] = useState(true);
  const [emitClientNote, setEmitClientNote] = useState(true);
  const [items, setItems] = useState<NewRentalLineInput[]>([
    { product_id: null, description: "", quantity: 1, unit_price: 0, serial_numbers: [""] },
  ]);

  const { data: companies = [] } = useQuery({
    queryKey: ["rentals-companies", wid],
    queryFn: async () => {
      const { data } = await supabase.from("companies").select("id,name,tax_id,tags").eq("workspace_id", wid!).order("name").limit(500);
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
  const monthly = months > 0 ? total / months : 0;

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
                <SelectTrigger><SelectValue placeholder="Escolher financiadora…" /></SelectTrigger>
                <SelectContent>{companies.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground mt-1">Cria a Liquid em Empresas se ainda não existir.</p>
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

          <div className="space-y-3">
            {items.map((line, i) => (
              <div key={i} className="border rounded-md p-3 space-y-2">
                <div className="grid grid-cols-12 gap-2">
                  <div className="col-span-4">
                    <Label className="text-xs">Produto</Label>
                    <Select value={line.product_id ?? ""} onValueChange={(v) => {
                      const p = products.find((x) => x.id === v);
                      updateItem(i, { product_id: v, description: p?.name ?? line.description, unit_price: p?.base_price ?? line.unit_price });
                    }}>
                      <SelectTrigger><SelectValue placeholder="Produto…" /></SelectTrigger>
                      <SelectContent>{products.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div className="col-span-3"><Label className="text-xs">Descrição</Label><Input value={line.description} onChange={(e) => updateItem(i, { description: e.target.value })} /></div>
                  <div className="col-span-1"><Label className="text-xs">Qtd</Label><Input type="number" min={1} value={line.quantity} onChange={(e) => updateSerials(i, Number(e.target.value))} /></div>
                  <div className="col-span-2"><Label className="text-xs">Preço unit.</Label><Input type="number" step="0.01" value={line.unit_price} onChange={(e) => updateItem(i, { unit_price: Number(e.target.value) })} /></div>
                  <div className="col-span-1 text-right pt-6 text-sm">{(line.quantity * line.unit_price).toFixed(2)} €</div>
                  <div className="col-span-1 pt-5"><Button variant="ghost" size="icon" onClick={() => setItems((a) => a.filter((_, idx) => idx !== i))}><Trash2 className="h-4 w-4" /></Button></div>
                </div>
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
              </div>
            ))}
            <Button variant="outline" size="sm" onClick={() => setItems((a) => [...a, { product_id: null, description: "", quantity: 1, unit_price: 0, serial_numbers: [""] }])}><Plus className="h-4 w-4 mr-2" />Adicionar linha</Button>
          </div>
          <div className="flex justify-end text-lg font-semibold">Total financiado: {total.toFixed(2)} €</div>
        </Card>

        <Card className="p-6 space-y-4">
          <h2 className="font-medium">3. Faturação e notas</h2>
          <div className="flex items-center gap-2"><Checkbox checked={emitFinancier} onCheckedChange={(v) => setEmitFinancier(!!v)} id="ef" /><Label htmlFor="ef">Emitir fatura à financiadora agora</Label></div>
          <div className="flex items-center gap-2"><Checkbox checked={emitClientNote} onCheckedChange={(v) => setEmitClientNote(!!v)} id="ec" /><Label htmlFor="ec">Gerar nota informativa (proforma) ao cliente final</Label></div>
          <div><Label>Notas internas</Label><Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} /></div>
        </Card>

        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={() => navigate("/dashboard/rentals")}>Cancelar</Button>
          <Button onClick={submit} disabled={mutation.isPending || !endClientId || !financierId}>{mutation.isPending ? "A criar…" : "Criar contrato"}</Button>
        </div>
      </div>
    </CapabilityGuard>
  );
}
