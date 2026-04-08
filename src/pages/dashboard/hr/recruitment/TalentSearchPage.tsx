import { useState } from "react";
import { HRBreadcrumb } from "@/components/hr/HRBreadcrumb";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search, Loader2, ExternalLink, UserPlus, Briefcase, X, MapPin, Globe, Rss, Download, Building2 } from "lucide-react";
import {
  useTalentResults,
  useSearchTalent,
  useDismissTalentResult,
  useImportTalentResult,
  usePortalImport,
  type TalentResult,
} from "@/hooks/hr/useTalentSearch";

const STATUS_LABELS: Record<string, string> = {
  new: "Novo",
  reviewed: "Revisto",
  imported: "Importado",
  dismissed: "Descartado",
};

const STATUS_VARIANT: Record<string, "default" | "secondary" | "outline" | "destructive"> = {
  new: "default",
  reviewed: "secondary",
  imported: "outline",
  dismissed: "destructive",
};

const PORTALS = [
  { slug: "indeed_pt", name: "Indeed PT", domain: "pt.indeed.com", description: "O maior motor de emprego do mundo" },
  { slug: "sapo_emprego", name: "Sapo Emprego", domain: "emprego.sapo.pt", description: "Portal de emprego do SAPO" },
  { slug: "iefp", name: "IEFP", domain: "iefp.pt", description: "Instituto do Emprego e Formação Profissional" },
  { slug: "emprego_publico", name: "Emprego Público", domain: "empregopublico.gov.pt", description: "Ofertas de emprego público" },
  { slug: "expresso_emprego", name: "Expresso Emprego", domain: "expressoemprego.pt", description: "Emprego do jornal Expresso" },
  { slug: "alerta_emprego", name: "Alerta Emprego", domain: "alertaemprego.pt", description: "Agregador de ofertas de emprego" },
  { slug: "portal_emprego", name: "Portal Emprego", domain: "portalemprego.pt", description: "Portal nacional de emprego" },
  { slug: "jobleads", name: "JobLeads", domain: "jobleads.com", description: "Vagas premium e executivas" },
  { slug: "dataannotation", name: "DataAnnotation", domain: "dataannotation.tech", description: "Trabalho remoto em IA e dados" },
];

