import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { toast } from "sonner";

// ============= Types =============

export interface DocumentSeries {
  id: string;
  workspace_id: string;
  document_type: string;
  series_prefix: string;
  series_year: number;
  current_number: number;
  is_active: boolean;
  is_default: boolean;
  description: string | null;
  created_at: string;
  updated_at: string;
}

export interface VatRule {
  id: string;
  workspace_id: string;
  name: string;
  country_code: string;
  client_type: string;
  rate: number;
  rate_type: string;
  exemption_reason: string | null;
  applies_to_products: boolean;
  applies_to_services: boolean;
  is_active: boolean;
  priority: number;
  created_at: string;
}

export const DOCUMENT_TYPES: Record<string, { label: string; prefix: string }> = {
  invoice: { label: "Fatura", prefix: "FT" },
  simplified_invoice: { label: "Fatura Simplificada", prefix: "FS" },
  credit_note: { label: "Nota de Crédito", prefix: "NC" },
  receipt: { label: "Recibo", prefix: "RC" },
  debit_note: { label: "Nota de Débito", prefix: "ND" },
  proforma: { label: "Proforma", prefix: "PF" },
};

export const CLIENT_TYPES: Record<string, string> = {
  b2c: "B2C (Consumidor final)",
  b2b_national: "B2B Nacional",
  b2b_eu: "B2B Intracomunitário (UE)",
  b2b_extra_eu: "B2B Extra-UE (Exportação)",
  exempt: "Isento",
};

export const VAT_RATE_TYPES: Record<string, string> = {
  standard: "Normal",
  intermediate: "Intermédia",
  reduced: "Reduzida",
  exempt: "Isenta",
  reverse_charge: "Autoliquidação",
};

export const VAT_REGIMES: Record<string, string> = {
  normal: "Regime Normal",
  simplified: "Regime Simplificado",
  exempt: "Isento (Art. 53º)",
  cash_accounting: "IVA de Caixa",
};

// Default PT VAT rates
export const DEFAULT_PT_VAT_RULES = [
  { name: "Normal B2C PT", country_code: "PT", client_type: "b2c", rate: 23, rate_type: "standard", priority: 0 },
  { name: "Intermédia B2C PT", country_code: "PT", client_type: "b2c", rate: 13, rate_type: "intermediate", priority: 0 },
  { name: "Reduzida B2C PT", country_code: "PT", client_type: "b2c", rate: 6, rate_type: "reduced", priority: 0 },
  { name: "Normal B2B Nacional", country_code: "PT", client_type: "b2b_national", rate: 23, rate_type: "standard", priority: 0 },
  { name: "Intracomunitário (Reverse Charge)", country_code: "EU", client_type: "b2b_eu", rate: 0, rate_type: "reverse_charge", exemption_reason: "Autoliquidação - Art. 14º RITI", priority: 10 },
  { name: "Exportação Extra-UE", country_code: "EXTRA", client_type: "b2b_extra_eu", rate: 0, rate_type: "exempt", exemption_reason: "Isento - Art. 14º CIVA", priority: 10 },
];

// ============= Document Series Hooks =============

export function useDocumentSeries() {
  const { currentWorkspace } = useWorkspace();

  return useQuery({
    queryKey: ["document-series", currentWorkspace?.id],
    queryFn: async () => {
      if (!currentWorkspace?.id) return [];
      const { data, error } = await supabase
        .from("document_series")
        .select("*")
        .eq("workspace_id", currentWorkspace.id)
        .order("document_type")
        .order("series_year", { ascending: false });
      if (error) throw error;
      return (data || []) as unknown as DocumentSeries[];
    },
    enabled: !!currentWorkspace?.id,
  });
}

export function useUpsertDocumentSeries() {
  const queryClient = useQueryClient();
  const { currentWorkspace } = useWorkspace();

  return useMutation({
    mutationFn: async (series: Partial<DocumentSeries> & { document_type: string; series_prefix: string }) => {
      if (!currentWorkspace?.id) throw new Error("No workspace");

      if (series.id) {
        const { error } = await supabase
          .from("document_series")
          .update({
            series_prefix: series.series_prefix,
            is_active: series.is_active,
            is_default: series.is_default,
            description: series.description,
          })
          .eq("id", series.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("document_series").insert({
          workspace_id: currentWorkspace.id,
          document_type: series.document_type,
          series_prefix: series.series_prefix,
          series_year: series.series_year || new Date().getFullYear(),
          is_active: series.is_active ?? true,
          is_default: series.is_default ?? false,
          description: series.description || null,
        });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["document-series"] });
      toast.success("Série guardada");
    },
    onError: (err) => toast.error("Erro: " + err.message),
  });
}

