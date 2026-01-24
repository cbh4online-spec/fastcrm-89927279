import { useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { ModuleGuard } from "@/components/guards/ModuleGuard";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Sparkles, 
  Search, 
  Users, 
  Building2, 
  Globe, 
  Linkedin, 
  Mail,
  Phone,
  MapPin,
  TrendingUp,
  Loader2,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  Zap,
  Target
} from "lucide-react";

interface EnrichmentResult {
  id: string;
  lead_name: string;
  company?: string;
  email?: string;
  phone?: string;
  linkedin?: string;
  website?: string;
  location?: string;
  industry?: string;
  confidence: number;
  status: "pending" | "enriched" | "partial" | "failed";
}

// Sample data for demonstration
const sampleLeads: EnrichmentResult[] = [
  {
    id: "1",
    lead_name: "João Silva",
    company: "Tech Solutions Lda",
    email: "joao.silva@techsolutions.pt",
    phone: "+351 912 345 678",
    linkedin: "linkedin.com/in/joaosilva",
    website: "techsolutions.pt",
    location: "Lisboa, Portugal",
    industry: "Tecnologia",
    confidence: 95,
    status: "enriched"
  },
  {
    id: "2",
    lead_name: "Maria Santos",
    company: "Consultar SA",
    email: "maria@consultar.pt",
    linkedin: "linkedin.com/in/mariasantos",
    location: "Porto, Portugal",
    industry: "Consultoria",
    confidence: 78,
    status: "partial"
  },
  {
    id: "3",
    lead_name: "António Costa",
    status: "pending",
    confidence: 0
  }
];

