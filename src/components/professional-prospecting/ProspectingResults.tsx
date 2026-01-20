import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  User, Building2, Users, HelpCircle, ExternalLink, 
  UserPlus, ThumbsDown, Search, Filter, Loader2,
  ChevronDown, ChevronUp, MapPin, Briefcase, Star,
  CheckCircle, XCircle, AlertCircle, RefreshCw, Instagram,
  Eye
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ConvertProfileDialog, ConversionOptions } from "./ConvertProfileDialog";

interface ProspectingResultsProps {
  searchId: string | null;
}

interface Profile {
  id: string;
  profile_url: string;
  profile_name: string | null;
  profile_bio: string | null;
  profile_image_url: string | null;
  platform: string;
  inferred_type: string | null;
  inferred_profession: string | null;
  inferred_specialty: string | null;
  inferred_location: string | null;
  inferred_workplace: string | null;
  confidence_score: number | null;
  lead_score: number | null;
  lead_score_explanation: string | null;
  lead_score_factors: {
    positive: string[];
    negative: string[];
  } | null;
  status: string;
  converted_lead_id: string | null;
  created_at: string;
  // Instagram enrichment fields
  instagram_followers_count: number | null;
  instagram_following_count: number | null;
  instagram_posts_count: number | null;
  instagram_full_bio: string | null;
  instagram_external_url: string | null;
  instagram_category: string | null;
  instagram_is_verified: boolean | null;
  instagram_is_business: boolean | null;
  instagram_enriched_at: string | null;
}

const TYPE_ICONS = {
  individual: User,
  clinic: Building2,
  company: Users,
  unknown: HelpCircle,
};

const TYPE_LABELS = {
  individual: "Profissional Individual",
  clinic: "Clínica/Consultório",
  company: "Empresa",
  unknown: "Não identificado",
};

const PLATFORM_COLORS: Record<string, string> = {
  instagram: "bg-pink-500/10 text-pink-500 border-pink-500/20",
  linkedin: "bg-blue-500/10 text-blue-500 border-blue-500/20",
  facebook: "bg-indigo-500/10 text-indigo-500 border-indigo-500/20",
  twitter: "bg-sky-500/10 text-sky-500 border-sky-500/20",
  other: "bg-muted text-muted-foreground",
};

