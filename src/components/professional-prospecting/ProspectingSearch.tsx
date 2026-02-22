import { useState, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Search, Globe, Link, Loader2, MapPin, Briefcase, Tags, Instagram, Facebook } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export interface SearchPrefill {
  profession: string;
  location: string;
  keywords: string;
  platforms: string[];
}

interface ProspectingSearchProps {
  onSearchComplete: (searchId: string) => void;
  prefill?: SearchPrefill | null;
}

const PROFESSION_SUGGESTIONS = [
  "Médico Dentista",
  "Dermatologista",
  "Fisioterapeuta",
  "Nutricionista",
  "Psicólogo",
  "Advogado",
  "Arquiteto",
  "Designer de Interiores",
  "Cabeleireiro",
  "Esteticista",
  "Personal Trainer",
  "Coach",
  "Consultor Financeiro",
];

export function ProspectingSearch({ onSearchComplete, prefill }: ProspectingSearchProps) {
  const { currentWorkspace } = useWorkspace();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [searchMode, setSearchMode] = useState<"web" | "manual">("web");
  const [isSearching, setIsSearching] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // Web search state
  const [profession, setProfession] = useState(prefill?.profession || "");
  const [location, setLocation] = useState(prefill?.location || "");
  const [keywords, setKeywords] = useState(prefill?.keywords || "");
  const [platforms, setPlatforms] = useState<string[]>(prefill?.platforms || ["instagram", "facebook"]);

  // Manual input state
  const [manualUrls, setManualUrls] = useState("");

  // Update fields when prefill changes
  useEffect(() => {
    if (prefill) {
      setProfession(prefill.profession);
      setLocation(prefill.location);
      setKeywords(prefill.keywords);
      setPlatforms(prefill.platforms);
      setSearchMode("web");
    }
  }, [prefill]);

  const togglePlatform = (platform: string) => {
    setPlatforms(prev => 
      prev.includes(platform) 
        ? prev.filter(p => p !== platform)
        : [...prev, platform]
    );
  };

  const handleWebSearch = async () => {
    if (!profession.trim()) {
      toast.error("Indique uma profissão para pesquisar");
      return;
    }

    if (!currentWorkspace?.id || !user?.id) {
      toast.error("Workspace não encontrado");
      return;
    }

    setIsSearching(true);
    try {
      const { data, error } = await supabase.functions.invoke("professional-prospecting-search", {
        body: {
          profession: profession.trim(),
          location: location.trim() || null,
          keywords: keywords.trim() || null,
          workspaceId: currentWorkspace.id,
          userId: user.id,
          platforms: platforms.length > 0 ? platforms : ["instagram"],
        },
      });

      if (error) throw error;

      if (!data.success) {
        if (data.error?.includes("limit")) {
          toast.error("Limite de pesquisas atingido", {
            description: "Aguarde o próximo mês ou contacte o suporte.",
          });
        } else {
          toast.error(data.error || "Erro na pesquisa");
        }
        return;
      }

      const filteredMsg = data.filteredCount > 0 
        ? ` (${data.filteredCount} já existentes removidos)` 
        : "";
      toast.success(`${data.count} perfis encontrados${filteredMsg}`, {
        description: "A analisar com IA...",
      });

      // Now analyze the profiles
      if (data.profiles && data.profiles.length > 0) {
        setIsAnalyzing(true);
        const { data: analysisData, error: analysisError } = await supabase.functions.invoke(
          "professional-prospecting-analyze",
          {
            body: {
              profiles: data.profiles,
              workspaceId: currentWorkspace.id,
              searchId: data.searchId,
              autoEnrichInstagram: true,
            },
          }
        );

        if (analysisError) {
          console.error("Analysis error:", analysisError);
          toast.error("Erro na análise de perfis", {
            description: "Os perfis não foram guardados. Tente novamente.",
          });
          return; // Don't navigate to results if analysis failed
        } else if (analysisData?.success) {
          toast.success(`${analysisData.analyzed} perfis analisados`);
          // Invalidate cache and navigate only on success
          queryClient.invalidateQueries({ queryKey: ["prospecting-profiles"] });
          onSearchComplete(data.searchId);
        } else {
          // Analysis returned but was not successful
          const errorMsg = analysisData?.error || "Erro desconhecido na análise";
          console.error("Analysis not successful:", errorMsg);
          toast.error("Erro na análise de perfis", {
            description: errorMsg,
          });
          return;
        }
      } else {
        // No profiles found, still navigate
        onSearchComplete(data.searchId);
      }
    } catch (error) {
      console.error("Search error:", error);
      toast.error("Erro ao pesquisar", {
        description: error instanceof Error ? error.message : "Tente novamente",
      });
    } finally {
      setIsSearching(false);
      setIsAnalyzing(false);
    }
  };

  const handleManualAnalysis = async () => {
    const urls = manualUrls
      .split("\n")
      .map((url) => url.trim())
      .filter((url) => url.length > 0);

    if (urls.length === 0) {
      toast.error("Cole pelo menos uma URL de perfil");
      return;
    }

    if (!currentWorkspace?.id) {
      toast.error("Workspace não encontrado");
      return;
    }

    setIsAnalyzing(true);
    try {
      const profiles = urls.map((url) => ({
        profileUrl: url,
        profileName: null,
        profileBio: null,
      }));

      const { data, error } = await supabase.functions.invoke("professional-prospecting-analyze", {
        body: {
          profiles,
          workspaceId: currentWorkspace.id,
          searchId: null,
        },
      });

      if (error) throw error;

      if (!data.success) {
        toast.error(data.error || "Erro na análise");
        return;
      }

      toast.success(`${data.analyzed} perfis analisados`);
      
      // Clear the input
      setManualUrls("");
      
      // Navigate to results (no searchId for manual)
      onSearchComplete("");
    } catch (error) {
      console.error("Analysis error:", error);
      toast.error("Erro ao analisar perfis");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const isLoading = isSearching || isAnalyzing;

  return (
    <div className="grid md:grid-cols-2 gap-6">
      {/* Search Form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="w-5 h-5" />
            Nova Pesquisa
          </CardTitle>
          <CardDescription>
            Encontre profissionais individuais por profissão e localização
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={searchMode} onValueChange={(v) => setSearchMode(v as "web" | "manual")}>
            <TabsList className="grid w-full grid-cols-2 mb-4">
              <TabsTrigger value="web" className="gap-2">
                <Globe className="w-4 h-4" />
                Pesquisa Web
              </TabsTrigger>
              <TabsTrigger value="manual" className="gap-2">
                <Link className="w-4 h-4" />
                URLs Manuais
              </TabsTrigger>
            </TabsList>

            <TabsContent value="web" className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="profession" className="flex items-center gap-2">
                  <Briefcase className="w-4 h-4" />
                  Profissão *
                </Label>
                <Input
                  id="profession"
                  placeholder="Ex: Médico Dentista, Cabeleireiro..."
                  value={profession}
                  onChange={(e) => setProfession(e.target.value)}
                  disabled={isLoading}
                />
                <div className="flex flex-wrap gap-1 mt-1">
                  {PROFESSION_SUGGESTIONS.slice(0, 5).map((p) => (
                    <Button
                      key={p}
                      variant="ghost"
                      size="sm"
                      className="h-6 text-xs px-2"
                      onClick={() => setProfession(p)}
                      disabled={isLoading}
                    >
                      {p}
                    </Button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="location" className="flex items-center gap-2">
                  <MapPin className="w-4 h-4" />
                  Localização
                </Label>
                <Input
                  id="location"
                  placeholder="Ex: Lisboa, Porto, Braga..."
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  disabled={isLoading}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="keywords" className="flex items-center gap-2">
                  <Tags className="w-4 h-4" />
                  Palavras-chave (opcional)
                </Label>
                <Input
                  id="keywords"
                  placeholder="Ex: implantologia, estética facial..."
                  value={keywords}
                  onChange={(e) => setKeywords(e.target.value)}
                  disabled={isLoading}
                />
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium">Plataformas</Label>
                <div className="flex gap-6">
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="platform-instagram"
                      checked={platforms.includes("instagram")}
                      onCheckedChange={() => togglePlatform("instagram")}
                      disabled={isLoading}
                    />
                    <label htmlFor="platform-instagram" className="flex items-center gap-1.5 text-sm cursor-pointer">
                      <Instagram className="w-4 h-4 text-pink-500" />
                      Instagram
                    </label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="platform-facebook"
                      checked={platforms.includes("facebook")}
                      onCheckedChange={() => togglePlatform("facebook")}
                      disabled={isLoading}
                    />
                    <label htmlFor="platform-facebook" className="flex items-center gap-1.5 text-sm cursor-pointer">
                      <Facebook className="w-4 h-4 text-blue-600" />
                      Facebook
                    </label>
                  </div>
                </div>
                {platforms.length === 0 && (
                  <p className="text-xs text-destructive">Selecione pelo menos uma plataforma</p>
                )}
              </div>

              <Button
                className="w-full"
                onClick={handleWebSearch}
                disabled={isLoading || !profession.trim() || platforms.length === 0}
              >
                {isSearching ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    A pesquisar...
                  </>
                ) : isAnalyzing ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    A analisar com IA...
                  </>
                ) : (
                  <>
                    <Search className="w-4 h-4 mr-2" />
                    Pesquisar Profissionais
                  </>
                )}
              </Button>
            </TabsContent>

            <TabsContent value="manual" className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="urls">URLs de Perfis (uma por linha)</Label>
                <Textarea
                  id="urls"
                  placeholder={`https://instagram.com/dra.maria.dentista
https://instagram.com/joao.fisio
https://linkedin.com/in/ana-psicologa`}
                  value={manualUrls}
                  onChange={(e) => setManualUrls(e.target.value)}
                  rows={8}
                  disabled={isLoading}
                />
                <p className="text-xs text-muted-foreground">
                  Suportamos Instagram, LinkedIn, Facebook e websites
                </p>
              </div>

              <Button
                className="w-full"
                onClick={handleManualAnalysis}
                disabled={isLoading || !manualUrls.trim()}
              >
                {isAnalyzing ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    A analisar com IA...
                  </>
                ) : (
                  <>
                    <Search className="w-4 h-4 mr-2" />
                    Analisar Perfis
                  </>
                )}
              </Button>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* How it Works */}
      <Card>
        <CardHeader>
          <CardTitle>Como funciona</CardTitle>
          <CardDescription>Pesquisa assistida por IA, controlo humano</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <div className="flex gap-3">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold">
                1
              </div>
              <div>
                <p className="font-medium">Defina a pesquisa</p>
                <p className="text-sm text-muted-foreground">
                  Escolha profissão, localização e palavras-chave
                </p>
              </div>
            </div>

            <div className="flex gap-3">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold">
                2
              </div>
              <div>
                <p className="font-medium">IA analisa perfis</p>
                <p className="text-sm text-muted-foreground">
                  Identifica profissão, especialidade e gera Lead Score
                </p>
              </div>
            </div>

            <div className="flex gap-3">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold">
                3
              </div>
              <div>
                <p className="font-medium">Reveja resultados</p>
                <p className="text-sm text-muted-foreground">
                  Veja análise detalhada com nível de confiança
                </p>
              </div>
            </div>

            <div className="flex gap-3">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold">
                4
              </div>
              <div>
                <p className="font-medium">Crie leads qualificados</p>
                <p className="text-sm text-muted-foreground">
                  Converta perfis interessantes em leads do CRM
                </p>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t">
            <p className="text-sm text-muted-foreground">
              <strong>Nota:</strong> Este módulo pesquisa apenas dados públicos. A IA infere
              informações com base no conteúdo visível. Sempre valide antes de contactar.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
