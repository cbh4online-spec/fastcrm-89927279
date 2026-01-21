import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import type { SEOEntity, EntityType, EntityStatus, Intent } from "../types";
import { toast } from "sonner";

interface AdminFilters {
  entityType?: EntityType | "all";
  status?: EntityStatus | "all";
  language?: string;
  intent?: Intent | "all";
  search?: string;
}

interface PaginationOptions {
  page: number;
  pageSize: number;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

export function useAdminSEOEntities(
  filters: AdminFilters = {},
  pagination: PaginationOptions = { page: 1, pageSize: 20 }
) {
  const { currentWorkspace } = useWorkspace();
  const { page, pageSize, sortBy = "updated_at", sortOrder = "desc" } = pagination;
  const offset = (page - 1) * pageSize;

  return useQuery({
    queryKey: ["admin-seo-entities", currentWorkspace?.id, filters, pagination],
    queryFn: async () => {
      if (!currentWorkspace?.id) {
        return { entities: [], total: 0, totalPages: 0 };
      }

      let query = supabase
        .from("seo_entities")
        .select("*", { count: "exact" })
        .eq("workspace_id", currentWorkspace.id); // FILTRO CRÍTICO DE SEGURANÇA

      // Apply filters
      if (filters.entityType && filters.entityType !== "all") {
        query = query.eq("entity_type", filters.entityType);
      }
      if (filters.status && filters.status !== "all") {
        query = query.eq("status", filters.status);
      }
      if (filters.language) {
        query = query.eq("language", filters.language);
      }
      if (filters.intent && filters.intent !== "all") {
        query = query.eq("intent", filters.intent);
      }
      if (filters.search) {
        query = query.or(`title.ilike.%${filters.search}%,slug.ilike.%${filters.search}%`);
      }

      // Apply pagination and sorting
      query = query
        .order(sortBy, { ascending: sortOrder === "asc" })
        .range(offset, offset + pageSize - 1);

      const { data, error, count } = await query;

      if (error) throw error;

      return {
        entities: data as SEOEntity[],
        total: count || 0,
        totalPages: Math.ceil((count || 0) / pageSize),
      };
    },
    enabled: !!currentWorkspace?.id,
    staleTime: 30000,
  });
}

export function useUpdateEntityStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      entityId,
      status,
    }: {
      entityId: string;
      status: EntityStatus;
    }) => {
      const updates: Record<string, unknown> = { status };
      
      if (status === "published") {
        updates.published_at = new Date().toISOString();
      }

      const { error } = await supabase
        .from("seo_entities")
        .update(updates)
        .eq("id", entityId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-seo-entities"] });
      toast.success("Estado atualizado com sucesso");
    },
    onError: (error) => {
      console.error("Error updating status:", error);
      toast.error("Erro ao atualizar estado");
    },
  });
}

export function useDeleteEntity() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (entityId: string) => {
      const { error } = await supabase
        .from("seo_entities")
        .delete()
        .eq("id", entityId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-seo-entities"] });
      toast.success("Entidade eliminada com sucesso");
    },
    onError: (error) => {
      console.error("Error deleting entity:", error);
      toast.error("Erro ao eliminar entidade");
    },
  });
}

export function useBulkUpdateStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      entityIds,
      status,
    }: {
      entityIds: string[];
      status: EntityStatus;
    }) => {
      const updates: Record<string, unknown> = { status };
      
      if (status === "published") {
        updates.published_at = new Date().toISOString();
      }

      const { error } = await supabase
        .from("seo_entities")
        .update(updates)
        .in("id", entityIds);

      if (error) throw error;
    },
    onSuccess: (_, { entityIds }) => {
      queryClient.invalidateQueries({ queryKey: ["admin-seo-entities"] });
      toast.success(`${entityIds.length} entidades atualizadas`);
    },
    onError: (error) => {
      console.error("Error bulk updating:", error);
      toast.error("Erro ao atualizar entidades");
    },
  });
}

export function useSEOStats() {
  const { currentWorkspace } = useWorkspace();

  return useQuery({
    queryKey: ["seo-stats", currentWorkspace?.id],
    queryFn: async () => {
      if (!currentWorkspace?.id) {
        return { total: 0, byStatus: {}, byType: {}, totalViews: 0, avgAIScore: 0 };
      }

      // Get counts by status - FILTRO POR WORKSPACE
      const { data: statusCounts, error: statusError } = await supabase
        .from("seo_entities")
        .select("status")
        .eq("workspace_id", currentWorkspace.id);

      if (statusError) throw statusError;

      // Get counts by type - FILTRO POR WORKSPACE
      const { data: typeCounts, error: typeError } = await supabase
        .from("seo_entities")
        .select("entity_type")
        .eq("workspace_id", currentWorkspace.id);

      if (typeError) throw typeError;

      // Get total views - FILTRO POR WORKSPACE
      const { data: viewsData, error: viewsError } = await supabase
        .from("seo_entities")
        .select("views_count")
        .eq("workspace_id", currentWorkspace.id);

      if (viewsError) throw viewsError;

      // Get average AI score - FILTRO POR WORKSPACE
      const { data: scoreData, error: scoreError } = await supabase
        .from("seo_entities")
        .select("ai_quality_score")
        .eq("workspace_id", currentWorkspace.id)
        .not("ai_quality_score", "is", null);

      if (scoreError) throw scoreError;

      // Calculate stats
      const statusStats = statusCounts.reduce(
        (acc, item) => {
          acc[item.status] = (acc[item.status] || 0) + 1;
          return acc;
        },
        {} as Record<string, number>
      );

      const typeStats = typeCounts.reduce(
        (acc, item) => {
          acc[item.entity_type] = (acc[item.entity_type] || 0) + 1;
          return acc;
        },
        {} as Record<string, number>
      );

      const totalViews = viewsData.reduce((sum, item) => sum + (item.views_count || 0), 0);
      
      const avgScore =
        scoreData.length > 0
          ? scoreData.reduce((sum, item) => sum + (item.ai_quality_score || 0), 0) / scoreData.length
          : 0;

      return {
        total: statusCounts.length,
        byStatus: statusStats,
        byType: typeStats,
        totalViews,
        avgAIScore: Math.round(avgScore * 10) / 10,
      };
    },
    enabled: !!currentWorkspace?.id,
    staleTime: 60000,
  });
}

export function useTopPerformingPages(limit = 10) {
  const { currentWorkspace } = useWorkspace();

  return useQuery({
    queryKey: ["seo-top-pages", currentWorkspace?.id, limit],
    queryFn: async () => {
      if (!currentWorkspace?.id) {
        return [];
      }

      const { data, error } = await supabase
        .from("seo_entities")
        .select("id, title, slug, entity_type, views_count, status")
        .eq("workspace_id", currentWorkspace.id) // FILTRO POR WORKSPACE
        .eq("status", "published")
        .order("views_count", { ascending: false })
        .limit(limit);

      if (error) throw error;
      return data;
    },
    enabled: !!currentWorkspace?.id,
    staleTime: 60000,
  });
}
