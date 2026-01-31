import { useState } from "react";
import { Heart } from "lucide-react";
import { ClientLayout } from "@/components/client-portal/ClientLayout";
import { FavoritesList } from "@/components/client-portal/FavoritesList";
import { useClientFavorites } from "@/hooks/client-portal/useClientFavorites";

export default function ClientFavoritesPage() {
  const { favoriteCount } = useClientFavorites();

  return (
    <ClientLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-red-100 flex items-center justify-center">
            <Heart className="h-5 w-5 text-red-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Os Meus Favoritos</h1>
            <p className="text-muted-foreground">
              {favoriteCount} {favoriteCount === 1 ? "produto" : "produtos"} guardado{favoriteCount !== 1 ? "s" : ""}
            </p>
          </div>
        </div>

        {/* Favorites Grid */}
        <FavoritesList />
      </div>
    </ClientLayout>
  );
}
