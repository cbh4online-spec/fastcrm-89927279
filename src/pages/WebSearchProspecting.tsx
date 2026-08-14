import { useState } from "react";
import { PageBreadcrumbs } from "@/components/layout/PageBreadcrumbs";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { ProspectingBackButton } from "@/components/prospecting/ProspectingBackButton";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Search, Globe, Building2, ExternalLink, Plus, Loader2, Check, Sparkles, Linkedin, MapPin, History, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { firecrawlApi } from "@/lib/api/firecrawl";
import { useCreateLead } from "@/hooks/useLeads";
import { supabase } from "@/integrations/supabase/client";
import { useProspectingSearchHistory, useExistingLeadIdentifiers } from "@/hooks/useProspectingSearchHistory";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { format } from "date-fns";
import { pt } from "date-fns/locale";

interface WebResult {
  url: string;
  title: string;
  description: string;
  markdown?: string;
  added?: boolean;
  enriching?: boolean;
  alreadyExists?: boolean;
  previouslyFound?: boolean;
}

function detectContentType(url: string): { label: string; icon: typeof Globe } {
  if (url.includes("linkedin.com")) return { label: "LinkedIn", icon: Linkedin };
  if (url.includes("maps.google") || url.includes("google.com/maps")) return { label: "Google Maps", icon: MapPin };
  return { label: "Website", icon: Globe };
}

function cleanTitle(title: string): string {
  // Remove common SEO suffixes
  return title
    .replace(/\s*[-–|]\s*(LinkedIn|Facebook|Instagram|Google Maps|Yelp|TripAdvisor).*$/i, "")
    .replace(/\s*[-–|]\s*Home$/i, "")
    .replace(/\s*[-–|]\s*Página Inicial$/i, "")
    .trim();
}

