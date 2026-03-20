import { useState, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Upload,
  FileSpreadsheet,
  Loader2,
  CheckCircle,
  XCircle,
  Download,
  Plus,
  ClipboardList,
  Sparkles,
  Link,
  ArrowRight,
  Globe,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useCreateProduct, useCreateProductsBatch } from "@/hooks/useProducts";
import { PostCreationSuggestionsCard } from "./PostCreationSuggestionsCard";
import { useWorkspace } from "@/contexts/WorkspaceContext";

interface BatchSKUImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface SKUResult {
  sku: string;
  status: "pending" | "processing" | "success" | "error";
  rawRow?: Record<string, string>;
  data?: {
    name?: string;
    commercialName?: string;
    technicalName?: string;
    description?: string;
    commercialDescription?: string;
    shortDescription?: string;
    category?: string;
    subcategory?: string;
    brand?: string;
    suggestedPrice?: number;
    costPrice?: number;
    recommendedPrice?: number;
    barcode?: string;
    weight?: string;
    imageUrl?: string;
    stock?: number;
    model?: string;
    specifications?: Record<string, string>;
    priceRange?: { min: number; max: number };
    color?: string;
    material?: string;
    warranty?: string;
    dimensions?: string;
    relatedProducts?: string;
  };
  error?: string;
  selected?: boolean;
  editedName?: string;
  editedPrice?: string;
}

type DialogPhase = "input" | "mapping" | "processing" | "results" | "summary";

interface CreationSummary {
  successCount: number;
  errorCount: number;
  failedSkus: { sku: string; error: string }[];
  lastCreatedProductId?: string;
  lastCreatedProductName?: string;
}

// System fields products can be mapped to
const SYSTEM_FIELDS = [
  { key: "ignore", label: "Ignorar" },
  { key: "sku", label: "SKU / Referência" },
  { key: "name", label: "Nome" },
  { key: "short_description", label: "Descrição curta" },
  { key: "description", label: "Descrição completa" },
  { key: "price", label: "Preço de venda" },
  { key: "cost_price", label: "Preço de custo" },
  { key: "recommended_price", label: "Preço recomendado (PVP)" },
  { key: "category", label: "Categoria" },
  { key: "subcategory", label: "Subcategoria" },
  { key: "brand", label: "Marca" },
  { key: "barcode", label: "Código de barras / EAN" },
  { key: "stock", label: "Stock" },
  { key: "weight", label: "Peso" },
  { key: "image_url", label: "URL da Imagem" },
  { key: "model", label: "Modelo" },
  { key: "specifications", label: "Características / Specs" },
  { key: "related_products", label: "Produtos relacionados" },
  { key: "dimensions", label: "Dimensões" },
  { key: "color", label: "Cor" },
  { key: "material", label: "Material" },
  { key: "warranty", label: "Garantia" },
  { key: "extra", label: "Dados extra" },
];

// Auto-mapping patterns: regex → system field key
const AUTO_MAP_PATTERNS: [RegExp, string][] = [
  [/^(sku|ref|reference|referencia|referência|código|codigo|code|part.?number|codart)$/i, "sku"],
  [/^(name|nome|product.?name|título|titulo|designação|designacao|nom)$/i, "name"],
  [/^(description_short|desc.?curta|short.?desc|resumo)$/i, "short_description"],
  [/^(desc|description|descrição|descricao|description_long|descripcion)$/i, "description"],
  [/^(pvp|recommended.?price|preço.?recomendado|msrp|rrp|pvp.?recomendado)$/i, "recommended_price"],
  [/^(cost|custo|cost.?price|preço.?custo|precio.?coste|prix.?achat)$/i, "cost_price"],
  [/^(price|preço|preco|precio|prix|tarifa|sell.?price)$/i, "price"],
  [/^(category|categoria|cat|famille|familia)$/i, "category"],
  [/^(subcategory|subcategoria|sub.?cat|sous.?famille)$/i, "subcategory"],
  [/^(brand|marca|fabricante|manufacturer|marque)$/i, "brand"],
  [/^(barcode|ean|upc|gtin|código.?barras|codebar)$/i, "barcode"],
  [/^(stock|qty|quantity|quantidade|existencias|inventario)$/i, "stock"],
  [/^(weight|peso|poids|kg)$/i, "weight"],
  [/^(image|img|imagem|image_url|foto|photo|url_image|url_img)$/i, "image_url"],
  [/^(model|modelo|modèle)$/i, "model"],
  [/^(spec|specs|specifications|características|caracteristicas|features)$/i, "specifications"],
  [/^(related|relacionados|accessories|acessórios|complementos)$/i, "related_products"],
  [/^(dimensions|dimensões|dimensoes|medidas|size|tamanho)$/i, "dimensions"],
  [/^(color|colour|cor|couleur)$/i, "color"],
  [/^(material|materia|materiau)$/i, "material"],
  [/^(warranty|garantia|garantie)$/i, "warranty"],
];

const BATCH_SIZE = 5;
const BATCH_DELAY_MS = 500;

/** RFC 4180–compliant CSV line parser that handles quoted fields containing delimiters */
function parseCSVLine(line: string, delimiter: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"') {
        if (i + 1 < line.length && line[i + 1] === '"') {
          current += '"';
          i++; // skip escaped quote
        } else {
          inQuotes = false;
        }
      } else {
        current += ch;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
      } else if (ch === delimiter) {
        result.push(current.trim());
        current = "";
      } else {
        current += ch;
      }
    }
  }
  result.push(current.trim());
  return result;
}

