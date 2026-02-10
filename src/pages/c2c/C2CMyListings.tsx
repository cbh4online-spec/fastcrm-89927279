import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useMyC2CListings, useUpdateC2CListing } from "@/hooks/useC2CListings";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { ArrowLeft, Plus, Pencil, Pause, Play, Trash2, Rocket } from "lucide-react";

const statusLabels: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  active: { label: "Ativo", variant: "default" },
  paused: { label: "Pausado", variant: "secondary" },
  sold: { label: "Vendido", variant: "outline" },
  flagged: { label: "Em revisão", variant: "destructive" },
  removed: { label: "Removido", variant: "destructive" },
};

export default function C2CMyListings() {
  const navigate = useNavigate();
  const { currentWorkspace } = useWorkspace();
  const workspaceId = currentWorkspace?.id;
  const { data: listings = [], isLoading } = useMyC2CListings(workspaceId);
  const updateListing = useUpdateC2CListing();

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-6 max-w-4xl">
        <Button variant="ghost" size="sm" onClick={() => navigate("/dashboard/c2c")} className="mb-4 -ml-2">
          <ArrowLeft className="h-4 w-4 mr-1" /> Marketplace
        </Button>

        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">Meus Anúncios</h1>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => navigate("/dashboard/c2c/boost")} className="gap-1">
              <Rocket className="h-4 w-4" /> Impulsionar
            </Button>
            <Button onClick={() => navigate("/dashboard/c2c/create")}>
              <Plus className="h-4 w-4 mr-1" /> Novo Anúncio
            </Button>
          </div>
        </div>

        {isLoading ? (
          <div className="text-center py-12 text-muted-foreground">A carregar...</div>
        ) : listings.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <p className="mb-4">Ainda não tens anúncios.</p>
            <Button onClick={() => navigate("/dashboard/c2c/create")}>
              <Plus className="h-4 w-4 mr-1" /> Criar Primeiro Anúncio
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {listings.map((listing) => {
              const st = statusLabels[listing.status] || statusLabels.active;
              return (
                <div key={listing.id} className="flex items-center gap-4 p-4 rounded-xl border bg-card">
                  <div className="w-16 h-16 rounded-lg overflow-hidden bg-muted flex-shrink-0">
                    {listing.photos?.[0] ? (
                      <img src={listing.photos[0]} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium truncate">{listing.title}</h3>
                    <p className="text-sm font-bold text-foreground">{listing.price.toFixed(2)} €</p>
                  </div>
                  <Badge variant={st.variant}>{st.label}</Badge>
                  <div className="flex items-center gap-1">
                    {listing.status === "active" && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => updateListing.mutate({ id: listing.id, status: "paused" })}
                        title="Pausar"
                      >
                        <Pause className="h-4 w-4" />
                      </Button>
                    )}
                    {listing.status === "paused" && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => updateListing.mutate({ id: listing.id, status: "active" })}
                        title="Reativar"
                      >
                        <Play className="h-4 w-4" />
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => updateListing.mutate({ id: listing.id, status: "removed" })}
                      title="Remover"
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
