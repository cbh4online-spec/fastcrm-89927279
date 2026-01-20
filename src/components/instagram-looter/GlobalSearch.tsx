import { useState } from "react";
import { Search, Loader2, User, ExternalLink, Star, Save } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { useInstagramLooter, IGSearchResult } from "@/hooks/useInstagramLooter";
import { toast } from "sonner";

export function GlobalSearch() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<IGSearchResult[]>([]);
  const [hasSearched, setHasSearched] = useState(false);
  const { isLoading, searchUsers, getProfile, saveProfile } = useInstagramLooter();

  const handleSearch = async () => {
    if (!query.trim()) {
      toast.error("Digite um termo de pesquisa");
      return;
    }

    try {
      const response = await searchUsers(query);
      setResults(response.results);
      setHasSearched(true);
      
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
      // First get full profile details
      const { profile } = await getProfile(result.username);
      if (profile) {
        await saveProfile.mutateAsync(profile);
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao guardar");
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSearch();
    }
  };

  return (
    <div className="space-y-6">
      {/* Search Input */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Pesquisar por nome, profissão, cidade..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyPress={handleKeyPress}
                className="pl-10"
              />
            </div>
            <Button onClick={handleSearch} disabled={isLoading}>
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Search className="h-4 w-4 mr-2" />
              )}
              Pesquisar
            </Button>
          </div>

          {/* Quick filters */}
          <div className="flex gap-2 mt-4">
            <Badge 
              variant="outline" 
              className="cursor-pointer hover:bg-accent"
              onClick={() => setQuery("dentista portugal")}
            >
              Dentistas
            </Badge>
            <Badge 
              variant="outline" 
              className="cursor-pointer hover:bg-accent"
              onClick={() => setQuery("cabeleireiro lisboa")}
            >
              Cabeleireiros
            </Badge>
            <Badge 
              variant="outline" 
              className="cursor-pointer hover:bg-accent"
              onClick={() => setQuery("esteticista porto")}
            >
              Esteticistas
            </Badge>
            <Badge 
              variant="outline" 
              className="cursor-pointer hover:bg-accent"
              onClick={() => setQuery("clinica dental")}
            >
              Clínicas Dentais
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Results */}
      {hasSearched && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">
            Resultados ({results.length})
          </h3>

          {results.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <User className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">Nenhum perfil encontrado</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Tente termos diferentes ou mais específicos
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {results.map((result) => (
                <Card key={result.pk} className="hover:shadow-md transition-shadow">
                  <CardContent className="pt-6">
                    <div className="flex items-start gap-4">
                      <Avatar className="h-14 w-14">
                        <AvatarImage src={result.profile_pic_url} alt={result.username} />
                        <AvatarFallback>
                          {result.username.substring(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h4 className="font-semibold truncate">
                            @{result.username}
                          </h4>
                          {result.is_verified && (
                            <Star className="h-4 w-4 text-primary fill-primary" />
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground truncate">
                          {result.full_name || "—"}
                        </p>
                        {result.follower_count && (
                          <p className="text-xs text-muted-foreground mt-1">
                            {result.follower_count.toLocaleString()} seguidores
                          </p>
                        )}
                        {result.is_private && (
                          <Badge variant="secondary" className="text-xs mt-2">
                            Privado
                          </Badge>
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
          )}
        </div>
      )}

      {/* Empty state */}
      {!hasSearched && (
        <Card>
          <CardContent className="py-16 text-center">
            <Search className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Busca Global de Perfis</h3>
            <p className="text-muted-foreground max-w-md mx-auto">
              Pesquise por profissionais, clínicas ou negócios no Instagram.
              Use termos como "dentista lisboa" ou "cabeleireiro porto".
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
