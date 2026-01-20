import { useState } from "react";
import { MapPin, Loader2, Building } from "lucide-react";
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
            {["Lisboa", "Porto", "Braga", "Faro", "Coimbra", "Aveiro"].map((loc) => (
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
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {results.map((loc: any, index: number) => (
                <Card 
                  key={loc.pk || index} 
                  className="hover:shadow-md transition-shadow cursor-pointer"
                >
                  <CardContent className="pt-6">
                    <div className="flex items-start gap-4">
                      <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
                        <Building className="h-6 w-6 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold truncate">
                          {loc.name || loc.title}
                        </h4>
                        <p className="text-sm text-muted-foreground truncate">
                          {loc.address || loc.subtitle || "—"}
                        </p>
                        {loc.external_id && (
                          <p className="text-xs text-muted-foreground mt-1">
                            ID: {loc.external_id}
                          </p>
                        )}
                      </div>
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
