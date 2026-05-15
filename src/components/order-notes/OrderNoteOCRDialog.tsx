import { useState, useCallback, useRef, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useQuery } from "@tanstack/react-query";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  ScanText, Upload, Camera, Loader2, AlertTriangle, CheckCircle2,
  Trash2, Image as ImageIcon, Sparkles, Check, X as XIcon,
} from "lucide-react";
import { toast } from "sonner";

export interface OCRLineItemDraft {
  product_id: string | null;
  product_name: string;
  product_sku: string | null;
  product_image_url: string | null;
  quantity: number;
  unit_price_net: number;
  vat_rate: number;
  notes: string | null;
}

interface ParsedItem {
  sku: string | null;
  product_name: string;
  quantity: number;
  unit_price_net: number | null;
  vat_rate: number | null;
  price_includes_vat: boolean;
  line_total: number | null;
  notes: string | null;
  confidence: string;
  // matching state
  matched_product_id?: string | null;
  matched_image_url?: string | null;
  include: boolean;
}

interface CatalogProduct {
  id: string;
  name: string;
  sku: string | null;
  base_price: number | null;
  images: string[] | null;
  primary_image_index: number | null;
}

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onConfirm: (items: OCRLineItemDraft[]) => void;
}

function fileToBase64(file: File): Promise<{ base64: string; mime: string }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Erro ao ler ficheiro"));
    reader.onload = () => {
      const result = reader.result as string;
      const [meta, b64] = result.split(",");
      const mimeMatch = meta.match(/data:(.*?);base64/);
      resolve({ base64: b64, mime: mimeMatch?.[1] ?? file.type });
    };
    reader.readAsDataURL(file);
  });
}

// Reduz imagens grandes antes de enviar para a IA: acelera muito a OCR.
async function compressImage(file: File, maxDim = 1600, quality = 0.82): Promise<{ base64: string; mime: string }> {
  if (!file.type.startsWith("image/")) return fileToBase64(file);
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, maxDim / Math.max(bitmap.width, bitmap.height));
    const w = Math.round(bitmap.width * scale);
    const h = Math.round(bitmap.height * scale);
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return fileToBase64(file);
    ctx.drawImage(bitmap, 0, 0, w, h);
    const blob: Blob | null = await new Promise((res) =>
      canvas.toBlob((b) => res(b), "image/jpeg", quality)
    );
    if (!blob) return fileToBase64(file);
    const buf = await blob.arrayBuffer();
    let bin = "";
    const bytes = new Uint8Array(buf);
    for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
    return { base64: btoa(bin), mime: "image/jpeg" };
  } catch {
    return fileToBase64(file);
  }
}

function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9 ]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function findBestMatch(item: ParsedItem, products: CatalogProduct[]): CatalogProduct | null {
  if (!products.length) return null;
  // 1) match exato por SKU
  if (item.sku) {
    const skuNorm = item.sku.trim().toLowerCase();
    const bySku = products.find((p) => p.sku?.trim().toLowerCase() === skuNorm);
    if (bySku) return bySku;

    // 1b) Sufixo: muitas folhas manuscritas só têm os últimos dígitos do SKU.
    // Tenta encontrar produtos cujo SKU completo termina com o SKU lido (ou últimos 3+ dígitos).
    const digitsOnly = skuNorm.replace(/\D/g, "");
    const suffixCandidates: string[] = [];
    if (skuNorm.length >= 3) suffixCandidates.push(skuNorm);
    if (digitsOnly.length >= 3) {
      suffixCandidates.push(digitsOnly);
      suffixCandidates.push(digitsOnly.slice(-3));
      if (digitsOnly.length >= 4) suffixCandidates.push(digitsOnly.slice(-4));
    }
    for (const suffix of suffixCandidates) {
      const matches = products.filter((p) => {
        const ps = p.sku?.trim().toLowerCase();
        if (!ps) return false;
        return ps.endsWith(suffix) || ps.replace(/\D/g, "").endsWith(suffix);
      });
      if (matches.length === 1) return matches[0];
      if (matches.length > 1 && item.product_name) {
        // desambigua pelo nome
        const target = normalize(item.product_name);
        const targetTokens = new Set(target.split(" ").filter((t) => t.length > 2));
        let best: { p: CatalogProduct; score: number } | null = null;
        for (const p of matches) {
          const candTokens = new Set(normalize(p.name).split(" ").filter((t) => t.length > 2));
          let inter = 0;
          targetTokens.forEach((t) => { if (candTokens.has(t)) inter++; });
          const union = new Set([...targetTokens, ...candTokens]).size || 1;
          const score = inter / union;
          if (!best || score > best.score) best = { p, score };
        }
        if (best) return best.p;
      }
    }
  }
  // 2) match por nome (Jaccard simples sobre tokens)
  const target = normalize(item.product_name);
  if (!target) return null;
  const targetTokens = new Set(target.split(" ").filter((t) => t.length > 2));
  if (targetTokens.size === 0) return null;

  let best: { p: CatalogProduct; score: number } | null = null;
  for (const p of products) {
    const candidate = normalize(p.name);
    const candTokens = new Set(candidate.split(" ").filter((t) => t.length > 2));
    if (candTokens.size === 0) continue;
    let inter = 0;
    targetTokens.forEach((t) => { if (candTokens.has(t)) inter++; });
    const union = new Set([...targetTokens, ...candTokens]).size;
    const score = inter / union;
    if (!best || score > best.score) best = { p, score };
  }
  return best && best.score >= 0.4 ? best.p : null;
}

