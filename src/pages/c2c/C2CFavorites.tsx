import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ListingCard } from "@/components/c2c/ListingCard";
import { useC2CListings, useC2CFavorites, useToggleC2CFavorite } from "@/hooks/useC2CListings";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { ArrowLeft, Heart } from "lucide-react";

export default function C2CFavorites() {
  const navigate = useNavigate();
  const { currentWorkspace } = useWorkspace();
  const workspaceId = currentWorkspace?.id;
  const { data: allListings = [] } = useC2CListings(workspaceId);
  const { data: favoriteIds = [] } = useC2CFavorites(workspaceId);
  const toggleFavorite = useToggleC2CFavorite(workspaceId);

  const favoriteListings = allListings.filter((l) => favoriteIds.includes(l.id));

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-6">
        <Button variant="ghost" size="sm" onClick={() => navigate("/dashboard/c2c")} className="mb-4 -ml-2">
          <ArrowLeft className="h-4 w-4 mr-1" /> Marketplace
        </Button>
        <h1 className="text-2xl font-bold mb-6">Favoritos</h1>

        {favoriteListings.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <Heart className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Ainda não tens favoritos.</p>
          </div>
        ) : (
          <div className="grid gap-4 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {favoriteListings.map((listing) => (
              <ListingCard
                key={listing.id}
                listing={listing}
                isFavorite
                onToggleFavorite={() => toggleFavorite.mutate(listing.id)}
                onClick={() => navigate(`/dashboard/c2c/${listing.id}`)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
