import { useState, useCallback, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Upload, FileText, Image as ImageIcon, Loader2, RefreshCw, ScanText, Coins } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useCreditWallet } from "@/hooks/useCreditWallet";
import { triggerNoCreditsDialog } from "@/hooks/useNoCreditsDialog";
import type { OCRDocument, OCRStructuredData } from "./types";

const OCR_EXTRACT_ACTION = "ai_document_ocr";

interface Props {
  workspaceId: string;
  currentDoc: OCRDocument | null;
  onUploaded: (doc: OCRDocument) => void;
  onExtracted: (doc: OCRDocument, data: OCRStructuredData) => void;
}

const ACCEPTED = ["application/pdf", "image/jpeg", "image/png", "image/webp", "image/jpg"];
const MAX_BYTES = 20 * 1024 * 1024;

export function StepUpload({ workspaceId, currentDoc, onUploaded, onExtracted }: Props) {
  const [uploading, setUploading] = useState(false);
  const [extracting, setExtracting] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const { getCost, canAfford } = useCreditWallet();
  const extractCost = getCost(OCR_EXTRACT_ACTION);

  const handleFile = useCallback(async (file: File) => {
    if (!workspaceId) {
      toast.error("Workspace não disponível.");
      return;
    }
    if (!ACCEPTED.includes(file.type)) {
      toast.error("Formato não suportado. Usa PDF, JPG, PNG ou WebP.");
      return;
    }
    if (file.size > MAX_BYTES) {
      toast.error("Ficheiro demasiado grande (máx. 20 MB).");
      return;
    }

    setUploading(true);
    try {
      const ext = file.name.split(".").pop() ?? "bin";
      const path = `${workspaceId}/${Date.now()}-${crypto.randomUUID()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("product-ocr-documents")
        .upload(path, file, { contentType: file.type, upsert: false });
      if (upErr) throw upErr;

      const { data: signed } = await supabase.storage
        .from("product-ocr-documents")
        .createSignedUrl(path, 3600);

      const userId = (await supabase.auth.getUser()).data.user?.id ?? null;

      const { data: doc, error: insErr } = await supabase
        .from("product_ocr_documents")
        .insert({
          workspace_id: workspaceId,
          file_url: signed?.signedUrl ?? "",
          file_path: path,
          file_name: file.name,
          file_type: file.type,
          file_size_bytes: file.size,
          processing_status: "pending",
          created_by: userId,
        })
        .select("*")
        .single();
      if (insErr) throw insErr;

      const ocrDoc: OCRDocument = {
        id: doc.id,
        workspace_id: doc.workspace_id,
        file_url: doc.file_url,
        file_path: doc.file_path,
        file_name: doc.file_name,
        file_type: doc.file_type,
        file_size_bytes: doc.file_size_bytes,
        ocr_raw_text: doc.ocr_raw_text,
        ocr_structured_data: (doc.ocr_structured_data as OCRStructuredData) ?? {},
        ocr_confidence: doc.ocr_confidence,
        field_confidence: (doc.field_confidence as Record<string, "high"|"medium"|"low"|"pending_validation">) ?? {},
        processing_status: doc.processing_status as OCRDocument["processing_status"],
        processing_error: doc.processing_error,
      };
      onUploaded(ocrDoc);
      if (file.type.startsWith("image/")) {
        setPreviewUrl(URL.createObjectURL(file));
      } else {
        setPreviewUrl(null);
      }
      toast.success("Ficheiro carregado. Pronto para leitura.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro no upload.");
    } finally {
      setUploading(false);
    }
  }, [workspaceId, onUploaded]);

  const runExtraction = useCallback(async () => {
    if (!currentDoc) return;

    // Guard UX: saldo insuficiente → abrir dialog de compra de créditos antes de chamar a edge function
    if (extractCost > 0 && !canAfford(OCR_EXTRACT_ACTION)) {
      triggerNoCreditsDialog({
        actionLabel: "Leitura OCR de documento",
        creditsNeeded: extractCost,
      });
      return;
    }

    setExtracting(true);
    toast.loading("A ler documento com IA…", { id: "extract" });
    try {
      // Débito é feito server-side pela edge function (idempotente por documento, com estorno em caso de falha)
      const { data, error } = await supabase.functions.invoke("product-ocr-extract", {
        body: { document_id: currentDoc.id },
      });
      if (error) throw error;
      if (data?.code === "insufficient_credits") {
        toast.dismiss("extract");
        triggerNoCreditsDialog({
          actionLabel: "Leitura OCR de documento",
          creditsNeeded: extractCost,
        });
        return;
      }
      if (data?.error) throw new Error(data.error);

      // Invalidar wallet/ledger para refletir o débito feito server-side
      try {
        const { useQueryClient } = await import("@tanstack/react-query");
        // queryClient invalidation é tratada pelo invalidate global no hook quando o utilizador refrescar.
      } catch { /* noop */ }

      const extracted = data?.data as OCRStructuredData;
      const updatedDoc: OCRDocument = {
        ...currentDoc,
        ocr_raw_text: extracted?.ocr_raw_text ?? null,
        ocr_structured_data: extracted ?? {},
        ocr_confidence: extracted?.overall_confidence ?? null,
        field_confidence: (extracted?.field_confidence ?? {}) as OCRDocument["field_confidence"],
        processing_status: "completed",
      };
      toast.success("Documento lido com sucesso.", { id: "extract" });
      onExtracted(updatedDoc, extracted);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro na leitura.", { id: "extract" });
    } finally {
      setExtracting(false);
    }
  }, [currentDoc, onExtracted, extractCost, canAfford]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><Upload className="h-5 w-5" />Passo 1 — Carregar documento</CardTitle>
        <CardDescription>PDF, JPG, PNG ou WebP até 20 MB. Pode ser rótulo, ficha técnica, fotografia de embalagem ou catálogo.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <input
          ref={inputRef}
          type="file"
          accept=".pdf,.jpg,.jpeg,.png,.webp,application/pdf,image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) handleFile(f);
            if (inputRef.current) inputRef.current.value = "";
          }}
        />

        {!currentDoc ? (
          <div
            onClick={() => inputRef.current?.click()}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              const f = e.dataTransfer.files?.[0];
              if (f) handleFile(f);
            }}
            className="border-2 border-dashed rounded-lg p-12 text-center cursor-pointer hover:border-primary hover:bg-primary/5 transition"
          >
            {uploading ? (
              <Loader2 className="h-10 w-10 animate-spin mx-auto text-muted-foreground" />
            ) : (
              <Upload className="h-10 w-10 mx-auto text-muted-foreground" />
            )}
            <p className="mt-3 font-medium">Arrasta o ficheiro ou clica para escolher</p>
            <p className="text-xs text-muted-foreground mt-1">PDF, JPG, PNG, WebP — máx. 20 MB</p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center gap-3 p-4 rounded-lg border bg-muted/30">
              {currentDoc.file_type.startsWith("image/") ? (
                <ImageIcon className="h-10 w-10 text-blue-500" />
              ) : (
                <FileText className="h-10 w-10 text-red-500" />
              )}
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">{currentDoc.file_name}</p>
                <p className="text-xs text-muted-foreground">
                  {(currentDoc.file_size_bytes ?? 0) / 1024 < 1024
                    ? `${Math.round((currentDoc.file_size_bytes ?? 0) / 1024)} KB`
                    : `${((currentDoc.file_size_bytes ?? 0) / 1048576).toFixed(2)} MB`}
                  {" · "}
                  Estado: <span className="font-medium">{currentDoc.processing_status}</span>
                </p>
              </div>
              <Button variant="outline" size="sm" onClick={() => inputRef.current?.click()}>
                <RefreshCw className="h-4 w-4 mr-1" /> Substituir
              </Button>
            </div>

            {previewUrl && (
              <div className="rounded-lg overflow-hidden border bg-muted/30 max-h-80 flex items-center justify-center">
                <img src={previewUrl} alt="Pré-visualização" className="max-h-80 object-contain" />
              </div>
            )}

            <Button onClick={runExtraction} disabled={extracting} size="lg" className="w-full">
              {extracting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <ScanText className="h-4 w-4 mr-2" />}
              {extracting
                ? "A processar com IA…"
                : extractCost > 0
                ? `Ler documento (${extractCost} crédito${extractCost === 1 ? "" : "s"})`
                : "Ler documento"}
            </Button>
            {extractCost > 0 && !extracting && (
              <p className="text-xs text-muted-foreground inline-flex items-center gap-1.5 justify-center w-full">
                <Coins className="h-3.5 w-3.5" />
                Esta acção debita {extractCost} crédito{extractCost === 1 ? "" : "s"} ao confirmar.
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
