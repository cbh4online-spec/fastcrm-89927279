import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useRFQDetail, useSendRFQ, useAddRFQQuote, useAwardRFQ, useAddRFQSupplier } from "@/hooks/useRFQ";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useSuppliers } from "@/hooks/useProcurement";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, Send, Plus, Trophy, Loader2, FileDown, Building2, Calendar, Globe, CreditCard, MapPin, Clock } from "lucide-react";
import { toast } from "sonner";

export default function RFQDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { currentWorkspace } = useWorkspace();
  const { rfq, items, suppliers, quotes, workspace, isLoading } = useRFQDetail(id);
  const { data: allSuppliers = [] } = useSuppliers(currentWorkspace?.id);
  const sendRFQ = useSendRFQ();
  const addQuote = useAddRFQQuote();
  const awardRFQ = useAwardRFQ();
  const addSupplier = useAddRFQSupplier();

  const [showQuoteModal, setShowQuoteModal] = useState(false);
  const [showAddSupplierModal, setShowAddSupplierModal] = useState(false);
  const [selectedSupplierId, setSelectedSupplierId] = useState("");
  const [quoteForm, setQuoteForm] = useState({ rfq_item_id: "", supplier_id: "", unit_price: "", lead_time_days: "", min_order_qty: "", notes: "", discount_percent: "0", vat_percent: "23" });
  const [selectedQuoteIds, setSelectedQuoteIds] = useState<string[]>([]);
  const [generatingPDF, setGeneratingPDF] = useState(false);

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
      discount_percent: Number(quoteForm.discount_percent) || 0,
      vat_percent: Number(quoteForm.vat_percent) || 23,
    });
    setShowQuoteModal(false);
    setQuoteForm({ rfq_item_id: "", supplier_id: "", unit_price: "", lead_time_days: "", min_order_qty: "", notes: "", discount_percent: "0", vat_percent: "23" });
  };

  const handleAward = () => {
    if (!selectedQuoteIds.length) return;
    awardRFQ.mutate({ rfq_id: rfq.id, selected_quote_ids: selectedQuoteIds });
  };

  const handleGeneratePDF = async () => {
    setGeneratingPDF(true);
    try {
      const { data, error } = await supabase.functions.invoke("rfq-generate-pdf", {
        body: { rfq_id: rfq.id },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      if (data?.pdf_url) {
        // Download the PDF
        const { data: fileData, error: dlError } = await supabase.storage
          .from("rfq-pdfs")
          .download(data.pdf_url);
        if (dlError) throw dlError;
        const url = URL.createObjectURL(fileData);
        const a = document.createElement("a");
        a.href = url;
        a.download = `RFQ-${(rfq as any).rfq_number || rfq.title || "export"}.pdf`;
        a.click();
        URL.revokeObjectURL(url);
        toast.success("PDF gerado com sucesso!");
      }
    } catch (e: any) {
      toast.error(`Erro ao gerar PDF: ${e.message}`);
    } finally {
      setGeneratingPDF(false);
    }
  };

  // Build comparison matrix
  const supplierIds = [...new Set(quotes.map((q: any) => q.supplier_id))];
  const supplierNames: Record<string, string> = {};
  quotes.forEach((q: any) => { if (q.suppliers?.name) supplierNames[q.supplier_id] = q.suppliers.name; });

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

  const rfqData = rfq as any;
  const wsData = workspace as any;

  return (
    <div className="space-y-6 p-6">
      {/* Top bar */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard/procurement/rfqs")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold">{rfq.title}</h1>
            {rfqData.rfq_number && (
              <Badge variant="outline" className="text-xs font-mono">{rfqData.rfq_number}</Badge>
            )}
          </div>
          <div className="flex items-center gap-2 mt-1">
            <Badge variant="secondary">{rfq.status}</Badge>
            {rfq.due_date && <span className="text-sm text-muted-foreground">Prazo: {rfq.due_date}</span>}
            {rfqData.currency && rfqData.currency !== "EUR" && (
              <Badge variant="outline">{rfqData.currency}</Badge>
            )}
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleGeneratePDF} disabled={generatingPDF}>
            {generatingPDF ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileDown className="mr-2 h-4 w-4" />}
            Exportar PDF
          </Button>
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

      {/* Enterprise Header Info */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {wsData?.company_name && (
              <div className="flex items-start gap-2">
                <Building2 className="h-4 w-4 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-xs text-muted-foreground">Empresa</p>
                  <p className="text-sm font-medium">{wsData.company_name}</p>
                  {wsData.tax_id && <p className="text-xs text-muted-foreground">NIF: {wsData.tax_id}</p>}
                </div>
              </div>
            )}
            {(rfqData.buyer_name || rfqData.buyer_email) && (
              <div className="flex items-start gap-2">
                <Globe className="h-4 w-4 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-xs text-muted-foreground">Comprador</p>
                  {rfqData.buyer_name && <p className="text-sm font-medium">{rfqData.buyer_name}</p>}
                  {rfqData.buyer_email && <p className="text-xs text-muted-foreground">{rfqData.buyer_email}</p>}
                </div>
              </div>
            )}
            {rfqData.payment_terms && (
              <div className="flex items-start gap-2">
                <CreditCard className="h-4 w-4 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-xs text-muted-foreground">Cond. Pagamento</p>
                  <p className="text-sm font-medium">{rfqData.payment_terms}</p>
                </div>
              </div>
            )}
            {rfqData.delivery_location && (
              <div className="flex items-start gap-2">
                <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-xs text-muted-foreground">Local Entrega</p>
                  <p className="text-sm font-medium">{rfqData.delivery_location}</p>
                </div>
              </div>
            )}
            {rfqData.incoterm && (
              <div className="flex items-start gap-2">
                <Globe className="h-4 w-4 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-xs text-muted-foreground">Incoterm</p>
                  <p className="text-sm font-medium">{rfqData.incoterm}</p>
                </div>
              </div>
            )}
            {rfqData.quote_validity_days && (
              <div className="flex items-start gap-2">
                <Clock className="h-4 w-4 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-xs text-muted-foreground">Validade Proposta</p>
                  <p className="text-sm font-medium">{rfqData.quote_validity_days} dias</p>
                </div>
              </div>
            )}
            <div className="flex items-start gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground mt-0.5" />
              <div>
                <p className="text-xs text-muted-foreground">Moeda</p>
                <p className="text-sm font-medium">{rfqData.currency || "EUR"}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

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
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fornecedor</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Enviado em</TableHead>
                  <TableHead>Respondido em</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {suppliers.map((s: any) => (
                  <TableRow key={s.id}>
                    <TableCell className="font-medium">{s.suppliers?.name || "—"}</TableCell>
                    <TableCell className="text-muted-foreground">{s.suppliers?.email || "—"}</TableCell>
                    <TableCell><Badge variant="secondary">{s.status}</Badge></TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {s.sent_at ? new Date(s.sent_at).toLocaleDateString("pt-PT") : "—"}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {s.responded_at ? new Date(s.responded_at).toLocaleDateString("pt-PT") : "—"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Items */}
      <Card>
        <CardHeader><CardTitle>Itens do RFQ</CardTitle></CardHeader>
        <CardContent>
          {items.length === 0 ? (
            <div className="text-center py-4 text-muted-foreground">Nenhum item neste RFQ.</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">#</TableHead>
                  <TableHead>Produto</TableHead>
                  <TableHead>SKU</TableHead>
                  <TableHead className="text-right">Quantidade</TableHead>
                  <TableHead>Unidade</TableHead>
                  <TableHead>Notas</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((item: any, idx: number) => (
                  <TableRow key={item.id}>
                    <TableCell className="text-muted-foreground">{item.line_number || idx + 1}</TableCell>
                    <TableCell className="font-medium">{item.products?.name || "—"}</TableCell>
                    <TableCell className="text-muted-foreground">{item.products?.sku || "—"}</TableCell>
                    <TableCell className="text-right">{item.qty}</TableCell>
                    <TableCell className="text-muted-foreground">{item.unit || "un"}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">{item.spec_notes || "—"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
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
                      const discount = Number(q.discount_percent) || 0;
                      const finalPrice = Number(q.unit_price) * (1 - discount / 100);
                      return (
                        <TableCell key={sid} className="text-center">
                          <div className={`space-y-1 ${isBest ? "bg-green-50 dark:bg-green-950 rounded p-1" : ""}`}>
                            <div className="font-medium">{finalPrice.toFixed(2)} €</div>
                            {discount > 0 && <div className="text-xs text-muted-foreground">-{discount}%</div>}
                            {q.lead_time_days && <div className="text-xs text-muted-foreground">{q.lead_time_days}d entrega</div>}
                            {q.submitted_via_portal && <Badge variant="outline" className="text-[10px]">Portal</Badge>}
                            <Checkbox
                              checked={selectedQuoteIds.includes(q.id)}
                              onCheckedChange={(checked) => {
                                setSelectedQuoteIds(prev => {
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
                <Label>Desconto %</Label>
                <Input type="number" step="0.1" value={quoteForm.discount_percent} onChange={e => setQuoteForm(p => ({ ...p, discount_percent: e.target.value }))} />
              </div>
              <div>
                <Label>IVA %</Label>
                <Input type="number" step="1" value={quoteForm.vat_percent} onChange={e => setQuoteForm(p => ({ ...p, vat_percent: e.target.value }))} />
              </div>
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
