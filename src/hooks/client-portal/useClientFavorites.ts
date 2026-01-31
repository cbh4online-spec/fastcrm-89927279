import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useClientAuth } from "./useClientAuth";
import { toast } from "sonner";

interface FavoriteProduct {
  id: string;
  product_id: string;
  created_at: string;
  product: {
    id: string;
    name: string;
    sku: string | null;
    base_price: number;
    images: string[] | null;
    primary_image_index: number | null;
    short_description: string | null;
    status: string;
  };
}

export function useClientFavorites() {
  const { clientUser } = useClientAuth();
  const queryClient = useQueryClient();

  // Fetch all favorites with product details
  const { data: favorites = [], isLoading, error } = useQuery({
    queryKey: ["client-favorites", clientUser?.id],
    queryFn: async () => {
      if (!clientUser?.id) return [];

      const { data, error } = await supabase
        .from("client_favorites")
        .select(`
          id,
          product_id,
          created_at,
          product:products (
            id,
            name,
            sku,
            base_price,
            images,
            primary_image_index,
            short_description,
            status
          )
        `)
        .eq("client_user_id", clientUser.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return (data || []) as unknown as FavoriteProduct[];
    },
    enabled: !!clientUser?.id,
  });

  // Get favorite IDs for quick lookup
  const favoriteProductIds = new Set(favorites.map((f) => f.product_id));

  // Check if a product is favorited
  const isFavorite = (productId: string): boolean => {
    return favoriteProductIds.has(productId);
  };

  // Add to favorites mutation
  const addFavorite = useMutation({
    mutationFn: async (productId: string) => {
      if (!clientUser?.id) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from("client_favorites")
        .insert({
          client_user_id: clientUser.id,
          product_id: productId,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onMutate: async (productId) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ["client-favorites", clientUser?.id] });

      // Snapshot previous value
      const previousFavorites = queryClient.getQueryData<FavoriteProduct[]>(["client-favorites", clientUser?.id]);

      // Optimistically update
      queryClient.setQueryData<FavoriteProduct[]>(
        ["client-favorites", clientUser?.id],
        (old = []) => [
          {
            id: `temp-${productId}`,
            product_id: productId,
            created_at: new Date().toISOString(),
            product: {} as FavoriteProduct["product"],
          },
          ...old,
        ]
      );

      return { previousFavorites };
    },
    onError: (err, productId, context) => {
      // Rollback on error
      queryClient.setQueryData(
        ["client-favorites", clientUser?.id],
        context?.previousFavorites
      );
      toast.error("Erro ao adicionar favorito");
    },
    onSuccess: () => {
      toast.success("Adicionado aos favoritos");
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["client-favorites", clientUser?.id] });
    },
  });

  // Remove from favorites mutation
  const removeFavorite = useMutation({
    mutationFn: async (productId: string) => {
      if (!clientUser?.id) throw new Error("Not authenticated");

      const { error } = await supabase
        .from("client_favorites")
        .delete()
        .eq("client_user_id", clientUser.id)
        .eq("product_id", productId);

      if (error) throw error;
    },
    onMutate: async (productId) => {
      await queryClient.cancelQueries({ queryKey: ["client-favorites", clientUser?.id] });

      const previousFavorites = queryClient.getQueryData<FavoriteProduct[]>(["client-favorites", clientUser?.id]);

      queryClient.setQueryData<FavoriteProduct[]>(
        ["client-favorites", clientUser?.id],
        (old = []) => old.filter((f) => f.product_id !== productId)
      );

      return { previousFavorites };
    },
    onError: (err, productId, context) => {
      queryClient.setQueryData(
        ["client-favorites", clientUser?.id],
        context?.previousFavorites
      );
      toast.error("Erro ao remover favorito");
    },
    onSuccess: () => {
      toast.success("Removido dos favoritos");
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["client-favorites", clientUser?.id] });
    },
  });

  // Toggle favorite
  const toggleFavorite = (productId: string) => {
    if (isFavorite(productId)) {
      removeFavorite.mutate(productId);
    } else {
      addFavorite.mutate(productId);
    }
  };

  return {
    favorites,
    loading: isLoading,
    error: error?.message || null,
    isFavorite,
    toggleFavorite,
    addFavorite: addFavorite.mutate,
    removeFavorite: removeFavorite.mutate,
    favoriteCount: favorites.length,
  };
}
