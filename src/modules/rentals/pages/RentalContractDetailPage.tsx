import { useParams, Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { ArrowLeft, Receipt, Wrench, Pencil, Save, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CapabilityGuard } from "@/components/guards/CapabilityGuard";
import { useRentalContract, useRentalContractEvents, useContractEquipment } from "../hooks/useRentalContracts";
import { ContractStatusBadge, EquipmentStatusBadge } from "../components/EquipmentStatusBadge";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import type { RentalStatus } from "../types";

const STATUS_OPTIONS: RentalStatus[] = ["draft", "active", "ended", "renewed", "cancelled", "defaulted"];

export default function RentalContractDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data: c, isLoading } = useRentalContract(id);
  const { data: events = [] } = useRentalContractEvents(id);
  const { data: equipment = [] } = useContractEquipment(id);
  const qc = useQueryClient();

  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    contract_number: "",
    status: "draft" as RentalStatus,
    start_date: "",
    end_date: "",
    duration_months: 0,
    monthly_amount: 0,
    total_financed: 0,
    financier_commission: 0,
    notes: "",
  });

  useEffect(() => {
    if (!c) return;
    setForm({
      contract_number: c.contract_number ?? "",
      status: c.status,
      start_date: c.start_date ?? "",
      end_date: c.end_date ?? "",
      duration_months: Number(c.duration_months ?? 0),
      monthly_amount: Number(c.monthly_amount ?? 0),
      total_financed: Number(c.total_financed ?? 0),
      financier_commission: Number(c.financier_commission ?? 0),
      notes: c.notes ?? "",
    });
  }, [c]);

  async function handleSave() {
    if (!id) return;
    setSaving(true);
    try {
      const payload: any = {
        contract_number: form.contract_number.trim() || null,
        status: form.status,
        start_date: form.start_date || null,
        end_date: form.end_date || null,
        duration_months: form.duration_months || null,
        monthly_amount: Number(form.monthly_amount) || 0,
        total_financed: Number(form.total_financed) || 0,
        financier_commission: Number(form.financier_commission) || 0,
        notes: form.notes || null,
      };
      const { error } = await supabase.from("rental_contracts").update(payload).eq("id", id);
      if (error) throw error;
      toast.success("Contrato atualizado");
      setEditing(false);
      await qc.invalidateQueries({ queryKey: ["rental-contract", id] });
      await qc.invalidateQueries({ queryKey: ["rental-contracts"] });
    } catch (e: any) {
      toast.error(e.message ?? "Erro ao guardar");
    } finally {
      setSaving(false);
    }
  }

  if (isLoading) return <div className="p-6 text-muted-foreground">A carregar…</div>;
  if (!c) return <div className="p-6">Contrato não encontrado.</div>;

  return (
    <CapabilityGuard need="rentals.view">
      <div className="p-6 space-y-6">
        <Button variant="ghost" size="sm" asChild><Link to="/dashboard/rentals"><ArrowLeft className="h-4 w-4 mr-2" />Contratos</Link></Button>
        <header className="flex items-center justify-between gap-4">
          <div className="flex-1 min-w-0">
            {editing ? (
              <div className="space-y-2 max-w-md">
                <Label className="text-xs">Referência do contrato</Label>
                <Input value={form.contract_number} onChange={(e) => setForm({ ...form, contract_number: e.target.value })} />
              </div>
            ) : (
              <>
                <h1 className="text-2xl font-semibold">{c.contract_number}</h1>
                <p className="text-sm text-muted-foreground">Cliente final: <strong>{c.end_client?.name ?? "—"}</strong> · Financiadora: <strong>{c.financier?.name ?? "—"}</strong></p>
              </>
            )}
          </div>
          <div className="flex items-center gap-2">
            {editing ? (
              <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v as RentalStatus })}>
                <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            ) : (
              <ContractStatusBadge status={c.status} />
            )}
            <CapabilityGuard need="rentals.manage" fallback={null}>
              {editing ? (
                <>
                  <Button variant="ghost" size="sm" onClick={() => setEditing(false)} disabled={saving}><X className="h-4 w-4 mr-1" />Cancelar</Button>
                  <Button size="sm" onClick={handleSave} disabled={saving}><Save className="h-4 w-4 mr-1" />{saving ? "A guardar…" : "Guardar"}</Button>
                </>
              ) : (
                <Button variant="outline" size="sm" onClick={() => setEditing(true)}><Pencil className="h-4 w-4 mr-1" />Editar</Button>
              )}
            </CapabilityGuard>
          </div>
        </header>

        {editing ? (
          <Card className="p-4 grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="space-y-1">
              <Label className="text-xs">Início</Label>
              <Input type="date" value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Fim previsto</Label>
              <Input type="date" value={form.end_date} onChange={(e) => setForm({ ...form, end_date: e.target.value })} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Duração (meses)</Label>
              <Input type="number" min={0} value={form.duration_months} onChange={(e) => setForm({ ...form, duration_months: Number(e.target.value) })} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Renda mensal (€)</Label>
              <Input type="number" step="0.01" min={0} value={form.monthly_amount} onChange={(e) => setForm({ ...form, monthly_amount: Number(e.target.value) })} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Total financiado (€)</Label>
              <Input type="number" step="0.01" min={0} value={form.total_financed} onChange={(e) => setForm({ ...form, total_financed: Number(e.target.value) })} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Comissão financiadora (€)</Label>
              <Input type="number" step="0.01" min={0} value={form.financier_commission} onChange={(e) => setForm({ ...form, financier_commission: Number(e.target.value) })} />
            </div>
            <div className="space-y-1 col-span-2 md:col-span-4">
              <Label className="text-xs">Notas</Label>
              <Textarea rows={3} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
            </div>
          </Card>
        ) : (
          <div className="grid grid-cols-4 gap-4">
            <Card className="p-4"><div className="text-xs text-muted-foreground">Início</div><div className="text-lg font-semibold">{c.start_date ?? "—"}</div></Card>
            <Card className="p-4"><div className="text-xs text-muted-foreground">Fim previsto</div><div className="text-lg font-semibold">{c.end_date ?? "—"}</div></Card>
            <Card className="p-4"><div className="text-xs text-muted-foreground">Renda mensal</div><div className="text-lg font-semibold">{Number(c.monthly_amount).toFixed(2)} €</div></Card>
            <Card className="p-4"><div className="text-xs text-muted-foreground">Total financiado</div><div className="text-lg font-semibold">{Number(c.total_financed).toFixed(2)} €</div></Card>
          </div>
        )}

        <Tabs defaultValue="items">
          <TabsList>
            <TabsTrigger value="items">Equipamentos</TabsTrigger>
            <TabsTrigger value="invoices">Faturas</TabsTrigger>
            <TabsTrigger value="timeline">Timeline</TabsTrigger>
          </TabsList>

          <TabsContent value="items">
            <Card className="p-0">
              <Table>
                <TableHeader><TableRow><TableHead>Produto</TableHead><TableHead>Nº de série</TableHead><TableHead>Estado</TableHead><TableHead></TableHead></TableRow></TableHeader>
                <TableBody>
                  {equipment.length === 0 && <TableRow><TableCell colSpan={4} className="text-center py-6 text-muted-foreground">Sem equipamentos.</TableCell></TableRow>}
                  {equipment.map((u: any) => (
                    <TableRow key={u.id}>
                      <TableCell>{u.product?.name ?? "—"}</TableCell>
                      <TableCell className="font-mono">{u.serial_number}</TableCell>
                      <TableCell><EquipmentStatusBadge status={u.status} /></TableCell>
                      <TableCell className="text-right"><Button variant="ghost" size="sm" asChild><Link to={`/dashboard/rentals/equipment/${u.id}`}><Wrench className="h-4 w-4 mr-1" />Abrir</Link></Button></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          </TabsContent>

          <TabsContent value="invoices">
            <Card className="p-6 space-y-3">
              {c.liquid_invoice_id && <Button variant="outline" asChild><Link to={`/dashboard/invoices/${c.liquid_invoice_id}`}><Receipt className="h-4 w-4 mr-2" />Fatura à financiadora</Link></Button>}
              {c.client_note_id && <Button variant="outline" asChild><Link to={`/dashboard/invoices/${c.client_note_id}`}><Receipt className="h-4 w-4 mr-2" />Nota ao cliente final</Link></Button>}
              {!c.liquid_invoice_id && !c.client_note_id && <p className="text-sm text-muted-foreground">Sem documentos emitidos.</p>}
            </Card>
          </TabsContent>

          <TabsContent value="timeline">
            <Card className="p-4 space-y-2">
              {events.length === 0 && <p className="text-sm text-muted-foreground">Sem eventos.</p>}
              {events.map((e: any) => (
                <div key={e.id} className="text-sm border-l-2 border-emerald-500 pl-3 py-1">
                  <span className="font-medium">{e.event_type}</span>
                  <span className="text-muted-foreground ml-2">{new Date(e.occurred_at).toLocaleString("pt-PT")}</span>
                </div>
              ))}
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </CapabilityGuard>
  );
}
