import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export interface C2CListing {
  id: string;
  workspace_id: string;
  seller_id: string;
  category_id: string | null;
  title: string;
  description: string;
  price: number;
  currency: string;
  condition: "new" | "like_new" | "used" | "for_parts";
  photos: string[];
  photos_360: string[];
  videos: string[];
  location: string | null;
  status: "active" | "sold" | "paused" | "removed" | "flagged";
  views_count: number;
  is_featured: boolean;
  moderation_status: "approved" | "flagged" | "rejected";
  moderation_notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface C2CCategory {
  id: string;
  workspace_id: string;
  name: string;
  slug: string;
  icon: string | null;
  description: string | null;
  parent_id: string | null;
  sort_order: number;
  is_active: boolean;
  created_at: string;
}

export interface C2CListingFilters {
  category?: string;
  minPrice?: number;
  maxPrice?: number;
  condition?: string;
  location?: string;
  search?: string;
  status?: string;
}

export function useC2CCategories(workspaceId: string | undefined) {
  return useQuery({
    queryKey: ["c2c-categories", workspaceId],
    queryFn: async () => {
      if (!workspaceId) return [];
      const { data, error } = await supabase
        .from("c2c_categories")
        .select("*")
        .eq("workspace_id", workspaceId)
        .eq("is_active", true)
        .order("sort_order");
      if (error) throw error;
      return data as C2CCategory[];
    },
    enabled: !!workspaceId,
  });
}

export function useC2CListings(workspaceId: string | undefined, filters?: C2CListingFilters) {
  return useQuery({
    queryKey: ["c2c-listings", workspaceId, filters],
    queryFn: async () => {
      if (!workspaceId) return [];
      let query = supabase
        .from("c2c_listings")
        .select("*")
        .eq("workspace_id", workspaceId)
        .eq("moderation_status", "approved");

      if (filters?.status) {
        query = query.eq("status", filters.status);
      } else {
        query = query.eq("status", "active");
      }

      if (filters?.category) query = query.eq("category_id", filters.category);
      if (filters?.minPrice) query = query.gte("price", filters.minPrice);
      if (filters?.maxPrice) query = query.lte("price", filters.maxPrice);
      if (filters?.condition) query = query.eq("condition", filters.condition);
      if (filters?.search) query = query.or(`title.ilike.%${filters.search}%,description.ilike.%${filters.search}%`);

      query = query.order("is_featured", { ascending: false }).order("created_at", { ascending: false });

      const { data, error } = await query;
      if (error) throw error;
      return data as C2CListing[];
    },
    enabled: !!workspaceId,
  });
}

export function useC2CListingDetail(listingId: string | undefined) {
  return useQuery({
    queryKey: ["c2c-listing", listingId],
    queryFn: async () => {
      if (!listingId) return null;
      const { data, error } = await supabase
        .from("c2c_listings")
        .select("*")
        .eq("id", listingId)
        .single();
      if (error) throw error;
      return data as C2CListing;
    },
    enabled: !!listingId,
  });
}

export function useMyC2CListings(workspaceId: string | undefined) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["c2c-my-listings", workspaceId, user?.id],
    queryFn: async () => {
      if (!workspaceId || !user) return [];
      const { data, error } = await supabase
        .from("c2c_listings")
        .select("*")
        .eq("workspace_id", workspaceId)
        .eq("seller_id", user.id)
        .neq("status", "removed")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as C2CListing[];
    },
    enabled: !!workspaceId && !!user,
  });
}