export function ProspectingResults({ searchId }: ProspectingResultsProps) {
  const { currentWorkspace } = useWorkspace();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [searchFilter, setSearchFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [enrichingIds, setEnrichingIds] = useState<Set<string>>(new Set());
  const [convertDialogOpen, setConvertDialogOpen] = useState(false);
  const [profileToConvert, setProfileToConvert] = useState<Profile | null>(null);

  // Fetch profiles - if searchId provided, filter by it; otherwise get recent analyzed profiles
  const { data: profiles = [], isLoading, refetch } = useQuery({
    queryKey: ["prospecting-profiles", currentWorkspace?.id, searchId],
    queryFn: async () => {
      if (!currentWorkspace?.id) return [];

      console.log("Fetching profiles for workspace:", currentWorkspace.id, "searchId:", searchId);

      // Build query - RLS will automatically filter by accessible workspaces
      let query = supabase
        .from("professional_prospecting_profiles")
        .select("*")
        .eq("status", "analyzed")
        .order("created_at", { ascending: false })
        .order("lead_score", { ascending: false, nullsFirst: false });

      if (searchId) {
        // When we have a searchId, filter by it directly
        query = query.eq("search_id", searchId);
      } else {
        // Otherwise get recent profiles from current workspace
        query = query.eq("workspace_id", currentWorkspace.id);
        const yesterday = new Date();
        yesterday.setHours(yesterday.getHours() - 24);
        query = query.gte("created_at", yesterday.toISOString());
      }

      const { data, error } = await query.limit(100);
      
      console.log("Profiles query result:", data?.length || 0, "profiles, error:", error);
      
      if (error) {
        console.error("Error fetching profiles:", error);
        throw error;
      }
      return (data || []).map((p: any) => ({
        ...p,
        lead_score_factors: p.lead_score_factors as { positive: string[]; negative: string[] } | null,
      })) as Profile[];
    },
    enabled: !!currentWorkspace?.id,
    refetchInterval: searchId ? 3000 : false, // Refetch every 3 seconds only when analyzing
  });

  // Convert to lead mutation with enriched data
  const convertMutation = useMutation({
    mutationFn: async ({ profile, options }: { profile: Profile; options: ConversionOptions }) => {
      if (!currentWorkspace?.id || !user?.id) throw new Error("Missing context");

      // Build enriched notes
      const noteParts: string[] = [];
      
      if (options.includeAnalysisData) {
        noteParts.push(`📊 **Análise IA**`);
        if (profile.inferred_profession) noteParts.push(`- Profissão: ${profile.inferred_profession}`);
        if (profile.inferred_specialty) noteParts.push(`- Especialidade: ${profile.inferred_specialty}`);
        if (profile.inferred_workplace) noteParts.push(`- Local de trabalho: ${profile.inferred_workplace}`);
        if (profile.lead_score) noteParts.push(`- Lead Score: ${profile.lead_score}/100`);
      }

      if (options.includeInstagramData && profile.instagram_enriched_at) {
        noteParts.push(`\n📱 **Dados Instagram**`);
        if (profile.instagram_followers_count) noteParts.push(`- Seguidores: ${profile.instagram_followers_count.toLocaleString()}`);
        if (profile.instagram_posts_count) noteParts.push(`- Publicações: ${profile.instagram_posts_count.toLocaleString()}`);
        if (profile.instagram_category) noteParts.push(`- Categoria: ${profile.instagram_category}`);
        if (profile.instagram_full_bio) noteParts.push(`- Bio: "${profile.instagram_full_bio}"`);
        if (profile.instagram_is_business) noteParts.push(`- Conta profissional: Sim`);
        if (profile.instagram_is_verified) noteParts.push(`- Verificado: Sim`);
      }

      if (options.additionalNotes) {
        noteParts.push(`\n📝 **Notas**\n${options.additionalNotes}`);
      }

      const enrichedNotes = noteParts.join("\n");

      // Build comprehensive ai_insight including enriched data
      const aiInsightParts: string[] = [];
      aiInsightParts.push(`Profissão: ${profile.inferred_profession || "N/A"}`);
      aiInsightParts.push(`Especialidade: ${profile.inferred_specialty || "N/A"}`);
      aiInsightParts.push(`Score: ${profile.lead_score || 0}/100`);
      
      if (options.includeInstagramData && profile.instagram_followers_count) {
        aiInsightParts.push(`Seguidores: ${profile.instagram_followers_count.toLocaleString()}`);
      }
      
      // Full insight includes notes as extra context
      const fullAiInsight = aiInsightParts.join(" | ") + (enrichedNotes ? `\n\n${enrichedNotes}` : "");

      // Create lead with enriched data
      const { data: lead, error: leadError } = await supabase
        .from("leads")
        .insert([{
          workspace_id: currentWorkspace.id,
          name: profile.profile_name || "Sem nome",
          source: "professional_prospecting",
          status: "new",
          website: profile.profile_url,
          city: profile.inferred_location || null,
          business_category: profile.inferred_profession || null,
          ai_insight: fullAiInsight,
          lead_score: profile.lead_score || null,
          tags: options.tags.length > 0 ? options.tags : null,
          assigned_to: user.id,
          created_by: user.id,
          // Store Instagram context for AI suggestions
          instagram_url: profile.platform === "instagram" ? profile.profile_url : null,
          // Use Instagram profile picture as avatar
          avatar_url: profile.profile_image_url || null,
        }])
        .select()
        .single();

      if (leadError) throw leadError;

      // Update profile status
      await supabase
        .from("professional_prospecting_profiles")
        .update({
          status: "converted",
          converted_lead_id: lead.id,
          converted_at: new Date().toISOString(),
          converted_by: user.id,
        })
        .eq("id", profile.id);

      return lead;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["prospecting-profiles"] });
      queryClient.invalidateQueries({ queryKey: ["leads"] });
      setConvertDialogOpen(false);
      setProfileToConvert(null);
      toast.success("Lead criado com sucesso com dados enriquecidos!");
    },
    onError: (error) => {
      toast.error("Erro ao criar lead", {
        description: error instanceof Error ? error.message : "Tente novamente",
      });
    },
  });

  const handleConvertClick = (profile: Profile) => {
    setProfileToConvert(profile);
    setConvertDialogOpen(true);
  };

  const handleConvertConfirm = (options: ConversionOptions) => {
    if (profileToConvert) {
      convertMutation.mutate({ profile: profileToConvert, options });
    }
  };

  // Reject profile mutation
  const rejectMutation = useMutation({
    mutationFn: async (profileId: string) => {
      await supabase
        .from("professional_prospecting_profiles")
        .update({
          status: "rejected",
          rejection_reason: "Rejeitado pelo utilizador",
        })
        .eq("id", profileId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["prospecting-profiles"] });
      toast.success("Perfil rejeitado");
    },
  });

  // Enrich profile with Instagram data
  const enrichProfile = async (profile: Profile) => {
    if (profile.platform !== "instagram") {
      toast.error("Enriquecimento apenas disponível para perfis Instagram");
      return;
    }

    // Extract username from URL
    const urlMatch = profile.profile_url.match(/instagram\.com\/([a-zA-Z0-9._]+)/);
    if (!urlMatch) {
      toast.error("Não foi possível extrair o username do perfil");
      return;
    }
    const username = urlMatch[1];

    setEnrichingIds(prev => new Set(prev).add(profile.id));
    
    try {
      const { data, error } = await supabase.functions.invoke("enrich-instagram-profile", {
        body: {
          profileId: profile.id,
          username,
          workspaceId: currentWorkspace?.id,
        },
      });

      if (error) throw error;
      if (!data.success) throw new Error(data.error);

      toast.success(`Perfil enriquecido: ${data.data.followers?.toLocaleString() || 0} seguidores`);
      queryClient.invalidateQueries({ queryKey: ["prospecting-profiles"] });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao enriquecer perfil");
    } finally {
      setEnrichingIds(prev => {
        const next = new Set(prev);
        next.delete(profile.id);
        return next;
      });
    }
  };

  // Filter profiles
  const filteredProfiles = profiles.filter((p) => {
    const matchesSearch =
      !searchFilter ||
      p.profile_name?.toLowerCase().includes(searchFilter.toLowerCase()) ||
      p.inferred_profession?.toLowerCase().includes(searchFilter.toLowerCase()) ||
      p.inferred_specialty?.toLowerCase().includes(searchFilter.toLowerCase()) ||
      p.inferred_location?.toLowerCase().includes(searchFilter.toLowerCase());

    const matchesType = !typeFilter || p.inferred_type === typeFilter;

    return matchesSearch && matchesType;
  });

  const toggleSelect = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  const getScoreColor = (score: number | null) => {
    if (!score) return "text-muted-foreground";
    if (score >= 75) return "text-green-500";
    if (score >= 50) return "text-yellow-500";
    return "text-red-500";
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (profiles.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <Users className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium mb-2">Sem resultados</h3>
          <p className="text-muted-foreground mb-4">
            {searchId 
              ? "A aguardar análise dos perfis... Os resultados aparecerão automaticamente."
              : "Execute uma pesquisa para ver perfis analisados"
            }
          </p>
          {searchId && (
            <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="w-4 h-4 animate-spin" />
              A carregar resultados...
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap gap-4 items-center">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Filtrar por nome, profissão, localização..."
            value={searchFilter}
            onChange={(e) => setSearchFilter(e.target.value)}
            className="pl-10"
          />
        </div>

        <div className="flex gap-2">
          {Object.entries(TYPE_LABELS).map(([key, label]) => (
            <Button
              key={key}
              variant={typeFilter === key ? "default" : "outline"}
              size="sm"
              onClick={() => setTypeFilter(typeFilter === key ? null : key)}
            >
              {label}
            </Button>
          ))}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold">{profiles.length}</div>
            <p className="text-sm text-muted-foreground">Perfis analisados</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold">
              {profiles.filter((p) => p.inferred_type === "individual").length}
            </div>
            <p className="text-sm text-muted-foreground">Profissionais</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-green-500">
              {profiles.filter((p) => (p.lead_score || 0) >= 70).length}
            </div>
            <p className="text-sm text-muted-foreground">Score alto (&gt;70)</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold">
              {Math.round(
                profiles.reduce((sum, p) => sum + (p.confidence_score || 0), 0) /
                  profiles.length *
                  100
              )}%
            </div>
            <p className="text-sm text-muted-foreground">Confiança média</p>
          </CardContent>
        </Card>
      </div>

      {/* Results List */}
      <ScrollArea className="h-[600px]">
        <div className="space-y-3">
          {filteredProfiles.map((profile) => {
            const TypeIcon = TYPE_ICONS[profile.inferred_type as keyof typeof TYPE_ICONS] || HelpCircle;
            const isExpanded = expandedId === profile.id;

            return (
              <Card
                key={profile.id}
                className={cn(
                  "transition-all",
                  selectedIds.has(profile.id) && "ring-2 ring-primary"
                )}
              >
                <CardContent className="p-4">
                  <div className="flex items-start gap-4">
                    {/* Checkbox */}
                    <Checkbox
                      checked={selectedIds.has(profile.id)}
                      onCheckedChange={() => toggleSelect(profile.id)}
                    />

                    {/* Profile Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="font-medium truncate">
                              {profile.profile_name || "Sem nome"}
                            </h3>
                            <Badge
                              variant="outline"
                              className={PLATFORM_COLORS[profile.platform] || PLATFORM_COLORS.other}
                            >
                              {profile.platform}
                            </Badge>
                          </div>

                          <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <TypeIcon className="w-3 h-3" />
                              {TYPE_LABELS[profile.inferred_type as keyof typeof TYPE_LABELS] || "Desconhecido"}
                            </span>
                            {profile.inferred_profession && (
                              <span className="flex items-center gap-1">
                                <Briefcase className="w-3 h-3" />
                                {profile.inferred_profession}
                              </span>
                            )}
                            {profile.inferred_location && (
                              <span className="flex items-center gap-1">
                                <MapPin className="w-3 h-3" />
                                {profile.inferred_location}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Score */}
                        <div className="text-right">
                          <div className={cn("text-2xl font-bold", getScoreColor(profile.lead_score))}>
                            {profile.lead_score || 0}
                          </div>
                          <p className="text-xs text-muted-foreground">Lead Score</p>
                        </div>
                      </div>

                      {/* Expanded Details */}
                      {isExpanded && (
                        <div className="mt-4 pt-4 border-t space-y-4">
                          {/* Instagram Enrichment Data */}
                          {profile.instagram_enriched_at && (
                            <div className="bg-gradient-to-r from-pink-500/10 to-purple-500/10 rounded-lg p-4 border border-pink-500/20">
                              <div className="flex items-center gap-2 mb-3">
                                <Instagram className="w-4 h-4 text-pink-500" />
                                <span className="text-sm font-medium">Dados Instagram</span>
                                {profile.instagram_is_verified && (
                                  <Badge variant="secondary" className="text-xs">✓ Verificado</Badge>
                                )}
                                {profile.instagram_is_business && (
                                  <Badge variant="outline" className="text-xs">Profissional</Badge>
                                )}
                              </div>
                              <div className="grid grid-cols-3 gap-4 text-center">
                                <div>
                                  <div className="text-xl font-bold">{profile.instagram_posts_count?.toLocaleString() || 0}</div>
                                  <div className="text-xs text-muted-foreground">Publicações</div>
                                </div>
                                <div>
                                  <div className="text-xl font-bold">{profile.instagram_followers_count?.toLocaleString() || 0}</div>
                                  <div className="text-xs text-muted-foreground">Seguidores</div>
                                </div>
                                <div>
                                  <div className="text-xl font-bold">{profile.instagram_following_count?.toLocaleString() || 0}</div>
                                  <div className="text-xs text-muted-foreground">A seguir</div>
                                </div>
                              </div>
                              {profile.instagram_full_bio && (
                                <div className="mt-3 pt-3 border-t border-pink-500/20">
                                  <p className="text-sm text-muted-foreground">{profile.instagram_full_bio}</p>
                                </div>
                              )}
                              {profile.instagram_category && (
                                <div className="mt-2">
                                  <Badge variant="outline">{profile.instagram_category}</Badge>
                                </div>
                              )}
                            </div>
                          )}

                          {/* Enrich Button if Instagram and not enriched */}
                          {profile.platform === "instagram" && !profile.instagram_enriched_at && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => enrichProfile(profile)}
                              disabled={enrichingIds.has(profile.id)}
                              className="w-full border-pink-500/30 hover:bg-pink-500/10"
                            >
                              {enrichingIds.has(profile.id) ? (
                                <>
                                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                  A buscar dados Instagram...
                                </>
                              ) : (
                                <>
                                  <Instagram className="w-4 h-4 mr-2 text-pink-500" />
                                  Enriquecer com dados Instagram
                                </>
                              )}
                            </Button>
                          )}

                          {/* Specialty & Workplace */}
                          <div className="grid md:grid-cols-2 gap-4 text-sm">
                            {profile.inferred_specialty && (
                              <div>
                                <span className="text-muted-foreground">Especialidade:</span>{" "}
                                <span className="font-medium">{profile.inferred_specialty}</span>
                              </div>
                            )}
                            {profile.inferred_workplace && (
                              <div>
                                <span className="text-muted-foreground">Local de trabalho:</span>{" "}
                                <span className="font-medium">{profile.inferred_workplace}</span>
                              </div>
                            )}
                          </div>

                          {/* Confidence */}
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-muted-foreground">Confiança da análise:</span>
                            <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                              <div
                                className="h-full bg-primary"
                                style={{ width: `${(profile.confidence_score || 0) * 100}%` }}
                              />
                            </div>
                            <span className="text-sm font-medium">
                              {Math.round((profile.confidence_score || 0) * 100)}%
                            </span>
                          </div>

                          {/* Score Explanation */}
                          {profile.lead_score_explanation && (
                            <div className="bg-muted/50 rounded-lg p-3">
                              <p className="text-sm">{profile.lead_score_explanation}</p>
                            </div>
                          )}

                          {/* Factors */}
                          {profile.lead_score_factors && (
                            <div className="grid md:grid-cols-2 gap-4">
                              {profile.lead_score_factors.positive?.length > 0 && (
                                <div>
                                  <p className="text-sm font-medium text-green-500 mb-2 flex items-center gap-1">
                                    <CheckCircle className="w-4 h-4" />
                                    Pontos positivos
                                  </p>
                                  <ul className="text-sm space-y-1">
                                    {profile.lead_score_factors.positive.map((f, i) => (
                                      <li key={i} className="text-muted-foreground">• {f}</li>
                                    ))}
                                  </ul>
                                </div>
                              )}
                              {profile.lead_score_factors.negative?.length > 0 && (
                                <div>
                                  <p className="text-sm font-medium text-red-500 mb-2 flex items-center gap-1">
                                    <XCircle className="w-4 h-4" />
                                    Pontos negativos
                                  </p>
                                  <ul className="text-sm space-y-1">
                                    {profile.lead_score_factors.negative.map((f, i) => (
                                      <li key={i} className="text-muted-foreground">• {f}</li>
                                    ))}
                                  </ul>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      )}

                      {/* Actions */}
                      <div className="flex items-center gap-2 mt-3">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setExpandedId(isExpanded ? null : profile.id)}
                        >
                          {isExpanded ? (
                            <>
                              <ChevronUp className="w-4 h-4 mr-1" />
                              Menos
                            </>
                          ) : (
                            <>
                              <ChevronDown className="w-4 h-4 mr-1" />
                              Detalhes
                            </>
                          )}
                        </Button>

                        <Button
                          variant="ghost"
                          size="sm"
                          asChild
                        >
                          <a href={profile.profile_url} target="_blank" rel="noopener noreferrer">
                            <ExternalLink className="w-4 h-4 mr-1" />
                            Ver perfil
                          </a>
                        </Button>

                        <div className="flex-1" />

                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-destructive hover:text-destructive"
                          onClick={() => rejectMutation.mutate(profile.id)}
                          disabled={rejectMutation.isPending}
                        >
                          <ThumbsDown className="w-4 h-4 mr-1" />
                          Rejeitar
                        </Button>

                        <Button
                          size="sm"
                          onClick={() => handleConvertClick(profile)}
                          disabled={convertMutation.isPending}
                        >
                          <UserPlus className="w-4 h-4 mr-1" />
                          Criar Lead
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </ScrollArea>

      {/* Convert Profile Dialog */}
      {profileToConvert && (
        <ConvertProfileDialog
          open={convertDialogOpen}
          onOpenChange={setConvertDialogOpen}
          profile={profileToConvert}
          onConfirm={handleConvertConfirm}
          isConverting={convertMutation.isPending}
        />
      )}
    </div>
  );
}
