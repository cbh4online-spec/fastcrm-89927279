import { useParams, Link } from "react-router-dom";
import { ArrowLeft, Receipt, Wrench } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CapabilityGuard } from "@/components/guards/CapabilityGuard";
import { useRentalContract, useRentalContractEvents, useContractEquipment } from "../hooks/useRentalContracts";
import { ContractStatusBadge, EquipmentStatusBadge } from "../components/EquipmentStatusBadge";

export default function RentalContractDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data: c, isLoading } = useRentalContract(id);
  const { data: events = [] } = useRentalContractEvents(id);
  const { data: equipment = [] } = useContractEquipment(id);

  if (isLoading) return <div className="p-6 text-muted-foreground">A carregar…</div>;
  if (!c) return <div className="p-6">Contrato não encontrado.</div>;

  return (
    <CapabilityGuard need="rentals.view">
      <div className="p-6 space-y-6">
        <Button variant="ghost" size="sm" asChild><Link to="/dashboard/rentals"><ArrowLeft className="h-4 w-4 mr-2" />Contratos</Link></Button>
        <header className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold">{c.contract_number}</h1>
            <p className="text-sm text-muted-foreground">Cliente final: <strong>{c.end_client?.name ?? "—"}</strong> · Financiadora: <strong>{c.financier?.name ?? "—"}</strong></p>
          </div>
          <ContractStatusBadge status={c.status} />
        </header>

        <div className="grid grid-cols-4 gap-4">
          <Card className="p-4"><div className="text-xs text-muted-foreground">Início</div><div className="text-lg font-semibold">{c.start_date ?? "—"}</div></Card>
          <Card className="p-4"><div className="text-xs text-muted-foreground">Fim previsto</div><div className="text-lg font-semibold">{c.end_date ?? "—"}</div></Card>
          <Card className="p-4"><div className="text-xs text-muted-foreground">Renda mensal</div><div className="text-lg font-semibold">{Number(c.monthly_amount).toFixed(2)} €</div></Card>
          <Card className="p-4"><div className="text-xs text-muted-foreground">Total financiado</div><div className="text-lg font-semibold">{Number(c.total_financed).toFixed(2)} €</div></Card>
        </div>

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
