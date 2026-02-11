import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ListingCard } from "@/components/c2c/ListingCard";
import { ListingFilters } from "@/components/c2c/ListingFilters";
import { MarketplaceSearchOverlay } from "@/components/c2c/MarketplaceSearchOverlay";
import { useC2CListings, useC2CCategories, useC2CFavorites, useToggleC2CFavorite, type C2CListingFilters } from "@/hooks/useC2CListings";
import { useUnreadCount } from "@/hooks/useC2CNotifications";
import { useAuth } from "@/contexts/AuthContext";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import {
  Plus, Store, ArrowLeft, MessageCircle, User, Heart, ChevronRight, ChevronLeft,
  ShieldCheck, Truck, Award, Search, Sparkles, TrendingUp, Clock, Bell,
} from "lucide-react";
import { cn } from "@/lib/utils";

function CategoryCarousel({ categories, onSelect, selected }: {
  categories: { id: string; name: string; icon: string | null; slug: string }[];
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
      <Button
        variant="ghost"
        size="icon"
        className="absolute -left-3 top-1/2 -translate-y-1/2 z-10 h-8 w-8 rounded-full bg-card shadow-md border hidden md:flex"
        onClick={() => scroll("left")}
      >
        <ChevronLeft className="h-4 w-4" />
      </Button>
      <div ref={scrollRef} className="flex gap-3 overflow-x-auto scrollbar-hide snap-x py-2 px-1">
        {categories.map((cat) => (
          <button
            key={cat.id}
            onClick={() => onSelect(selected === cat.id ? undefined : cat.id)}
            className={cn(
              "flex flex-col items-center gap-2 px-4 py-3 rounded-xl border transition-all shrink-0 snap-start min-w-[100px] hover:shadow-md",
              selected === cat.id
                ? "bg-primary/10 border-primary shadow-sm"
                : "bg-card border-border hover:border-primary/30"
            )}
          >
            <span className="text-2xl">{cat.icon || "📦"}</span>
            <span className="text-xs font-medium text-center leading-tight">{cat.name}</span>
          </button>
        ))}
      </div>
      <Button
        variant="ghost"
        size="icon"
        className="absolute -right-3 top-1/2 -translate-y-1/2 z-10 h-8 w-8 rounded-full bg-card shadow-md border hidden md:flex"
        onClick={() => scroll("right")}
      >
        <ChevronRight className="h-4 w-4" />
      </Button>
    </div>
  );
}

function SectionCarousel({ title, icon, listings, favoriteIds, onToggleFavorite, onNavigate, seeMoreHref }: {
  title: string;
  icon: React.ReactNode;
  listings: any[];
  favoriteIds: string[];
  onToggleFavorite: any;
  onNavigate: (id: string) => void;
  seeMoreHref?: () => void;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const scroll = (dir: "left" | "right") => {
    scrollRef.current?.scrollBy({ left: dir === "left" ? -300 : 300, behavior: "smooth" });
  };

  if (listings.length === 0) return null;

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold flex items-center gap-2">
          {icon}
          {title}
        </h2>
        {seeMoreHref && (
          <Button variant="ghost" size="sm" className="gap-1 text-primary" onClick={seeMoreHref}>
            ver mais <ChevronRight className="h-4 w-4" />
          </Button>
        )}
      </div>
      <div className="relative">
        <Button
          variant="ghost"
          size="icon"
          className="absolute -left-3 top-1/2 -translate-y-1/2 z-10 h-8 w-8 rounded-full bg-card shadow-md border hidden md:flex"
          onClick={() => scroll("left")}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <div ref={scrollRef} className="flex gap-4 overflow-x-auto scrollbar-hide snap-x pb-2">
          {listings.map((listing) => (
            <ListingCard
              key={listing.id}
              listing={listing}
              variant="carousel"
              isFavorite={favoriteIds.includes(listing.id)}
              onToggleFavorite={() => onToggleFavorite.mutate(listing.id)}
              onClick={() => onNavigate(listing.id)}
            />
          ))}
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="absolute -right-3 top-1/2 -translate-y-1/2 z-10 h-8 w-8 rounded-full bg-card shadow-md border hidden md:flex"
          onClick={() => scroll("right")}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </section>
  );
}

