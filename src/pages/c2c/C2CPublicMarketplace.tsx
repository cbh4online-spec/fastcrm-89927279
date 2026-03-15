import { useState, useRef, useMemo, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Helmet } from "react-helmet-async";
import { supabase } from "@/integrations/supabase/client";
import { usePublicStoreSettings } from "@/hooks/useStoreSettings";
import { usePublicMarketplaceWorkspace } from "@/hooks/c2c/usePublicMarketplaceWorkspace";
import { getPublicBaseUrl } from "@/utils/getPublicDomain";
import { getShareUrl } from "@/utils/getShareUrl";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ListingCard } from "@/components/c2c/ListingCard";
import { MarketplaceSearchOverlay } from "@/components/c2c/MarketplaceSearchOverlay";
import { useC2CSponsoredListings } from "@/hooks/useC2CBoost";
import type { C2CListing, C2CCategory, C2CListingFilters } from "@/hooks/useC2CListings";
import {
  Store, Search, Sparkles, TrendingUp, Clock, ChevronRight, ChevronLeft,
  ShieldCheck, Truck, Award, MessageCircle, Plus, Users, ArrowRight,
  DollarSign, Eye, Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ShareButtons } from "@/components/c2c/ShareButtons";

/* ── Public listings ─────────────────────────────────────────────── */
function usePublicListings(workspaceId: string | undefined, filters?: C2CListingFilters) {
  return useQuery({
    queryKey: ["c2c-public-listings", workspaceId, filters],
    queryFn: async () => {
      if (!workspaceId) return [];
      let query = supabase
        .from("c2c_listings")
        .select("*")
        .eq("workspace_id", workspaceId)
        .eq("status", "active")
        .eq("moderation_status", "approved");

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

function usePublicCategories(workspaceId: string | undefined) {
  return useQuery({
    queryKey: ["c2c-public-categories", workspaceId],
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

/* ── Category carousel (reusable) ────────────────────────────────── */
function CategoryCarousel({ categories, onSelect, selected }: {
  categories: C2CCategory[];
  onSelect: (id: string | undefined) => void;
  selected?: string;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const scroll = (dir: "left" | "right") => {
    scrollRef.current?.scrollBy({ left: dir === "left" ? -300 : 300, behavior: "smooth" });
  };
  if (categories.length === 0) return null;
  return (
    <div className="relative">
      <Button variant="ghost" size="icon" className="absolute -left-3 top-1/2 -translate-y-1/2 z-10 h-8 w-8 rounded-full bg-card shadow-md border hidden md:flex" onClick={() => scroll("left")}>
        <ChevronLeft className="h-4 w-4" />
      </Button>
      <div ref={scrollRef} className="flex gap-3 overflow-x-auto scrollbar-hide snap-x py-2 px-1">
        {categories.map((cat) => (
          <button
            key={cat.id}
            onClick={() => onSelect(selected === cat.id ? undefined : cat.id)}
            className={cn(
              "flex flex-col items-center gap-2 px-4 py-3 rounded-xl border transition-all shrink-0 snap-start min-w-[100px] hover:shadow-md",
              selected === cat.id ? "bg-primary/10 border-primary shadow-sm" : "bg-card border-border hover:border-primary/30"
            )}
          >
            {cat.image_url ? (
              <img src={cat.image_url} alt={cat.name} className="w-12 h-12 object-contain rounded-lg" />
            ) : (
              <span className="text-2xl">{cat.icon || "📦"}</span>
            )}
            <span className="text-xs font-medium text-center leading-tight">{cat.name}</span>
          </button>
        ))}
      </div>
      <Button variant="ghost" size="icon" className="absolute -right-3 top-1/2 -translate-y-1/2 z-10 h-8 w-8 rounded-full bg-card shadow-md border hidden md:flex" onClick={() => scroll("right")}>
        <ChevronRight className="h-4 w-4" />
      </Button>
    </div>
  );
}

/* ── Section Carousel ────────────────────────────────────────────── */
function SectionCarousel({ title, icon, listings, onNavigate, seeMoreHref, sponsoredIds = [] }: {
  title: string;
  icon: React.ReactNode;
  listings: C2CListing[];
  onNavigate: (id: string) => void;
  seeMoreHref?: () => void;
  sponsoredIds?: string[];
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const scroll = (dir: "left" | "right") => {
    scrollRef.current?.scrollBy({ left: dir === "left" ? -300 : 300, behavior: "smooth" });
  };
  if (listings.length === 0) return null;
  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold flex items-center gap-2">{icon}{title}</h2>
        {seeMoreHref && (
          <Button variant="ghost" size="sm" className="gap-1 text-primary" onClick={seeMoreHref}>
            ver mais <ChevronRight className="h-4 w-4" />
          </Button>
        )}
      </div>
      <div className="relative">
        <Button variant="ghost" size="icon" className="absolute -left-3 top-1/2 -translate-y-1/2 z-10 h-8 w-8 rounded-full bg-card shadow-md border hidden md:flex" onClick={() => scroll("left")}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <div ref={scrollRef} className="flex gap-4 overflow-x-auto scrollbar-hide snap-x pb-2">
          {listings.map((listing) => (
            <ListingCard
              key={listing.id}
              listing={listing}
              variant="carousel"
              isFavorite={false}
              onToggleFavorite={() => {}}
              onClick={() => onNavigate(listing.id)}
              isSponsored={sponsoredIds.includes(listing.id)}
            />
          ))}
        </div>
        <Button variant="ghost" size="icon" className="absolute -right-3 top-1/2 -translate-y-1/2 z-10 h-8 w-8 rounded-full bg-card shadow-md border hidden md:flex" onClick={() => scroll("right")}>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </section>
  );
}

/* ── Hero Section ────────────────────────────────────────────────── */
function HeroSection({ onExplore, onSell }: { onExplore: () => void; onSell: () => void }) {
  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-zinc-900 via-zinc-900 to-zinc-800">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(245,158,11,0.15),transparent_50%)]" />
      <div className="container mx-auto px-4 py-16 md:py-24 relative z-10">
        <div className="grid md:grid-cols-2 gap-10 items-center">
           <div className="space-y-6">
            <Badge className="bg-amber-500/20 text-amber-400 hover:bg-amber-500/30 border-amber-500/30 text-xs">
              <Sparkles className="h-3 w-3 mr-1" /> Marketplace C2C
            </Badge>
            <h1 className="text-3xl md:text-5xl font-extrabold leading-tight tracking-tight text-white">
              Compra e vende entre<br />
              <span className="text-amber-400">utilizadores reais</span>
            </h1>
            <p className="text-lg text-zinc-400 max-w-md">
              O teu marketplace de confiança. Publica os teus produtos, 
              encontra oportunidades e negoceia diretamente.
            </p>
            <div className="flex flex-wrap gap-3">
              <Button size="lg" className="gap-2 rounded-full font-semibold bg-amber-500 hover:bg-amber-600 text-zinc-900 border-0" onClick={onExplore}>
                <Search className="h-4 w-4" />
                Explorar Produtos
              </Button>
              <Button size="lg" variant="outline" className="gap-2 rounded-full font-semibold border-zinc-600 text-zinc-200 hover:bg-zinc-800 hover:text-white" onClick={onSell}>
                <Plus className="h-4 w-4" />
                Começar a Vender
              </Button>
            </div>
          </div>

          <div className="hidden md:grid grid-cols-2 gap-4">
            {[
              { icon: ShieldCheck, label: "Compra Segura", desc: "Transações protegidas" },
              { icon: Users, label: "Comunidade Ativa", desc: "Milhares de utilizadores" },
              { icon: DollarSign, label: "Sem Taxas p/ Comprador", desc: "Compra sem comissões" },
              { icon: Zap, label: "Publicação Rápida", desc: "Anuncia em 2 minutos" },
            ].map(({ icon: Icon, label, desc }) => (
              <div key={label} className="bg-zinc-800/80 backdrop-blur-sm rounded-xl p-4 border border-zinc-700/50 hover:border-amber-500/30 hover:bg-zinc-800 transition-colors">
                <Icon className="h-6 w-6 mb-2 text-amber-400" />
                <h3 className="font-semibold text-sm text-white">{label}</h3>
                <p className="text-xs text-zinc-400">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

/* ── How it works section ────────────────────────────────────────── */
function HowItWorks() {
  const steps = [
    { icon: Eye, title: "Descobre", desc: "Explora milhares de produtos publicados por outros utilizadores." },
    { icon: MessageCircle, title: "Negoceia", desc: "Fala diretamente com o vendedor via chat integrado." },
    { icon: ShieldCheck, title: "Compra Seguro", desc: "Pagamento protegido pela plataforma com garantia." },
  ];
  return (
    <section className="py-12 bg-zinc-900 border-t border-zinc-800">
      <div className="container mx-auto px-4">
        <h2 className="text-2xl font-bold text-center mb-8 text-white">Como funciona</h2>
        <div className="grid md:grid-cols-3 gap-8">
          {steps.map((step) => (
            <div key={step.title} className="text-center space-y-3">
              <div className="mx-auto w-14 h-14 rounded-2xl bg-amber-500/10 flex items-center justify-center">
                <step.icon className="h-7 w-7 text-amber-400" />
              </div>
              <h3 className="font-semibold text-lg text-white">{step.title}</h3>
              <p className="text-sm text-zinc-400 max-w-xs mx-auto">{step.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ── Sell CTA Section ────────────────────────────────────────────── */
function SellCTA({ onSell }: { onSell: () => void }) {
  return (
    <section className="py-12">
      <div className="container mx-auto px-4">
        <div className="bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent rounded-2xl p-8 md:p-12 border border-amber-500/20">
          <div className="grid md:grid-cols-2 gap-8 items-center">
            <div className="space-y-4">
              <h2 className="text-2xl md:text-3xl font-bold text-white">Tem algo para vender?</h2>
              <p className="text-zinc-400">
                Publica o teu anúncio gratuitamente e chega a milhares de compradores. 
                A plataforma cobra apenas 5% sobre cada venda concluída.
              </p>
              <div className="flex flex-wrap gap-6 text-sm text-zinc-300">
                <div className="flex items-center gap-2">
                  <Zap className="h-4 w-4 text-amber-400" />
                  <span>Publicação em 2 min</span>
                </div>
                <div className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-amber-400" />
                  <span>Apenas 5% de comissão</span>
                </div>
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-amber-400" />
                  <span>Destaque disponível</span>
                </div>
              </div>
              <Button size="lg" className="gap-2 rounded-full bg-amber-500 hover:bg-amber-600 text-zinc-900 border-0" onClick={onSell}>
                <Plus className="h-4 w-4" />
                Começar a Vender
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
            <div className="hidden md:flex justify-center">
              <div className="bg-zinc-800 rounded-2xl shadow-xl border border-zinc-700 p-6 space-y-4 w-72">
                <div className="h-32 bg-zinc-700 rounded-lg flex items-center justify-center">
                  <Store className="h-12 w-12 text-zinc-500" />
                </div>
                <div className="space-y-2">
                  <div className="h-4 bg-zinc-700 rounded w-3/4" />
                  <div className="h-3 bg-zinc-700 rounded w-1/2" />
                  <div className="h-5 bg-amber-500/20 rounded w-20 mt-2" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ── Main Page ───────────────────────────────────────────────────── */
export default function C2CPublicMarketplace() {
  const { workspaceSlug } = useParams<{ workspaceSlug: string }>();
  const navigate = useNavigate();
  const [filters, setFilters] = useState<C2CListingFilters>({});
  const [searchOpen, setSearchOpen] = useState(false);
  const [showListings, setShowListings] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [visibleCount, setVisibleCount] = useState(20);

  // No longer force light theme — marketplace uses its own dark styling

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setIsAuthenticated(!!session?.user);
    });
  }, []);

  const { data: workspace, isLoading: wsLoading } = usePublicMarketplaceWorkspace(workspaceSlug);
  const workspaceId = workspace?.id;
  const { data: storeSettings } = usePublicStoreSettings(workspaceId || "");
  const { data: listings = [], isLoading } = usePublicListings(workspaceId, filters);
  const { data: categories = [] } = usePublicCategories(workspaceId);
  const { data: sponsoredIds = [] } = useC2CSponsoredListings(workspaceId);

  const ogTitle = storeSettings?.store_name ? `${storeSettings.store_name} — Marketplace C2C` : `${workspace?.name || "Marketplace"} — C2C`;
  const ogDescription = storeSettings?.store_description || `Explora o marketplace de ${workspace?.name || ""}. Compra e vende entre utilizadores reais.`;
  const ogImage = storeSettings?.logo_url || `${getPublicBaseUrl()}/og-image.png`;
  const ogUrl = `${getPublicBaseUrl()}/marketplace/${workspaceSlug}`;
  const shareUrl = getShareUrl("store", workspaceSlug || "");

  const featuredListings = useMemo(() => listings.filter((l) => l.is_featured), [listings]);
  const recentListings = useMemo(() =>
    [...listings].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).slice(0, 12),
    [listings]
  );

  const hasActiveFilters = filters.search || filters.category || filters.condition || filters.minPrice || filters.maxPrice;
  const showBrowse = showListings || hasActiveFilters;

  const handleSell = () => {
    navigate(`/marketplace/${workspaceSlug}/sell`);
  };

  const handleExplore = () => {
    setShowListings(true);
    window.scrollTo({ top: 500, behavior: "smooth" });
  };

  if (wsLoading) {
    return (
      <div className="light min-h-screen bg-white flex items-center justify-center" style={{ colorScheme: 'light' }}>
        <div className="animate-pulse text-center space-y-4">
          <Store className="h-12 w-12 mx-auto text-amber-500/30" />
          <p className="text-zinc-500">A carregar marketplace...</p>
        </div>
      </div>
    );
  }

  if (!workspace) {
    return (
      <div className="light min-h-screen bg-white flex items-center justify-center" style={{ colorScheme: 'light' }}>
        <div className="text-center space-y-4">
          <Store className="h-12 w-12 mx-auto text-zinc-300" />
          <h2 className="text-xl font-semibold text-zinc-800">Marketplace não encontrado</h2>
          <p className="text-zinc-500">O endereço que procuras não existe.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="light min-h-screen bg-white text-zinc-900" style={{ colorScheme: 'light' }}>
      <Helmet>
        <title>{ogTitle}</title>
        <meta property="og:title" content={ogTitle} />
        <meta property="og:description" content={ogDescription} />
        <meta property="og:image" content={ogImage} />
        <meta property="og:url" content={ogUrl} />
        <meta property="og:type" content="website" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={ogTitle} />
        <meta name="twitter:description" content={ogDescription} />
        <meta name="twitter:image" content={ogImage} />
      </Helmet>
      {/* Top bar */}
      <header className="sticky top-0 z-40 bg-card/95 backdrop-blur-md border-b shadow-sm">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 shrink-0">
              <div className="p-1.5 rounded-lg bg-primary/10">
                <Store className="w-5 h-5 text-primary" />
              </div>
              <h1 className="text-lg font-bold leading-tight">{workspace.name}</h1>
            </div>

            <div className="flex-1 max-w-xl mx-auto">
              <button
                type="button"
                onClick={() => setSearchOpen(true)}
                className="w-full h-10 pl-10 pr-4 rounded-full border bg-muted/30 text-sm text-left text-muted-foreground hover:bg-muted/50 focus:outline-none focus:ring-2 focus:ring-primary/30 transition-colors relative"
              >
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                {filters.search || "Pesquisar produtos, marcas, categorias..."}
              </button>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <ShareButtons url={shareUrl} title={ogTitle} />
              <Button variant="outline" size="sm" className="rounded-full hidden sm:flex" onClick={() => navigate(isAuthenticated ? `/dashboard/c2c/seller-area?ws=${workspaceSlug}` : `/login?redirect=/marketplace/${workspaceSlug}`)}>
                {isAuthenticated ? 'Gerir' : 'Entrar'}
              </Button>
              <Button size="sm" className="gap-1 rounded-full" onClick={handleSell}>
                <Plus className="h-4 w-4" />
                <span className="hidden sm:inline">Vender</span>
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Hero — only on initial load without filters */}
      {!showBrowse && (
        <>
          <HeroSection onExplore={handleExplore} onSell={handleSell} />
          <HowItWorks />
        </>
      )}

      {/* Listings content */}
      <main className="container mx-auto px-4 py-6 space-y-8">
        {/* Category Carousel */}
        <div>
          <CategoryCarousel
            categories={categories}
            onSelect={(id) => {
              setFilters((f) => ({ ...f, category: id }));
              setShowListings(true);
            }}
            selected={filters.category}
          />
        </div>

        {hasActiveFilters ? (
          <div className="space-y-6">
            {isLoading ? (
              <div className="grid gap-4 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                {Array.from({ length: 10 }).map((_, i) => (
                  <Skeleton key={i} className="aspect-[3/4] rounded-xl" />
                ))}
              </div>
            ) : listings.length > 0 ? (
              <>
                <p className="text-sm text-muted-foreground">
                  {listings.length} resultado{listings.length !== 1 ? "s" : ""}
                </p>
                <div className="grid gap-4 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                  {listings.map((listing) => (
                    <ListingCard
                      key={listing.id}
                      listing={listing}
                      isFavorite={false}
                      onToggleFavorite={() => {}}
                      onClick={() => navigate(`/marketplace/${workspaceSlug}/${listing.id}`)}
                      isSponsored={sponsoredIds.includes(listing.id)}
                    />
                  ))}
                </div>
              </>
            ) : (
              <div className="text-center py-16">
                <Search className="w-12 h-12 mx-auto text-muted-foreground/30 mb-4" />
                <h3 className="text-lg font-medium mb-2">Nenhum resultado encontrado</h3>
                <p className="text-muted-foreground mb-4">Tente ajustar os filtros</p>
                <Button variant="outline" onClick={() => setFilters({})}>Limpar filtros</Button>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-10">
            {featuredListings.length > 0 && (
              <SectionCarousel
                title="Destaques"
                icon={<Sparkles className="h-5 w-5 text-primary" />}
                listings={featuredListings}
                onNavigate={(id) => navigate(`/marketplace/${workspaceSlug}/${id}`)}
                sponsoredIds={sponsoredIds}
              />
            )}

            {/* Full catalog grid */}
            {listings.length > 0 && (
              <section className="space-y-4">
                <h2 className="text-lg font-bold flex items-center gap-2">
                  <Store className="h-5 w-5 text-primary" />
                  Todos os anúncios
                  <Badge variant="secondary" className="text-xs">{listings.length}</Badge>
                </h2>
                <div className="grid gap-4 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                  {listings.slice(0, visibleCount).map((listing) => (
                    <ListingCard
                      key={listing.id}
                      listing={listing}
                      isFavorite={false}
                      onToggleFavorite={() => {}}
                      onClick={() => navigate(`/marketplace/${workspaceSlug}/${listing.id}`)}
                      isSponsored={sponsoredIds.includes(listing.id)}
                    />
                  ))}
                </div>
                {visibleCount < listings.length && (
                  <div className="text-center pt-4">
                    <Button variant="outline" size="lg" className="rounded-full gap-2" onClick={() => setVisibleCount((c) => c + 20)}>
                      Carregar mais ({listings.length - visibleCount} restantes)
                    </Button>
                  </div>
                )}
              </section>
            )}
          </div>
        )}

        {/* Sell CTA at the bottom */}
        {!hasActiveFilters && <SellCTA onSell={handleSell} />}

        {/* Trust section */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-8 border-t">
          {[
            { icon: ShieldCheck, label: "Compra Segura", desc: "Transações protegidas" },
            { icon: Truck, label: "Envio Nacional", desc: "Para todo o país" },
            { icon: Award, label: "Vendedores Verificados", desc: "Perfis certificados" },
            { icon: MessageCircle, label: "Chat Direto", desc: "Fale com o vendedor" },
          ].map(({ icon: Icon, label, desc }) => (
            <div key={label} className="flex flex-col items-center text-center gap-2 p-4">
              <Icon className="h-8 w-8 text-primary" />
              <span className="text-sm font-medium">{label}</span>
              <span className="text-[11px] text-muted-foreground">{desc}</span>
            </div>
          ))}
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t bg-muted/20 py-8">
        <div className="container mx-auto px-4 text-center space-y-2">
          <p className="text-sm text-muted-foreground">
            © {new Date().getFullYear()} {workspace.name} Marketplace. Todos os direitos reservados.
          </p>
          <p className="text-xs text-muted-foreground/60">
            Comissão de 5% sobre vendas concluídas · Pagamentos protegidos
          </p>
        </div>
      </footer>

      {/* Search overlay */}
      <MarketplaceSearchOverlay
        open={searchOpen}
        onClose={() => setSearchOpen(false)}
        onSearch={(q) => {
          setFilters((f) => ({ ...f, search: q }));
          setShowListings(true);
        }}
        initialQuery={filters.search || ""}
        workspaceId={workspaceId}
      />
    </div>
  );
}
