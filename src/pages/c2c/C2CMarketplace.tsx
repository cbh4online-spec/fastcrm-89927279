import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ListingCard } from "@/components/c2c/ListingCard";
import { ListingFilters } from "@/components/c2c/ListingFilters";
import { useC2CListings, useC2CCategories, useC2CFavorites, useToggleC2CFavorite, type C2CListingFilters } from "@/hooks/useC2CListings";
import { Plus, Store, ArrowLeft, MessageCircle, User, Heart } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useWorkspace } from "@/contexts/WorkspaceContext";

export default function C2CMarketplace() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { currentWorkspace } = useWorkspace();
  const workspaceId = currentWorkspace?.id;

  const [filters, setFilters] = useState<C2CListingFilters>({});
  const { data: listings = [], isLoading } = useC2CListings(workspaceId, filters);
  const { data: categories = [] } = useC2CCategories(workspaceId);
  const { data: favoriteIds = [] } = useC2CFavorites(workspaceId);
  const toggleFavorite = useToggleC2CFavorite(workspaceId);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-gradient-to-r from-primary/5 via-primary/3 to-background">
        <div className="container mx-auto px-4 py-6">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate("/dashboard")}
            className="mb-3 -ml-2 text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            Voltar
          </Button>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-primary/10">
                <Store className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h1 className="text-2xl font-bold">Marketplace</h1>
                <p className="text-muted-foreground text-sm">
                  Compra e vende entre utilizadores
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              {user && (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => navigate("/dashboard/c2c/favorites")}
                  >
                    <Heart className="h-4 w-4 mr-1" />
                    <span className="hidden sm:inline">Favoritos</span>
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => navigate("/dashboard/c2c/messages")}
                  >
                    <MessageCircle className="h-4 w-4 mr-1" />
                    <span className="hidden sm:inline">Mensagens</span>
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => navigate("/dashboard/c2c/my-listings")}
                  >
                    <User className="h-4 w-4 mr-1" />
                    <span className="hidden sm:inline">Meus Anúncios</span>
                  </Button>
                  <Button onClick={() => navigate("/dashboard/c2c/create")} size="sm">
                    <Plus className="h-4 w-4 mr-1" />
                    Criar Anúncio
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6 space-y-6">
        {/* Filters */}
        <ListingFilters
          filters={filters}
          onFiltersChange={setFilters}
          categories={categories}
        />

        {/* Grid */}
        {isLoading ? (
          <div className="text-center py-12 text-muted-foreground">A carregar...</div>
        ) : listings.length > 0 ? (
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
        ) : (
          <div className="text-center py-16">
            <Store className="w-12 h-12 mx-auto text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-medium mb-2">Nenhum anúncio encontrado</h3>
            <p className="text-muted-foreground mb-4">Sê o primeiro a publicar!</p>
            {user && (
              <Button onClick={() => navigate("/dashboard/c2c/create")}>
                <Plus className="h-4 w-4 mr-1" />
                Criar Anúncio
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
