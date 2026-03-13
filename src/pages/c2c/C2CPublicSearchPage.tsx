import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Helmet } from "react-helmet-async";
import { supabase } from "@/integrations/supabase/client";
import { ListingCard } from "@/components/c2c/ListingCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Search, SlidersHorizontal } from "lucide-react";
import { useState } from "react";
import type { C2CListing } from "@/hooks/useC2CListings";

export default function C2CPublicSearchPage() {
  const { workspaceSlug } = useParams<{ workspaceSlug: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const q = searchParams.get("q") || "";
  const [search, setSearch] = useState(q);

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

  const { data: listings = [], isLoading } = useQuery({
    queryKey: ["c2c-search-listings", workspace?.id, q],
    queryFn: async () => {
      if (!workspace?.id || !q) return [];
      const { data, error } = await supabase
        .from("c2c_listings")
        .select("*")
        .eq("workspace_id", workspace.id)
        .eq("status", "active")
        .or(`title.ilike.%${q}%,description.ilike.%${q}%`)
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return (data || []) as unknown as C2CListing[];
    },
    enabled: !!workspace?.id && !!q,
  });

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (search.trim()) {
      setSearchParams({ q: search.trim() });
    }
  };

  return (
    <>
      <Helmet>
        <title>{q ? `"${q}" — Pesquisa` : "Pesquisa"} — Marketplace</title>
      </Helmet>
      <div className="light min-h-screen bg-white text-zinc-900" style={{ colorScheme: 'light' }}>
        <header className="sticky top-0 z-30 bg-white/90 backdrop-blur-md border-b border-zinc-200">
          <div className="max-w-6xl mx-auto px-4 py-3 flex items-center gap-3">
            <Button variant="ghost" size="icon" className="text-zinc-500" onClick={() => navigate(`/marketplace/${workspaceSlug}`)}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <form onSubmit={handleSearch} className="flex-1 flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Pesquisar anúncios..."
                  className="pl-9 bg-zinc-50 border-zinc-200 text-zinc-900"
                />
              </div>
              <Button type="submit" size="sm" className="bg-amber-500 text-white hover:bg-amber-600">
                Pesquisar
              </Button>
            </form>
          </div>
        </header>

        <main className="max-w-6xl mx-auto px-4 py-6">
          {!q ? (
            <div className="text-center py-16 text-zinc-500">
              <Search className="h-12 w-12 mx-auto mb-4 opacity-30" />
              <p>Pesquisa por artigos no marketplace</p>
            </div>
          ) : isLoading ? (
            <p className="text-zinc-400">A pesquisar "{q}"...</p>
          ) : listings.length === 0 ? (
            <div className="text-center py-16 text-zinc-500">
              <p>Sem resultados para "{q}"</p>
            </div>
          ) : (
            <>
              <p className="text-sm text-zinc-500 mb-4">{listings.length} resultado(s) para "{q}"</p>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {listings.map((listing) => (
                  <ListingCard
                    key={listing.id}
                    listing={listing}
                    onClick={() => navigate(`/marketplace/${workspaceSlug}/listing/${listing.id}`)}
                  />
                ))}
              </div>
            </>
          )}
        </main>
      </div>
    </>
  );
}
