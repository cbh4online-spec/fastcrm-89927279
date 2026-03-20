import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Loader2, TestTube, ArrowRight } from "lucide-react";
import { useSupplierFeeds, SupplierFeed } from "@/hooks/useSupplierFeeds";
import { toast } from "sonner";

const PRODUCT_FIELDS = [
  { value: "sku", label: "SKU / Referência" },
  { value: "name", label: "Nome do produto" },
  { value: "description", label: "Descrição" },
  { value: "price", label: "Preço" },
  { value: "category", label: "Categoria" },
  { value: "brand", label: "Marca" },
  { value: "barcode", label: "Código de barras" },
  { value: "image_url", label: "URL da imagem" },
  { value: "stock", label: "Stock" },
  { value: "", label: "— Ignorar —" },
];

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  supplierId?: string;
  feed?: SupplierFeed | null;
}

export function SupplierFeedConfigDialog({ open, onOpenChange, supplierId, feed }: Props) {
  const { createFeed, updateFeed, previewFeed } = useSupplierFeeds();

  const [feedName, setFeedName] = useState("");
  const [feedUrl, setFeedUrl] = useState("");
  const [delimiter, setDelimiter] = useState(";");
  const [encoding, setEncoding] = useState("utf-8");
  const [autoSync, setAutoSync] = useState(false);
  const [syncInterval, setSyncInterval] = useState(24);
  const [columnMapping, setColumnMapping] = useState<Record<string, string>>({});

  // Preview state
  const [previewHeaders, setPreviewHeaders] = useState<string[]>([]);
  const [previewRows, setPreviewRows] = useState<Record<string, string>[]>([]);
  const [previewTotal, setPreviewTotal] = useState(0);
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [tempFeedId, setTempFeedId] = useState<string | null>(null);

  useEffect(() => {
    if (feed) {
      setFeedName(feed.feed_name);
      setFeedUrl(feed.feed_url);
      setDelimiter(feed.csv_delimiter);
      setEncoding(feed.csv_encoding);
      setAutoSync(feed.auto_sync_enabled);
      setSyncInterval(feed.sync_interval_hours);
      setColumnMapping(feed.column_mapping || {});
    } else {
      setFeedName("");
      setFeedUrl("");
      setDelimiter(";");
      setEncoding("utf-8");
      setAutoSync(false);
      setSyncInterval(24);
      setColumnMapping({});
      setPreviewHeaders([]);
      setPreviewRows([]);
    }
  }, [feed, open]);

  const handleTestUrl = async () => {
    if (!feedUrl.trim()) {
      toast.error("Insere o URL do feed");
      return;
    }

    setIsPreviewing(true);
    try {
      // Need to save a temporary feed to test — or if editing, use existing
      let fId = feed?.id || tempFeedId;
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
        // We need the ID — re-query or use a workaround
        toast.info("Feed criado. Clica novamente em Testar URL.");
        setIsPreviewing(false);
        return;
      }

      const result = await previewFeed.mutateAsync(fId);
      setPreviewHeaders(result.headers);
      setPreviewRows(result.sample_rows);
      setPreviewTotal(result.total_rows);

      // Auto-suggest mapping for known Visiotech columns
      const autoMapping: Record<string, string> = {};
      for (const h of result.headers) {
        const lower = h.toLowerCase();
        if (lower.includes('sku') || lower.includes('referenc') || lower.includes('ref')) autoMapping.sku = h;
        else if (lower.includes('nombre') || lower.includes('name') || lower.includes('descri') || lower.includes('produto')) autoMapping.name = h;
        else if (lower.includes('precio') || lower.includes('price') || lower.includes('pvp') || lower.includes('preço')) autoMapping.price = h;
        else if (lower.includes('categ') || lower.includes('familia')) autoMapping.category = h;
        else if (lower.includes('marca') || lower.includes('brand')) autoMapping.brand = h;
        else if (lower.includes('ean') || lower.includes('barcode') || lower.includes('código')) autoMapping.barcode = h;
        else if (lower.includes('image') || lower.includes('foto') || lower.includes('img')) autoMapping.image_url = h;
        else if (lower.includes('stock') || lower.includes('cantidad')) autoMapping.stock = h;
      }
      setColumnMapping(prev => ({ ...autoMapping, ...prev }));
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
      column_mapping: columnMapping,
      supplier_id: supplierId || null,
    };

    if (feed) {
      await updateFeed.mutateAsync({ id: feed.id, ...config } as any);
    } else {
      await createFeed.mutateAsync(config as any);
    }
    onOpenChange(false);
  };

  const updateMapping = (field: string, csvColumn: string) => {
    setColumnMapping(prev => {
      const next = { ...prev };
      if (csvColumn) {
        next[field] = csvColumn;
      } else {
        delete next[field];
      }
      return next;
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
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

          {/* Column mapping */}
          {previewHeaders.length > 0 && (
            <div className="space-y-3 border rounded-lg p-4">
              <div className="flex items-center justify-between">
                <h4 className="font-semibold text-sm">Mapeamento de colunas</h4>
                <span className="text-xs text-muted-foreground">{previewTotal} linhas encontradas</span>
              </div>

              <div className="space-y-2">
                {PRODUCT_FIELDS.filter(f => f.value).map(field => (
                  <div key={field.value} className="flex items-center gap-3">
                    <span className="text-sm w-36 shrink-0">{field.label}</span>
                    <ArrowRight className="h-3 w-3 text-muted-foreground shrink-0" />
                    <Select
                      value={columnMapping[field.value] || ""}
                      onValueChange={v => updateMapping(field.value, v)}
                    >
                      <SelectTrigger className="flex-1">
                        <SelectValue placeholder="Selecionar coluna..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">— Ignorar —</SelectItem>
                        {previewHeaders.map(h => (
                          <SelectItem key={h} value={h}>{h}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ))}
              </div>

              {/* Preview table */}
              {previewRows.length > 0 && (
                <div className="mt-3">
                  <h5 className="text-xs font-medium text-muted-foreground mb-2">Pré-visualização (5 primeiras linhas)</h5>
                  <div className="overflow-x-auto border rounded">
                    <table className="text-xs w-full">
                      <thead>
                        <tr className="bg-muted/50">
                          {previewHeaders.slice(0, 6).map(h => (
                            <th key={h} className="px-2 py-1 text-left font-medium">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {previewRows.map((row, i) => (
                          <tr key={i} className="border-t">
                            {previewHeaders.slice(0, 6).map(h => (
                              <td key={h} className="px-2 py-1 truncate max-w-[150px]">{row[h]}</td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
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
