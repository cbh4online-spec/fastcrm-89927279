import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useRFQDetail, useSendRFQ, useAddRFQQuote, useAwardRFQ, useAddRFQSupplier } from "@/hooks/useRFQ";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useSuppliers } from "@/hooks/useProcurement";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { ArrowLeft, Send, Plus, Trophy, Loader2 } from "lucide-react";

export default function RFQDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { currentWorkspace } = useWorkspace();
  const { rfq, items, suppliers, quotes, isLoading } = useRFQDetail(id);
  const { data: allSuppliers = [] } = useSuppliers(currentWorkspace?.id);
  const sendRFQ = useSendRFQ();
  const addQuote = useAddRFQQuote();
  const awardRFQ = useAwardRFQ();
  const addSupplier = useAddRFQSupplier();

  const [showQuoteModal, setShowQuoteModal] = useState(false);
  const [showAddSupplierModal, setShowAddSupplierModal] = useState(false);
  const [selectedSupplierId, setSelectedSupplierId] = useState("");
  const [quoteForm, setQuoteForm] = useState({ rfq_item_id: "", supplier_id: "", unit_price: "", lead_time_days: "", min_order_qty: "", notes: "" });
  const [selectedQuoteIds, setSelectedQuoteIds] = useState<string[]>([]);

  if (isLoading) {
    return <div className="flex items-center justify-center p-12"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;
  }

  if (!rfq) {
    return <div className="p-6 text-muted-foreground">RFQ não encontrado.</div>;
  }

  const handleSend = () => sendRFQ.mutate(rfq.id);

  const handleAddQuote = async () => {
    if (!currentWorkspace?.id) return;
    await addQuote.mutateAsync({
      workspace_id: currentWorkspace.id,
      rfq_id: rfq.id,
      rfq_item_id: quoteForm.rfq_item_id,
      supplier_id: quoteForm.supplier_id,
      unit_price: Number(quoteForm.unit_price),
      lead_time_days: quoteForm.lead_time_days ? Number(quoteForm.lead_time_days) : undefined,
      min_order_qty: quoteForm.min_order_qty ? Number(quoteForm.min_order_qty) : undefined,
      notes: quoteForm.notes || undefined,
    });
    setShowQuoteModal(false);
    setQuoteForm({ rfq_item_id: "", supplier_id: "", unit_price: "", lead_time_days: "", min_order_qty: "", notes: "" });
  };

  const handleAward = () => {
    if (!selectedQuoteIds.length) return;
    awardRFQ.mutate({ rfq_id: rfq.id, selected_quote_ids: selectedQuoteIds });
  };

  // Build comparison matrix
  const supplierIds = [...new Set(quotes.map((q: any) => q.supplier_id))];
  const supplierNames: Record<string, string> = {};
  quotes.forEach((q: any) => { if (q.suppliers?.name) supplierNames[q.supplier_id] = q.suppliers.name; });

  // Find best price per item
  const bestPriceByItem: Record<string, number> = {};
  items.forEach((item: any) => {
    const itemQuotes = quotes.filter((q: any) => q.rfq_item_id === item.id);
    if (itemQuotes.length) {
      bestPriceByItem[item.id] = Math.min(...itemQuotes.map((q: any) => Number(q.unit_price)));
    }
  });

  const canSend = rfq.status === "draft";
  const canAddQuotes = ["sent", "receiving_quotes"].includes(rfq.status);
  const canAward = quotes.length > 0 && !["awarded", "closed"].includes(rfq.status);

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard/procurement/rfqs")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">{rfq.title}</h1>
          <div className="flex items-center gap-2 mt-1">
            <Badge variant="secondary">{rfq.status}</Badge>
            {rfq.due_date && <span className="text-sm text-muted-foreground">Prazo: {rfq.due_date}</span>}
          </div>
        </div>
        <div className="flex gap-2">
          {canSend && (
            <Button onClick={handleSend} disabled={sendRFQ.isPending}>
              {sendRFQ.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
              Enviar RFQ
            </Button>
          )}
          {canAddQuotes && (
            <Button variant="outline" onClick={() => setShowQuoteModal(true)}>
              <Plus className="mr-2 h-4 w-4" /> Registar Cotação
            </Button>
          )}
          {canAward && selectedQuoteIds.length > 0 && (
            <Button onClick={handleAward} disabled={awardRFQ.isPending} className="bg-green-600 hover:bg-green-700">
              {awardRFQ.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trophy className="mr-2 h-4 w-4" />}
              Adjudicar e Gerar PO ({selectedQuoteIds.length})
            </Button>
          )}
        </div>
      </div>

      {/* Suppliers */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Fornecedores Convidados</CardTitle>
          {!["awarded", "closed"].includes(rfq.status) && (
            <Button variant="outline" size="sm" onClick={() => { setSelectedSupplierId(""); setShowAddSupplierModal(true); }}>
              <Plus className="mr-2 h-4 w-4" /> Adicionar Fornecedor
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {suppliers.length === 0 ? (
            <div className="text-center py-4 text-muted-foreground">Nenhum fornecedor adicionado.</div>
          ) : (
            <div className="flex flex-wrap gap-2">
              {suppliers.map((s: any) => (
                <Badge key={s.id} variant="outline" className="text-sm py-1 px-3">
                  {s.suppliers?.name || "—"} — <span className="text-muted-foreground">{s.status}</span>
                  {s.sent_at && <span className="ml-1 text-xs text-muted-foreground">({new Date(s.sent_at).toLocaleDateString()})</span>}
                </Badge>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Comparison Table */}
      <Card>
        <CardHeader><CardTitle>Comparação de Cotações</CardTitle></CardHeader>
        <CardContent className="overflow-x-auto">
          {!quotes.length ? (
            <div className="text-center py-8 text-muted-foreground">Sem cotações registadas.</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="sticky left-0 bg-background">Produto</TableHead>
                  <TableHead className="sticky left-0 bg-background">Qtd</TableHead>
                  {supplierIds.map(sid => (
                    <TableHead key={sid} className="text-center min-w-[160px]">
                      {supplierNames[sid] || sid.slice(0, 8)}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((item: any) => (
                  <TableRow key={item.id}>
                    <TableCell className="sticky left-0 bg-background font-medium">
                      {item.products?.name || "—"}
                    </TableCell>
                    <TableCell className="sticky left-0 bg-background">{item.qty}</TableCell>
                    {supplierIds.map(sid => {
                      const q = quotes.find((qq: any) => qq.rfq_item_id === item.id && qq.supplier_id === sid);
                      if (!q) return <TableCell key={sid} className="text-center text-muted-foreground">—</TableCell>;
                      const isBest = Number(q.unit_price) === bestPriceByItem[item.id];
                      return (
                        <TableCell key={sid} className="text-center">
                          <div className={`space-y-1 ${isBest ? "bg-green-50 dark:bg-green-950 rounded p-1" : ""}`}>
                            <div className="font-medium">{Number(q.unit_price).toFixed(2)} €</div>
                            {q.lead_time_days && <div className="text-xs text-muted-foreground">{q.lead_time_days}d entrega</div>}
                            <Checkbox
                              checked={selectedQuoteIds.includes(q.id)}
                              onCheckedChange={(checked) => {
                                setSelectedQuoteIds(prev => {
                                  // Remove any existing quote for this item
                                  const otherItemQuoteIds = quotes
                                    .filter((qq: any) => qq.rfq_item_id === item.id && qq.id !== q.id)
                                    .map((qq: any) => qq.id);
                                  const filtered = prev.filter(id => !otherItemQuoteIds.includes(id));
                                  return checked ? [...filtered, q.id] : filtered.filter(id => id !== q.id);
                                });
                              }}
                            />
                          </div>
                        </TableCell>
                      );
                    })}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Add Quote Modal */}
      <Dialog open={showQuoteModal} onOpenChange={setShowQuoteModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Registar Cotação</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label>Item</Label>
              <Select value={quoteForm.rfq_item_id} onValueChange={v => setQuoteForm(p => ({ ...p, rfq_item_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Selecionar item" /></SelectTrigger>
                <SelectContent>
                  {items.map((item: any) => (
                    <SelectItem key={item.id} value={item.id}>{item.products?.name || "Produto"} (Qtd: {item.qty})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Fornecedor</Label>
              <Select value={quoteForm.supplier_id} onValueChange={v => setQuoteForm(p => ({ ...p, supplier_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Selecionar fornecedor" /></SelectTrigger>
                <SelectContent>
                  {suppliers.map((s: any) => (
                    <SelectItem key={s.id} value={s.supplier_id}>{s.suppliers?.name || s.supplier_id}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Preço Unitário (€)</Label>
              <Input type="number" step="0.01" value={quoteForm.unit_price} onChange={e => setQuoteForm(p => ({ ...p, unit_price: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Lead Time (dias)</Label>
                <Input type="number" value={quoteForm.lead_time_days} onChange={e => setQuoteForm(p => ({ ...p, lead_time_days: e.target.value }))} />
              </div>
              <div>
                <Label>MOQ</Label>
                <Input type="number" value={quoteForm.min_order_qty} onChange={e => setQuoteForm(p => ({ ...p, min_order_qty: e.target.value }))} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowQuoteModal(false)}>Cancelar</Button>
            <Button onClick={handleAddQuote} disabled={!quoteForm.rfq_item_id || !quoteForm.supplier_id || !quoteForm.unit_price || addQuote.isPending}>
              {addQuote.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Guardar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {/* Add Supplier Modal */}
      <Dialog open={showAddSupplierModal} onOpenChange={setShowAddSupplierModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Adicionar Fornecedor ao RFQ</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label>Fornecedor</Label>
              <Select value={selectedSupplierId} onValueChange={setSelectedSupplierId}>
                <SelectTrigger><SelectValue placeholder="Selecionar fornecedor" /></SelectTrigger>
                <SelectContent>
                  {allSuppliers
                    .filter((s: any) => !suppliers.some((rs: any) => rs.supplier_id === s.id))
                    .map((s: any) => (
                      <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddSupplierModal(false)}>Cancelar</Button>
            <Button
              disabled={!selectedSupplierId || addSupplier.isPending}
              onClick={async () => {
                if (!currentWorkspace?.id || !rfq) return;
                await addSupplier.mutateAsync({ workspace_id: currentWorkspace.id, rfq_id: rfq.id, supplier_id: selectedSupplierId });
                setShowAddSupplierModal(false);
              }}
            >
              {addSupplier.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Adicionar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
