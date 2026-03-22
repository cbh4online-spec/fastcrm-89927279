import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, TestTube, ArrowRight, Columns } from "lucide-react";
import { useSupplierFeeds, SupplierFeed } from "@/hooks/useSupplierFeeds";
import { useFeedCategorySuggestions } from "@/hooks/useFeedCategorySuggestions";
import { SupplierFeedCategoryPreview } from "./SupplierFeedCategoryPreview";
import { toast } from "sonner";

const PRODUCT_FIELDS = [
  { value: "sku", label: "SKU / Referência" },
  { value: "ean", label: "EAN / Código de barras" },
  { value: "name", label: "Nome do produto" },
  { value: "description", label: "Descrição curta" },
  { value: "long_description", label: "Descrição longa" },
  { value: "cost_price", label: "Preço de custo" },
  { value: "sale_price", label: "PVP / Preço de venda" },
  { value: "category", label: "Categoria" },
  { value: "subcategory", label: "Subcategoria" },
  { value: "brand", label: "Marca" },
  { value: "barcode", label: "Código de barras (legacy)" },
  { value: "image_url", label: "URL da imagem" },
  { value: "stock", label: "Stock" },
  { value: "weight", label: "Peso (kg)" },
  { value: "dimensions", label: "Dimensões" },
  { value: "model", label: "Modelo" },
  { value: "family", label: "Linha / Família" },
  { value: "warranty", label: "Garantia" },
  { value: "datasheet_url", label: "Ficha técnica (URL)" },
];

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  supplierId?: string;
  feed?: SupplierFeed | null;
}

