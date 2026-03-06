import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";

export interface SuggestionStats {
  totalSuggestions: number;
  accepted: number;
  rejected: number;
  pending: number;
  expired: number;
  acceptanceRate: number;
  avgConfidence: number;
  byField: Record<string, {
    total: number;
    accepted: number;
    rejected: number;
    acceptanceRate: number;
    avgConfidence: number;
  }>;
  byEntityType: Record<string, {
    total: number;
    accepted: number;
    rejected: number;
  }>;
  byConfidenceRange: {
    low: { total: number; accepted: number };
    medium: { total: number; accepted: number };
    high: { total: number; accepted: number };
  };
  recentSuggestions: Array<{
    id: string;
    entity_type: string;
    entity_id: string;
    field_name: string;
    field_type: string;
    suggested_value: unknown;
    confidence: number;
    status: string;
    created_at: string;
    reviewed_at: string | null;
  }>;
}

export function useAISuggestionsHistory() {
  const { currentWorkspace } = useWorkspace();

  return useQuery({
    queryKey: ["ai-suggestions-history", currentWorkspace?.id],
    queryFn: async (): Promise<SuggestionStats> => {
      if (!currentWorkspace?.id) {
        return getEmptyStats();
      }

      const { data, error } = await supabase
        .from("ai_field_suggestions")
        .select("*")
        .eq("workspace_id", currentWorkspace.id)
        .order("created_at", { ascending: false });

      if (error) {
        console.error('[AI-SUGGESTIONS] Failed to fetch suggestions history:', error.message);
        throw error;
      }

      const suggestions = data || [];
      
      const totalSuggestions = suggestions.length;
      const accepted = suggestions.filter(s => s.status === "accepted").length;
      const rejected = suggestions.filter(s => s.status === "rejected").length;
      const pending = suggestions.filter(s => s.status === "pending").length;
      const expired = suggestions.filter(s => s.status === "expired").length;
      
      const acceptanceRate = totalSuggestions > 0 
        ? (accepted / (accepted + rejected)) * 100 
        : 0;
      
      const avgConfidence = totalSuggestions > 0
        ? suggestions.reduce((acc, s) => acc + Number(s.confidence), 0) / totalSuggestions
        : 0;

      const byField: SuggestionStats["byField"] = {};
      suggestions.forEach(s => {
        const fieldKey = s.field_name;
        if (!byField[fieldKey]) {
          byField[fieldKey] = { total: 0, accepted: 0, rejected: 0, acceptanceRate: 0, avgConfidence: 0 };
        }
        byField[fieldKey].total++;
        if (s.status === "accepted") byField[fieldKey].accepted++;
        if (s.status === "rejected") byField[fieldKey].rejected++;
        byField[fieldKey].avgConfidence += Number(s.confidence);
      });

      Object.keys(byField).forEach(key => {
        const field = byField[key];
        const reviewed = field.accepted + field.rejected;
        field.acceptanceRate = reviewed > 0 ? (field.accepted / reviewed) * 100 : 0;
        field.avgConfidence = field.total > 0 ? field.avgConfidence / field.total : 0;
      });

      const byEntityType: SuggestionStats["byEntityType"] = {};
      suggestions.forEach(s => {
        if (!byEntityType[s.entity_type]) {
          byEntityType[s.entity_type] = { total: 0, accepted: 0, rejected: 0 };
        }
        byEntityType[s.entity_type].total++;
        if (s.status === "accepted") byEntityType[s.entity_type].accepted++;
        if (s.status === "rejected") byEntityType[s.entity_type].rejected++;
      });

      const byConfidenceRange: SuggestionStats["byConfidenceRange"] = {
        low: { total: 0, accepted: 0 },
        medium: { total: 0, accepted: 0 },
        high: { total: 0, accepted: 0 },
      };

      suggestions.forEach(s => {
        const confidence = Number(s.confidence);
        let range: "low" | "medium" | "high";
        if (confidence < 0.5) range = "low";
        else if (confidence < 0.75) range = "medium";
        else range = "high";
        
        byConfidenceRange[range].total++;
        if (s.status === "accepted") byConfidenceRange[range].accepted++;
      });

      return {
        totalSuggestions,
        accepted,
        rejected,
        pending,
        expired,
        acceptanceRate,
        avgConfidence,
        byField,
        byEntityType,
        byConfidenceRange,
        recentSuggestions: suggestions.slice(0, 50).map(s => ({
          id: s.id,
          entity_type: s.entity_type,
          entity_id: s.entity_id,
          field_name: s.field_name,
          field_type: s.field_type,
          suggested_value: s.suggested_value,
          confidence: Number(s.confidence),
          status: s.status,
          created_at: s.created_at,
          reviewed_at: s.reviewed_at,
        })),
      };
    },
    enabled: !!currentWorkspace?.id,
  });
}

function getEmptyStats(): SuggestionStats {
  return {
    totalSuggestions: 0,
    accepted: 0,
    rejected: 0,
    pending: 0,
    expired: 0,
    acceptanceRate: 0,
    avgConfidence: 0,
    byField: {},
    byEntityType: {},
    byConfidenceRange: {
      low: { total: 0, accepted: 0 },
      medium: { total: 0, accepted: 0 },
      high: { total: 0, accepted: 0 },
    },
    recentSuggestions: [],
  };
}
