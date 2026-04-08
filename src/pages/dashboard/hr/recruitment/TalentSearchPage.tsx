import { useState } from "react";
import { HRBreadcrumb } from "@/components/hr/HRBreadcrumb";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search, Loader2, ExternalLink, UserPlus, Briefcase, X, MapPin, Globe } from "lucide-react";
import {
  useTalentResults,
  useSearchTalent,
  useDismissTalentResult,
  useImportTalentResult,
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

export default function TalentSearchPage() {
  const [query, setQuery] = useState("");
  const [location, setLocation] = useState("");
  const [searchType, setSearchType] = useState<string>("candidate");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const { data: results = [], isLoading } = useTalentResults({
    search_type: searchType,
    status: statusFilter !== "all" ? statusFilter : undefined,
  });

  const searchMutation = useSearchTalent();
  const dismissMutation = useDismissTalentResult();
  const importMutation = useImportTalentResult();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    searchMutation.mutate({ search_type: searchType, query: query.trim(), location: location.trim() || undefined });
  };

  return (
    <div className="space-y-6">
      <HRBreadcrumb />

      <div>
        <h1 className="text-2xl font-bold text-foreground">Pesquisa de Talento</h1>
        <p className="text-muted-foreground">Pesquise candidatos e ofertas de emprego na web com IA</p>
      </div>

      {/* Search form */}
      <Card>
        <CardContent className="pt-6">
          <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-3">
            <Select value={searchType} onValueChange={setSearchType}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="candidate">Candidatos</SelectItem>
                <SelectItem value="job_offer">Ofertas de emprego</SelectItem>
              </SelectContent>
            </Select>

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

            <Button type="submit" disabled={searchMutation.isPending || !query.trim()}>
              {searchMutation.isPending ? (
                <><Loader2 className="h-4 w-4 mr-2 animate-spin" />A pesquisar...</>
              ) : (
                <><Search className="h-4 w-4 mr-2" />Pesquisar</>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Filters */}
      <Tabs value={statusFilter} onValueChange={setStatusFilter}>
        <TabsList>
          <TabsTrigger value="all">Todos</TabsTrigger>
          <TabsTrigger value="new">Novos</TabsTrigger>
          <TabsTrigger value="imported">Importados</TabsTrigger>
          <TabsTrigger value="dismissed">Descartados</TabsTrigger>
        </TabsList>
      </Tabs>

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
              Pesquise por candidatos ou ofertas de emprego para começar
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
                  <Button
                    size="sm"
                    onClick={() => onImport("candidate")}
                    disabled={isImporting}
                  >
                    <UserPlus className="h-4 w-4 mr-1" />Importar candidato
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    onClick={() => onImport("job_posting")}
                    disabled={isImporting}
                  >
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