export function SupplierFeedConfigDialog({ open, onOpenChange, supplierId, feed }: Props) {
  const { createFeed, updateFeed, previewFeed } = useSupplierFeeds();
  const categorySuggestions = useFeedCategorySuggestions();

  const [feedName, setFeedName] = useState("");
  const [feedUrl, setFeedUrl] = useState("");
  const [delimiter, setDelimiter] = useState(";");
  const [encoding, setEncoding] = useState("utf-8");
  const [autoSync, setAutoSync] = useState(false);
  const [syncInterval, setSyncInterval] = useState(24);
  // Inverted mapping: csvColumn → systemField
  const [invertedMapping, setInvertedMapping] = useState<Record<string, string>>({});
  // Selected columns (checkboxes)
  const [selectedColumns, setSelectedColumns] = useState<Set<string>>(new Set());
  // AI categories
  const [aiCategoriesEnabled, setAiCategoriesEnabled] = useState(false);
  // Default markup
  const [defaultMarkup, setDefaultMarkup] = useState(30);

  // Preview state
  const [previewHeaders, setPreviewHeaders] = useState<string[]>([]);
  const [previewRows, setPreviewRows] = useState<Record<string, string>[]>([]);
  const [previewTotal, setPreviewTotal] = useState(0);
  const [isPreviewing, setIsPreviewing] = useState(false);

  useEffect(() => {
    if (feed) {
      setFeedName(feed.feed_name);
      setFeedUrl(feed.feed_url);
      setDelimiter(feed.csv_delimiter);
      setEncoding(feed.csv_encoding);
      setAutoSync(feed.auto_sync_enabled);
      setSyncInterval(feed.sync_interval_hours);
      // Convert system→csv mapping to csv→system mapping
      const inverted: Record<string, string> = {};
      const cols = new Set<string>();
      for (const [sysField, csvCol] of Object.entries(feed.column_mapping || {})) {
        inverted[csvCol] = sysField;
        cols.add(csvCol);
      }
      setInvertedMapping(inverted);
      setSelectedColumns(cols);
    } else {
      setFeedName("");
      setFeedUrl("");
      setDelimiter(";");
      setEncoding("utf-8");
      setAutoSync(false);
      setSyncInterval(24);
      setInvertedMapping({});
      setSelectedColumns(new Set());
      setPreviewHeaders([]);
      setPreviewRows([]);
      categorySuggestions.clearSuggestions();
      setAiCategoriesEnabled(false);
      setDefaultMarkup(30);
    }
  }, [feed, open]);

  // Convert inverted mapping back to system→csv for storage
  const getColumnMapping = (): Record<string, string> => {
    const mapping: Record<string, string> = {};
    for (const [csvCol, sysField] of Object.entries(invertedMapping)) {
      if (sysField && selectedColumns.has(csvCol)) {
        mapping[sysField] = csvCol;
      }
    }
    return mapping;
  };

  const handleTestUrl = async () => {
    if (!feedUrl.trim()) {
      toast.error("Insere o URL do feed");
      return;
    }

    setIsPreviewing(true);
    try {
      let fId = feed?.id;
      if (!fId) {
        // Create temp feed to test
        await createFeed.mutateAsync({
          feed_name: feedName || "Teste",
          feed_url: feedUrl,
          csv_delimiter: delimiter,
          csv_encoding: encoding,
          supplier_id: supplierId || null,
          auto_sync_enabled: false,
        } as any);
        toast.info("Feed criado. Clica novamente em Testar URL.");
        setIsPreviewing(false);
        return;
      }

      const result = await previewFeed.mutateAsync(fId);
      setPreviewHeaders(result.headers);
      setPreviewRows(result.sample_rows);
      setPreviewTotal(result.total_rows);

      // Auto-suggest inverted mapping
      const autoInverted: Record<string, string> = {};
      const autoCols = new Set<string>();
      const usedFields = new Set<string>();
      for (const h of result.headers) {
        const lower = h.toLowerCase();
        let mapped = "";
        if (/^(ref(erencia)?|sku|codigo|code|part.?num)/i.test(lower)) mapped = 'sku';
        else if (/^(ean|gtin|barcode|codigo.?barr)/i.test(lower)) mapped = 'ean';
        else if (/^(nombre|name|titulo|produto|product$)/i.test(lower)) mapped = 'name';
        else if (/^(desc(ripcion)?_?(larga|long)|long.?desc)/i.test(lower)) mapped = 'long_description';
        else if (/^(desc(ripcion|ription)?|resumen|short.?desc)/i.test(lower)) mapped = 'description';
        else if (/^(precio.?coste?|cost|compra|purchase|wholesale)/i.test(lower)) mapped = 'cost_price';
        else if (/^(pvp|venta|sale|retail|price|prec[io]o?$)/i.test(lower)) mapped = 'sale_price';
        else if (/subcateg/i.test(lower)) mapped = 'subcategory';
        else if (/^(categ|familia|group|tipo$|type$)/i.test(lower)) mapped = 'category';
        else if (/^(marca|brand|fabricante|manufacturer)/i.test(lower)) mapped = 'brand';
        else if (/^(image|foto|photo|picture|img)/i.test(lower)) mapped = 'image_url';
        else if (/^(stock|qty|quantity|disponible|available)/i.test(lower)) mapped = 'stock';
        else if (/^(peso|weight|kg)/i.test(lower)) mapped = 'weight';
        else if (/^(dimen)/i.test(lower)) mapped = 'dimensions';
        else if (/^(model)/i.test(lower)) mapped = 'model';
        else if (/^(garant|warranty)/i.test(lower)) mapped = 'warranty';
        else if (/^(ficha|datasheet|spec|technical)/i.test(lower)) mapped = 'datasheet_url';

        if (mapped && !usedFields.has(mapped)) {
          usedFields.add(mapped);
          autoInverted[h] = mapped;
          autoCols.add(h);
        }
      }
      setInvertedMapping(prev => ({ ...autoInverted, ...prev }));
      setSelectedColumns(prev => {
        const next = new Set(prev);
        autoCols.forEach(c => next.add(c));
        return next;
      });
    } catch (e: any) {
      toast.error("Erro ao testar URL: " + e.message);
    } finally {
      setIsPreviewing(false);
    }
  };

  const handleSave = async () => {
    if (!feedName.trim() || !feedUrl.trim()) {
      toast.error("Preenche o nome e URL do feed");
      return;
    }

    const config = {
      feed_name: feedName,
      feed_url: feedUrl,
      csv_delimiter: delimiter,
      csv_encoding: encoding,
      auto_sync_enabled: autoSync,
      sync_interval_hours: syncInterval,
      column_mapping: getColumnMapping(),
      supplier_id: supplierId || null,
      default_markup_pct: defaultMarkup,
    };

    if (feed) {
      await updateFeed.mutateAsync({ id: feed.id, ...config } as any);
    } else {
      await createFeed.mutateAsync(config as any);
    }
    onOpenChange(false);
  };

  const toggleColumn = (header: string) => {
    setSelectedColumns(prev => {
      const next = new Set(prev);
      if (next.has(header)) {
        next.delete(header);
      } else {
        next.add(header);
      }
      return next;
    });
  };

  const updateColumnMapping = (csvColumn: string, systemField: string) => {
    setInvertedMapping(prev => {
      const next = { ...prev };
      if (systemField) {
        next[csvColumn] = systemField;
      } else {
        delete next[csvColumn];
      }
      return next;
    });
  };

  const handlePreviewCategories = () => {
    // Get product names from preview rows using the mapped "name" column
    const nameCol = Object.entries(invertedMapping).find(([_, sys]) => sys === 'name')?.[0];
    if (!nameCol) {
      toast.error("Mapeia uma coluna para 'Nome do produto' primeiro");
      return;
    }
    const names = previewRows.map(r => r[nameCol]).filter(Boolean).slice(0, 20);
    if (names.length === 0) {
      toast.error("Sem nomes de produtos no preview");
      return;
    }
    categorySuggestions.suggestCategories.mutate(names);
  };

  const selectedCount = selectedColumns.size;
  const totalColumns = previewHeaders.length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{feed ? "Editar Feed" : "Novo Feed de Fornecedor"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Basic config */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Nome do feed</Label>
              <Input value={feedName} onChange={e => setFeedName(e.target.value)} placeholder="Visiotech - Catálogo" />
            </div>
            <div className="space-y-2">
              <Label>Tipo</Label>
              <Select value="csv" disabled>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="csv">CSV</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>URL do feed</Label>
            <div className="flex gap-2">
              <Input
                value={feedUrl}
                onChange={e => setFeedUrl(e.target.value)}
                placeholder="https://www.visiotechsecurity.com/..."
                className="flex-1"
              />
              <Button
                variant="outline"
                onClick={handleTestUrl}
                disabled={isPreviewing || !feedUrl.trim()}
              >
                {isPreviewing ? <Loader2 className="h-4 w-4 animate-spin" /> : <TestTube className="h-4 w-4" />}
                <span className="ml-1">Testar</span>
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Delimitador CSV</Label>
              <Select value={delimiter} onValueChange={setDelimiter}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value=";">Ponto e vírgula (;)</SelectItem>
                  <SelectItem value=",">Vírgula (,)</SelectItem>
                  <SelectItem value="\t">Tab</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Encoding</Label>
              <Select value={encoding} onValueChange={setEncoding}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="utf-8">UTF-8</SelectItem>
                  <SelectItem value="iso-8859-1">ISO-8859-1 (Latin)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Preview table — ALL columns */}
          {previewHeaders.length > 0 && previewRows.length > 0 && (
            <div className="space-y-2 border rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Columns className="h-4 w-4 text-muted-foreground" />
                  <h5 className="text-xs font-medium text-muted-foreground">
                    Pré-visualização — {totalColumns} colunas · {previewTotal} linhas
                  </h5>
                </div>
                <span className="text-xs text-muted-foreground">
                  {selectedCount} selecionadas
                </span>
              </div>
              <ScrollArea className="w-full">
                <div className="overflow-x-auto border rounded max-h-[200px]">
                  <table className="text-xs w-max min-w-full">
                    <thead>
                      <tr className="bg-muted/50">
                        {previewHeaders.map(h => (
                          <th key={h} className="px-2 py-1.5 text-left font-medium whitespace-nowrap">
                            <div className="flex items-center gap-1.5">
                              <Checkbox
                                checked={selectedColumns.has(h)}
                                onCheckedChange={() => toggleColumn(h)}
                                className="h-3.5 w-3.5"
                              />
                              <span className={selectedColumns.has(h) ? "" : "text-muted-foreground"}>{h}</span>
                            </div>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {previewRows.map((row, i) => (
                        <tr key={i} className="border-t">
                          {previewHeaders.map(h => (
                            <td
                              key={h}
                              className={`px-2 py-1 truncate max-w-[180px] whitespace-nowrap ${
                                selectedColumns.has(h) ? "" : "text-muted-foreground/50"
                              }`}
                            >
                              {row[h] || "—"}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </ScrollArea>
            </div>
          )}

          {/* Inverted column mapping: CSV column → system field */}
          {previewHeaders.length > 0 && (
            <div className="space-y-3 border rounded-lg p-4">
              <div className="flex items-center justify-between">
                <h4 className="font-semibold text-sm">Mapeamento de colunas</h4>
                <span className="text-xs text-muted-foreground">
                  Coluna CSV → Campo do sistema
                </span>
              </div>

              <div className="space-y-1.5 max-h-[300px] overflow-y-auto pr-1">
                {previewHeaders.map(csvCol => {
                  const isSelected = selectedColumns.has(csvCol);
                  return (
                    <div
                      key={csvCol}
                      className={`flex items-center gap-3 py-1 ${!isSelected ? "opacity-40" : ""}`}
                    >
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={() => toggleColumn(csvCol)}
                        className="h-3.5 w-3.5 shrink-0"
                      />
                      <span className="text-sm w-40 shrink-0 truncate font-mono text-xs">
                        {csvCol}
                      </span>
                      <ArrowRight className="h-3 w-3 text-muted-foreground shrink-0" />
                      <Select
                        value={invertedMapping[csvCol] || ""}
                        onValueChange={v => updateColumnMapping(csvCol, v)}
                        disabled={!isSelected}
                      >
                        <SelectTrigger className="flex-1 h-8 text-xs">
                          <SelectValue placeholder="— Ignorar —" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="">— Ignorar —</SelectItem>
                          {PRODUCT_FIELDS.map(f => (
                            <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* AI Category suggestions */}
          {previewHeaders.length > 0 && (
            <SupplierFeedCategoryPreview
              suggestions={categorySuggestions.suggestions}
              isLoading={categorySuggestions.isLoading}
              onPreview={handlePreviewCategories}
              onToggle={categorySuggestions.toggleSuggestion}
              onUpdate={categorySuggestions.updateSuggestion}
              enabled={aiCategoriesEnabled}
              onEnabledChange={setAiCategoriesEnabled}
            />
          )}

          {/* Auto-sync */}
          <div className="flex items-center justify-between border rounded-lg p-4">
            <div>
              <p className="text-sm font-medium">Sincronização automática</p>
              <p className="text-xs text-muted-foreground">Atualiza automaticamente os produtos</p>
            </div>
            <div className="flex items-center gap-3">
              {autoSync && (
                <Select value={String(syncInterval)} onValueChange={v => setSyncInterval(Number(v))}>
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="12">A cada 12h</SelectItem>
                    <SelectItem value="24">A cada 24h</SelectItem>
                    <SelectItem value="48">A cada 48h</SelectItem>
                    <SelectItem value="168">Semanal</SelectItem>
                  </SelectContent>
                </Select>
              )}
              <Switch checked={autoSync} onCheckedChange={setAutoSync} />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button
            onClick={handleSave}
            disabled={createFeed.isPending || updateFeed.isPending}
          >
            {(createFeed.isPending || updateFeed.isPending) && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            {feed ? "Guardar alterações" : "Criar feed"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