export function OrderNoteOCRDialog({ open, onOpenChange, onConfirm }: Props) {
  const { currentWorkspace } = useWorkspace();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [items, setItems] = useState<ParsedItem[]>([]);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [headerInfo, setHeaderInfo] = useState<Record<string, unknown> | null>(null);

  // catálogo do workspace para auto-match
  const { data: catalog = [] } = useQuery({
    queryKey: ["order-ocr-catalog", currentWorkspace?.id],
    queryFn: async () => {
      if (!currentWorkspace?.id) return [];
      const { data, error } = await supabase
        .from("products")
        .select("id, name, sku, base_price, images, primary_image_index")
        .eq("workspace_id", currentWorkspace.id)
        .eq("status", "active")
        .limit(2000);
      if (error) throw error;
      return (data ?? []) as CatalogProduct[];
    },
    enabled: open && !!currentWorkspace?.id,
    staleTime: 60_000,
  });

  const reset = useCallback(() => {
    setPreviewUrl((url) => { if (url) URL.revokeObjectURL(url); return null; });
    setItems([]);
    setWarnings([]);
    setHeaderInfo(null);
    setIsProcessing(false);
  }, []);

  const handleClose = useCallback(() => {
    reset();
    onOpenChange(false);
  }, [reset, onOpenChange]);

  const processFile = useCallback(async (file: File) => {
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      toast.error("Ficheiro demasiado grande (máx 10MB)");
      return;
    }
    if (!file.type.startsWith("image/") && file.type !== "application/pdf") {
      toast.error("Formato não suportado. Usa JPG, PNG ou PDF.");
      return;
    }

    setIsProcessing(true);
    setItems([]);
    setWarnings([]);
    setHeaderInfo(null);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(file.type.startsWith("image/") ? URL.createObjectURL(file) : null);

    try {
      const { base64, mime } = await compressImage(file);
      const { data, error } = await supabase.functions.invoke("order-note-ocr-parse", {
        body: { image_base64: base64, mime, file_name: file.name },
      });
      if (error) throw error;
      if (data?.fallback || data?.error) {
        toast.error(data?.error ?? "Erro ao processar imagem");
        setIsProcessing(false);
        return;
      }

      const parsedItems: ParsedItem[] = (data.items ?? []).map((it: ParsedItem) => {
        const match = findBestMatch(it, catalog);
        const matchedImage = match
          ? (match.images?.[match.primary_image_index ?? 0] ?? match.images?.[0] ?? null)
          : null;
        // se temos preço unitário com IVA incluído, converter para líquido
        let unitNet = it.unit_price_net;
        const vat = it.vat_rate ?? 23;
        if (unitNet != null && it.price_includes_vat) {
          unitNet = Math.round((unitNet / (1 + vat / 100)) * 100) / 100;
        }
        // se IA não devolveu preço mas temos match, usar preço de catálogo
        if (unitNet == null && match?.base_price != null) {
          unitNet = Number(match.base_price);
        }
        return {
          ...it,
          unit_price_net: unitNet,
          vat_rate: it.vat_rate,
          matched_product_id: match?.id ?? null,
          matched_image_url: matchedImage,
          include: true,
        };
      });

      setItems(parsedItems);
      setHeaderInfo(data.header ?? null);
      setWarnings(data.warnings ?? []);
      if (parsedItems.length === 0) {
        toast.warning("Não foi possível identificar produtos. Tenta uma foto mais nítida.");
      } else {
        toast.success(`${parsedItems.length} linha(s) detetada(s)`);
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao processar");
    } finally {
      setIsProcessing(false);
    }
  }, [catalog, previewUrl]);

  const updateItem = useCallback((idx: number, patch: Partial<ParsedItem>) => {
    setItems((prev) => prev.map((it, i) => (i === idx ? { ...it, ...patch } : it)));
  }, []);

  const removeItem = useCallback((idx: number) => {
    setItems((prev) => prev.filter((_, i) => i !== idx));
  }, []);

  const includedCount = useMemo(() => items.filter((i) => i.include).length, [items]);

  const handleConfirm = useCallback(() => {
    const drafts: OCRLineItemDraft[] = items
      .filter((it) => it.include && it.product_name.trim() && it.quantity > 0)
      .map((it) => ({
        product_id: it.matched_product_id ?? null,
        product_name: it.product_name.trim(),
        product_sku: it.sku,
        product_image_url: it.matched_image_url ?? null,
        quantity: it.quantity,
        unit_price_net: Number(it.unit_price_net ?? 0),
        vat_rate: Number(it.vat_rate ?? 23),
        notes: it.notes,
      }));
    if (drafts.length === 0) {
      toast.error("Sem linhas válidas para adicionar");
      return;
    }
    onConfirm(drafts);
    handleClose();
  }, [items, onConfirm, handleClose]);

  const matchedCount = items.filter((i) => i.matched_product_id).length;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ScanText className="h-5 w-5 text-primary" />
            Importar Encomenda por OCR
          </DialogTitle>
        </DialogHeader>

        {items.length === 0 && !isProcessing && (
          <div className="space-y-4">
            <Card
              className="border-dashed border-2 p-8 text-center cursor-pointer hover:bg-muted/30 transition-colors"
              onClick={() => fileInputRef.current?.click()}
              onDragOver={(e) => { e.preventDefault(); }}
              onDrop={(e) => {
                e.preventDefault();
                const f = e.dataTransfer.files?.[0];
                if (f) processFile(f);
              }}
            >
              <Upload className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
              <p className="font-medium mb-1">Arrasta a foto ou PDF da encomenda</p>
              <p className="text-sm text-muted-foreground mb-4">
                JPG, PNG ou PDF (máx 10MB) — folha manuscrita, talão ou ficheiro impresso
              </p>
              <div className="flex gap-2 justify-center">
                <Button variant="outline" size="sm">
                  <ImageIcon className="h-4 w-4 mr-1" /> Selecionar ficheiro
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    const input = document.createElement("input");
                    input.type = "file";
                    input.accept = "image/*";
                    input.capture = "environment";
                    input.onchange = (ev) => {
                      const f = (ev.target as HTMLInputElement).files?.[0];
                      if (f) processFile(f);
                    };
                    input.click();
                  }}
                >
                  <Camera className="h-4 w-4 mr-1" /> Tirar foto
                </Button>
              </div>
            </Card>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,application/pdf"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) processFile(f);
                e.target.value = "";
              }}
            />
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <Sparkles className="h-3 w-3" />
              A IA extrai produto, quantidade, preço e IVA. Reconhece também escrita manual.
            </p>
          </div>
        )}

        {isProcessing && (
          <div className="py-12 flex flex-col items-center gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm font-medium">A processar imagem com IA…</p>
            <p className="text-xs text-muted-foreground">Pode demorar 5-15 segundos</p>
            {previewUrl && (
              <img src={previewUrl} alt="" className="max-h-40 rounded border mt-2" />
            )}
          </div>
        )}

        {items.length > 0 && !isProcessing && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant="secondary" className="gap-1">
                <CheckCircle2 className="h-3 w-3" /> {items.length} linha(s) detetada(s)
              </Badge>
              {matchedCount > 0 && (
                <Badge variant="default" className="gap-1">
                  {matchedCount} produto(s) do catálogo identificado(s)
                </Badge>
              )}
              {warnings.map((w, i) => (
                <Badge key={i} variant="destructive" className="gap-1">
                  <AlertTriangle className="h-3 w-3" /> {w}
                </Badge>
              ))}
              <Button
                variant="ghost"
                size="sm"
                className="ml-auto"
                onClick={reset}
              >
                Recomeçar
              </Button>
            </div>

            {headerInfo && (headerInfo.client_name || headerInfo.client_tax_id || headerInfo.order_reference) && (
              <Card className="p-3 bg-muted/30">
                <p className="text-xs text-muted-foreground mb-1">Cabeçalho detetado (informativo)</p>
                <div className="text-sm space-y-0.5">
                  {headerInfo.client_name && <p><span className="text-muted-foreground">Cliente:</span> {String(headerInfo.client_name)}</p>}
                  {headerInfo.client_tax_id && <p><span className="text-muted-foreground">NIF:</span> {String(headerInfo.client_tax_id)}</p>}
                  {headerInfo.order_reference && <p><span className="text-muted-foreground">Referência:</span> {String(headerInfo.order_reference)}</p>}
                  {headerInfo.order_date && <p><span className="text-muted-foreground">Data:</span> {String(headerInfo.order_date)}</p>}
                </div>
              </Card>
            )}

            <div className="border rounded-md overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-8"></TableHead>
                    <TableHead>Produto</TableHead>
                    <TableHead className="w-20">Qtd</TableHead>
                    <TableHead className="w-28">Preço (líq.)</TableHead>
                    <TableHead className="w-20">IVA %</TableHead>
                    <TableHead className="w-24">Match</TableHead>
                    <TableHead className="w-10"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((item, idx) => (
                    <TableRow key={idx} className={item.include ? "" : "opacity-40"}>
                      <TableCell>
                        <input
                          type="checkbox"
                          checked={item.include}
                          onChange={(e) => updateItem(idx, { include: e.target.checked })}
                          className="h-4 w-4"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          value={item.product_name}
                          onChange={(e) => updateItem(idx, { product_name: e.target.value })}
                          className="h-8 text-sm"
                        />
                        {item.sku && (
                          <p className="text-[10px] text-muted-foreground mt-0.5">SKU: {item.sku}</p>
                        )}
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          min={1}
                          value={item.quantity}
                          onChange={(e) => updateItem(idx, { quantity: Math.max(1, Number(e.target.value)) })}
                          className="h-8 text-sm w-16"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          min={0}
                          step={0.01}
                          value={item.unit_price_net ?? ""}
                          onChange={(e) => updateItem(idx, { unit_price_net: e.target.value === "" ? null : Math.max(0, Number(e.target.value)) })}
                          className="h-8 text-sm w-24"
                          placeholder="0.00"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          min={0}
                          max={100}
                          value={item.vat_rate ?? 23}
                          onChange={(e) => updateItem(idx, { vat_rate: Math.max(0, Math.min(100, Number(e.target.value))) })}
                          className="h-8 text-sm w-16"
                        />
                      </TableCell>
                      <TableCell>
                        {item.matched_product_id ? (
                          <Badge variant="default" className="text-[10px]">Catálogo</Badge>
                        ) : (
                          <Badge variant="outline" className="text-[10px]">Manual</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => removeItem(idx)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {previewUrl && (
              <details className="text-xs">
                <summary className="cursor-pointer text-muted-foreground">Ver imagem original</summary>
                <img src={previewUrl} alt="" className="mt-2 max-h-64 rounded border" />
              </details>
            )}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>Cancelar</Button>
          <Button
            onClick={handleConfirm}
            disabled={isProcessing || includedCount === 0}
          >
            Adicionar {includedCount > 0 ? `${includedCount} linha(s)` : ""}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
