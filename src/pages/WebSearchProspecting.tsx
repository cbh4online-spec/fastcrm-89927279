import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useWorkspaceInstance } from "@/contexts/WorkspaceInstanceContext";
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
import { supabase } from "@/integrations/supabase/client";
import { useProspectingSearchHistory } from "@/hooks/useProspectingSearchHistory";
import { safeRandomId } from "@/lib/browser/safeBrowser";
import { assertProspectingIdentityReady, checkProspectingIdentity, describeProspectingIdentity, importProspectingLead, isSeparateProspectingInstance, prospectingIdentityHref, PROSPECTING_INSTANCE_NOT_READY_MESSAGE, SEPARATE_PROSPECTING_INSTANCE_MESSAGE, type ProspectingIdentityCheck } from "@/lib/prospecting/identity";
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
  identity?: ProspectingIdentityCheck;
  previouslyFound?: boolean;
}
interface WebSearchItem {
  url?: string;
  title?: string;
  description?: string;
  markdown?: string;
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
  
  const { currentWorkspace } = useWorkspace();
  const { workspaceClient, instanceData, isLoading: isInstanceLoading, error: instanceError } = useWorkspaceInstance();
  const { searches, allPreviousIdentifiers, saveSearch } = useProspectingSearchHistory("web_search");

