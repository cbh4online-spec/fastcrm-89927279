import { useState } from "react";
import { Compass, Loader2, TrendingUp, Save, ExternalLink, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { useInstagramLooter, IGSearchResult } from "@/hooks/useInstagramLooter";
import { toast } from "sonner";

const EXPLORE_CATEGORIES = [
  { id: "dentista", label: "Dentistas", icon: "🦷", color: "bg-blue-500/10 text-blue-600" },
  { id: "ortodontia", label: "Ortodontia", icon: "😁", color: "bg-cyan-500/10 text-cyan-600" },
  { id: "cabeleireiro", label: "Cabeleireiros", icon: "💇", color: "bg-pink-500/10 text-pink-600" },
  { id: "esteticista", label: "Esteticistas", icon: "💅", color: "bg-purple-500/10 text-purple-600" },
  { id: "clinica dental", label: "Clínicas Dentais", icon: "🏥", color: "bg-green-500/10 text-green-600" },
  { id: "salao beleza", label: "Salões de Beleza", icon: "💄", color: "bg-rose-500/10 text-rose-600" },
  { id: "nutricionista", label: "Nutricionistas", icon: "🥗", color: "bg-lime-500/10 text-lime-600" },
  { id: "personal trainer", label: "Personal Trainers", icon: "💪", color: "bg-orange-500/10 text-orange-600" },
];

export function ExploreFeed() {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [results, setResults] = useState<IGSearchResult[]>([]);
  const { isLoading, searchUsers, getProfile, saveProfile } = useInstagramLooter();

  const handleExplore = async (categoryId: string) => {
    setSelectedCategory(categoryId);
    
    try {
      const response = await searchUsers(categoryId);
      setResults(response.results);
      
      if (response.results.length === 0) {
        toast.info("Nenhum resultado encontrado");
      } else {
        toast.success(`${response.results.length} perfis encontrados`);
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro na pesquisa");
    }
  };

  const handleSaveProfile = async (result: IGSearchResult) => {
    try {
      const { profile } = await getProfile(result.username);
      if (profile) {
        await saveProfile.mutateAsync(profile);
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao guardar");
    }
  };

  return (
    <div className="space-y-6">
      {/* Categories */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Explorar por Categoria
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
            {EXPLORE_CATEGORIES.map((category) => (
              <Button
                key={category.id}
                variant={selectedCategory === category.id ? "default" : "outline"}
                className={`h-auto py-4 flex flex-col gap-2 ${selectedCategory !== category.id ? category.color : ""}`}
                onClick={() => handleExplore(category.id)}
                disabled={isLoading}
              >
                <span className="text-2xl">{category.icon}</span>
                <span className="text-xs font-medium">{category.label}</span>
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Loading */}
      {isLoading && (
        <Card>
          <CardContent className="py-12 flex items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <span className="ml-3">A explorar...</span>
          </CardContent>
        </Card>
      )}

      {/* Results */}
      {!isLoading && selectedCategory && results.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">
              Resultados para "{selectedCategory}" ({results.length})
            </h3>
            <Badge variant="secondary">
              Limitado a 50 resultados
            </Badge>
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {results.slice(0, 50).map((result) => (
              <Card key={result.pk} className="hover:shadow-md transition-shadow">
                <CardContent className="pt-6">
                  <div className="flex items-start gap-4">
                    <Avatar className="h-12 w-12">
                      <AvatarImage src={result.profile_pic_url} alt={result.username || ''} />
                      <AvatarFallback>
                        {(result.username || 'IG').substring(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1">
                        <p className="font-semibold truncate">@{result.username}</p>
                        {result.is_verified && (
                          <Star className="h-3 w-3 text-primary fill-primary" />
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground truncate">
                        {result.full_name || "—"}
                      </p>
                      {result.follower_count && (
                        <p className="text-xs text-muted-foreground">
                          {result.follower_count.toLocaleString()} seguidores
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2 mt-4">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() => handleSaveProfile(result)}
                      disabled={saveProfile.isPending}
                    >
                      <Save className="h-4 w-4 mr-1" />
                      Guardar
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      asChild
                    >
                      <a 
                        href={`https://instagram.com/${result.username}`}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <ExternalLink className="h-4 w-4" />
                      </a>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Empty state */}
      {!selectedCategory && (
        <Card>
          <CardContent className="py-16 text-center">
            <Compass className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Explore o Feed</h3>
            <p className="text-muted-foreground max-w-md mx-auto">
              Selecione uma categoria acima para descobrir perfis relevantes.
              Esta é uma forma rápida de pesquisa e descoberta.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
