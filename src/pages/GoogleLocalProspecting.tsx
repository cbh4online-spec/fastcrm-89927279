import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { 
  MapPin, 
  Search, 
  Star, 
  Phone, 
  Globe, 
  Clock, 
  Building2, 
  UserPlus,
  ExternalLink,
  Loader2,
  Settings,
  CreditCard,
  AlertCircle,
  CheckCircle2,
  Image as ImageIcon
} from "lucide-react";
import { PageBreadcrumbs } from "@/components/layout/PageBreadcrumbs";

// Simulated search results for demo
interface GooglePlaceResult {
  id: string;
  title: string;
  rating: number;
  reviews_count: number;
  address: string;
  phone?: string;
  website?: string;
  category: string;
  hours?: string;
  description?: string;
  images?: string[];
  services?: string[];
}

const SAMPLE_RESULTS: GooglePlaceResult[] = [
  {
    id: "1",
    title: "Restaurante O Pescador",
    rating: 4.5,
    reviews_count: 234,
    address: "Rua da Praia 123, Lisboa",
    phone: "+351 21 123 4567",
    website: "https://opescador.pt",
    category: "Restaurante",
    hours: "12:00 - 23:00",
    description: "Restaurante de marisco tradicional com vista para o mar",
    services: ["Entrega ao domicílio", "Reservas", "Wi-Fi grátis"]
  },
  {
    id: "2",
    title: "Auto Mecânica Silva",
    rating: 4.8,
    reviews_count: 156,
    address: "Av. da Liberdade 456, Porto",
    phone: "+351 22 987 6543",
    website: "https://automecanicasilva.pt",
    category: "Oficina Automóvel",
    hours: "08:00 - 18:00",
    description: "Oficina especializada em manutenção e reparação automóvel",
    services: ["Revisões", "Pneus", "Ar condicionado", "Diagnóstico"]
  },
  {
    id: "3",
    title: "Clínica Dentária Sorriso",
    rating: 4.7,
    reviews_count: 89,
    address: "Praça do Município 78, Braga",
    phone: "+351 253 456 789",
    website: "https://clinicasorriso.pt",
    category: "Clínica Dentária",
    hours: "09:00 - 19:00",
    description: "Clínica moderna com especialidades em ortodontia e implantes",
    services: ["Ortodontia", "Implantes", "Branqueamento", "Limpeza"]
  },
  {
    id: "4",
    title: "Contabilidade & Consultoria Lda",
    rating: 4.3,
    reviews_count: 45,
    address: "Rua do Comércio 321, Coimbra",
    phone: "+351 239 111 222",
    website: "https://contabilidadeconsultoria.pt",
    category: "Contabilidade",
    hours: "09:00 - 18:00",
    description: "Serviços de contabilidade, fiscalidade e consultoria empresarial",
    services: ["Contabilidade", "IRS", "IRC", "Apoio a empresas"]
  }
];

const CATEGORIES = [
  { value: "all", label: "Todas as categorias" },
  { value: "restaurant", label: "Restaurantes" },
  { value: "auto", label: "Automóvel" },
  { value: "health", label: "Saúde" },
  { value: "services", label: "Serviços" },
  { value: "retail", label: "Retalho" },
  { value: "construction", label: "Construção" },
];