export default function LeadEnricher() {
  const [searchQuery, setSearchQuery] = useState("");
  const [isEnriching, setIsEnriching] = useState(false);
  const [leads] = useState<EnrichmentResult[]>(sampleLeads);

  const handleEnrichAll = async () => {
    setIsEnriching(true);
    // Simulate enrichment process
    setTimeout(() => {
      setIsEnriching(false);
    }, 2000);
  };

  const getStatusBadge = (status: EnrichmentResult["status"]) => {
    switch (status) {
      case "enriched":
        return <Badge className="bg-green-500/10 text-green-600 border-green-500/30">Enriquecido</Badge>;
      case "partial":
        return <Badge className="bg-amber-500/10 text-amber-600 border-amber-500/30">Parcial</Badge>;
      case "failed":
        return <Badge className="bg-red-500/10 text-red-600 border-red-500/30">Falhou</Badge>;
      default:
        return <Badge variant="outline">Pendente</Badge>;
    }
  };

  const filteredLeads = leads.filter(lead =>
    lead.lead_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    lead.company?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <ModuleGuard moduleSlug="lead-enricher" moduleName="Lead Enricher Pro">
      <DashboardLayout>
        <div className="space-y-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-2">
                <Sparkles className="h-6 w-6 text-primary" />
                Lead Enricher Pro
              </h1>
              <p className="text-muted-foreground mt-1">
                Enriqueça automaticamente os dados dos seus leads com IA
              </p>
            </div>
            <Button onClick={handleEnrichAll} disabled={isEnriching}>
              {isEnriching ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  A enriquecer...
                </>
              ) : (
                <>
                  <Zap className="mr-2 h-4 w-4" />
                  Enriquecer Todos
                </>
              )}
            </Button>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Total Leads</p>
                    <p className="text-2xl font-bold">{leads.length}</p>
                  </div>
                  <Users className="h-8 w-8 text-muted-foreground/50" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Enriquecidos</p>
                    <p className="text-2xl font-bold text-green-600">
                      {leads.filter(l => l.status === "enriched").length}
                    </p>
                  </div>
                  <CheckCircle2 className="h-8 w-8 text-green-500/50" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Parciais</p>
                    <p className="text-2xl font-bold text-amber-600">
                      {leads.filter(l => l.status === "partial").length}
                    </p>
                  </div>
                  <AlertCircle className="h-8 w-8 text-amber-500/50" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Taxa Sucesso</p>
                    <p className="text-2xl font-bold">87%</p>
                  </div>
                  <TrendingUp className="h-8 w-8 text-primary/50" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Main Content */}
          <Tabs defaultValue="leads" className="space-y-4">
            <TabsList>
              <TabsTrigger value="leads">Leads</TabsTrigger>
              <TabsTrigger value="queue">Fila de Enriquecimento</TabsTrigger>
              <TabsTrigger value="settings">Configurações</TabsTrigger>
            </TabsList>

            <TabsContent value="leads" className="space-y-4">
              {/* Search */}
              <div className="flex gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Pesquisar leads..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>

              {/* Leads List */}
              <div className="space-y-3">
                {filteredLeads.map((lead) => (
                  <Card key={lead.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="font-semibold truncate">{lead.lead_name}</h3>
                            {getStatusBadge(lead.status)}
                            {lead.confidence > 0 && (
                              <span className="text-xs text-muted-foreground">
                                {lead.confidence}% confiança
                              </span>
                            )}
                          </div>
                          
                          {lead.status !== "pending" && (
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                              {lead.company && (
                                <div className="flex items-center gap-2 text-muted-foreground">
                                  <Building2 className="h-4 w-4 flex-shrink-0" />
                                  <span className="truncate">{lead.company}</span>
                                </div>
                              )}
                              {lead.email && (
                                <div className="flex items-center gap-2 text-muted-foreground">
                                  <Mail className="h-4 w-4 flex-shrink-0" />
                                  <span className="truncate">{lead.email}</span>
                                </div>
                              )}
                              {lead.phone && (
                                <div className="flex items-center gap-2 text-muted-foreground">
                                  <Phone className="h-4 w-4 flex-shrink-0" />
                                  <span className="truncate">{lead.phone}</span>
                                </div>
                              )}
                              {lead.linkedin && (
                                <div className="flex items-center gap-2 text-muted-foreground">
                                  <Linkedin className="h-4 w-4 flex-shrink-0" />
                                  <span className="truncate">{lead.linkedin}</span>
                                </div>
                              )}
                              {lead.website && (
                                <div className="flex items-center gap-2 text-muted-foreground">
                                  <Globe className="h-4 w-4 flex-shrink-0" />
                                  <span className="truncate">{lead.website}</span>
                                </div>
                              )}
                              {lead.location && (
                                <div className="flex items-center gap-2 text-muted-foreground">
                                  <MapPin className="h-4 w-4 flex-shrink-0" />
                                  <span className="truncate">{lead.location}</span>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                        
                        <div className="flex items-center gap-2">
                          {lead.status === "pending" && (
                            <Button size="sm" variant="outline">
                              <Sparkles className="mr-1 h-3 w-3" />
                              Enriquecer
                            </Button>
                          )}
                          <Button size="sm" variant="ghost">
                            <ArrowRight className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="queue">
              <Card>
                <CardHeader>
                  <CardTitle>Fila de Enriquecimento</CardTitle>
                  <CardDescription>
                    Leads pendentes para enriquecimento automático
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <Target className="h-12 w-12 text-muted-foreground/50 mb-4" />
                    <h3 className="font-medium mb-2">Nenhum lead na fila</h3>
                    <p className="text-sm text-muted-foreground max-w-md">
                      Adicione leads à fila de enriquecimento para processamento automático em lote.
                    </p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="settings">
              <Card>
                <CardHeader>
                  <CardTitle>Configurações de Enriquecimento</CardTitle>
                  <CardDescription>
                    Personalize como os dados dos leads são enriquecidos
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-4">
                    <div className="flex items-center justify-between p-4 border rounded-lg">
                      <div>
                        <h4 className="font-medium">Enriquecimento Automático</h4>
                        <p className="text-sm text-muted-foreground">
                          Enriquecer novos leads automaticamente
                        </p>
                      </div>
                      <Badge variant="outline">Em breve</Badge>
                    </div>
                    <div className="flex items-center justify-between p-4 border rounded-lg">
                      <div>
                        <h4 className="font-medium">Fontes de Dados</h4>
                        <p className="text-sm text-muted-foreground">
                          LinkedIn, Google, bases de dados empresariais
                        </p>
                      </div>
                      <Badge variant="outline">Ativo</Badge>
                    </div>
                    <div className="flex items-center justify-between p-4 border rounded-lg">
                      <div>
                        <h4 className="font-medium">Validação de Email</h4>
                        <p className="text-sm text-muted-foreground">
                          Verificar emails encontrados antes de guardar
                        </p>
                      </div>
                      <Badge variant="outline">Em breve</Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </DashboardLayout>
    </ModuleGuard>
  );
}
