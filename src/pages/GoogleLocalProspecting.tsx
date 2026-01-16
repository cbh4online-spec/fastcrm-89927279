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
  CheckCircle2,
  History
} from "lucide-react";
import { PageBreadcrumbs } from "@/components/layout/PageBreadcrumbs";
import { useCreateLead, useLeads } from "@/hooks/useLeads";

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
  services?: string[];
}

const MOCK_DATABASE: Record<string, GooglePlaceResult[]> = {
  health: [
    {
      id: "h1",
      title: "Clínica Médica São Lucas",
      rating: 4.8,
      reviews_count: 312,
      address: "Av. da Liberdade 45, Lisboa",
      phone: "+351 21 345 6789",
      website: "https://clinicasaolucas.pt",
      category: "Clínica Médica",
      hours: "08:00 - 20:00",
      description: "Clínica multidisciplinar com especialidades em medicina geral, cardiologia e dermatologia",
      services: ["Medicina Geral", "Cardiologia", "Dermatologia", "Análises Clínicas"]
    },
    {
      id: "h2",
      title: "Centro de Fisioterapia Lisboa",
      rating: 4.6,
      reviews_count: 187,
      address: "Rua Augusta 123, Lisboa",
      phone: "+351 21 456 7890",
      website: "https://fisioterapialisboa.pt",
      category: "Fisioterapia",
      hours: "09:00 - 19:00",
      description: "Centro especializado em reabilitação física e desportiva",
      services: ["Fisioterapia", "Reabilitação", "Massagem Terapêutica", "Pilates Clínico"]
    },
    {
      id: "h3",
      title: "Clínica Dentária Sorriso Perfeito",
      rating: 4.9,
      reviews_count: 423,
      address: "Praça do Comércio 67, Lisboa",
      phone: "+351 21 567 8901",
      website: "https://sorrisoperfeito.pt",
      category: "Clínica Dentária",
      hours: "09:00 - 19:00",
      description: "Clínica moderna especializada em ortodontia, implantes e estética dentária",
      services: ["Ortodontia", "Implantes", "Branqueamento", "Higiene Oral"]
    },
    {
      id: "h4",
      title: "Hospital Veterinário do Lumiar",
      rating: 4.7,
      reviews_count: 256,
      address: "Alameda das Linhas de Torres 200, Lisboa",
      phone: "+351 21 678 9012",
      website: "https://hvlumiar.pt",
      category: "Veterinário",
      hours: "24 horas",
      description: "Hospital veterinário com serviço de urgência 24 horas",
      services: ["Consultas", "Cirurgia", "Urgências", "Internamento"]
    },
    {
      id: "h5",
      title: "Farmácia Central Lisboa",
      rating: 4.5,
      reviews_count: 178,
      address: "Rossio 45, Lisboa",
      phone: "+351 21 789 0123",
      website: "https://farmaciacentral.pt",
      category: "Farmácia",
      hours: "08:00 - 22:00",
      description: "Farmácia com serviços de aconselhamento farmacêutico e medição de tensão",
      services: ["Medicamentos", "Dermofarmácia", "Ortopedia", "Veterinária"]
    }
  ],
  restaurant: [
    {
      id: "r1",
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
      id: "r2",
      title: "Tasca do Chico",
      rating: 4.7,
      reviews_count: 567,
      address: "Bairro Alto, Lisboa",
      phone: "+351 21 234 5678",
      website: "https://tascadochico.pt",
      category: "Restaurante Tradicional",
      hours: "19:00 - 02:00",
      description: "Tasca típica portuguesa com fado ao vivo",
      services: ["Fado ao Vivo", "Reservas", "Grupos"]
    }
  ],
  auto: [
    {
      id: "a1",
      title: "Auto Mecânica Lisboa",
      rating: 4.8,
      reviews_count: 156,
      address: "Av. Almirante Reis 456, Lisboa",
      phone: "+351 21 345 6789",
      website: "https://automecanicalisboa.pt",
      category: "Oficina Automóvel",
      hours: "08:00 - 18:00",
      description: "Oficina especializada em manutenção e reparação automóvel",
      services: ["Revisões", "Pneus", "Ar condicionado", "Diagnóstico"]
    },
    {
      id: "a2",
      title: "Centro de Inspeções Lisboa",
      rating: 4.3,
      reviews_count: 890,
      address: "Zona Industrial, Lisboa",
      phone: "+351 21 456 7890",
      category: "Centro de Inspeções",
      hours: "08:00 - 19:00",
      description: "Centro de inspeções automóveis certificado",
      services: ["Inspeção Periódica", "Inspeção Extraordinária"]
    }
  ],
  services: [
    {
      id: "s1",
      title: "Contabilidade & Consultoria Lda",
      rating: 4.3,
      reviews_count: 45,
      address: "Rua do Comércio 321, Lisboa",
      phone: "+351 21 111 2222",
      website: "https://contabilidadeconsultoria.pt",
      category: "Contabilidade",
      hours: "09:00 - 18:00",
      description: "Serviços de contabilidade, fiscalidade e consultoria empresarial",
      services: ["Contabilidade", "IRS", "IRC", "Apoio a empresas"]
    },
    {
      id: "s2",
      title: "Advogados Associados Lisboa",
      rating: 4.6,
      reviews_count: 123,
      address: "Av. da República 100, Lisboa",
      phone: "+351 21 222 3333",
      website: "https://advogadoslisboa.pt",
      category: "Escritório de Advogados",
      hours: "09:00 - 18:00",
      description: "Escritório de advogados especializado em direito comercial e laboral",
      services: ["Direito Comercial", "Direito Laboral", "Contratos", "Litígios"]
    }
  ],
  retail: [
    {
      id: "rt1",
      title: "Loja de Eletrónica TechZone",
      rating: 4.2,
      reviews_count: 234,
      address: "Centro Comercial Colombo, Lisboa",
      phone: "+351 21 333 4444",
      website: "https://techzone.pt",
      category: "Loja de Eletrónica",
      hours: "10:00 - 23:00",
      description: "Loja especializada em eletrónica e informática",
      services: ["Reparações", "Garantia", "Assistência Técnica"]
    }
  ],
  construction: [
    {
      id: "c1",
      title: "Construções Lisboa Lda",
      rating: 4.4,
      reviews_count: 78,
      address: "Zona Industrial Sacavém, Lisboa",
      phone: "+351 21 444 5555",
      website: "https://construcoeslisboa.pt",
      category: "Construção Civil",
      hours: "08:00 - 17:00",
      description: "Empresa de construção civil especializada em remodelações",
      services: ["Construção", "Remodelação", "Pintura", "Canalização"]
    }
  ]
};

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
  const [importedIds, setImportedIds] = useState<string[]>([]);
  
  const createLead = useCreateLead();
  const { data: recentLeads = [] } = useLeads({ 
    status: undefined 
  });
  
  // Filter leads from google_local source
  const prospectionLeads = recentLeads
    .filter(lead => lead.source === "google_local")
    .slice(0, 10);

  const handleSearch = async () => {
    if (!searchQuery.trim() && !location.trim()) {
      toast.error("Introduza um termo de pesquisa ou localização");
      return;
    }

    setIsSearching(true);
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    let filteredResults: GooglePlaceResult[] = [];
    
    if (category === "all") {
      filteredResults = Object.values(MOCK_DATABASE).flat();
    } else {
      filteredResults = MOCK_DATABASE[category] || [];
    }
    
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filteredResults = filteredResults.filter(result => 
        result.title.toLowerCase().includes(query) ||
        result.category.toLowerCase().includes(query) ||
        result.description?.toLowerCase().includes(query) ||
        result.services?.some(s => s.toLowerCase().includes(query))
      );
    }
    
    if (location.trim()) {
      const loc = location.toLowerCase();
      filteredResults = filteredResults.filter(result =>
        result.address.toLowerCase().includes(loc)
      );
    }
    
    setResults(filteredResults);
    setIsSearching(false);
    setImportedIds([]);
    
    if (filteredResults.length > 0) {
      toast.success(`Encontrados ${filteredResults.length} resultados`);
    } else {
      toast.info("Nenhum resultado encontrado");
    }
  };

  const toggleSelection = (id: string) => {
    setSelectedResults(prev => 
      prev.includes(id) 
        ? prev.filter(x => x !== id)
        : [...prev, id]
    );
  };

  const importLeads = async (leadsToImport: GooglePlaceResult[]) => {
    let successCount = 0;
    
    for (const result of leadsToImport) {
      try {
        await createLead.mutateAsync({
          name: result.title,
          phone: result.phone || undefined,
          source: "google_local",
          status: "new",
        });
        setImportedIds(prev => [...prev, result.id]);
        successCount++;
      } catch (error) {
        console.error("Error importing lead:", error);
      }
    }
    
    return successCount;
  };

  const handleImportSelected = async () => {
    if (selectedResults.length === 0) {
      toast.error("Selecione pelo menos um resultado para importar");
      return;
    }
    
    const leadsToImport = results.filter(r => selectedResults.includes(r.id));
    const count = await importLeads(leadsToImport);
    
    toast.success(`${count} leads importados com sucesso!`);
    setSelectedResults([]);
  };

  const handleImportAll = async () => {
    const leadsToImport = results.filter(r => !importedIds.includes(r.id));
    const count = await importLeads(leadsToImport);
    
    toast.success(`${count} leads importados com sucesso!`);
  };

  const creditsUsed = 45;
  const creditsTotal = 500;

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

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
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
              <div className="grid gap-4 md:grid-cols-3">
                <div>
                  <Input
                    placeholder="Ex: restaurantes, advogados..."
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
                        : "Selecione os resultados que pretende importar"
                      }
                    </CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Button 
                      variant="outline" 
                      onClick={handleImportSelected}
                      disabled={selectedResults.length === 0 || createLead.isPending}
                    >
                      <UserPlus className="mr-2 h-4 w-4" />
                      Importar ({selectedResults.length})
                    </Button>
                    <Button 
                      onClick={handleImportAll}
                      disabled={createLead.isPending}
                    >
                      <UserPlus className="mr-2 h-4 w-4" />
                      Importar Todos
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[400px]">
                  <div className="space-y-3">
                    {results.map((result) => (
                      <div
                        key={result.id}
                        className={`p-4 rounded-lg border transition-colors ${
                          importedIds.includes(result.id)
                            ? "border-green-500 bg-green-500/5"
                            : selectedResults.includes(result.id)
                            ? "border-primary bg-primary/5"
                            : "hover:border-primary/50"
                        }`}
                      >
                        <div className="flex items-start gap-4">
                          <Checkbox
                            checked={selectedResults.includes(result.id)}
                            onCheckedChange={() => toggleSelection(result.id)}
                            disabled={importedIds.includes(result.id)}
                            className="mt-1"
                          />
                          <div className="flex-1 space-y-2">
                            <div className="flex items-start justify-between">
                              <div>
                                <h3 className="font-semibold flex items-center gap-2">
                                  {result.title}
                                  {importedIds.includes(result.id) && (
                                    <Badge variant="outline" className="text-green-600 border-green-600">
                                      <CheckCircle2 className="h-3 w-3 mr-1" />
                                      Importado
                                    </Badge>
                                  )}
                                </h3>
                                <Badge variant="outline" className="mt-1 text-xs">
                                  {result.category}
                                </Badge>
                              </div>
                              <div className="flex items-center gap-1 text-amber-500">
                                <Star className="h-4 w-4 fill-current" />
                                <span className="font-medium">{result.rating}</span>
                                <span className="text-muted-foreground text-xs">
                                  ({result.reviews_count})
                                </span>
                              </div>
                            </div>
                            
                            <p className="text-sm text-muted-foreground line-clamp-1">
                              {result.description}
                            </p>

                            <div className="flex flex-wrap gap-3 text-xs">
                              <span className="flex items-center gap-1 text-muted-foreground">
                                <MapPin className="h-3 w-3" />
                                {result.address}
                              </span>
                              {result.phone && (
                                <span className="flex items-center gap-1 text-muted-foreground">
                                  <Phone className="h-3 w-3" />
                                  {result.phone}
                                </span>
                              )}
                            </div>
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
                  Pesquise por tipo de negócio para encontrar leads qualificados.
                </p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* History Sidebar */}
        <div>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <History className="h-4 w-4" />
                Leads Importados
              </CardTitle>
              <CardDescription>
                Últimos leads importados do Google Local
              </CardDescription>
            </CardHeader>
            <CardContent>
              {prospectionLeads.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Nenhum lead importado ainda
                </p>
              ) : (
                <div className="space-y-3">
                  {prospectionLeads.map((lead) => (
                    <div key={lead.id} className="flex items-start gap-3 p-2 rounded-lg hover:bg-muted/50">
                      <Building2 className="h-4 w-4 text-muted-foreground mt-0.5" />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{lead.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(lead.created_at).toLocaleDateString('pt-PT')}
                        </p>
                      </div>
                      <Badge variant="secondary" className="text-xs shrink-0">
                        {lead.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