export default function GoogleLocalProspecting() {
  const [searchQuery, setSearchQuery] = useState("");
  const [location, setLocation] = useState("");
  const [category, setCategory] = useState("all");
  const [isSearching, setIsSearching] = useState(false);
  const [results, setResults] = useState<GooglePlaceResult[]>([]);
  const [selectedResults, setSelectedResults] = useState<string[]>([]);

  const handleSearch = async () => {
    if (!searchQuery.trim() && !location.trim()) {
      toast.error("Introduza um termo de pesquisa ou localização");
      return;
    }

    setIsSearching(true);
    
    // Simulated API call delay
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    setResults(SAMPLE_RESULTS);
    setIsSearching(false);
    toast.success(`Encontrados ${SAMPLE_RESULTS.length} resultados`);
  };

  const toggleSelection = (id: string) => {
    setSelectedResults(prev => 
      prev.includes(id) 
        ? prev.filter(x => x !== id)
        : [...prev, id]
    );
  };

  const handleImportSelected = () => {
    if (selectedResults.length === 0) {
      toast.error("Selecione pelo menos um resultado para importar");
      return;
    }
    
    toast.success(`${selectedResults.length} leads importados com sucesso!`, {
      description: "Os leads foram adicionados à sua lista"
    });
    setSelectedResults([]);
  };

  const handleImportAll = () => {
    toast.success(`${results.length} leads importados com sucesso!`, {
      description: "Todos os resultados foram adicionados como leads"
    });
    setResults([]);
  };

  const creditsUsed = 45;
  const creditsTotal = 500;
  const creditsPercent = (creditsUsed / creditsTotal) * 100;

  return (
    <div className="space-y-6">
      <PageBreadcrumbs 
        items={[
          { label: "Prospecção", href: "/dashboard/prospecting/google-local" },
          { label: "Google Local" }
        ]}
      />

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <MapPin className="h-8 w-8 text-primary" />
            Google Local Services
          </h1>
          <p className="text-muted-foreground mt-1">
            Pesquise e importe leads diretamente do Google Maps
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm">
            <Settings className="mr-2 h-4 w-4" />
            Configurações
          </Button>
          <Badge variant="outline" className="gap-2 py-2 px-3">
            <CreditCard className="h-4 w-4" />
            {creditsUsed}/{creditsTotal} créditos
          </Badge>
        </div>
      </div>


      {/* Search Form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            Pesquisar Empresas
          </CardTitle>
          <CardDescription>
            Pesquise por tipo de negócio, nome ou serviço e filtre por localização
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-4">
            <div className="md:col-span-2">
              <Input
                placeholder="Ex: restaurantes, advogados, oficinas..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              />
            </div>
            <div>
              <Input
                placeholder="Localização (ex: Lisboa)"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              />
            </div>
            <div>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger>
                  <SelectValue placeholder="Categoria" />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map(cat => (
                    <SelectItem key={cat.value} value={cat.value}>
                      {cat.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex justify-end mt-4">
            <Button onClick={handleSearch} disabled={isSearching}>
              {isSearching ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  A pesquisar...
                </>
              ) : (
                <>
                  <Search className="mr-2 h-4 w-4" />
                  Pesquisar (1 crédito)
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Results */}
      {results.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Resultados ({results.length})</CardTitle>
                <CardDescription>
                  {selectedResults.length > 0 
                    ? `${selectedResults.length} selecionados`
                    : "Selecione os resultados que pretende importar como leads"
                  }
                </CardDescription>
              </div>
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  onClick={handleImportSelected}
                  disabled={selectedResults.length === 0}
                >
                  <UserPlus className="mr-2 h-4 w-4" />
                  Importar Selecionados ({selectedResults.length})
                </Button>
                <Button onClick={handleImportAll}>
                  <UserPlus className="mr-2 h-4 w-4" />
                  Importar Todos
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[500px]">
              <div className="space-y-4">
                {results.map((result) => (
                  <div
                    key={result.id}
                    className={`p-4 rounded-lg border transition-colors ${
                      selectedResults.includes(result.id)
                        ? "border-primary bg-primary/5"
                        : "hover:border-primary/50"
                    }`}
                  >
                    <div className="flex items-start gap-4">
                      <Checkbox
                        checked={selectedResults.includes(result.id)}
                        onCheckedChange={() => toggleSelection(result.id)}
                        className="mt-1"
                      />
                      <div className="flex-1 space-y-2">
                        <div className="flex items-start justify-between">
                          <div>
                            <h3 className="font-semibold text-lg flex items-center gap-2">
                              {result.title}
                              {result.rating >= 4.5 && (
                                <Badge variant="secondary" className="text-xs">
                                  <Star className="h-3 w-3 mr-1 fill-amber-400 text-amber-400" />
                                  Top
                                </Badge>
                              )}
                            </h3>
                            <Badge variant="outline" className="mt-1">
                              {result.category}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-1 text-amber-500">
                            <Star className="h-4 w-4 fill-current" />
                            <span className="font-medium">{result.rating}</span>
                            <span className="text-muted-foreground text-sm">
                              ({result.reviews_count} avaliações)
                            </span>
                          </div>
                        </div>
                        
                        <p className="text-sm text-muted-foreground">
                          {result.description}
                        </p>

                        <div className="flex flex-wrap gap-4 text-sm">
                          <div className="flex items-center gap-1 text-muted-foreground">
                            <MapPin className="h-4 w-4" />
                            {result.address}
                          </div>
                          {result.phone && (
                            <div className="flex items-center gap-1 text-muted-foreground">
                              <Phone className="h-4 w-4" />
                              {result.phone}
                            </div>
                          )}
                          {result.hours && (
                            <div className="flex items-center gap-1 text-muted-foreground">
                              <Clock className="h-4 w-4" />
                              {result.hours}
                            </div>
                          )}
                        </div>

                        {result.services && result.services.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {result.services.map((service, i) => (
                              <Badge key={i} variant="secondary" className="text-xs">
                                {service}
                              </Badge>
                            ))}
                          </div>
                        )}

                        {result.website && (
                          <a 
                            href={result.website} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
                          >
                            <Globe className="h-4 w-4" />
                            {result.website.replace('https://', '')}
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      )}

      {/* Empty State */}
      {results.length === 0 && !isSearching && (
        <Card>
          <CardContent className="py-16 text-center">
            <MapPin className="h-16 w-16 mx-auto text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-medium mb-2">Comece a prospectar</h3>
            <p className="text-muted-foreground mb-4 max-w-md mx-auto">
              Pesquise por tipo de negócio ou nome de empresa para encontrar leads qualificados na sua zona.
            </p>
            <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
              <CheckCircle2 className="h-4 w-4 text-green-500" />
              <span>Dados verificados pelo Google</span>
              <span className="mx-2">•</span>
              <CheckCircle2 className="h-4 w-4 text-green-500" />
              <span>Contactos e ratings incluídos</span>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}