export default function C2CMarketplace() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { currentWorkspace } = useWorkspace();
  const workspaceId = currentWorkspace?.id;

  const [filters, setFilters] = useState<C2CListingFilters>({});
  const [searchOpen, setSearchOpen] = useState(false);
  const { data: listings = [], isLoading } = useC2CListings(workspaceId, filters);
  const { data: categories = [] } = useC2CCategories(workspaceId);
  const { data: favoriteIds = [] } = useC2CFavorites(workspaceId);
  const toggleFavorite = useToggleC2CFavorite(workspaceId);
  const { data: unreadCount = 0 } = useUnreadCount(workspaceId);

  // Group listings by category for section carousels
  const featuredListings = listings.filter((l) => l.is_featured);
  const recentListings = [...listings].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).slice(0, 12);

  const listingsByCategory = categories.reduce<Record<string, typeof listings>>((acc, cat) => {
    acc[cat.id] = listings.filter((l) => l.category_id === cat.id).slice(0, 10);
    return acc;
  }, {});

  const hasActiveFilters = filters.search || filters.category || filters.condition || filters.minPrice || filters.maxPrice;

  return (
    <div className="min-h-screen bg-background">
      {/* Promo Banner */}
      <div className="bg-gradient-to-r from-primary to-primary/80 text-primary-foreground">
        <div className="container mx-auto px-4 py-2 flex items-center justify-center gap-2 text-sm">
          <Sparkles className="h-4 w-4" />
          <span>Compra e vende de forma segura entre utilizadores!</span>
          <Badge variant="secondary" className="bg-white/20 text-primary-foreground hover:bg-white/30 text-[10px]">
            Novo
          </Badge>
        </div>
      </div>

      {/* Header */}
      <header className="sticky top-0 z-40 bg-card/95 backdrop-blur-md border-b shadow-sm">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate("/dashboard")}
              className="shrink-0"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>

            <div className="flex items-center gap-2 shrink-0">
              <div className="p-1.5 rounded-lg bg-primary/10">
                <Store className="w-5 h-5 text-primary" />
              </div>
              <div className="hidden sm:block">
                <h1 className="text-lg font-bold leading-tight">Marketplace</h1>
              </div>
            </div>

            {/* Search trigger (Vinted-style: opens fullscreen overlay) */}
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

            {/* Action buttons */}
            <div className="flex items-center gap-1.5 shrink-0">
              {user && (
                <>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="relative"
                    onClick={() => navigate("/dashboard/c2c/favorites")}
                  >
                    <Heart className="h-5 w-5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => navigate("/dashboard/c2c/messages")}
                  >
                    <MessageCircle className="h-5 w-5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="relative"
                    onClick={() => navigate("/dashboard/c2c/notifications")}
                  >
                    <Bell className="h-5 w-5" />
                    {unreadCount > 0 && (
                      <span className="absolute -top-0.5 -right-0.5 h-4 w-4 rounded-full bg-destructive text-destructive-foreground text-[10px] flex items-center justify-center">
                        {unreadCount > 9 ? "9+" : unreadCount}
                      </span>
                    )}
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => navigate("/dashboard/c2c/my-listings")}
                  >
                    <User className="h-5 w-5" />
                  </Button>
                  <Button
                    size="sm"
                    className="gap-1 rounded-full hidden sm:flex"
                    onClick={() => navigate("/dashboard/c2c/create")}
                  >
                    <Plus className="h-4 w-4" />
                    Vender
                  </Button>
                  <Button
                    size="icon"
                    className="sm:hidden rounded-full"
                    onClick={() => navigate("/dashboard/c2c/create")}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 space-y-8">
        {/* Category Carousel (KuantoKusta style) */}
        {!hasActiveFilters && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
            <CategoryCarousel
              categories={categories}
              onSelect={(id) => setFilters((f) => ({ ...f, category: id }))}
              selected={filters.category}
            />
          </motion.div>
        )}

        {/* If filtering: show filter bar + grid */}
        {hasActiveFilters ? (
          <div className="space-y-6">
            <ListingFilters
              filters={filters}
              onFiltersChange={setFilters}
              categories={categories}
            />

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
                      isFavorite={favoriteIds.includes(listing.id)}
                      onToggleFavorite={() => toggleFavorite.mutate(listing.id)}
                      onClick={() => navigate(`/dashboard/c2c/${listing.id}`)}
                    />
                  ))}
                </div>
              </>
            ) : (
              <div className="text-center py-16">
                <Search className="w-12 h-12 mx-auto text-muted-foreground/30 mb-4" />
                <h3 className="text-lg font-medium mb-2">Nenhum resultado encontrado</h3>
                <p className="text-muted-foreground mb-4">Tente ajustar os filtros</p>
                <Button variant="outline" onClick={() => setFilters({})}>
                  Limpar filtros
                </Button>
              </div>
            )}
          </div>
        ) : (
          /* Homepage sections (KuantoKusta-style) */
          <div className="space-y-10">
            {/* Featured / Destaques */}
            {featuredListings.length > 0 && (
              <SectionCarousel
                title="Destaques"
                icon={<Sparkles className="h-5 w-5 text-primary" />}
                listings={featuredListings}
                favoriteIds={favoriteIds}
                onToggleFavorite={toggleFavorite}
                onNavigate={(id) => navigate(`/dashboard/c2c/${id}`)}
              />
            )}

            {/* Mais Recentes */}
            {recentListings.length > 0 && (
              <SectionCarousel
                title="Mais Recentes"
                icon={<Clock className="h-5 w-5 text-primary" />}
                listings={recentListings}
                favoriteIds={favoriteIds}
                onToggleFavorite={toggleFavorite}
                onNavigate={(id) => navigate(`/dashboard/c2c/${id}`)}
              />
            )}

            {/* Category sections */}
            {categories.map((cat) => {
              const catListings = listingsByCategory[cat.id] || [];
              if (catListings.length === 0) return null;
              return (
                <SectionCarousel
                  key={cat.id}
                  title={cat.name}
                  icon={<span className="text-lg">{cat.icon || "📦"}</span>}
                  listings={catListings}
                  favoriteIds={favoriteIds}
                  onToggleFavorite={toggleFavorite}
                  onNavigate={(id) => navigate(`/dashboard/c2c/${id}`)}
                  seeMoreHref={() => setFilters({ category: cat.id })}
                />
              );
            })}

            {/* Empty state */}
            {listings.length === 0 && !isLoading && (
              <div className="text-center py-20">
                <Store className="w-16 h-16 mx-auto text-muted-foreground/20 mb-6" />
                <h3 className="text-xl font-semibold mb-2">O marketplace está vazio</h3>
                <p className="text-muted-foreground mb-6">Sê o primeiro a publicar um anúncio!</p>
                {user && (
                  <Button size="lg" className="gap-2 rounded-full" onClick={() => navigate("/dashboard/c2c/create")}>
                    <Plus className="h-5 w-5" />
                    Criar Anúncio
                  </Button>
                )}
              </div>
            )}

            {isLoading && (
              <div className="grid gap-4 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                {Array.from({ length: 10 }).map((_, i) => (
                  <Skeleton key={i} className="aspect-[3/4] rounded-xl" />
                ))}
              </div>
            )}
          </div>
        )}

        {/* Trust section at bottom */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-8 border-t">
          <div className="flex flex-col items-center text-center gap-2 p-4">
            <ShieldCheck className="h-8 w-8 text-primary" />
            <span className="text-sm font-medium">Compra Segura</span>
            <span className="text-[11px] text-muted-foreground">Transações protegidas</span>
          </div>
          <div className="flex flex-col items-center text-center gap-2 p-4">
            <Truck className="h-8 w-8 text-primary" />
            <span className="text-sm font-medium">Envio Nacional</span>
            <span className="text-[11px] text-muted-foreground">Para todo o país</span>
          </div>
          <div className="flex flex-col items-center text-center gap-2 p-4">
            <Award className="h-8 w-8 text-primary" />
            <span className="text-sm font-medium">Vendedores Verificados</span>
            <span className="text-[11px] text-muted-foreground">Perfis certificados</span>
          </div>
          <div className="flex flex-col items-center text-center gap-2 p-4">
            <MessageCircle className="h-8 w-8 text-primary" />
            <span className="text-sm font-medium">Chat Direto</span>
            <span className="text-[11px] text-muted-foreground">Fale com o vendedor</span>
          </div>
        </div>
      </main>

      {/* Mobile FAB */}
      {user && (
        <div className="fixed bottom-6 right-6 sm:hidden z-50">
          <Button
            size="lg"
            className="rounded-full shadow-2xl h-14 w-14 p-0"
            onClick={() => navigate("/dashboard/c2c/create")}
          >
            <Plus className="h-6 w-6" />
          </Button>
        </div>
      )}

      {/* Vinted-style Search Overlay */}
      <MarketplaceSearchOverlay
        open={searchOpen}
        onClose={() => setSearchOpen(false)}
        onSearch={(q) => setFilters((f) => ({ ...f, search: q }))}
        initialQuery={filters.search || ""}
      />
    </div>
  );
}
