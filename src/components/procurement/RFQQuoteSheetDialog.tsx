import { useState, useCallback, useRef, useEffect, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Label } from "@/components/ui/label";
import { Loader2, Save, Send, AlertTriangle, CheckCircle2, Percent, Clock, ChevronDown } from "lucide-react";
import { useRFQQuoteSheet, QuoteSheetRow } from "@/hooks/useRFQQuoteSheet";
import { cn } from "@/lib/utils";

interface RFQQuoteSheetDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  rfqId: string;
  suppliers: any[]; // rfq_suppliers with suppliers relation
}

type EditableField = "unit_price" | "discount_percent" | "vat_percent" | "lead_time_days" | "min_order_qty";

const EDITABLE_FIELDS: EditableField[] = ["unit_price", "discount_percent", "vat_percent", "lead_time_days", "min_order_qty"];

interface CellError {
  field: EditableField;
  message: string;
}

export default function RFQQuoteSheetDialog({ open, onOpenChange, rfqId, suppliers }: RFQQuoteSheetDialogProps) {
  const { fetchSheet, isLoadingSheet, upsertSheet, isUpserting, submitSheet, isSubmitting } = useRFQQuoteSheet();

  const [selectedSupplierId, setSelectedSupplierId] = useState("");
  const [rows, setRows] = useState<QuoteSheetRow[]>([]);
  const [originalRows, setOriginalRows] = useState<QuoteSheetRow[]>([]);
  const [currency, setCurrency] = useState("EUR");
  const [loaded, setLoaded] = useState(false);
  const inputRefs = useRef<Map<string, HTMLInputElement>>(new Map());

  // Load sheet when supplier selected
  const handleSupplierChange = useCallback(async (supplierId: string) => {
    setSelectedSupplierId(supplierId);
    if (!supplierId) return;
    try {
      const data = await fetchSheet(rfqId, supplierId);
      setRows(data.rows);
      setOriginalRows(JSON.parse(JSON.stringify(data.rows)));
      setCurrency(data.currency);
      setLoaded(true);
    } catch {
      setRows([]);
      setOriginalRows([]);
      setLoaded(false);
    }
  }, [rfqId, fetchSheet]);

  // Cell change
  const updateCell = useCallback((rowIdx: number, field: EditableField, value: string) => {
    setRows(prev => {
      const next = [...prev];
      const numVal = value === "" ? null : Number(value);
      (next[rowIdx] as any)[field] = field === "unit_price" || field === "discount_percent" || field === "vat_percent"
        ? (numVal ?? 0)
        : numVal;
      return next;
    });
  }, []);

  // Keyboard navigation
  const handleKeyDown = useCallback((e: React.KeyboardEvent, rowIdx: number, fieldIdx: number) => {
    if (e.key === "Tab" || e.key === "Enter") {
      e.preventDefault();
      let nextFieldIdx = fieldIdx + (e.shiftKey ? -1 : 1);
      let nextRowIdx = rowIdx;

      if (nextFieldIdx >= EDITABLE_FIELDS.length) {
        nextFieldIdx = 0;
        nextRowIdx++;
      } else if (nextFieldIdx < 0) {
        nextFieldIdx = EDITABLE_FIELDS.length - 1;
        nextRowIdx--;
      }

      if (nextRowIdx >= 0 && nextRowIdx < rows.length) {
        const key = `${nextRowIdx}-${EDITABLE_FIELDS[nextFieldIdx]}`;
        const el = inputRefs.current.get(key);
        el?.focus();
        el?.select();
      }
    }
  }, [rows.length]);

  // Paste support
  const handlePaste = useCallback((e: React.ClipboardEvent, startRowIdx: number, startFieldIdx: number) => {
    const text = e.clipboardData.getData("text/plain");
    if (!text) return;

    const pastedRows = text.split("\n").filter(r => r.trim());
    if (pastedRows.length <= 1 && !text.includes("\t")) return; // Single value, let default handle

    e.preventDefault();
    setRows(prev => {
      const next = [...prev];
      pastedRows.forEach((pastedRow, rOffset) => {
        const values = pastedRow.split("\t");
        values.forEach((val, fOffset) => {
          const ri = startRowIdx + rOffset;
          const fi = startFieldIdx + fOffset;
          if (ri < next.length && fi < EDITABLE_FIELDS.length) {
            const field = EDITABLE_FIELDS[fi];
            const numVal = val.trim() === "" ? null : Number(val.trim().replace(",", "."));
            if (numVal !== null && !isNaN(numVal)) {
              (next[ri] as any)[field] = numVal;
            }
          }
        });
      });
      return next;
    });
  }, []);

  // Validation
  const cellErrors = useMemo(() => {
    const errors: Map<string, CellError> = new Map();
    rows.forEach((row, idx) => {
      if (row.unit_price < 0) {
        errors.set(`${idx}-unit_price`, { field: "unit_price", message: "Preço inválido" });
      }
      if (row.vat_percent < 0 || row.vat_percent > 100) {
        errors.set(`${idx}-vat_percent`, { field: "vat_percent", message: "IVA deve ser 0-100" });
      }
      if (row.discount_percent < 0 || row.discount_percent > 100) {
        errors.set(`${idx}-discount_percent`, { field: "discount_percent", message: "Desconto deve ser 0-100" });
      }
      if (row.lead_time_days !== null && row.lead_time_days < 0) {
        errors.set(`${idx}-lead_time_days`, { field: "lead_time_days", message: "Lead time >= 0" });
      }
      if (row.min_order_qty !== null && row.min_order_qty < 1) {
        errors.set(`${idx}-min_order_qty`, { field: "min_order_qty", message: "MOQ >= 1" });
      }
    });
    return errors;
  }, [rows]);

  // Changes count
  const changesCount = useMemo(() => {
    if (!originalRows.length) return 0;
    let count = 0;
    rows.forEach((row, idx) => {
      const orig = originalRows[idx];
      if (!orig) return;
      EDITABLE_FIELDS.forEach(f => {
        if ((row as any)[f] !== (orig as any)[f]) count++;
      });
    });
    return count;
  }, [rows, originalRows]);

  // Calculations
  const calcSubtotal = (row: QuoteSheetRow) => {
    const base = row.unit_price * row.qty;
    const discount = base * (row.discount_percent / 100);
    return base - discount;
  };

  const calcTotal = (row: QuoteSheetRow) => {
    const subtotal = calcSubtotal(row);
    return subtotal * (1 + row.vat_percent / 100);
  };

  const grandSubtotal = useMemo(() => rows.reduce((s, r) => s + calcSubtotal(r), 0), [rows]);
  const grandTotal = useMemo(() => rows.reduce((s, r) => s + calcTotal(r), 0), [rows]);

  // Bulk apply actions
  const applyToAll = (field: EditableField, value: number) => {
    setRows(prev => prev.map(r => ({ ...r, [field]: value })));
  };

  // Save draft
  const handleSaveDraft = async () => {
    const saveRows = rows.map(r => ({
      rfq_item_id: r.rfq_item_id,
      unit_price: r.unit_price,
      discount_percent: r.discount_percent,
      vat_percent: r.vat_percent,
      lead_time_days: r.lead_time_days,
      min_order_qty: r.min_order_qty,
      pack_size: r.pack_size,
      notes: r.notes,
      status: "draft",
    }));
    await upsertSheet({ rfq_id: rfqId, supplier_id: selectedSupplierId, rows: saveRows });
    setOriginalRows(JSON.parse(JSON.stringify(rows)));
  };

  // Submit
  const handleSubmit = async () => {
    // Check required: all unit_price > 0
    const missing = rows.filter(r => !r.unit_price || r.unit_price <= 0);
    if (missing.length > 0) {
      const { toast } = await import("sonner");
      toast.error(`${missing.length} item(s) sem preço. Preencha todos os preços antes de submeter.`);
      return;
    }
    if (cellErrors.size > 0) {
      const { toast } = await import("sonner");
      toast.error(`${cellErrors.size} erro(s) de validação. Corrija antes de submeter.`);
      return;
    }

    // Save first, then submit
    const saveRows = rows.map(r => ({
      rfq_item_id: r.rfq_item_id,
      unit_price: r.unit_price,
      discount_percent: r.discount_percent,
      vat_percent: r.vat_percent,
      lead_time_days: r.lead_time_days,
      min_order_qty: r.min_order_qty,
      pack_size: r.pack_size,
      notes: r.notes,
      status: "submitted",
    }));
    await upsertSheet({ rfq_id: rfqId, supplier_id: selectedSupplierId, rows: saveRows });
    await submitSheet({ rfq_id: rfqId, supplier_id: selectedSupplierId });
    setOriginalRows(JSON.parse(JSON.stringify(rows)));
    onOpenChange(false);
  };

  const setRef = useCallback((key: string) => (el: HTMLInputElement | null) => {
    if (el) inputRefs.current.set(key, el);
    else inputRefs.current.delete(key);
  }, []);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] w-full max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            Tabela de Cotação
            {changesCount > 0 && (
              <Badge variant="outline" className="text-xs">
                {changesCount} alteração(ões)
              </Badge>
            )}
            {cellErrors.size > 0 && (
              <Badge variant="destructive" className="text-xs gap-1">
                <AlertTriangle className="h-3 w-3" />
                {cellErrors.size} erro(s)
              </Badge>
            )}
          </DialogTitle>
        </DialogHeader>

        {/* Supplier selector + bulk actions */}
        <div className="flex flex-wrap items-center gap-3 pb-2 border-b border-border">
          <div className="flex items-center gap-2">
            <Label className="text-sm whitespace-nowrap">Fornecedor:</Label>
            <Select value={selectedSupplierId} onValueChange={handleSupplierChange}>
              <SelectTrigger className="w-[250px]">
                <SelectValue placeholder="Selecionar fornecedor" />
              </SelectTrigger>
              <SelectContent>
                {suppliers.map((s: any) => (
                  <SelectItem key={s.supplier_id} value={s.supplier_id}>
                    {s.suppliers?.name || s.supplier_id}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {loaded && (
            <>
              <BulkApplyButton label="IVA" icon={<Percent className="h-3 w-3" />} defaultValue={23} onApply={v => applyToAll("vat_percent", v)} />
              <BulkApplyButton label="Desconto %" icon={<Percent className="h-3 w-3" />} defaultValue={0} onApply={v => applyToAll("discount_percent", v)} />
              <BulkApplyButton label="Lead Time" icon={<Clock className="h-3 w-3" />} defaultValue={30} onApply={v => applyToAll("lead_time_days", v)} />
            </>
          )}
        </div>

        {/* Table */}
        <div className="flex-1 overflow-auto min-h-0">
          {isLoadingSheet ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : !loaded ? (
            <div className="text-center py-12 text-muted-foreground">
              Selecione um fornecedor para carregar os itens.
            </div>
          ) : rows.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              Nenhum item neste RFQ.
            </div>
          ) : (
            <table className="w-full text-sm border-collapse" style={{ minWidth: "1100px" }}>
              <thead className="sticky top-0 z-10 bg-muted/80 backdrop-blur-sm">
                <tr className="border-b border-border">
                  <th className="text-left px-2 py-2 font-medium text-muted-foreground w-10">#</th>
                  <th className="text-left px-2 py-2 font-medium text-muted-foreground min-w-[180px]">Produto</th>
                  <th className="text-left px-2 py-2 font-medium text-muted-foreground w-24">SKU</th>
                  <th className="text-right px-2 py-2 font-medium text-muted-foreground w-16">Qtd</th>
                  <th className="text-right px-2 py-2 font-medium text-muted-foreground w-28">Preço Unit. ({currency})</th>
                  <th className="text-right px-2 py-2 font-medium text-muted-foreground w-20">Desc. %</th>
                  <th className="text-right px-2 py-2 font-medium text-muted-foreground w-20">IVA %</th>
                  <th className="text-right px-2 py-2 font-medium text-muted-foreground w-24">Lead Time</th>
                  <th className="text-right px-2 py-2 font-medium text-muted-foreground w-20">MOQ</th>
                  <th className="text-right px-2 py-2 font-medium text-muted-foreground w-28">Subtotal</th>
                  <th className="text-right px-2 py-2 font-medium text-muted-foreground w-28">Total c/ IVA</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, rowIdx) => (
                  <tr key={row.rfq_item_id} className={cn(
                    "border-b border-border/50 hover:bg-muted/30 transition-colors",
                    row.has_existing_quote && "bg-primary/5"
                  )}>
                    <td className="px-2 py-1 text-muted-foreground">{row.line_number}</td>
                    <td className="px-2 py-1 font-medium truncate max-w-[200px]" title={row.product_name}>{row.product_name}</td>
                    <td className="px-2 py-1 text-muted-foreground font-mono text-xs">{row.sku}</td>
                    <td className="px-2 py-1 text-right">{row.qty} {row.unit}</td>
                    {EDITABLE_FIELDS.map((field, fieldIdx) => {
                      const cellKey = `${rowIdx}-${field}`;
                      const error = cellErrors.get(cellKey);
                      const value = (row as any)[field];
                      return (
                        <td key={field} className="px-1 py-1">
                          <Input
                            ref={setRef(cellKey)}
                            type="number"
                            step={field === "unit_price" ? "0.01" : "1"}
                            className={cn(
                              "h-7 text-right text-sm px-2 bg-transparent border-border/40 focus:border-primary",
                              error && "border-destructive focus:border-destructive"
                            )}
                            value={value ?? ""}
                            onChange={e => updateCell(rowIdx, field, e.target.value)}
                            onKeyDown={e => handleKeyDown(e, rowIdx, fieldIdx)}
                            onPaste={e => handlePaste(e, rowIdx, fieldIdx)}
                            title={error?.message}
                          />
                        </td>
                      );
                    })}
                    <td className="px-2 py-1 text-right font-medium tabular-nums">
                      {calcSubtotal(row).toFixed(2)}
                    </td>
                    <td className="px-2 py-1 text-right font-medium tabular-nums">
                      {calcTotal(row).toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-muted/40 font-medium">
                <tr className="border-t-2 border-border">
                  <td colSpan={9} className="px-2 py-2 text-right">Totais:</td>
                  <td className="px-2 py-2 text-right tabular-nums">{grandSubtotal.toFixed(2)}</td>
                  <td className="px-2 py-2 text-right tabular-nums">{grandTotal.toFixed(2)}</td>
                </tr>
              </tfoot>
            </table>
          )}
        </div>

        {/* Footer */}
        {loaded && rows.length > 0 && (
          <div className="flex items-center justify-between pt-3 border-t border-border">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              {changesCount > 0 ? (
                <span className="flex items-center gap-1 text-destructive">
                  <AlertTriangle className="h-3.5 w-3.5" />
                  {changesCount} alteração(ões) por guardar
                </span>
              ) : (
                <span className="flex items-center gap-1 text-primary">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  Tudo guardado
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button
                variant="outline"
                onClick={handleSaveDraft}
                disabled={isUpserting || changesCount === 0}
              >
                {isUpserting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                Guardar Rascunho
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={isSubmitting || isUpserting}
              >
                {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                Submeter Cotação
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

// Bulk apply popover button
function BulkApplyButton({ label, icon, defaultValue, onApply }: {
  label: string;
  icon: React.ReactNode;
  defaultValue: number;
  onApply: (value: number) => void;
}) {
  const [value, setValue] = useState(String(defaultValue));

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1 text-xs h-7">
          {icon}
          {label}
          <ChevronDown className="h-3 w-3" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-48 p-3" align="start">
        <div className="space-y-2">
          <Label className="text-xs">Aplicar {label} a todos</Label>
          <Input
            type="number"
            value={value}
            onChange={e => setValue(e.target.value)}
            className="h-8"
          />
          <Button
            size="sm"
            className="w-full h-7"
            onClick={() => { onApply(Number(value) || 0); }}
          >
            Aplicar
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
