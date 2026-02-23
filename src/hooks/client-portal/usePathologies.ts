import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface Pathology {
  id: string;
  workspace_id: string;
  name: string;
  slug: string;
  description: string | null;
  image_url: string | null;
  tags: string[];
  is_active: boolean;
  position: number;
  created_at: string;
  protocol_count?: number;
}

export interface PathologyWithProtocols extends Pathology {
  protocols: {
    id: string;
    protocol_id: string;
    notes: string | null;
    position: number;
    protocol: {
      id: string;
      name: string;
      code: string;
      description: string | null;
      short_description: string | null;
      image_url: string | null;
      is_active: boolean;
      discount_percentage: number;
    };
  }[];
}

export function usePathologies(workspaceId: string | undefined) {
  return useQuery({
    queryKey: ["pathologies", workspaceId],
    queryFn: async () => {
      if (!workspaceId) return [];

      const { data, error } = await supabase
        .from("pathologies")
        .select("*")
        .eq("workspace_id", workspaceId)
        .eq("is_active", true)
        .order("position", { ascending: true });

      if (error) throw error;

      // Get protocol counts
      const pathologyIds = (data || []).map((p: any) => p.id);
      if (pathologyIds.length === 0) return data as unknown as Pathology[];

      const { data: links } = await supabase
        .from("pathology_protocols")
        .select("pathology_id")
        .in("pathology_id", pathologyIds);

      const countMap = new Map<string, number>();
      (links || []).forEach((l: any) => {
        countMap.set(l.pathology_id, (countMap.get(l.pathology_id) || 0) + 1);
      });

      return (data || []).map((p: any) => ({
        ...p,
        protocol_count: countMap.get(p.id) || 0,
      })) as Pathology[];
    },
    enabled: !!workspaceId,
  });
}

export function usePathology(slug: string | undefined, workspaceId: string | undefined) {
  return useQuery({
    queryKey: ["pathology", slug, workspaceId],
    queryFn: async () => {
      if (!slug || !workspaceId) return null;

      const { data, error } = await supabase
        .from("pathologies")
        .select("*")
        .eq("workspace_id", workspaceId)
        .eq("slug", slug)
        .single();

      if (error) throw error;

      // Fetch associated protocols
      const { data: links } = await supabase
        .from("pathology_protocols")
        .select(`
          id,
          protocol_id,
          notes,
          position
        `)
        .eq("pathology_id", data.id)
        .order("position", { ascending: true });

      // Fetch full protocol data
      const protocolIds = (links || []).map((l: any) => l.protocol_id);
      let protocols: any[] = [];

      if (protocolIds.length > 0) {
        const { data: protocolData } = await supabase
          .from("product_protocols")
          .select("id, name, code, description, short_description, image_url, is_active, discount_percentage")
          .in("id", protocolIds)
          .eq("is_active", true);

        protocols = (links || []).map((l: any) => ({
          ...l,
          protocol: (protocolData || []).find((p: any) => p.id === l.protocol_id),
        })).filter((l: any) => l.protocol);
      }

      return {
        ...data,
        protocols,
      } as unknown as PathologyWithProtocols;
    },
    enabled: !!slug && !!workspaceId,
  });
}
