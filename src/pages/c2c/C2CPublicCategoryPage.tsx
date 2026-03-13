import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Helmet } from "react-helmet-async";
import { supabase } from "@/integrations/supabase/client";
import { ListingCard } from "@/components/c2c/ListingCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Search } from "lucide-react";
import { useState } from "react";
import type { C2CListing } from "@/hooks/useC2CListings";

export default function C2CPublicCategoryPage() {
  const { workspaceSlug, category } = useParams<{ workspaceSlug: string; category: string }>();
  const navigate = useNavigate();

  const { data: workspace } = useQuery({
    queryKey: ["c2c-public-workspace", workspaceSlug],
    queryFn: async () => {
      if (!workspaceSlug) return null;
      // Try c2c_marketplace_config first
      const { data: mpConfig } = await (supabase as any)
        .from("c2c_marketplace_config")
        .select("workspace_id, name, slug")
        .eq("slug", workspaceSlug)
        .eq("status", "active")
        .maybeSingle();
      if (mpConfig) return { id: mpConfig.workspace_id, name: mpConfig.name, slug: mpConfig.slug };
      const { data, error } = await supabase.from("workspaces").select("id, name, slug").eq("slug", workspaceSlug).single();
      if (error) throw error;
      return data;
    },
    enabled: !!workspaceSlug,
  });

  const { data: categoryData } = useQuery({
    queryKey: ["c2c-category", workspace?.id, category],
    queryFn: async () => {
      if (!workspace?.id || !category) return null;
      const { data } = await (supabase as any).from("c2c_categories").select("*").eq("workspace_id", workspace.id).eq("slug", category).maybeSingle();
      return data;
    },
    enabled: !!workspace?.id && !!category,
  });

  const { data: listings = [], isLoading } = useQuery({
    queryKey: ["c2c-category-listings", workspace?.id, categoryData?.id],
    queryFn: async () => {
      if (!workspace?.id || !categoryData?.id) return [];
      const { data, error } = await supabase
        .from("c2c_listings")
        .select("*")
        .eq("workspace_id", workspace.id)
        .eq("category_id", categoryData.id)
        .eq("status", "active")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []) as unknown as C2CListing[];
    },
    enabled: !!workspace?.id && !!categoryData?.id,
  });

  return (
    <>
      <Helmet>
        <title>{categoryData?.name || category} — Marketplace</title>
      </Helmet>
      <div className="light min-h-screen bg-white text-zinc-900" style={{ colorScheme: 'light' }}>
        <header className="sticky top-0 z-30 bg-white/90 backdrop-blur-md border-b border-zinc-200">
          <div className="max-w-6xl mx-auto px-4 py-3 flex items-center gap-3">
            <Button variant="ghost" size="icon" className="text-zinc-500" onClick={() => navigate(`/marketplace/${workspaceSlug}`)}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-lg font-semibold text-zinc-900">{categoryData?.name || category}</h1>
            <span className="text-xs text-zinc-500">{listings.length} anúncios</span>
          </div>
        </header>

        <main className="max-w-6xl mx-auto px-4 py-6">
          {isLoading ? (
            <p className="text-zinc-400">A carregar...</p>
          ) : listings.length === 0 ? (
            <div className="text-center py-16 text-zinc-500">
              <p>Sem anúncios nesta categoria</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {listings.map((listing) => (
                <ListingCard
                  key={listing.id}
                  listing={listing}
                  onClick={() => navigate(`/marketplace/${workspaceSlug}/listing/${listing.id}`)}
                />
              ))}
            </div>
          )}
        </main>
      </div>
    </>
  );
}