export function useCreateC2CListing(workspaceId: string | undefined) {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (listing: Omit<C2CListing, "id" | "workspace_id" | "seller_id" | "views_count" | "is_featured" | "moderation_status" | "moderation_notes" | "created_at" | "updated_at">) => {
      if (!workspaceId || !user) throw new Error("Sem workspace ou utilizador");

      // Auto-moderation: check banned words
      const { data: settings } = await supabase
        .from("c2c_moderation_settings")
        .select("banned_words, min_description_length, require_photo")
        .eq("workspace_id", workspaceId)
        .single();

      let moderationStatus = "approved";
      let moderationNotes = null;

      if (settings) {
        const bannedWords = (settings.banned_words as string[]) || [];
        const text = `${listing.title} ${listing.description}`.toLowerCase();
        const foundBanned = bannedWords.filter(w => text.includes(w.toLowerCase()));
        if (foundBanned.length > 0) {
          moderationStatus = "flagged";
          moderationNotes = `Palavras suspeitas detetadas: ${foundBanned.join(", ")}`;
        }
        if (settings.require_photo && (!listing.photos || listing.photos.length === 0)) {
          throw new Error("É obrigatório incluir pelo menos uma foto.");
        }
        if (settings.min_description_length && listing.description.length < (settings.min_description_length as number)) {
          throw new Error(`A descrição deve ter pelo menos ${settings.min_description_length} caracteres.`);
        }
      }

      const { data, error } = await supabase
        .from("c2c_listings")
        .insert({
          ...listing,
          workspace_id: workspaceId,
          seller_id: user.id,
          moderation_status: moderationStatus,
          moderation_notes: moderationNotes,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["c2c-listings"] });
      queryClient.invalidateQueries({ queryKey: ["c2c-my-listings"] });
      toast.success("Anúncio publicado com sucesso!");
    },
    onError: (err: Error) => {
      toast.error(err.message);
    },
  });
}

export function useUpdateC2CListing() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<C2CListing> & { id: string }) => {
      const { data, error } = await supabase
        .from("c2c_listings")
        .update(updates)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["c2c-listings"] });
      queryClient.invalidateQueries({ queryKey: ["c2c-my-listings"] });
      toast.success("Anúncio atualizado!");
    },
    onError: () => toast.error("Erro ao atualizar anúncio"),
  });
}

export function useC2CFavorites(workspaceId: string | undefined) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["c2c-favorites", workspaceId, user?.id],
    queryFn: async () => {
      if (!workspaceId || !user) return [];
      const { data, error } = await supabase
        .from("c2c_favorites")
        .select("listing_id")
        .eq("workspace_id", workspaceId)
        .eq("user_id", user.id);
      if (error) throw error;
      return data.map(f => f.listing_id);
    },
    enabled: !!workspaceId && !!user,
  });
}

export function useToggleC2CFavorite(workspaceId: string | undefined) {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (listingId: string) => {
      if (!workspaceId || !user) throw new Error("Sem sessão");
      const { data: existing } = await supabase
        .from("c2c_favorites")
        .select("id")
        .eq("listing_id", listingId)
        .eq("user_id", user.id)
        .maybeSingle();

      if (existing) {
        await supabase.from("c2c_favorites").delete().eq("id", existing.id);
      } else {
        await supabase.from("c2c_favorites").insert({
          workspace_id: workspaceId,
          listing_id: listingId,
          user_id: user.id,
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["c2c-favorites"] });
    },
  });
}

export function useC2CSellerReviews(sellerId: string | undefined) {
  return useQuery({
    queryKey: ["c2c-seller-reviews", sellerId],
    queryFn: async () => {
      if (!sellerId) return { reviews: [], average: 0, count: 0 };
      const { data, error } = await supabase
        .from("c2c_reviews")
        .select("*")
        .eq("seller_id", sellerId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      const avg = data.length > 0 ? data.reduce((s, r) => s + r.rating, 0) / data.length : 0;
      return { reviews: data, average: Math.round(avg * 10) / 10, count: data.length };
    },
    enabled: !!sellerId,
  });
}

export function useCreateC2CReport(workspaceId: string | undefined) {
  const { user } = useAuth();
  return useMutation({
    mutationFn: async ({ listingId, reason, details }: { listingId: string; reason: string; details?: string }) => {
      if (!workspaceId || !user) throw new Error("Sem sessão");
      const { error } = await supabase.from("c2c_reports").insert({
        workspace_id: workspaceId,
        listing_id: listingId,
        reporter_id: user.id,
        reason,
        details,
      });
      if (error) throw error;
    },
    onSuccess: () => toast.success("Denúncia enviada. Obrigado!"),
    onError: () => toast.error("Erro ao enviar denúncia"),
  });
}