  useEffect(() => {
    setResults([]);
    setHasSearched(false);
  }, [currentWorkspace?.id]);

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      toast.error("Introduza um termo de pesquisa");
      return;
    }
    if (!currentWorkspace?.id) {
      toast.error("Selecione um espaço de trabalho");
      return;
    }
    if (isInstanceLoading || instanceError) {
      toast.error(PROSPECTING_INSTANCE_NOT_READY_MESSAGE);
      return;
    }
    if (isSeparateProspectingInstance(instanceData?.supabase_url, import.meta.env.VITE_SUPABASE_URL)) {
      toast.error(SEPARATE_PROSPECTING_INSTANCE_MESSAGE);
      return;
    }
    try {
      await assertProspectingIdentityReady(workspaceClient, currentWorkspace.id);
    } catch (error) {
      toast.error("A verificação de duplicados não está pronta; a pesquisa não foi iniciada.", {
        description: error instanceof Error ? error.message : undefined,
      });
      return;
    }

    setIsSearching(true);
    setHasSearched(true);
    setResults([]);

    try {
      const response = await firecrawlApi.searchProspects(searchQuery, currentWorkspace.id, {
        limit: 15,
        lang: "pt",
        country: "pt",
        scrapeOptions: { formats: ["markdown"] },
      }, safeRandomId());

      if (response.success && Array.isArray(response.data)) {
        const searchResults: WebResult[] = await Promise.all((response.data as WebSearchItem[]).map(async (item) => {
          const url = item.url || "";
          const title = item.title || item.url || "Sem título";
          const cleanName = cleanTitle(title);
          let identity: ProspectingIdentityCheck;
          try {
            identity = await checkProspectingIdentity(workspaceClient, currentWorkspace.id, {
              name: cleanName, website: url, profile_url: url,
            });
          } catch {
            identity = { status: "unavailable", matches: [] };
          }
          return {
            url,
            title,
            description: item.description || item.markdown?.substring(0, 200) || "",
            markdown: item.markdown || "",
            added: false,
            identity,
            previouslyFound: allPreviousIdentifiers.has(url),
          };
        }));
        
        // Sort: new results first, then previously found, then existing
        const sorted = [...searchResults].sort((a, b) => {
          if (a.identity?.status !== b.identity?.status) return a.identity?.status === "new" ? -1 : 1;
          if (a.previouslyFound !== b.previouslyFound) return a.previouslyFound ? 1 : -1;
          return 0;
        });
        
        setResults(sorted);
        if (sorted.some(r => r.identity?.status === "unavailable")) {
          toast.error("Alguns resultados não puderam ser verificados; a sua importação ficou bloqueada.");
        }
        
        const newCount = sorted.filter(r => r.identity?.status === "new" && !r.previouslyFound).length;
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
      if (isInstanceLoading || instanceError) {
        toast.error(PROSPECTING_INSTANCE_NOT_READY_MESSAGE);
        return;
      }
      if (isSeparateProspectingInstance(instanceData?.supabase_url, import.meta.env.VITE_SUPABASE_URL)) {
        toast.error(SEPARATE_PROSPECTING_INSTANCE_MESSAGE);
        return;
      }
      if (!currentWorkspace?.id || !result.identity || result.identity.status === "unavailable") {
        toast.error("Verificação de duplicados indisponível. Tente novamente.");
        return;
      }
      if (["exists", "opportunity", "blocked"].includes(result.identity.status)) {
        toast.error(describeProspectingIdentity(result.identity));
        return;
      }
      const allowPossible = result.identity.status === "review";
      if (allowPossible && !window.confirm(`${describeProspectingIdentity(result.identity)}\n\nConfirma que pretende criar um novo lead?`)) return;
      const cleanName = cleanTitle(result.title);
      
      const importResult = await importProspectingLead(workspaceClient, currentWorkspace.id, {
        name: cleanName,
        source: "web_search",
        status: "new",
        lead_type: "company",
        website: result.url,
        about: result.description?.substring(0, 500) || null,
      }, undefined, allowPossible);
      if (!importResult.lead_id) {
        setResults(prev => prev.map((r, i) => i === index ? { ...r, identity: importResult } : r));
        toast.error("Lead não criado", { description: describeProspectingIdentity(importResult) });
        return;
      }
      
      // Mark as added
      setResults(prev => prev.map((r, i) => 
        i === index ? { ...r, added: true, enriching: !!result.markdown } : r
      ));

      const fieldsAdded = ["nome", "website", "descrição"];
      toast.success(`"${cleanName}" adicionado com ${fieldsAdded.join(", ")}`, {
        description: result.markdown ? "A enriquecer com IA..." : undefined,
      });
      
      // Fire-and-forget AI enrichment if we have markdown
      if (result.markdown) {
        enrichLeadFromMarkdown(importResult.lead_id, result).catch(err => {
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
      const updates: Record<string, string> = {};
      if (extracted.company_name) updates.company_name = extracted.company_name;
      if (extracted.about) updates.about = extracted.about;
      if (extracted.industry) updates.industry = extracted.industry;
      if (extracted.city) updates.city = extracted.city;
      if (extracted.address) updates.address = extracted.address;
      // AI contact fields need a separate identity review before being saved.
      const suggestedContacts = [extracted.phone && `Telefone sugerido: ${extracted.phone}`,
        extracted.email && `Email sugerido: ${extracted.email}`,
        extracted.website && `Website sugerido: ${extracted.website}`].filter(Boolean);
      if (suggestedContacts.length > 0) updates.notes = suggestedContacts.join("\n");

      if (Object.keys(updates).length > 0) {
        const { error: updateError } = await workspaceClient
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
                    ({s.results_count} resultados)
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
                  <Card key={index} className={`hover:shadow-md transition-shadow ${result.identity?.status !== "new" ? "border-muted" : ""}`}>
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
                            {result.identity?.status && result.identity.status !== "new" && (
                              <Badge variant="destructive" className="shrink-0 text-xs gap-1">
                                <AlertTriangle className="h-3 w-3" />
                                {result.identity.status === "review" ? "Rever" : result.identity.status === "unavailable" ? "Sem verificação" : result.identity.status === "opportunity" ? "Oportunidade em curso" : result.identity.status === "blocked" ? "Não contactar" : "Já existe"}
                              </Badge>
                            )}
                            {result.identity?.status === "new" && result.previouslyFound && (
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
                          {result.identity?.status && result.identity.status !== "new" && (
                            <p className="text-xs text-muted-foreground">
                              {describeProspectingIdentity(result.identity)}{" "}
                              {prospectingIdentityHref(result.identity) && (
                                <Link to={prospectingIdentityHref(result.identity)!} className="text-primary underline">Abrir registo</Link>
                              )}
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
                          disabled={result.added || result.identity?.status === "unavailable" || ["exists", "opportunity", "blocked"].includes(result.identity?.status ?? "")}
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