export default function TalentSearchPage() {
  const [query, setQuery] = useState("");
  const [location, setLocation] = useState("");
  const [rssUrl, setRssUrl] = useState("");
  const [searchType, setSearchType] = useState<string>("candidate");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [resultTypeFilter, setResultTypeFilter] = useState<string>("all");
  const [portalKeywords, setPortalKeywords] = useState("");
  const [importingPortal, setImportingPortal] = useState<string | null>(null);

  const { data: results = [], isLoading } = useTalentResults({
    search_type: resultTypeFilter !== "all" ? resultTypeFilter : undefined,
    status: statusFilter !== "all" ? statusFilter : undefined,
  });

  const searchMutation = useSearchTalent();
  const dismissMutation = useDismissTalentResult();
  const importMutation = useImportTalentResult();
  const portalImportMutation = usePortalImport();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchType === "rss_feed") {
      if (!rssUrl.trim()) return;
      searchMutation.mutate({ search_type: "rss_feed", rss_url: rssUrl.trim() });
    } else {
      if (!query.trim()) return;
      searchMutation.mutate({ search_type: searchType, query: query.trim(), location: location.trim() || undefined });
    }
  };

  const handlePortalImport = (portalSlug: string) => {
    setImportingPortal(portalSlug);
    portalImportMutation.mutate(
      { portal_slug: portalSlug, keywords: portalKeywords.trim() || undefined },
      { onSettled: () => setImportingPortal(null) }
    );
  };

  return (
    <div className="space-y-6">
      <HRBreadcrumb />

      <div>
        <h1 className="text-2xl font-bold text-foreground">Pesquisa de Talento</h1>
        <p className="text-muted-foreground">Pesquise candidatos e ofertas de emprego na web com IA</p>
      </div>

      {/* Integrated Portals */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Building2 className="h-5 w-5 text-primary" />
            Portais Integrados
          </CardTitle>
          <p className="text-sm text-muted-foreground">Importe vagas dos principais portais de emprego portugueses com um clique</p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Palavras-chave opcionais (ex: React, Marketing...)"
                value={portalKeywords}
                onChange={(e) => setPortalKeywords(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {PORTALS.map((portal) => (
              <div
                key={portal.slug}
                className="flex items-center gap-3 p-3 rounded-lg border border-border/60 hover:border-primary/40 hover:bg-accent/30 transition-all"
              >
                <img
                  src={`https://www.google.com/s2/favicons?domain=${portal.domain}&sz=32`}
                  alt=""
                  className="h-8 w-8 rounded shrink-0"
                  onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                />
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm text-foreground truncate">{portal.name}</p>
                  <p className="text-xs text-muted-foreground truncate">{portal.description}</p>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  className="shrink-0"
                  disabled={importingPortal === portal.slug || portalImportMutation.isPending}
                  onClick={() => handlePortalImport(portal.slug)}
                >
                  {importingPortal === portal.slug ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Download className="h-4 w-4" />
                  )}
                </Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Search form */}
      <Card>
        <CardContent className="pt-6">
          <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-3">
            <Select value={searchType} onValueChange={setSearchType}>
              <SelectTrigger className="w-full sm:w-[200px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="candidate">Candidatos</SelectItem>
                <SelectItem value="job_offer">Ofertas de emprego</SelectItem>
                <SelectItem value="rss_feed">Feed RSS / Portal</SelectItem>
              </SelectContent>
            </Select>

            {searchType === "rss_feed" ? (
              <div className="flex-1 relative">
                <Rss className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="URL do feed RSS (ex: https://www.net-empregos.com/rssfeed.asp)"
                  value={rssUrl}
                  onChange={(e) => setRssUrl(e.target.value)}
                  className="pl-10"
                />
              </div>
            ) : (
              <>
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder={searchType === "candidate" ? "Ex: Desenvolvedor React, Designer UX..." : "Ex: Marketing Manager, Engenheiro Civil..."}
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>

                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Localização"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    className="pl-10 w-full sm:w-[180px]"
                  />
                </div>
              </>
            )}

            <Button type="submit" disabled={searchMutation.isPending || (searchType === "rss_feed" ? !rssUrl.trim() : !query.trim())}>
              {searchMutation.isPending ? (
                <><Loader2 className="h-4 w-4 mr-2 animate-spin" />A pesquisar...</>
              ) : searchType === "rss_feed" ? (
                <><Rss className="h-4 w-4 mr-2" />Importar feed</>
              ) : (
                <><Search className="h-4 w-4 mr-2" />Pesquisar</>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Filters */}
      <div className="flex flex-wrap gap-4 items-center">
        <Tabs value={statusFilter} onValueChange={setStatusFilter}>
          <TabsList>
            <TabsTrigger value="all">Todos</TabsTrigger>
            <TabsTrigger value="new">Novos</TabsTrigger>
            <TabsTrigger value="imported">Importados</TabsTrigger>
            <TabsTrigger value="dismissed">Descartados</TabsTrigger>
          </TabsList>
        </Tabs>

        <Select value={resultTypeFilter} onValueChange={setResultTypeFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Tipo de resultado" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os tipos</SelectItem>
            <SelectItem value="candidate">Candidatos</SelectItem>
            <SelectItem value="job_offer">Ofertas</SelectItem>
          </SelectContent>
        </Select>

        <span className="text-sm text-muted-foreground ml-auto">
          {results.length} resultado{results.length !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Results */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : results.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <Search className="h-12 w-12 text-muted-foreground/30 mb-4" />
            <h3 className="text-lg font-medium text-foreground">Sem resultados</h3>
            <p className="text-muted-foreground text-sm mt-1">
              Pesquise por candidatos, ofertas ou importe de um portal integrado
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {results.map((r) => (
            <ResultCard
              key={r.id}
              result={r}
              onDismiss={() => dismissMutation.mutate(r.id)}
              onImport={(importAs) => importMutation.mutate({ result: r, importAs })}
              isImporting={importMutation.isPending}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function ResultCard({
  result,
  onDismiss,
  onImport,
  isImporting,
}: {
  result: TalentResult;
  onDismiss: () => void;
  onImport: (importAs: "candidate" | "job_posting") => void;
  isImporting: boolean;
}) {
  const ed = result.extracted_data || {};

  return (
    <Card className="hover:shadow-sm transition-shadow">
      <CardContent className="p-5">
        <div className="flex flex-col sm:flex-row gap-4 justify-between">
          <div className="flex-1 min-w-0 space-y-2">
            <div className="flex items-start gap-2 flex-wrap">
              <h3 className="font-semibold text-foreground truncate">{result.title || "Sem título"}</h3>
              <Badge variant={STATUS_VARIANT[result.status] || "secondary"} className="shrink-0">
                {STATUS_LABELS[result.status] || result.status}
              </Badge>
            </div>

            <div className="flex items-center gap-3 text-sm text-muted-foreground flex-wrap">
              {result.source_platform && (
                <span className="flex items-center gap-1">
                  <Globe className="h-3.5 w-3.5" />
                  {result.source_platform}
                </span>
              )}
              {result.location && (
                <span className="flex items-center gap-1">
                  <MapPin className="h-3.5 w-3.5" />
                  {result.location}
                </span>
              )}
              {ed.experience_years && <span>{ed.experience_years} anos exp.</span>}
              {ed.company && <span>{ed.company}</span>}
              {ed.employment_type && <span>{ed.employment_type}</span>}
            </div>

            {result.description && (
              <p className="text-sm text-muted-foreground line-clamp-2">{result.description}</p>
            )}

            {result.skills && result.skills.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {result.skills.slice(0, 8).map((skill, i) => (
                  <Badge key={i} variant="outline" className="text-xs">{skill}</Badge>
                ))}
                {result.skills.length > 8 && (
                  <Badge variant="outline" className="text-xs">+{result.skills.length - 8}</Badge>
                )}
              </div>
            )}
          </div>

          <div className="flex sm:flex-col gap-2 shrink-0">
            {result.source_url && (
              <Button variant="outline" size="sm" asChild>
                <a href={result.source_url} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="h-4 w-4 mr-1" />Ver fonte
                </a>
              </Button>
            )}

            {result.status === "new" && (
              <>
                {result.search_type === "candidate" ? (
                  <Button size="sm" onClick={() => onImport("candidate")} disabled={isImporting}>
                    <UserPlus className="h-4 w-4 mr-1" />Importar candidato
                  </Button>
                ) : (
                  <Button size="sm" onClick={() => onImport("job_posting")} disabled={isImporting}>
                    <Briefcase className="h-4 w-4 mr-1" />Importar vaga
                  </Button>
                )}

                <Button variant="ghost" size="sm" onClick={onDismiss}>
                  <X className="h-4 w-4 mr-1" />Descartar
                </Button>
              </>
            )}

            {result.status === "imported" && result.imported_as && (
              <Badge variant="outline" className="text-xs justify-center">
                {result.imported_as === "candidate" ? "→ Candidato" : "→ Vaga"}
              </Badge>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}