// ============= VAT Rules Hooks =============

export function useVatRules() {
  const { currentWorkspace } = useWorkspace();

  return useQuery({
    queryKey: ["vat-rules", currentWorkspace?.id],
    queryFn: async () => {
      if (!currentWorkspace?.id) return [];
      const { data, error } = await supabase
        .from("vat_rules")
        .select("*")
        .eq("workspace_id", currentWorkspace.id)
        .order("priority", { ascending: false })
        .order("client_type");
      if (error) throw error;
      return (data || []) as unknown as VatRule[];
    },
    enabled: !!currentWorkspace?.id,
  });
}

export function useSeedDefaultVatRules() {
  const queryClient = useQueryClient();
  const { currentWorkspace } = useWorkspace();

  return useMutation({
    mutationFn: async () => {
      if (!currentWorkspace?.id) throw new Error("No workspace");

      const rules = DEFAULT_PT_VAT_RULES.map(r => ({
        ...r,
        workspace_id: currentWorkspace.id,
        is_active: true,
        applies_to_products: true,
        applies_to_services: true,
        exemption_reason: (r as any).exemption_reason || null,
      }));

      const { error } = await supabase.from("vat_rules").insert(rules);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vat-rules"] });
      toast.success("Regras de IVA PT inseridas");
    },
    onError: (err) => toast.error("Erro: " + err.message),
  });
}

export function useUpsertVatRule() {
  const queryClient = useQueryClient();
  const { currentWorkspace } = useWorkspace();

  return useMutation({
    mutationFn: async (rule: Partial<VatRule> & { name: string; rate: number; client_type: string }) => {
      if (!currentWorkspace?.id) throw new Error("No workspace");

      if (rule.id) {
        const { error } = await supabase
          .from("vat_rules")
          .update({
            name: rule.name,
            country_code: rule.country_code,
            client_type: rule.client_type,
            rate: rule.rate,
            rate_type: rule.rate_type,
            exemption_reason: rule.exemption_reason,
            is_active: rule.is_active,
            priority: rule.priority,
          })
          .eq("id", rule.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("vat_rules").insert({
          workspace_id: currentWorkspace.id,
          ...rule,
        });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vat-rules"] });
      toast.success("Regra de IVA guardada");
    },
    onError: (err) => toast.error("Erro: " + err.message),
  });
}

export function useDeleteVatRule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("vat_rules").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vat-rules"] });
      toast.success("Regra eliminada");
    },
    onError: (err) => toast.error("Erro: " + err.message),
  });
}

// ============= VAT Calculation Engine =============

export function resolveVatRate(
  rules: VatRule[],
  clientType: string,
  rateType: string = "standard"
): { rate: number; exemptionReason: string | null; isReverseCharge: boolean } {
  // Find matching rule by client_type and rate_type, ordered by priority
  const match = rules.find(
    r => r.is_active && r.client_type === clientType && r.rate_type === rateType
  );

  if (match) {
    return {
      rate: match.rate,
      exemptionReason: match.exemption_reason,
      isReverseCharge: match.rate_type === "reverse_charge",
    };
  }

  // Fallback: try just by client_type
  const fallback = rules.find(r => r.is_active && r.client_type === clientType);
  if (fallback) {
    return {
      rate: fallback.rate,
      exemptionReason: fallback.exemption_reason,
      isReverseCharge: fallback.rate_type === "reverse_charge",
    };
  }

  // Default: 23% standard
  return { rate: 23, exemptionReason: null, isReverseCharge: false };
}

export function calculateItemTax(
  netAmount: number,
  vatRate: number
): { taxAmount: number; grossTotal: number } {
  const taxAmount = Math.round(netAmount * vatRate) / 100;
  return {
    taxAmount,
    grossTotal: netAmount + taxAmount,
  };
}

// EU country codes for intra-community validation
export const EU_COUNTRY_CODES = [
  "AT", "BE", "BG", "CY", "CZ", "DE", "DK", "EE", "ES", "FI",
  "FR", "GR", "HR", "HU", "IE", "IT", "LT", "LU", "LV", "MT",
  "NL", "PL", "PT", "RO", "SE", "SI", "SK"
];

export function detectClientType(
  country: string,
  hasValidVatNumber: boolean,
  isBusiness: boolean
): string {
  if (!isBusiness) return "b2c";
  if (country === "PT") return "b2b_national";
  if (EU_COUNTRY_CODES.includes(country) && hasValidVatNumber) return "b2b_eu";
  if (!EU_COUNTRY_CODES.includes(country)) return "b2b_extra_eu";
  return "b2b_national"; // EU without valid VAT = treat as national
}
