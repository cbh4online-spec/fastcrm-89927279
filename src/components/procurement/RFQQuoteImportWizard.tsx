import React, { useState, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Progress } from "@/components/ui/progress";
import { Loader2, Upload, CheckCircle, AlertTriangle, XCircle, Search, FileText } from "lucide-react";
import { useRFQQuoteImport, ImportLine } from "@/hooks/useRFQQuoteImport";

interface RFQQuoteImportWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  rfqId: string;
  workspaceId: string;
  suppliers: any[];
  rfqItems: any[];
}

export default function RFQQuoteImportWizard({
  open,
  onOpenChange,
  rfqId,
  workspaceId,
  suppliers,
  rfqItems,
}: RFQQuoteImportWizardProps) {
  const [step, setStep] = useState(1);
  const [supplierId, setSupplierId] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [applyResult, setApplyResult] = useState<any>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const {
    importId,
    uploadAndCreate,
    process,
    isProcessing,
    processResult,
    lines,
    isLoadingLines,
    refetchLines,
    updateMatch,
    apply,
    isApplying,
  } = useRFQQuoteImport(rfqId, workspaceId);

  const handleProcess = async () => {
    if (!file || !supplierId) return;
    setStep(2);
    try {
      const id = await uploadAndCreate(file, supplierId);
      await process(id);
      setStep(3);
    } catch {
      setStep(1);
    }
  };

  const handleApply = async (mode: "draft" | "submitted") => {
    try {
      const result = await apply(mode);
      setApplyResult(result);
      setStep(4);
    } catch { /* toast handled in hook */ }
  };

  const handleClose = () => {
    onOpenChange(false);
    setStep(1);
    setSupplierId("");
    setFile(null);
    setApplyResult(null);
  };

  const matchedCount = lines.filter(l => l.match_status === "matched").length;
  const reviewCount = lines.filter(l => l.match_status === "needs_review").length;
  const unmatchedCount = lines.filter(l => l.match_status === "unmatched").length;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Importar Cotação (PDF/OCR)
          </DialogTitle>
        </DialogHeader>

        {/* Stepper */}
        <div className="flex items-center gap-2 mb-4">
          {[1, 2, 3, 4].map(s => (
            <div key={s} className="flex items-center gap-1">
              <div className={`h-8 w-8 rounded-full flex items-center justify-center text-sm font-medium ${
                step >= s ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
              }`}>
                {step > s ? <CheckCircle className="h-4 w-4" /> : s}
              </div>
              <span className="text-xs text-muted-foreground hidden sm:inline">
                {s === 1 ? "Upload" : s === 2 ? "Processar" : s === 3 ? "Review" : "Aplicar"}
              </span>
              {s < 4 && <div className={`w-8 h-0.5 ${step > s ? "bg-primary" : "bg-muted"}`} />}
            </div>
          ))}
        </div>

        {/* Step 1: Upload */}
        {step === 1 && (
          <div className="space-y-4">
            <div>
              <Label>Fornecedor</Label>
              <Select value={supplierId} onValueChange={setSupplierId}>
                <SelectTrigger><SelectValue placeholder="Selecionar fornecedor..." /></SelectTrigger>
                <SelectContent>
                  {suppliers.map((s: any) => (
                    <SelectItem key={s.supplier_id || s.id} value={s.supplier_id || s.id}>
                      {s.suppliers?.name || s.name || "—"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Ficheiro (PDF, JPG, PNG)</Label>
              <input
                ref={fileRef}
                type="file"
                accept=".pdf,.jpg,.jpeg,.png"
                className="hidden"
                onChange={e => setFile(e.target.files?.[0] || null)}
              />
              <div
                className="border-2 border-dashed rounded-lg p-8 text-center cursor-pointer hover:border-primary/50 transition-colors"
                onClick={() => fileRef.current?.click()}
              >
                {file ? (
                  <div className="flex items-center justify-center gap-2">
                    <FileText className="h-5 w-5 text-primary" />
                    <span className="font-medium">{file.name}</span>
                    <span className="text-sm text-muted-foreground">({(file.size / 1024).toFixed(0)} KB)</span>
                  </div>
                ) : (
                  <div>
                    <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                    <p className="text-sm text-muted-foreground">Clique ou arraste o ficheiro</p>
                  </div>
                )}
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={handleClose}>Cancelar</Button>
              <Button onClick={handleProcess} disabled={!file || !supplierId}>
                Processar
              </Button>
            </div>
          </div>
        )}

        {/* Step 2: Processing */}
        {step === 2 && (
          <div className="flex flex-col items-center justify-center py-12 space-y-4">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
            <p className="text-lg font-medium">A processar documento...</p>
            <p className="text-sm text-muted-foreground">OCR → Parsing → Matching</p>
            <Progress value={isProcessing ? 60 : 100} className="w-64" />
          </div>
        )}

        {/* Step 3: Review */}
        {step === 3 && (
          <div className="space-y-4">
            {/* Summary */}
            <div className="flex gap-3">
              <Badge variant="default" className="gap-1">
                <CheckCircle className="h-3 w-3" /> {matchedCount} matched
              </Badge>
              <Badge variant="secondary" className="gap-1">
                <AlertTriangle className="h-3 w-3" /> {reviewCount} para rever
              </Badge>
              <Badge variant="outline" className="gap-1">
                <XCircle className="h-3 w-3" /> {unmatchedCount} sem match
              </Badge>
            </div>

            {/* Lines table */}
            {isLoadingLines ? (
              <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div>
            ) : (
              <div className="border rounded-lg overflow-auto max-h-[400px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-10">#</TableHead>
                      <TableHead>Descrição</TableHead>
                      <TableHead className="text-right">Qtd</TableHead>
                      <TableHead className="text-right">Preço Unit.</TableHead>
                      <TableHead className="text-right">IVA %</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                      <TableHead>Match</TableHead>
                      <TableHead className="text-right">Score</TableHead>
                      <TableHead>Ação</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {lines.map((line) => (
                      <ImportLineRow
                        key={line.id}
                        line={line}
                        rfqItems={rfqItems}
                        onUpdateMatch={async (lineId, itemId) => {
                          await updateMatch({ lineId, rfqItemId: itemId });
                          refetchLines();
                        }}
                      />
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}

            <div className="flex justify-between">
              <Button variant="outline" onClick={handleClose}>Cancelar</Button>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => handleApply("draft")} disabled={isApplying || matchedCount === 0}>
                  {isApplying && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Guardar Rascunho
                </Button>
                <Button onClick={() => handleApply("submitted")} disabled={isApplying || matchedCount === 0}>
                  {isApplying && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Submeter Cotação
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Step 4: Applied */}
        {step === 4 && (
          <div className="flex flex-col items-center py-12 space-y-4">
            <CheckCircle className="h-12 w-12 text-green-500" />
            <p className="text-lg font-medium">Cotação aplicada com sucesso!</p>
            {applyResult && (
              <div className="text-sm text-muted-foreground space-y-1 text-center">
                <p>{applyResult.created} linhas criadas, {applyResult.updated} atualizadas</p>
                {applyResult.errors?.length > 0 && (
                  <p className="text-destructive">{applyResult.errors.length} erros</p>
                )}
              </div>
            )}
            <Button onClick={handleClose}>Fechar</Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

// Sub-component for each import line row
function ImportLineRow({
  line,
  rfqItems,
  onUpdateMatch,
}: {
  line: ImportLine;
  rfqItems: any[];
  onUpdateMatch: (lineId: string, itemId: string | null) => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const matchedItem = line.match_rfq_item_id
    ? rfqItems.find((it: any) => it.id === line.match_rfq_item_id)
    : null;

  const filteredItems = search.length >= 1
    ? rfqItems.filter((it: any) => {
        const name = (it.products?.name || it.product_name || "").toLowerCase();
        const sku = (it.products?.sku || it.sku || "").toLowerCase();
        const q = search.toLowerCase();
        return name.includes(q) || sku.includes(q);
      })
    : rfqItems;

  const statusIcon = line.match_status === "matched"
    ? <CheckCircle className="h-3.5 w-3.5 text-green-500" />
    : line.match_status === "needs_review"
      ? <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
      : <XCircle className="h-3.5 w-3.5 text-muted-foreground" />;

  return (
    <TableRow className={line.match_status === "unmatched" ? "bg-muted/30" : ""}>
      <TableCell className="text-xs text-muted-foreground">{line.line_no}</TableCell>
      <TableCell className="text-sm max-w-[200px] truncate" title={line.raw_text || line.description}>
        {line.description || line.raw_text || "—"}
      </TableCell>
      <TableCell className="text-right text-sm font-mono">{line.quantity ?? "—"}</TableCell>
      <TableCell className="text-right text-sm font-mono">
        {line.computed_unit_price != null ? `€${Number(line.computed_unit_price).toFixed(2)}` : line.unit_price != null ? `€${Number(line.unit_price).toFixed(2)}` : "—"}
      </TableCell>
      <TableCell className="text-right text-sm">{line.vat_percent != null ? `${line.vat_percent}%` : "—"}</TableCell>
      <TableCell className="text-right text-sm font-mono">
        {line.line_total != null ? `€${Number(line.line_total).toFixed(2)}` : "—"}
      </TableCell>
      <TableCell>
        <div className="flex items-center gap-1.5">
          {statusIcon}
          <span className="text-xs truncate max-w-[120px]">
            {matchedItem ? (matchedItem.products?.name || matchedItem.product_name || "Item") : line.match_status === "needs_review" ? "Rever" : "Sem match"}
          </span>
        </div>
      </TableCell>
      <TableCell className="text-right text-xs">
        {line.match_score > 0 ? `${(line.match_score * 100).toFixed(0)}%` : "—"}
      </TableCell>
      <TableCell>
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="sm" className="h-7 text-xs gap-1">
              <Search className="h-3 w-3" /> Associar
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-72 p-3" align="end">
            <Input
              placeholder="Pesquisar item RFQ..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="mb-2"
              autoFocus
            />
            <div className="max-h-48 overflow-auto space-y-1">
              {filteredItems.map((item: any) => (
                <button
                  key={item.id}
                  onClick={async () => {
                    await onUpdateMatch(line.id, item.id);
                    setOpen(false);
                  }}
                  className="w-full text-left p-2 rounded hover:bg-accent text-sm"
                >
                  <span className="font-medium">{item.products?.name || item.product_name || "Item"}</span>
                  {(item.products?.sku || item.sku) && (
                    <span className="text-xs text-muted-foreground ml-2">SKU: {item.products?.sku || item.sku}</span>
                  )}
                </button>
              ))}
              {filteredItems.length === 0 && (
                <p className="text-xs text-muted-foreground py-2">Nenhum item encontrado</p>
              )}
            </div>
          </PopoverContent>
        </Popover>
      </TableCell>
    </TableRow>
  );
}
