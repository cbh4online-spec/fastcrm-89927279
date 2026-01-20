import { useState } from "react";
import { MapPin, Loader2, Building, ExternalLink, Users } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useInstagramLooter } from "@/hooks/useInstagramLooter";
import { toast } from "sonner";

export function LocationSearch() {
  const [location, setLocation] = useState("");
  const [results, setResults] = useState<any[]>([]);
  const [hasSearched, setHasSearched] = useState(false);
  const { isLoading, searchLocation } = useInstagramLooter();

  const handleSearch = async () => {
    if (!location.trim()) {
      toast.error("Digite uma localização");
      return;
    }

    try {
      const response = await searchLocation(location);
      setResults(response.results);
      setHasSearched(true);
      
      if (response.results.length === 0) {
        toast.info("Nenhuma localização encontrada");
      } else {
        toast.success(`${response.results.length} localizações encontradas`);
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro na pesquisa");
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
              <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Pesquisar por cidade, bairro ou local..."
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                onKeyPress={handleKeyPress}
                className="pl-10"
              />
            </div>
            <Button onClick={handleSearch} disabled={isLoading}>
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <MapPin className="h-4 w-4 mr-2" />
              )}
              Pesquisar
            </Button>
          </div>

          {/* Popular locations */}
          <div className="flex flex-wrap gap-2 mt-4">
            {["Lisboa", "Porto", "Braga", "Faro", "Coimbra", "Aveiro", "Cascais", "Sintra"].map((loc) => (
              <Badge 
                key={loc}
                variant="outline" 
                className="cursor-pointer hover:bg-accent"
                onClick={() => setLocation(loc)}
              >
                📍 {loc}
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Results */}
      {hasSearched && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">
            Localizações ({results.length})
          </h3>

          {results.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <MapPin className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">Nenhuma localização encontrada</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Tente um termo diferente ou mais genérico
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {results.map((loc: any, index: number) => (
                <Card 
                  key={loc.pk || index} 
                  className="hover:shadow-md transition-shadow"
                >
                  <CardContent className="pt-6">
                    <div className="flex items-start gap-4">
                      <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                        <Building className="h-6 w-6 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold truncate">
                          {loc.name || loc.title}
                        </h4>
                        <p className="text-sm text-muted-foreground truncate">
                          {loc.address || loc.subtitle || "—"}
                        </p>
                        {loc.media_count && (
                          <div className="flex items-center gap-1 mt-2 text-xs text-muted-foreground">
                            <Users className="h-3 w-3" />
                            {loc.media_count.toLocaleString()} posts
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="mt-4 flex gap-2">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="flex-1"
                        asChild
                      >
                        <a 
                          href={`https://instagram.com/explore/locations/${loc.pk || loc.external_id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <ExternalLink className="h-3 w-3 mr-1" />
                          Ver Posts
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
            <MapPin className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Pesquisa por Localização</h3>
            <p className="text-muted-foreground max-w-md mx-auto">
              Encontre locais e veja posts associados a essa localização.
              Útil para identificar negócios numa área específica.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
