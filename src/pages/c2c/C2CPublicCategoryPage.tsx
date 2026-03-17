import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Helmet } from "react-helmet-async";
import { supabase } from "@/integrations/supabase/client";
import { usePublicMarketplaceWorkspace } from "@/hooks/c2c/usePublicMarketplaceWorkspace";
import { usePublicMarketplaceTheme } from "@/hooks/c2c/usePublicMarketplaceTheme";
import { ListingCard } from "@/components/c2c/ListingCard";
import { MarketplaceFooter } from "@/components/c2c/MarketplaceFooter";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import type { C2CListing } from "@/hooks/useC2CListings";

export default function C2CPublicCategoryPage() {
  const { workspaceSlug, category } = useParams<{ workspaceSlug: string; category: string }>();
  const navigate = useNavigate();
  usePublicMarketplaceTheme();

  const { data: workspace, isLoading: workspaceLoading } = usePublicMarketplaceWorkspace(workspaceSlug);

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
        .eq("moderation_status", "approved")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []) as unknown as C2CListing[];
    },
    enabled: !!workspace?.id && !!categoryData?.id,
  });

  const pageLoading = workspaceLoading || isLoading;

  return (
    <>
      <Helmet>
        <title>{categoryData?.name || category} — Marketplace</title>
      </Helmet>
      <div className="min-h-screen bg-zinc-950 text-zinc-100">
        <header className="sticky top-0 z-30 bg-zinc-900/95 backdrop-blur-md border-b border-zinc-800">
          <div className="max-w-6xl mx-auto px-4 py-3 flex flex-wrap items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              className="text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800"
              onClick={() => navigate(`/marketplace/${workspaceSlug}`)}
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-lg font-semibold text-zinc-100">{categoryData?.name || category}</h1>
            <span className="text-xs text-zinc-500">{listings.length} anúncios</span>
          </div>
        </header>

        <main className="max-w-6xl mx-auto px-4 py-6">
          {pageLoading ? (
            <p className="text-zinc-500">A carregar...</p>
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
        <MarketplaceFooter workspaceName={workspace?.name || ""} workspaceSlug={workspaceSlug || ""} />
      </div>
    </>
  );
}
