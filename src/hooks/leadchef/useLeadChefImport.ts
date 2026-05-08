import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { useCreateLeadChefAuditLog } from "./useCreateLeadChefAuditLog";
import {
  findDuplicate,
  isValidEmail,
  type ExistingLead,
} from "@/utils/leadchef/duplicates";
import {
  normalizeDate,
  normalizeStage,
  normalizeTemperature,
  type CanonicalField,
} from "@/utils/leadchef/fieldMapping";
import { cleanPhoneNumber } from "@/utils/leadchef/contact";

export interface ImportRow {
  index: number;
  raw: Record<string, string>;
  mapped: Partial<Record<CanonicalField, string>>;
  status: "valid" | "warning" | "invalid" | "duplicate";
  errors: string[];
  warnings: string[];
}

export interface ImportPreview {
  rows: ImportRow[];
  total: number;
  valid: number;
  warnings: number;
  invalid: number;
  duplicates: number;
}

export const IMPORT_ROW_LIMIT = 1000;

export function buildImportPreview(
  parsedRows: Record<string, string>[],
  mapping: Partial<Record<CanonicalField, string>>,
  existing: ExistingLead[],
): ImportPreview {
  const rows: ImportRow[] = [];
  let valid = 0;
  let warnings = 0;
  let invalid = 0;
  let duplicates = 0;

  parsedRows.slice(0, IMPORT_ROW_LIMIT).forEach((raw, idx) => {
    const mapped: Partial<Record<CanonicalField, string>> = {};
    (Object.keys(mapping) as CanonicalField[]).forEach((field) => {
      const col = mapping[field];
      if (col) mapped[field] = (raw[col] ?? "").trim();
    });

    const errors: string[] = [];
    const warningsArr: string[] = [];

    if (!mapped.name) errors.push("Nome em falta");
    if (!mapped.phone && !mapped.email) warningsArr.push("Sem telefone nem email");
    if (mapped.email && !isValidEmail(mapped.email)) errors.push("Email inválido");
    if (mapped.next_action_at && !normalizeDate(mapped.next_action_at)) {
      warningsArr.push("Data inválida — será ignorada");
    }

    let status: ImportRow["status"] = "valid";
    if (errors.length > 0) {
      status = "invalid";
      invalid++;
    } else {
      const dup = findDuplicate(
        { name: mapped.name, phone: mapped.phone, email: mapped.email },
        existing,
      );
      if (dup) {
        status = "duplicate";
        warningsArr.push(`Possível duplicado (por ${dup.reason})`);
        duplicates++;
      } else if (warningsArr.length > 0) {
        status = "warning";
        warnings++;
      } else {
        valid++;
      }
    }

    rows.push({ index: idx, raw, mapped, status, errors, warnings: warningsArr });
  });

  return {
    rows,
    total: rows.length,
    valid,
    warnings,
    invalid,
    duplicates,
  };
}

export interface ImportOptions {
  skipDuplicates: boolean;
  skipInvalid: boolean;
}

export interface ImportResult {
  imported: number;
  skipped: number;
  failed: number;
  errors: { row: number; message: string }[];
}

export function useLeadChefImport() {
  const queryClient = useQueryClient();
  const { currentWorkspace } = useWorkspace();
  const { user } = useAuth();
  const workspaceId = currentWorkspace?.id;
  const auditMut = useCreateLeadChefAuditLog();

  return useMutation({
    mutationFn: async ({
      preview,
      options,
    }: {
      preview: ImportPreview;
      options: ImportOptions;
    }): Promise<ImportResult> => {
      if (!workspaceId) throw new Error("Workspace não selecionado.");
      if (!user?.id) throw new Error("Sessão não encontrada.");

      let imported = 0;
      let skipped = 0;
      let failed = 0;
      const errors: { row: number; message: string }[] = [];

      for (const row of preview.rows) {
        if (row.status === "invalid") {
          if (options.skipInvalid) {
            skipped++;
            continue;
          }
          failed++;
          errors.push({ row: row.index + 2, message: row.errors.join("; ") });
          continue;
        }
        if (row.status === "duplicate" && options.skipDuplicates) {
          skipped++;
          continue;
        }

        try {
          const m = row.mapped;
          const stage = normalizeStage(m.stage) ?? "to_contact";
          const temperature = normalizeTemperature(m.temperature);
          const nextAt = normalizeDate(m.next_action_at);

          const { data: lead, error: leadErr } = await supabase
            .from("leads")
            .insert({
              workspace_id: workspaceId,
              name: m.name!,
              phone: m.phone ? cleanPhoneNumber(m.phone) : null,
              email: m.email || null,
              source: m.origin || null,
              status: "new",
              ai_temperature: temperature,
              created_by: user.id,
            } as any)
            .select("id")
            .single();
          if (leadErr) throw leadErr;

          const { error: profErr } = await (supabase as any)
            .from("leadchef_lead_profiles")
            .insert({
              workspace_id: workspaceId,
              lead_id: lead.id,
              stage,
              interest: m.interest || null,
              origin: m.origin || null,
              temperature,
              next_action_type: m.next_action_type || null,
              next_action_at: nextAt,
              next_action_note: m.notes || null,
              created_by: user.id,
            });
          if (profErr) throw profErr;

          imported++;
        } catch (e: any) {
          failed++;
          errors.push({ row: row.index + 2, message: e?.message || "Erro" });
        }
      }

      auditMut.mutate({
        action: "import_completed",
        entityType: "leadchef_lead",
        description: `Importados ${imported} leads (${skipped} ignorados, ${failed} falhas)`,
        metadata: { imported, skipped, failed, total: preview.total },
      });

      return { imported, skipped, failed, errors };
    },
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ["leadchef-leads"] });
      queryClient.invalidateQueries({ queryKey: ["leads"] });
      toast.success(`Importação concluída: ${res.imported} criados.`);
    },
    onError: (err: any) => {
      toast.error(err?.message || "Não foi possível importar.");
    },
  });
}
