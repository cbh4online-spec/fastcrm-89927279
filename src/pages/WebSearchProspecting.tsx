import { useState } from "react";
import { PageBreadcrumbs } from "@/components/layout/PageBreadcrumbs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Globe, Building2, ExternalLink, Plus, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { firecrawlApi } from "@/lib/api/firecrawl";

interface WebResult {
  url: string;
  title: string;
  description: string;
}

export default function WebSearchProspecting() {
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [results, setResults] = useState<WebResult[]>([]);
  const [hasSearched, setHasSearched] = useState(false);

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      toast.error("Introduza um termo de pesquisa");
      return;
    }

    setIsSearching(true);
    setHasSearched(true);
    setResults([]);

    try {
      const response = await firecrawlApi.search(searchQuery, {
        limit: 15,
        lang: "pt",
        country: "pt",
      });

      if (response.success && response.data) {
        const searchResults: WebResult[] = response.data.map((item: any) => ({
          url: item.url || "",
          title: item.title || item.url || "Sem título",
          description: item.description || item.markdown?.substring(0, 200) || "",
        }));
        setResults(searchResults);
        toast.success(`${searchResults.length} resultados encontrados`);
      } else {
        toast.error(response.error || "Erro na pesquisa");
      }
    } catch (error) {
      console.error("Search error:", error);
      toast.error("Erro ao pesquisar. Verifique se o conector Firecrawl está configurado.");
    } finally {
      setIsSearching(false);
    }
  };

  const handleAddToLeads = (result: WebResult) => {
    toast.success(`"${result.title}" adicionado aos leads`);
  };

  return (
    <div className="space-y-6">
      <PageBreadcrumbs
        items={[
          { label: "Prospecção", href: "/dashboard/prospecting" },
          { label: "Pesquisa Web" },
        ]}
      />

      <div>
        <h1 className="text-2xl font-bold tracking-tight">Pesquisa Web</h1>
        <p className="text-muted-foreground">
          Pesquise empresas na web e adicione-as como leads
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5" />
            Pesquisar na Web
          </CardTitle>
          <CardDescription>
            Introduza termos de pesquisa para encontrar potenciais clientes
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <Input
              placeholder="Ex: clínicas dentárias Lisboa, advogados Porto, contabilistas Braga..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              className="flex-1"
            />
            <Button onClick={handleSearch} disabled={isSearching}>
              {isSearching ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Search className="h-4 w-4 mr-2" />
              )}
              Pesquisar
            </Button>
          </div>
        </CardContent>
      </Card>

      {hasSearched && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">
              {isSearching ? "A pesquisar..." : `${results.length} Resultados`}
            </h2>
          </div>

          {!isSearching && results.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                Nenhum resultado encontrado. Tente outros termos de pesquisa.
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {results.map((result, index) => (
                <Card key={index} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center gap-2">
                          <Building2 className="h-4 w-4 text-muted-foreground" />
                          <h3 className="font-semibold line-clamp-1">{result.title}</h3>
                        </div>
                        
                        {result.description && (
                          <p className="text-sm text-muted-foreground line-clamp-2">
                            {result.description}
                          </p>
                        )}

                        <a
                          href={result.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
                        >
                          <ExternalLink className="h-3 w-3" />
                          <span className="line-clamp-1">{result.url}</span>
                        </a>
                      </div>

                      <Button
                        size="sm"
                        onClick={() => handleAddToLeads(result)}
                      >
                        <Plus className="h-4 w-4 mr-1" />
                        Adicionar
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
