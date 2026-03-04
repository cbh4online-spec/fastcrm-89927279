import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useRFQDetail, useSendRFQ, useAddRFQQuote, useAwardRFQ, useAddRFQSupplier, useUpdateRFQ } from "@/hooks/useRFQ";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useUserRole } from "@/hooks/useUserRole";
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
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { ArrowLeft, Send, Plus, Trophy, Loader2, FileDown, Building2, Calendar as CalendarIcon, Globe, CreditCard, MapPin, Clock, Pencil, FolderOpen, FileText, Upload } from "lucide-react";
import RFQComparisonDashboard from "@/components/procurement/RFQComparisonDashboard";
import RFQAnalysisTab from "@/components/procurement/RFQAnalysisTab";
import { RFQAuditTrail } from "@/components/procurement/RFQAuditTrail";
import RFQQuoteSheetDialog from "@/components/procurement/RFQQuoteSheetDialog";
import { toast } from "sonner";
import RFQQuoteImportWizard from "@/components/procurement/RFQQuoteImportWizard";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function RFQDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { currentWorkspace } = useWorkspace();
  const { isSuperAdmin, isAdmin } = useUserRole();
  const { rfq, items, suppliers, quotes, workspace, isLoading } = useRFQDetail(id);
  const { data: allSuppliers = [] } = useSuppliers(currentWorkspace?.id);
  const sendRFQ = useSendRFQ();
  const addQuote = useAddRFQQuote();
  const awardRFQ = useAwardRFQ();
  const addSupplier = useAddRFQSupplier();
  const updateRFQ = useUpdateRFQ();

  const workspaceRole = currentWorkspace?.role;
  const hasEditPermission = isSuperAdmin || isAdmin || workspaceRole === "owner" || workspaceRole === "admin";

  const [showQuoteModal, setShowQuoteModal] = useState(false);
  const [showAddSupplierModal, setShowAddSupplierModal] = useState(false);
  const [selectedSupplierId, setSelectedSupplierId] = useState("");
  const [quoteForm, setQuoteForm] = useState({ rfq_item_id: "", supplier_id: "", unit_price: "", lead_time_days: "", min_order_qty: "", notes: "", discount_percent: "0", vat_percent: "23" });
  const [selectedQuoteIds, setSelectedQuoteIds] = useState<string[]>([]);
  const [generatingPDF, setGeneratingPDF] = useState(false);
  const [showQuoteSheet, setShowQuoteSheet] = useState(false);
  const [showQuoteImport, setShowQuoteImport] = useState(false);

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
    awardRFQ.mutate({ rfq_id: rfq.id, selected_quote_ids: selectedQuoteIds }, {
      onSuccess: (data) => {
        toast.success(`${data?.count || 0} Ordem(ns) de Compra criada(s)!`, {
          action: {
            label: "Ver Ordens de Compra",
            onClick: () => navigate("/dashboard/procurement/orders"),
          },
          duration: 8000,
        });
      },
    });
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

  const canSend = rfq.status === "draft" && hasEditPermission;
  const canAddQuotes = ["sent", "receiving_quotes"].includes(rfq.status);
  const canAward = quotes.length > 0 && !["awarded", "closed"].includes(rfq.status) && hasEditPermission;

  const rfqData = rfq as any;
  const wsData = workspace as any;
  const isDraft = rfq.status === "draft";
  const isEditable = !["awarded", "closed"].includes(rfq.status) && hasEditPermission;
  const projectData = rfqData.procurement_projects;

  const handleInlineUpdate = (field: string, value: any) => {
    updateRFQ.mutate({ rfqId: rfq.id, updates: { [field]: value } });
  };

  return (
    <div className="space-y-6 p-6">
      {/* Top bar */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={() => navigate("/dashboard/procurement")}>
          <ArrowLeft className="h-4 w-4 mr-1" /> Dashboard
        </Button>
        <span className="text-muted-foreground">/</span>
        <Button variant="ghost" size="sm" className="text-muted-foreground px-1" onClick={() => navigate("/dashboard/procurement/rfqs")}>
          RFQs
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
             {!hasEditPermission && !["awarded", "closed"].includes(rfq.status) && (
               <Badge variant="outline" className="text-xs border-muted-foreground/30">Apenas leitura</Badge>
             )}
             {rfq.due_date && (
               <Badge variant={new Date(rfq.due_date) < new Date() ? "destructive" : "outline"} className="text-xs">
                 <CalendarIcon className="mr-1 h-3 w-3" />
                 Prazo: {new Date(rfq.due_date).toLocaleDateString("pt-PT")}
               </Badge>
             )}
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
            <>
              <Button onClick={() => setShowQuoteSheet(true)}>
                <Plus className="mr-2 h-4 w-4" /> Registar Cotação (Tabela)
              </Button>
              <Button variant="secondary" onClick={() => setShowQuoteImport(true)}>
                <Upload className="mr-2 h-4 w-4" /> Importar Cotação (PDF/OCR)
              </Button>
              <Button variant="outline" onClick={() => setShowQuoteModal(true)}>
                <Plus className="mr-2 h-4 w-4" /> Cotação Individual
              </Button>
            </>
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
             {/* Project & Proposal */}
             {projectData?.name && (
               <div className="flex items-start gap-2">
                 <FolderOpen className="h-4 w-4 text-muted-foreground mt-0.5" />
                 <div>
                   <p className="text-xs text-muted-foreground">Projeto</p>
                   <p className="text-sm font-medium">{projectData.name}</p>
                 </div>
               </div>
             )}
             {projectData?.source_type === "proposal" && projectData?.source_id && (
               <div className="flex items-start gap-2">
                 <FileText className="h-4 w-4 text-muted-foreground mt-0.5" />
                 <div>
                   <p className="text-xs text-muted-foreground">Proposta</p>
                   <p className="text-sm font-medium">{projectData.source_id}</p>
                 </div>
               </div>
             )}
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
             {/* Due Date - editable in draft */}
             <div className="flex items-start gap-2">
               <CalendarIcon className="h-4 w-4 text-muted-foreground mt-0.5" />
               <div>
                 <p className="text-xs text-muted-foreground">Data Limite</p>
                  {isEditable ? (
                   <Popover>
                     <PopoverTrigger asChild>
                       <Button variant="ghost" size="sm" className={cn("h-auto p-0 text-sm font-medium hover:underline", !rfq.due_date && "text-muted-foreground")}>
                         {rfq.due_date ? new Date(rfq.due_date).toLocaleDateString("pt-PT") : "Definir..."}
                         <Pencil className="ml-1 h-3 w-3" />
                       </Button>
                     </PopoverTrigger>
                     <PopoverContent className="w-auto p-0" align="start">
                       <Calendar
                         mode="single"
                         selected={rfq.due_date ? new Date(rfq.due_date) : undefined}
                         onSelect={(date) => handleInlineUpdate("due_date", date ? format(date, "yyyy-MM-dd") : null)}
                         disabled={(date) => date < new Date()}
                         initialFocus
                         className={cn("p-3 pointer-events-auto")}
                       />
                     </PopoverContent>
                   </Popover>
                 ) : (
                   <p className="text-sm font-medium">{rfq.due_date ? new Date(rfq.due_date).toLocaleDateString("pt-PT") : "—"}</p>
                 )}
               </div>
             </div>
             {/* Payment Terms - editable in draft */}
             <div className="flex items-start gap-2">
               <CreditCard className="h-4 w-4 text-muted-foreground mt-0.5" />
               <div>
                 <p className="text-xs text-muted-foreground">Cond. Pagamento</p>
                  {isEditable ? (
                   <Input
                     className="h-7 text-sm w-32"
                     defaultValue={rfqData.payment_terms || ""}
                     onBlur={(e) => { if (e.target.value !== (rfqData.payment_terms || "")) handleInlineUpdate("payment_terms", e.target.value || null); }}
                   />
                 ) : (
                   <p className="text-sm font-medium">{rfqData.payment_terms || "—"}</p>
                 )}
               </div>
             </div>
             {/* Delivery Location - editable in draft */}
             <div className="flex items-start gap-2">
               <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
               <div>
                 <p className="text-xs text-muted-foreground">Local Entrega</p>
                  {isEditable ? (
                   <Input
                     className="h-7 text-sm w-32"
                     defaultValue={rfqData.delivery_location || ""}
                     onBlur={(e) => { if (e.target.value !== (rfqData.delivery_location || "")) handleInlineUpdate("delivery_location", e.target.value || null); }}
                   />
                 ) : (
                   <p className="text-sm font-medium">{rfqData.delivery_location || "—"}</p>
                 )}
               </div>
             </div>
             {/* Incoterm - editable in draft */}
             <div className="flex items-start gap-2">
               <Globe className="h-4 w-4 text-muted-foreground mt-0.5" />
               <div>
                 <p className="text-xs text-muted-foreground">Incoterm</p>
                  {isEditable ? (
                   <Input
                     className="h-7 text-sm w-24"
                     defaultValue={rfqData.incoterm || ""}
                     onBlur={(e) => { if (e.target.value !== (rfqData.incoterm || "")) handleInlineUpdate("incoterm", e.target.value || null); }}
                   />
                 ) : (
                   <p className="text-sm font-medium">{rfqData.incoterm || "—"}</p>
                 )}
               </div>
             </div>
             {/* Quote Validity - editable in draft */}
             <div className="flex items-start gap-2">
               <Clock className="h-4 w-4 text-muted-foreground mt-0.5" />
               <div>
                 <p className="text-xs text-muted-foreground">Validade Proposta</p>
                  {isEditable ? (
                   <div className="flex items-center gap-1">
                     <Input
                       type="number"
                       className="h-7 text-sm w-16"
                       defaultValue={rfqData.quote_validity_days || ""}
                       onBlur={(e) => { const v = Number(e.target.value); if (v !== (rfqData.quote_validity_days || 0)) handleInlineUpdate("quote_validity_days", v || null); }}
                     />
                     <span className="text-xs text-muted-foreground">dias</span>
                   </div>
                 ) : (
                   <p className="text-sm font-medium">{rfqData.quote_validity_days ? `${rfqData.quote_validity_days} dias` : "—"}</p>
                 )}
               </div>
             </div>
             {/* Currency */}
             <div className="flex items-start gap-2">
               <Globe className="h-4 w-4 text-muted-foreground mt-0.5" />
               <div>
                 <p className="text-xs text-muted-foreground">Moeda</p>
                 {isEditable ? (
                   <Input
                     className="h-7 text-sm w-16"
                     defaultValue={rfqData.currency || "EUR"}
                     onBlur={(e) => { if (e.target.value !== (rfqData.currency || "EUR")) handleInlineUpdate("currency", e.target.value || "EUR"); }}
                   />
                 ) : (
                   <p className="text-sm font-medium">{rfqData.currency || "EUR"}</p>
                 )}
               </div>
             </div>
           </div>
         </CardContent>
      </Card>

      {/* Suppliers */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Fornecedores Convidados</CardTitle>
          {!["awarded", "closed"].includes(rfq.status) && hasEditPermission && (
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

      {/* Tabs: Comparison, Analysis, Audit */}
      <Tabs defaultValue={quotes.length > 0 ? "analysis" : "comparison"} className="w-full">
        <TabsList>
          <TabsTrigger value="comparison">Cotações</TabsTrigger>
          <TabsTrigger value="analysis">Análise & Sugestão</TabsTrigger>
          <TabsTrigger value="audit">Histórico</TabsTrigger>
        </TabsList>
        <TabsContent value="comparison" className="mt-4">
          <RFQComparisonDashboard
            quotes={quotes}
            items={items}
            supplierIds={supplierIds}
            supplierNames={supplierNames}
            selectedQuoteIds={selectedQuoteIds}
            setSelectedQuoteIds={setSelectedQuoteIds}
          />
        </TabsContent>
        <TabsContent value="analysis" className="mt-4">
          <RFQAnalysisTab rfqId={rfq.id} hasEditPermission={hasEditPermission} />
        </TabsContent>
        <TabsContent value="audit" className="mt-4">
          <RFQAuditTrail rfqId={rfq.id} />
        </TabsContent>
      </Tabs>

      {/* Generated POs Section */}
      {rfq.status === "awarded" && <GeneratedPOsCard rfqId={rfq.id} />}

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
                    <SelectItem key={item.id} value={item.id}>{item.products?.name || "Produto"} {item.products?.sku ? `[${item.products.sku}]` : ""} (Qtd: {item.qty})</SelectItem>
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

      {/* Quote Sheet Dialog */}
      <RFQQuoteSheetDialog
        open={showQuoteSheet}
        onOpenChange={setShowQuoteSheet}
        rfqId={rfq.id}
        suppliers={suppliers}
      />

      {/* Quote Import Wizard */}
      <RFQQuoteImportWizard
        open={showQuoteImport}
        onOpenChange={setShowQuoteImport}
        rfqId={rfq.id}
        workspaceId={currentWorkspace?.id || ""}
        suppliers={suppliers}
        rfqItems={items}
      />

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

function GeneratedPOsCard({ rfqId }: { rfqId: string }) {
  const navigate = useNavigate();
  const { data: pos = [], isLoading } = useQuery({
    queryKey: ["rfq-generated-pos", rfqId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("purchase_orders")
        .select("id, po_number, total_amount, status, supplier:suppliers(name)")
        .eq("rfq_id", rfqId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!rfqId,
  });

  if (isLoading || pos.length === 0) return null;

  const statusColors: Record<string, string> = {
    draft: "secondary", sent: "outline", confirmed: "default",
    partial: "outline", received: "default", closed: "secondary", cancelled: "destructive",
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center gap-2">
        <Trophy className="h-5 w-5 text-amber-500" />
        <CardTitle>Ordens de Compra Geradas</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nº PO</TableHead>
              <TableHead>Fornecedor</TableHead>
              <TableHead>Valor</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(pos as any[]).map((po) => (
              <TableRow key={po.id}>
                <TableCell className="font-mono font-medium">{po.po_number || "—"}</TableCell>
                <TableCell>{po.supplier?.name || "—"}</TableCell>
                <TableCell>€{(Number(po.total_amount) || 0).toFixed(2)}</TableCell>
                <TableCell>
                  <Badge variant={statusColors[po.status] as any}>{po.status}</Badge>
                </TableCell>
                <TableCell>
                  <Button variant="ghost" size="sm" onClick={() => navigate("/dashboard/procurement/orders")}>
                    Ver
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