/** Clean price string: remove currency symbols, spaces; convert comma decimal */
function sanitizePrice(val: string): number | undefined {
  if (!val) return undefined;
  // Remove currency symbols, spaces, non-breaking spaces
  let cleaned = val.replace(/[€$£\s\u00A0]/g, "").trim();
  // If has both . and , — determine which is decimal separator
  if (cleaned.includes(",") && cleaned.includes(".")) {
    // e.g. "1.234,56" → European format
    if (cleaned.lastIndexOf(",") > cleaned.lastIndexOf(".")) {
      cleaned = cleaned.replace(/\./g, "").replace(",", ".");
    } else {
      // e.g. "1,234.56" → US format
      cleaned = cleaned.replace(/,/g, "");
    }
  } else if (cleaned.includes(",")) {
    cleaned = cleaned.replace(",", ".");
  }
  const num = parseFloat(cleaned);
  return isNaN(num) ? undefined : num;
}

const SYSTEM_COLUMNS = [
  { key: "__status", label: "Estado" },
  { key: "__ai_name", label: "Nome (IA)" },
  { key: "__ai_price", label: "Preço (IA)" },
  { key: "__ai_category", label: "Categoria (IA)" },
];

export function BatchSKUImportDialog({ open, onOpenChange }: BatchSKUImportDialogProps) {
  const [skuList, setSkuList] = useState<SKUResult[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [manualInput, setManualInput] = useState("");
  const [phase, setPhase] = useState<DialogPhase>("input");
  const [summary, setSummary] = useState<CreationSummary | null>(null);
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [visibleCsvCols, setVisibleCsvCols] = useState<Set<string>>(new Set());
  const [visibleSysCols, setVisibleSysCols] = useState<Set<string>>(
    new Set(SYSTEM_COLUMNS.map(c => c.key))
  );
  const [showColumnPicker, setShowColumnPicker] = useState(false);

  // URL import state
  const [feedUrl, setFeedUrl] = useState("");
  const [isDownloading, setIsDownloading] = useState(false);

  // Mapping phase state
  const [allCsvHeaders, setAllCsvHeaders] = useState<string[]>([]);
  const [sampleRows, setSampleRows] = useState<string[][]>([]);
  const [totalUrlRows, setTotalUrlRows] = useState(0);
  const [columnMapping, setColumnMapping] = useState<Record<string, string>>({});
  const [columnIncluded, setColumnIncluded] = useState<Record<string, boolean>>({});
  // Full rows data for direct creation
  const [allRows, setAllRows] = useState<string[][]>([]);

  const createProduct = useCreateProduct();
  const createProductsBatch = useCreateProductsBatch();
  const { currentWorkspace } = useWorkspace();

  const detectDelimiter = (firstLine: string): string => {
    const counts = { ";": 0, ",": 0, "\t": 0, "|": 0 };
    for (const ch of firstLine) {
      if (ch in counts) counts[ch as keyof typeof counts]++;
    }
    let best: string = ";";
    let max = 0;
    for (const [d, c] of Object.entries(counts)) {
      if (c > max) { max = c; best = d; }
    }
    return max > 0 ? best : ";";
  };

  const autoMapHeaders = (headers: string[]) => {
    const mapping: Record<string, string> = {};
    const included: Record<string, boolean> = {};
    const usedFields = new Set<string>();

    for (const h of headers) {
      let mapped = "ignore";
      for (const [regex, field] of AUTO_MAP_PATTERNS) {
        if (regex.test(h) && !usedFields.has(field)) {
          mapped = field;
          usedFields.add(field);
          break;
        }
      }
      mapping[h] = mapped;
      included[h] = mapped !== "ignore";
    }
    return { mapping, included };
  };

  // Transition to mapping phase with headers + sample data
  const goToMapping = (headers: string[], rows: string[][], totalRows: number) => {
    setAllCsvHeaders(headers);
    setSampleRows(rows.slice(0, 5));
    setAllRows(rows);
    setTotalUrlRows(totalRows);
    const { mapping, included } = autoMapHeaders(headers);
    setColumnMapping(mapping);
    setColumnIncluded(included);
    setPhase("mapping");
  };

  // Download CSV from URL via edge function
  const handleUrlDownload = async () => {
    if (!feedUrl.trim()) { toast.error("Introduza um URL"); return; }
    setIsDownloading(true);
    try {
      const { data, error } = await supabase.functions.invoke("csv-url-fetch", {
        body: { url: feedUrl.trim(), max_rows: 5000 },
      });
      if (error) throw error;
      if (!data.success) throw new Error(data.error);

      const headers: string[] = data.headers;
      const rows: string[][] = data.rows;

      if (headers.length === 0) { toast.error("CSV vazio ou sem colunas"); return; }

      toast.success(`${data.total_rows} linhas · ${headers.length} colunas detectadas`);
      goToMapping(headers, rows, data.total_rows);
    } catch (err) {
      toast.error(`Erro ao descarregar: ${err instanceof Error ? err.message : "Erro desconhecido"}`);
    } finally {
      setIsDownloading(false);
    }
  };

  const handleFileUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      const lines = text.split(/[\r\n]+/).filter(Boolean);
      if (lines.length === 0) return;

      const delimiter = detectDelimiter(lines[0]);
      const headers = parseCSVLine(lines[0], delimiter).map(h => h.replace(/^["']|["']$/g, ""));
      const rows = lines.slice(1).map(line => parseCSVLine(line, delimiter));

      toast.success(`${rows.length} linhas · ${headers.length} colunas detectadas`);
      goToMapping(headers, rows, rows.length);
    };
    reader.readAsText(file);
    e.target.value = "";
  }, []);

  const handleManualSubmit = () => {
    const lines = manualInput.split(/[\r\n]+/).filter(Boolean);
    if (lines.length === 0) { toast.error("Nenhum SKU válido encontrado"); return; }

    const delimiter = detectDelimiter(lines[0]);
    const firstCols = parseCSVLine(lines[0], delimiter);

    if (firstCols.length > 1) {
      const headers = firstCols.map(h => h.replace(/^["']|["']$/g, ""));
      const rows = lines.slice(1).map(line => parseCSVLine(line, delimiter));
      if (rows.length > 0) {
        toast.success(`${rows.length} linhas · ${headers.length} colunas`);
        goToMapping(headers, rows, rows.length);
        return;
      }
    }

    // Simple list of SKUs — skip mapping, go to processing
    const skus = lines
      .map(l => l.split(/[,;|\t]/)[0]?.trim())
      .filter(s => s && s.length >= 3);
    const uniqueByNormalized = new Map<string, string>();
    for (const sku of skus) {
      const key = sku.toLowerCase();
      if (!uniqueByNormalized.has(key)) uniqueByNormalized.set(key, sku);
    }
    const unique = [...uniqueByNormalized.values()];
    if (unique.length === 0) { toast.error("Nenhum SKU válido encontrado"); return; }
    setCsvHeaders([]);
    setVisibleCsvCols(new Set());
    setSkuList(unique.map(sku => ({ sku, status: "pending", selected: true })));
    setPhase("processing");
    toast.success(`${unique.length} SKUs carregados`);
  };

  // Confirm mapping → build SKUResult list from data
  const confirmMapping = (useAi: boolean) => {
    const skuCol = Object.entries(columnMapping).find(([, v]) => v === "sku")?.[0];
    if (!skuCol) {
      toast.error("Selecione uma coluna como SKU / Referência");
      return;
    }
    const skuIdx = allCsvHeaders.indexOf(skuCol);

    const includedHeaders = allCsvHeaders.filter(h => columnIncluded[h]);
    setCsvHeaders(includedHeaders);
    setVisibleCsvCols(new Set(includedHeaders));

    const parsedItems: SKUResult[] = [];
    const seenSkus = new Set<string>();

    for (const cells of allRows) {
      const sku = cells[skuIdx]?.trim();
      const normalizedSku = sku?.toLowerCase();
      if (!sku || sku.length < 2 || !normalizedSku || seenSkus.has(normalizedSku)) continue;
      seenSkus.add(normalizedSku);

      const rawRow: Record<string, string> = {};
      allCsvHeaders.forEach((h, i) => {
        if (columnIncluded[h]) rawRow[h] = cells[i] || "";
      });

      // If not using AI, pre-fill data from mapped columns
      const itemData: SKUResult["data"] = {};
      if (!useAi) {
        for (const [header, field] of Object.entries(columnMapping)) {
          if (field === "ignore" || field === "extra" || !columnIncluded[header]) continue;
          const idx = allCsvHeaders.indexOf(header);
          const val = cells[idx] || "";
          if (!val) continue;
          switch (field) {
            case "name": itemData.name = val; break;
            case "description": itemData.description = val; break;
            case "short_description": itemData.shortDescription = val; break;
            case "price": itemData.suggestedPrice = sanitizePrice(val); break;
            case "cost_price": itemData.costPrice = sanitizePrice(val); break;
            case "recommended_price": itemData.recommendedPrice = sanitizePrice(val); break;
            case "category": itemData.category = val; break;
            case "subcategory": itemData.subcategory = val; break;
            case "brand": itemData.brand = val; break;
            case "barcode": itemData.barcode = val; break;
            case "stock": itemData.stock = parseInt(val) || undefined; break;
            case "weight": itemData.weight = val; break;
            case "image_url": itemData.imageUrl = val; break;
            case "model": itemData.model = val; break;
            case "specifications": itemData.specifications = { specs: val }; break;
            case "related_products": itemData.relatedProducts = val; break;
            case "dimensions": itemData.dimensions = val; break;
            case "color": itemData.color = val; break;
            case "material": itemData.material = val; break;
            case "warranty": itemData.warranty = val; break;
          }
        }
      }

      parsedItems.push({
        sku,
        status: useAi ? "pending" : "success",
        selected: true,
        rawRow,
        data: useAi ? undefined : (Object.keys(itemData).length > 0 ? itemData : undefined),
      });
    }

    setSkuList(parsedItems);
    if (useAi) {
      setPhase("processing");
    } else {
      setPhase("results");
    }
    toast.success(`${parsedItems.length} produtos preparados`);
  };

  const processSkus = async () => {
    setIsProcessing(true);
    const items = [...skuList];
    for (let batchStart = 0; batchStart < items.length; batchStart += BATCH_SIZE) {
      const batchEnd = Math.min(batchStart + BATCH_SIZE, items.length);
      const batchIndices = Array.from({ length: batchEnd - batchStart }, (_, i) => batchStart + i);
      setSkuList(prev => prev.map((s, idx) =>
        batchIndices.includes(idx) ? { ...s, status: "processing" } : s
      ));
      const results = await Promise.allSettled(
        batchIndices.map(async (idx) => {
          const { data, error } = await supabase.functions.invoke("ai-product-assistant", {
            body: { mode: "sku-search", sku: items[idx].sku },
          });
          if (error) throw error;
          return { idx, data };
        })
      );
      setSkuList(prev => {
        const next = [...prev];
        for (const result of results) {
          if (result.status === "fulfilled") {
            const { idx, data } = result.value;
            if (data.success && data.data?.found) {
              next[idx] = { ...next[idx], status: "success", data: data.data, selected: true };
            } else {
              next[idx] = { ...next[idx], status: "error", error: "Produto não encontrado", selected: false };
            }
          } else {
            const idx = batchIndices[results.indexOf(result)];
            next[idx] = { ...next[idx], status: "error", error: result.reason?.message || "Erro desconhecido", selected: false };
          }
        }
        return next;
      });
      if (batchEnd < items.length) await new Promise(r => setTimeout(r, BATCH_DELAY_MS));
    }
    setIsProcessing(false);
    setPhase("results");
  };

  const toggleSelection = (index: number) => {
    setSkuList(prev => prev.map((s, idx) => idx === index ? { ...s, selected: !s.selected } : s));
  };
  const selectAll = () => { setSkuList(prev => prev.map(s => ({ ...s, selected: s.status === "success" || s.status === "pending" ? true : s.selected }))); };
  const deselectAll = () => { setSkuList(prev => prev.map(s => ({ ...s, selected: false }))); };
  const updateEditedName = (index: number, value: string) => {
    setSkuList(prev => prev.map((s, idx) => idx === index ? { ...s, editedName: value } : s));
  };
  const updateEditedPrice = (index: number, value: string) => {
    setSkuList(prev => prev.map((s, idx) => idx === index ? { ...s, editedPrice: value } : s));
  };

  // AI price enrichment: suggest selling prices based on cost price
  const enrichPricesWithAI = async () => {
    const itemsToEnrich = skuList.filter(
      s => s.selected && s.data && s.data.costPrice && !s.data.suggestedPrice && !s.editedPrice
    );
    if (itemsToEnrich.length === 0) {
      toast.info("Todos os produtos selecionados já têm preço de venda");
      return;
    }
    setIsEnrichingPrices(true);
    toast.info(`A enriquecer preços de ${itemsToEnrich.length} produtos...`);

    for (let batchStart = 0; batchStart < itemsToEnrich.length; batchStart += BATCH_SIZE) {
      const batch = itemsToEnrich.slice(batchStart, batchStart + BATCH_SIZE);
      const results = await Promise.allSettled(
        batch.map(async (item) => {
          const { data, error } = await supabase.functions.invoke("ai-product-assistant", {
            body: {
              mode: "price-analysis",
              productName: item.data?.name || item.sku,
              category: item.data?.category,
              productType: "physical",
            },
          });
          if (error) throw error;
          return { sku: item.sku, suggestedPrice: data?.data?.suggestedPrice };
        })
      );

      setSkuList(prev => prev.map(s => {
        const result = results.find((_, i) => batch[i]?.sku === s.sku);
        if (!result || result.status !== "fulfilled" || !result.value?.suggestedPrice) return s;
        return {
          ...s,
          data: { ...s.data, suggestedPrice: result.value.suggestedPrice },
        };
      }));

      if (batchStart + BATCH_SIZE < itemsToEnrich.length) {
        await new Promise(r => setTimeout(r, BATCH_DELAY_MS));
      }
    }

    setIsEnrichingPrices(false);
    toast.success("Preços sugeridos pela IA aplicados");
  };

  const createSelectedProducts = async () => {
    const selected = skuList.filter(s => s.selected && (s.status === "success" || s.data));
    if (selected.length === 0) { toast.error("Nenhum produto seleccionado"); return; }
    setIsCreating(true);

    const items = selected.map(item => {
      const d = item.data;
      const finalName = item.editedName || d?.commercialName || d?.name || item.sku;
      const finalPrice = item.editedPrice ? parseFloat(item.editedPrice) : (d?.suggestedPrice || d?.recommendedPrice || 0);

      // Build specifications from extra data fields
      const specs: Record<string, string> = {};
      if (d?.specifications) Object.assign(specs, d.specifications);
      if (d?.weight) specs.weight = d.weight;
      if (d?.dimensions) specs.dimensions = d.dimensions;
      if (d?.color) specs.color = d.color;
      if (d?.material) specs.material = d.material;
      if (d?.warranty) specs.warranty = d.warranty;
      if (d?.model) specs.model = d.model;

      return {
        name: finalName,
        sku: item.sku,
        short_description: d?.shortDescription || d?.commercialDescription || undefined,
        commercial_description: d?.description || undefined,
        category: d?.category,
        subcategory: d?.subcategory,
        base_price: finalPrice,
        direct_cost: d?.costPrice || undefined,
        barcode: d?.barcode || undefined,
        specifications: Object.keys(specs).length > 0 ? specs : undefined,
        product_type: "physical" as const,
        status: "active" as const,
      };
    });

    console.log("[BATCH_CREATE] Items to create:", items.length, JSON.stringify(items.slice(0, 2)));

    try {
      const result = await createProductsBatch.mutateAsync(items);
      console.log("[BATCH_CREATE] Result:", JSON.stringify(result));
      setSummary({
        successCount: result.created,
        errorCount: result.skipped.length,
        failedSkus: result.skipped.map(s => ({ sku: s.sku, error: s.reason })),
        lastCreatedProductId: undefined,
        lastCreatedProductName: undefined,
      });
    } catch (err) {
      console.error("[BATCH_CREATE] Error:", err);
      setSummary({
        successCount: 0,
        errorCount: selected.length,
        failedSkus: [{ sku: "batch", error: err instanceof Error ? err.message : "Erro desconhecido" }],
      });
    }

    setIsCreating(false);
    setPhase("summary");
  };

  const downloadTemplate = () => {
    const content = "SKU\nSF-IPD821WA-2PW\nHIK-DS-2CD2043G2-I\nDAH-IPC-HDW2431T-AS";
    const blob = new Blob([content], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "template_skus.csv"; a.click();
    URL.revokeObjectURL(url);
  };

  const downloadErrorReport = () => {
    if (!summary || summary.failedSkus.length === 0) return;
    const rows = summary.failedSkus.map(f => `"${f.sku}","${f.error}"`);
    const content = ["SKU,Erro", ...rows].join("\n");
    const blob = new Blob([content], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "erros_importacao.csv"; a.click();
    URL.revokeObjectURL(url);
  };

  const resetDialog = () => {
    setSkuList([]); setManualInput(""); setPhase("input"); setSummary(null);
    setCsvHeaders([]); setVisibleCsvCols(new Set()); setFeedUrl("");
    setAllCsvHeaders([]); setSampleRows([]); setAllRows([]);
    setColumnMapping({}); setColumnIncluded({});
  };

  const progress = skuList.length > 0
    ? ((skuList.filter(s => s.status !== "pending" && s.status !== "processing").length) / skuList.length) * 100
    : 0;
  const successCount = skuList.filter(s => s.status === "success").length;
  const errorCount = skuList.filter(s => s.status === "error").length;
  const selectedCount = skuList.filter(s => s.selected && (s.status === "success" || s.data)).length;
  const allSelected = skuList.length > 0 && skuList.filter(s => s.status === "success" || s.data).every(s => s.selected);

  const hasCsvData = csvHeaders.length > 0;

  const activeColumns: { key: string; label: string; type: "csv" | "system" }[] = [];
  for (const h of csvHeaders) {
    if (visibleCsvCols.has(h)) activeColumns.push({ key: h, label: h, type: "csv" });
  }
  for (const sc of SYSTEM_COLUMNS) {
    if (visibleSysCols.has(sc.key)) activeColumns.push({ key: sc.key, label: sc.label, type: "system" });
  }

  const totalAvailableCols = csvHeaders.length + SYSTEM_COLUMNS.length;

  // Count included & mapped columns in mapping phase
  const includedCount = Object.values(columnIncluded).filter(Boolean).length;
  const mappedCount = Object.entries(columnMapping).filter(([h, v]) => columnIncluded[h] && v !== "ignore" && v !== "extra").length;

  const renderCellValue = (item: SKUResult, col: { key: string; type: "csv" | "system" }, idx: number) => {
    if (col.type === "csv") {
      const val = item.rawRow?.[col.key] || "";
      const display = val.length > 120 ? val.slice(0, 120) + "…" : val;
      return <span className="text-xs whitespace-nowrap">{display || "—"}</span>;
    }
    switch (col.key) {
      case "__status":
        if (item.status === "pending") return <Badge variant="outline" className="text-[10px] px-1.5 py-0">Pendente</Badge>;
        if (item.status === "processing") return <Badge variant="outline" className="text-[10px] px-1.5 py-0"><Loader2 className="h-3 w-3 mr-1 animate-spin" />...</Badge>;
        if (item.status === "success") return <Badge className="bg-emerald-500/15 text-emerald-400 border-emerald-500/20 text-[10px] px-1.5 py-0"><CheckCircle className="h-3 w-3 mr-0.5" />OK</Badge>;
        return <Badge variant="destructive" className="text-[10px] px-1.5 py-0"><XCircle className="h-3 w-3 mr-0.5" />Erro</Badge>;
      case "__ai_name":
        if (!item.data) return <span className="text-xs text-muted-foreground">—</span>;
        if (phase === "results") return (
          <Input
            value={item.editedName ?? (item.data.commercialName || item.data.name || "")}
            onChange={(e) => updateEditedName(idx, e.target.value)}
            className="h-6 text-xs border-transparent bg-transparent hover:border-border focus:border-primary px-1 min-w-[180px]"
          />
        );
        return <span className="text-xs truncate block max-w-[200px]">{item.data.commercialName || item.data.name || "—"}</span>;
      case "__ai_price":
        if (!item.data) return <span className="text-xs text-muted-foreground">—</span>;
        if (phase === "results") return (
          <Input
            type="number" step="0.01"
            value={item.editedPrice ?? (item.data.suggestedPrice?.toString() || "")}
            onChange={(e) => updateEditedPrice(idx, e.target.value)}
            className="h-6 text-xs w-20 border-transparent bg-transparent hover:border-border focus:border-primary px-1 text-right"
          />
        );
        return <span className="text-xs tabular-nums">{item.data.suggestedPrice ? `${item.data.suggestedPrice.toFixed(2)} €` : "—"}</span>;
      case "__ai_category":
        if (!item.data?.category) return <span className="text-xs text-muted-foreground">—</span>;
        return <span className="text-xs whitespace-nowrap">{item.data.category}</span>;
      default:
        return "—";
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) resetDialog(); onOpenChange(v); }}>
      <DialogContent className="max-w-[95vw] w-[1400px] max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5" />
            Importação em Lote de Produtos
          </DialogTitle>
          <DialogDescription>
            Importe produtos via URL, CSV ou SKUs. Mapeie colunas antes de criar.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 flex-1 overflow-hidden flex flex-col min-h-0">
          {/* Phase: Input */}
          {phase === "input" && (
            <Tabs defaultValue="url" className="w-full">
              <TabsList className="w-full">
                <TabsTrigger value="url" className="flex-1 gap-2">
                  <Globe className="h-4 w-4" />
                  Importar por URL
                </TabsTrigger>
                <TabsTrigger value="csv" className="flex-1 gap-2">
                  <Upload className="h-4 w-4" />
                  Carregar CSV
                </TabsTrigger>
                <TabsTrigger value="paste" className="flex-1 gap-2">
                  <ClipboardList className="h-4 w-4" />
                  Colar SKUs
                </TabsTrigger>
              </TabsList>

              <TabsContent value="url" className="space-y-3 mt-3">
                <div className="space-y-2">
                  <label className="text-sm font-medium">URL do catálogo CSV</label>
                  <div className="flex gap-2">
                    <Input
                      value={feedUrl}
                      onChange={(e) => setFeedUrl(e.target.value)}
                      placeholder="https://www.visiotechsecurity.com/?option=com_csvgeneration&..."
                      className="flex-1 font-mono text-xs"
                    />
                    <Button onClick={handleUrlDownload} disabled={isDownloading || !feedUrl.trim()}>
                      {isDownloading ? (
                        <><Loader2 className="h-4 w-4 mr-2 animate-spin" />A descarregar...</>
                      ) : (
                        <><Download className="h-4 w-4 mr-2" />Descarregar e Analisar</>
                      )}
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    O sistema descarrega o CSV, detecta as colunas e permite mapear cada uma antes de importar.
                  </p>
                </div>
                <div className="rounded-lg border border-dashed p-4 bg-muted/30">
                  <p className="text-xs font-medium text-muted-foreground mb-1">Fornecedores pré-configurados:</p>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-xs h-7 gap-1.5"
                    onClick={() => setFeedUrl("https://www.visiotechsecurity.com/?option=com_csvgeneration&task=generate.generateCSV&token=b6f2863a59d0085252999a4d0fa5162e&username=VT4128HGN")}
                  >
                    <Link className="h-3 w-3" />
                    Visiotech Security
                  </Button>
                </div>
              </TabsContent>

              <TabsContent value="csv" className="space-y-3 mt-3">
                <div className="border-2 border-dashed rounded-lg p-8 text-center hover:border-primary/50 transition-colors">
                  <input type="file" accept=".csv,.txt,.tsv" onChange={handleFileUpload} className="hidden" id="csv-upload" />
                  <label htmlFor="csv-upload" className="cursor-pointer">
                    <Upload className="h-10 w-10 mx-auto text-muted-foreground mb-4" />
                    <p className="text-sm font-medium">Clique para carregar ficheiro CSV</p>
                    <p className="text-xs text-muted-foreground mt-1">Detecta automaticamente delimitador e colunas</p>
                  </label>
                </div>
                <Button variant="outline" size="sm" onClick={downloadTemplate} className="w-full">
                  <Download className="h-4 w-4 mr-2" />
                  Descarregar Template CSV
                </Button>
              </TabsContent>

              <TabsContent value="paste" className="space-y-3 mt-3">
                <Textarea
                  placeholder={"Cole os SKUs aqui, um por linha:\n\nSF-IPD821WA-2PW\nHIK-DS-2CD2043G2-I\nDAH-IPC-HDW2431T-AS"}
                  value={manualInput}
                  onChange={(e) => setManualInput(e.target.value)}
                  rows={8}
                  className="font-mono text-sm"
                />
                <Button onClick={handleManualSubmit} disabled={!manualInput.trim()} className="w-full">
                  <Plus className="h-4 w-4 mr-2" />
                  Carregar SKUs
                </Button>
              </TabsContent>
            </Tabs>
          )}

          {/* Phase: Mapping — column-by-column confirmation */}
          {phase === "mapping" && (
            <div className="flex flex-col gap-3 flex-1 min-h-0">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold">Mapeamento de Colunas</h3>
                  <p className="text-xs text-muted-foreground">
                    {allCsvHeaders.length} colunas detectadas · {totalUrlRows} linhas · {includedCount} incluídas · {mappedCount} mapeadas
                  </p>
                </div>
                <div className="flex gap-1.5">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-xs h-7"
                    onClick={() => {
                      const all: Record<string, boolean> = {};
                      allCsvHeaders.forEach(h => { all[h] = true; });
                      setColumnIncluded(all);
                    }}
                  >
                    Incluir todas
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-xs h-7"
                    onClick={() => {
                      const only: Record<string, boolean> = {};
                      allCsvHeaders.forEach(h => {
                        only[h] = columnMapping[h] !== "ignore";
                      });
                      setColumnIncluded(only);
                    }}
                  >
                    Só mapeadas
                  </Button>
                </div>
              </div>

              {/* Mapping table — spreadsheet-like */}
              <div className="flex-1 overflow-auto border rounded-md min-h-0">
                <Table>
                  <TableHeader className="sticky top-0 z-10 bg-muted/90 backdrop-blur-sm">
                    <TableRow className="hover:bg-transparent">
                      <TableHead className="w-12 text-center px-2 text-[10px] sticky left-0 bg-muted/90 z-20">Incluir</TableHead>
                      <TableHead className="min-w-[160px] text-xs px-2 sticky left-12 bg-muted/90 z-20">Coluna CSV</TableHead>
                      <TableHead className="min-w-[180px] text-xs px-2">Mapear para</TableHead>
                      {sampleRows.slice(0, 3).map((_, i) => (
                        <TableHead key={i} className="text-xs px-2 min-w-[200px]">
                          <span className="text-muted-foreground">Linha {i + 1}</span>
                        </TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {allCsvHeaders.map((header) => {
                      const isIncluded = columnIncluded[header] ?? false;
                      const mappedTo = columnMapping[header] || "ignore";
                      return (
                        <TableRow
                          key={header}
                          className={`h-8 ${!isIncluded ? "opacity-40" : ""} ${mappedTo !== "ignore" && mappedTo !== "extra" && isIncluded ? "bg-primary/5" : ""}`}
                        >
                          <TableCell className="text-center px-2 sticky left-0 bg-background z-10">
                            <Checkbox
                              checked={isIncluded}
                              onCheckedChange={() => {
                                setColumnIncluded(prev => ({ ...prev, [header]: !prev[header] }));
                              }}
                            />
                          </TableCell>
                          <TableCell className="px-2 sticky left-12 bg-background z-10">
                            <span className="text-xs font-mono font-medium truncate block max-w-[150px]" title={header}>
                              {header}
                            </span>
                          </TableCell>
                          <TableCell className="px-2">
                            <Select
                              value={mappedTo}
                              onValueChange={(val) => {
                                setColumnMapping(prev => ({ ...prev, [header]: val }));
                                if (val !== "ignore") {
                                  setColumnIncluded(prev => ({ ...prev, [header]: true }));
                                }
                              }}
                            >
                              <SelectTrigger className="h-7 text-xs min-w-[160px]">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {SYSTEM_FIELDS.map(f => (
                                  <SelectItem key={f.key} value={f.key} className="text-xs">
                                    {f.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </TableCell>
                          {sampleRows.slice(0, 3).map((row, ri) => {
                            const colIdx = allCsvHeaders.indexOf(header);
                            const val = row[colIdx] || "";
                            const display = val.length > 80 ? val.slice(0, 80) + "…" : val;
                            return (
                              <TableCell key={ri} className="px-2">
                                <span className="text-xs text-muted-foreground whitespace-nowrap">{display || "—"}</span>
                              </TableCell>
                            );
                          })}
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>

              {/* Mapping not valid warning */}
              {!Object.values(columnMapping).includes("sku") && (
                <div className="rounded-md bg-amber-500/10 border border-amber-500/20 px-3 py-2 text-xs text-amber-600 dark:text-amber-400">
                  ⚠ Selecione pelo menos uma coluna como <strong>SKU / Referência</strong> para continuar.
                </div>
              )}
            </div>
          )}

          {/* Phase: Processing & Results — Excel-like table */}
          {(phase === "processing" || phase === "results") && (
            <>
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-sm">
                  <span>
                    {isProcessing
                      ? <>A processar {skuList.filter(s => s.status === "processing").length} SKUs...</>
                      : <>Processados: {successCount + errorCount} de {skuList.length}</>
                    }
                  </span>
                  <div className="flex gap-2">
                    <Badge variant="secondary" className="bg-emerald-500/15 text-emerald-400 border-emerald-500/20">
                      <CheckCircle className="h-3 w-3 mr-1" />{successCount}
                    </Badge>
                    <Badge variant="secondary" className="bg-destructive/15 text-destructive border-destructive/20">
                      <XCircle className="h-3 w-3 mr-1" />{errorCount}
                    </Badge>
                  </div>
                </div>
                <Progress value={progress} className="h-1.5" />
              </div>

              <div className="flex items-center justify-between gap-2 flex-wrap">
                <span className="text-sm text-muted-foreground">
                  {selectedCount} seleccionados para criar
                </span>
                <div className="flex gap-1 items-center">
                  <Button variant="ghost" size="sm" onClick={selectAll} className="text-xs h-7">
                    Seleccionar Todos
                  </Button>
                  <Button variant="ghost" size="sm" onClick={deselectAll} className="text-xs h-7">
                    Limpar
                  </Button>
                  <div className="relative">
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-xs h-7"
                      onClick={() => setShowColumnPicker(!showColumnPicker)}
                    >
                      Colunas ({activeColumns.length}/{totalAvailableCols})
                    </Button>
                    {showColumnPicker && (
                      <div
                        className="absolute right-0 top-full mt-1 z-50 rounded-md border bg-popover p-3 shadow-lg min-w-[220px] max-h-[50vh] overflow-auto"
                        onMouseLeave={() => setShowColumnPicker(false)}
                      >
                        {hasCsvData && (
                          <>
                            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
                              Colunas do CSV ({csvHeaders.length})
                            </p>
                            {csvHeaders.map(h => (
                              <label
                                key={`csv-${h}`}
                                className="flex items-center gap-2 py-1 px-1 rounded hover:bg-muted/50 cursor-pointer text-sm"
                              >
                                <Checkbox
                                  checked={visibleCsvCols.has(h)}
                                  onCheckedChange={() => {
                                    setVisibleCsvCols(prev => {
                                      const next = new Set(prev);
                                      if (next.has(h)) next.delete(h); else next.add(h);
                                      return next;
                                    });
                                  }}
                                />
                                <span className="truncate">{h}</span>
                              </label>
                            ))}
                            <div className="border-t my-2" />
                          </>
                        )}
                        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
                          Colunas do Sistema
                        </p>
                        {SYSTEM_COLUMNS.map(sc => (
                          <label
                            key={sc.key}
                            className="flex items-center gap-2 py-1 px-1 rounded hover:bg-muted/50 cursor-pointer text-sm"
                          >
                            <Checkbox
                              checked={visibleSysCols.has(sc.key)}
                              onCheckedChange={() => {
                                setVisibleSysCols(prev => {
                                  const next = new Set(prev);
                                  if (next.has(sc.key)) next.delete(sc.key); else next.add(sc.key);
                                  return next;
                                });
                              }}
                            />
                            {sc.label}
                          </label>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex-1 overflow-auto border rounded-md min-h-0">
                <Table>
                  <TableHeader className="sticky top-0 z-10 bg-muted/90 backdrop-blur-sm">
                    <TableRow className="hover:bg-transparent">
                      <TableHead className="w-9 text-center px-1 sticky left-0 bg-muted/90 z-20">
                        <Checkbox
                          checked={allSelected}
                          onCheckedChange={() => allSelected ? deselectAll() : selectAll()}
                        />
                      </TableHead>
                      <TableHead className="w-8 text-center px-1 text-[10px] text-muted-foreground sticky left-9 bg-muted/90 z-20">#</TableHead>
                      {activeColumns.map(col => (
                        <TableHead
                          key={col.key}
                          className={`text-xs font-semibold whitespace-nowrap px-2 ${col.type === "system" ? "bg-primary/5" : ""}`}
                        >
                          {col.label}
                        </TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {skuList.map((item, idx) => (
                      <TableRow
                        key={item.sku}
                        className={`h-7 ${item.selected ? "bg-primary/5" : ""} ${item.status === "error" ? "opacity-50" : ""}`}
                      >
                        <TableCell className="text-center px-1 sticky left-0 bg-background z-10">
                          <Checkbox
                            checked={item.selected}
                            onCheckedChange={() => toggleSelection(idx)}
                          />
                        </TableCell>
                        <TableCell className="text-center px-1 text-[10px] text-muted-foreground tabular-nums sticky left-9 bg-background z-10">
                          {idx + 1}
                        </TableCell>
                        {activeColumns.map(col => (
                          <TableCell key={col.key} className={`px-2 py-0.5 ${col.type === "system" ? "bg-primary/[0.02]" : ""}`}>
                            {renderCellValue(item, col, idx)}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </>
          )}

          {/* Phase: Summary */}
          {phase === "summary" && summary && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="p-4 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-center">
                  <CheckCircle className="h-8 w-8 text-emerald-500 mx-auto mb-2" />
                  <p className="text-2xl font-bold text-emerald-400">{summary.successCount}</p>
                  <p className="text-xs text-emerald-500">Produtos criados</p>
                </div>
                <div className="p-4 rounded-lg bg-destructive/10 border border-destructive/20 text-center">
                  <XCircle className="h-8 w-8 text-destructive mx-auto mb-2" />
                  <p className="text-2xl font-bold text-destructive">{summary.errorCount + (summary.failedSkus.length - summary.errorCount)}</p>
                  <p className="text-xs text-destructive">Falhas</p>
                </div>
              </div>
              {summary.failedSkus.length > 0 && (
                <Button variant="outline" size="sm" onClick={downloadErrorReport} className="w-full">
                  <Download className="h-4 w-4 mr-2" />
                  Exportar Relatório de Erros ({summary.failedSkus.length} SKUs)
                </Button>
              )}
              {summary.lastCreatedProductId && currentWorkspace?.id && (
                <PostCreationSuggestionsCard
                  productId={summary.lastCreatedProductId}
                  workspaceId={currentWorkspace.id}
                  productName={summary.lastCreatedProductName || ""}
                  onDismiss={() => {}}
                />
              )}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-2 pt-3 border-t">
          {phase === "input" && (
            <Button variant="outline" onClick={() => onOpenChange(false)} className="flex-1">Cancelar</Button>
          )}
          {phase === "mapping" && (
            <>
              <Button variant="outline" onClick={resetDialog}>
                <ArrowRight className="h-4 w-4 mr-2 rotate-180" />Voltar
              </Button>
              <Button
                variant="outline"
                onClick={() => confirmMapping(false)}
                disabled={!Object.values(columnMapping).includes("sku")}
                className="flex-1"
              >
                <Plus className="h-4 w-4 mr-2" />
                Criar directamente ({totalUrlRows} produtos)
              </Button>
              <Button
                onClick={() => confirmMapping(true)}
                disabled={!Object.values(columnMapping).includes("sku")}
                className="flex-1"
              >
                <Sparkles className="h-4 w-4 mr-2" />
                Enriquecer com IA
              </Button>
            </>
          )}
          {(phase === "processing" || phase === "results") && (
            <>
              <Button variant="outline" onClick={resetDialog} disabled={isProcessing || isCreating || isEnrichingPrices}>Limpar</Button>
              {phase === "processing" && !isProcessing && progress < 100 && (
                <Button onClick={processSkus} className="flex-1">
                  <Sparkles className="h-4 w-4 mr-2" />Iniciar Pesquisa IA
                </Button>
              )}
              {phase === "processing" && isProcessing && (
                <Button disabled className="flex-1">
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />A processar...
                </Button>
              )}
              {(phase === "results" || (phase === "processing" && progress === 100)) && (
                <>
                  <Button
                    variant="outline"
                    onClick={enrichPricesWithAI}
                    disabled={isCreating || isEnrichingPrices || selectedCount === 0}
                    className="gap-1.5"
                  >
                    {isEnrichingPrices
                      ? <><Loader2 className="h-4 w-4 animate-spin" />Enriquecendo...</>
                      : <><Sparkles className="h-4 w-4" />Sugerir Preços (IA)</>
                    }
                  </Button>
                  <Button onClick={createSelectedProducts} disabled={isCreating || selectedCount === 0} className="flex-1">
                    {isCreating
                      ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />A criar...</>
                      : <><Plus className="h-4 w-4 mr-2" />Criar {selectedCount} Produtos</>
                    }
                  </Button>
                </>
              )}
            </>
          )}
          {phase === "summary" && (
            <Button onClick={() => { resetDialog(); onOpenChange(false); }} className="flex-1">Fechar</Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