export default function WebSearchProspecting() {
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [results, setResults] = useState<WebResult[]>([]);
  const [hasSearched, setHasSearched] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  
  const createLead = useCreateLead();
  const { searches, allPreviousIdentifiers, saveSearch } = useProspectingSearchHistory("web_search");
  const { isExistingLead } = useExistingLeadIdentifiers();

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
        scrapeOptions: { formats: ["markdown"] },
      });

      if (response.success && response.data) {
        const searchResults: WebResult[] = response.data.map((item: any) => {
          const url = item.url || "";
          const title = item.title || item.url || "Sem título";
          const cleanName = cleanTitle(title);
          return {
            url,
            title,
            description: item.description || item.markdown?.substring(0, 200) || "",
            markdown: item.markdown || "",
            added: false,
            alreadyExists: isExistingLead(cleanName, undefined, url),
            previouslyFound: allPreviousIdentifiers.has(url),
          };
        });
        
        // Sort: new results first, then previously found, then existing
        const sorted = [...searchResults].sort((a, b) => {
          if (a.alreadyExists !== b.alreadyExists) return a.alreadyExists ? 1 : -1;
          if (a.previouslyFound !== b.previouslyFound) return a.previouslyFound ? 1 : -1;
          return 0;
        });
        
        setResults(sorted);
        
        const newCount = sorted.filter(r => !r.alreadyExists && !r.previouslyFound).length;
        toast.success(`${sorted.length} resultados (${newCount} novos)`);
        
        // Save search history
        saveSearch.mutate({
          query: searchQuery,
          results_count: sorted.length,
          result_identifiers: sorted.map(r => r.url).filter(Boolean),
        });
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

  const handleAddToLeads = async (result: WebResult, index: number) => {
    try {
      const cleanName = cleanTitle(result.title);
      
      // Create lead with all available data
      const newLead = await createLead.mutateAsync({
        name: cleanName,
        source: "web_search",
        status: "new",
        lead_type: "company",
        website: result.url,
        about: result.description?.substring(0, 500) || null,
      });
      
      // Mark as added
      setResults(prev => prev.map((r, i) => 
        i === index ? { ...r, added: true, enriching: !!result.markdown } : r
      ));

      const fieldsAdded = ["nome", "website", "descrição"];
      toast.success(`"${cleanName}" adicionado com ${fieldsAdded.join(", ")}`, {
        description: result.markdown ? "A enriquecer com IA..." : undefined,
      });
      
      // Fire-and-forget AI enrichment if we have markdown
      if (result.markdown && newLead?.id) {
        enrichLeadFromMarkdown(newLead.id, result).catch(err => {
          console.warn("[WEB-SEARCH] AI enrichment failed:", err);
        }).finally(() => {
          setResults(prev => prev.map((r, i) => 
            i === index ? { ...r, enriching: false } : r
          ));
        });
      }
    } catch (error) {
      console.error("Error creating lead:", error);
      toast.error("Erro ao adicionar lead");
    }
  };

  const enrichLeadFromMarkdown = async (leadId: string, result: WebResult) => {
    try {
      const { data, error } = await supabase.functions.invoke("web-search-enrich", {
        body: {
          markdown: result.markdown,
          title: result.title,
          url: result.url,
          description: result.description,
        },
      });

      if (error || !data?.success || !data?.data) {
        console.warn("[WEB-SEARCH] Enrichment response:", data?.error || error?.message);
        return;
      }

      const extracted = data.data as Record<string, string>;
      if (Object.keys(extracted).length === 0) return;

      // Map extracted fields to lead update
      const updates: Record<string, any> = {};
      if (extracted.company_name) updates.company_name = extracted.company_name;
      if (extracted.about) updates.about = extracted.about;
      if (extracted.industry) updates.industry = extracted.industry;
      if (extracted.city) updates.city = extracted.city;
      if (extracted.address) updates.address = extracted.address;
      if (extracted.phone) updates.phone = extracted.phone;
      if (extracted.email) updates.email = extracted.email;
      if (extracted.website) updates.website = extracted.website;

      if (Object.keys(updates).length > 0) {
        const { error: updateError } = await supabase
          .from("leads")
          .update(updates)
          .eq("id", leadId);

        if (updateError) {
          console.warn("[WEB-SEARCH] Lead update failed:", updateError);
        } else {
          const fieldNames = Object.keys(updates).join(", ");
          console.log(`[WEB-SEARCH] Lead ${leadId} enriched: ${fieldNames}`);
          toast.success(`Dados enriquecidos: ${fieldNames}`, { duration: 3000 });
        }
      }
    } catch (err) {
      console.warn("[WEB-SEARCH] enrichLeadFromMarkdown error:", err);
    }
  };

  return (
    <DashboardLayout>
    <div className="p-6 space-y-6">
      <PageBreadcrumbs
        items={[
          { label: "Prospecção", href: "/dashboard/prospecting" },
          { label: "Pesquisa Web" },
        ]}
      />

      <div>
        <ProspectingBackButton />
        <h1 className="text-2xl font-bold tracking-tight">Pesquisa Web</h1>
        <p className="text-muted-foreground">
          Pesquise empresas na web e adicione-as como leads enriquecidos automaticamente
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5" />
            Pesquisar na Web
          </CardTitle>
          <CardDescription>
            Introduza termos de pesquisa para encontrar potenciais clientes. Os dados serão extraídos automaticamente com IA.
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

      {/* Search History */}
      {searches.length > 0 && (
        <Collapsible open={historyOpen} onOpenChange={setHistoryOpen}>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" className="gap-2 text-muted-foreground">
              <History className="h-4 w-4" />
              Pesquisas anteriores ({searches.length})
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="flex flex-wrap gap-2 mt-2">
              {searches.map((s) => (
                <Badge
                  key={s.id}
                  variant="outline"
                  className="cursor-pointer hover:bg-muted py-1.5 px-3"
                  onClick={() => {
                    setSearchQuery(s.query);
                    toast.info(`Pesquisa "${s.query}" carregada`);
                  }}
                >
                  <Search className="h-3 w-3 mr-1" />
                  {s.query}
                  <span className="ml-1 text-muted-foreground">
                    ({s.results_count} res. / {s.imported_count} imp.)
                  </span>
                  <span className="ml-1 text-muted-foreground text-[10px]">
                    {format(new Date(s.created_at), "dd/MM HH:mm", { locale: pt })}
                  </span>
                </Badge>
              ))}
            </div>
          </CollapsibleContent>
        </Collapsible>
      )}

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
              {results.map((result, index) => {
                const contentType = detectContentType(result.url);
                const ContentIcon = contentType.icon;
                return (
                  <Card key={index} className={`hover:shadow-md transition-shadow ${result.alreadyExists ? "opacity-60 border-muted" : ""}`}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 space-y-2">
                          <div className="flex items-center gap-2">
                            <Building2 className="h-4 w-4 text-muted-foreground shrink-0" />
                            <h3 className="font-semibold line-clamp-1">{cleanTitle(result.title)}</h3>
                            <Badge variant="outline" className="shrink-0 text-xs gap-1">
                              <ContentIcon className="h-3 w-3" />
                              {contentType.label}
                            </Badge>
                            {result.markdown && (
                              <Badge variant="secondary" className="shrink-0 text-xs gap-1">
                                <Sparkles className="h-3 w-3" />
                                IA
                              </Badge>
                            )}
                            {result.alreadyExists && (
                              <Badge variant="destructive" className="shrink-0 text-xs gap-1">
                                <AlertTriangle className="h-3 w-3" />
                                Já existe
                              </Badge>
                            )}
                            {!result.alreadyExists && result.previouslyFound && (
                              <Badge variant="secondary" className="shrink-0 text-xs gap-1">
                                <History className="h-3 w-3" />
                                Já encontrado
                              </Badge>
                            )}
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
                          variant={result.added ? "outline" : "default"}
                          onClick={() => handleAddToLeads(result, index)}
                          disabled={result.added || createLead.isPending}
                        >
                          {result.enriching ? (
                            <>
                              <Loader2 className="h-4 w-4 animate-spin mr-1" />
                              A enriquecer
                            </>
                          ) : result.added ? (
                            <>
                              <Check className="h-4 w-4 mr-1" />
                              Adicionado
                            </>
                          ) : (
                            <>
                              <Plus className="h-4 w-4 mr-1" />
                              Adicionar
                            </>
                          )}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
    </DashboardLayout>
  );
}
