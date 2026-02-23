import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useClientAuth } from "./useClientAuth";
import { toast } from "sonner";

export interface FavoriteProtocol {
  id: string;
  protocol_id: string;
  default_kit_level: string;
  notes: string | null;
  created_at: string;
  protocol?: {
    id: string;
    name: string;
    short_description: string | null;
    image_url: string | null;
    discount_percentage: number;
  };
}

export function useFavoriteProtocols() {
  const { clientUser } = useClientAuth();
  const queryClient = useQueryClient();
  const companyId = clientUser?.company_id;
  const workspaceId = clientUser?.workspace_id;

  const { data: favorites = [], isLoading } = useQuery({
    queryKey: ["client-favorite-protocols", companyId],
    queryFn: async () => {
      if (!companyId) return [];
      const { data, error } = await supabase
        .from("client_favorite_protocols")
        .select("*, protocol:product_protocols(id, name, short_description, image_url, discount_percentage)")
        .eq("company_id", companyId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []) as FavoriteProtocol[];
    },
    enabled: !!companyId,
  });

  const isFavorite = (protocolId: string) => favorites.some((f) => f.protocol_id === protocolId);

  const toggleFavorite = useMutation({
    mutationFn: async ({ protocolId, kitLevel = "basic" }: { protocolId: string; kitLevel?: string }) => {
      if (!companyId || !workspaceId) throw new Error("No company");
      const existing = favorites.find((f) => f.protocol_id === protocolId);
      if (existing) {
        const { error } = await supabase.from("client_favorite_protocols").delete().eq("id", existing.id);
        if (error) throw error;
        return { removed: true };
      } else {
        const { error } = await supabase.from("client_favorite_protocols").insert({
          workspace_id: workspaceId,
          company_id: companyId,
          protocol_id: protocolId,
          created_by: clientUser?.id,
          default_kit_level: kitLevel,
        });
        if (error) throw error;
        return { removed: false };
      }
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["client-favorite-protocols"] });
      toast.success(result.removed ? "Removido dos favoritos" : "Adicionado aos favoritos!");
    },
    onError: () => toast.error("Erro ao atualizar favoritos"),
  });

  return {
    favorites,
    isLoading,
    isFavorite,
    toggleFavorite: toggleFavorite.mutateAsync,
    toggling: toggleFavorite.isPending,
  };
}
