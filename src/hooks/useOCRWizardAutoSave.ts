import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";

export type OCRWizardSnapshot = {
  step: number;
  sheet: unknown;
  content: unknown;
  sales: unknown;
  structured: unknown;
};

type Status = "idle" | "saving" | "saved" | "error";

/**
 * Auto-save (debounced) do estado do wizard OCR para a coluna
 * `wizard_state` em product_ocr_documents. Só guarda enquanto
 * o documento ainda não foi convertido em produto (product_id IS NULL).
 */
export function useOCRWizardAutoSave(
  documentId: string | null | undefined,
  snapshot: OCRWizardSnapshot,
  enabled: boolean,
  delayMs = 1200,
) {
  const [status, setStatus] = useState<Status>("idle");
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastPayload = useRef<string>("");

  useEffect(() => {
    if (!enabled || !documentId) return;
    const serialized = JSON.stringify(snapshot);
    if (serialized === lastPayload.current) return;

    if (timer.current) clearTimeout(timer.current);
    setStatus("saving");

    timer.current = setTimeout(async () => {
      try {
        const now = new Date().toISOString();
        const { error } = await supabase
          .from("product_ocr_documents")
          .update({
            wizard_state: snapshot as unknown as Json,
            wizard_last_saved_at: now,
          })
          .eq("id", documentId);
        if (error) throw error;
        lastPayload.current = serialized;
        setLastSavedAt(new Date(now));
        setStatus("saved");
      } catch (err) {
        console.error("[OCR-AutoSave] failed", err);
        setStatus("error");
      }
    }, delayMs);

    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [documentId, enabled, snapshot, delayMs]);

  return { status, lastSavedAt };
}
