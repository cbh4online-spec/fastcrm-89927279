import { useState } from "react";
import { PageBreadcrumbs } from "@/components/layout/PageBreadcrumbs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Search, Globe, Building2, MapPin, Phone, Mail, ExternalLink, Plus, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface WebResult {
  id: string;
  title: string;
  url: string;
  description: string;
  address?: string;
  phone?: string;
  email?: string;
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

    // Simular pesquisa
    await new Promise(resolve => setTimeout(resolve, 1500));

    // Dados mock baseados na pesquisa
    const mockResults: WebResult[] = [
      {
        id: "1",
        title: `${searchQuery} - Empresa Exemplo 1`,
        url: "https://exemplo1.pt",
        description: `Empresa líder em ${searchQuery.toLowerCase()}. Oferecemos serviços de qualidade há mais de 10 anos.`,
        address: "Lisboa, Portugal",
        phone: "+351 21 123 4567",
        email: "info@exemplo1.pt"
      },
      {
        id: "2",
        title: `${searchQuery} Portugal - Serviços Profissionais`,
        url: "https://servicos-profissionais.pt",
        description: `Especialistas em ${searchQuery.toLowerCase()} com equipa certificada e experiência comprovada.`,
        address: "Porto, Portugal",
        phone: "+351 22 987 6543",
        email: "contacto@servicos.pt"
      },
      {
        id: "3",
        title: `Grupo ${searchQuery} & Associados`,
        url: "https://grupo-associados.pt",
        description: `Consultoria e serviços em ${searchQuery.toLowerCase()}. Soluções personalizadas para empresas.`,
        address: "Braga, Portugal",
        email: "geral@grupo.pt"
      },
    ];

    setResults(mockResults);
    setIsSearching(false);
    toast.success(`${mockResults.length} resultados encontrados`);
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
              placeholder="Ex: agências de marketing, advogados, contabilistas..."
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
              {results.length} Resultados
            </h2>
          </div>

          {results.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                Nenhum resultado encontrado. Tente outros termos de pesquisa.
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {results.map((result) => (
                <Card key={result.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center gap-2">
                          <Building2 className="h-4 w-4 text-muted-foreground" />
                          <h3 className="font-semibold">{result.title}</h3>
                        </div>
                        
                        <p className="text-sm text-muted-foreground">
                          {result.description}
                        </p>

                        <div className="flex flex-wrap gap-3 text-sm">
                          {result.address && (
                            <span className="flex items-center gap-1 text-muted-foreground">
                              <MapPin className="h-3 w-3" />
                              {result.address}
                            </span>
                          )}
                          {result.phone && (
                            <span className="flex items-center gap-1 text-muted-foreground">
                              <Phone className="h-3 w-3" />
                              {result.phone}
                            </span>
                          )}
                          {result.email && (
                            <span className="flex items-center gap-1 text-muted-foreground">
                              <Mail className="h-3 w-3" />
                              {result.email}
                            </span>
                          )}
                        </div>

                        <a
                          href={result.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
                        >
                          <ExternalLink className="h-3 w-3" />
                          {result.url}
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
