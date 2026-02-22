import { useState, useMemo } from "react";
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
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  User, Building2, Users, HelpCircle, ExternalLink, 
  UserPlus, ThumbsDown, Search, Filter, Loader2,
  ChevronDown, ChevronUp, MapPin, Briefcase, Star,
  CheckCircle, XCircle, AlertCircle, RefreshCw, Instagram,
  Eye, Facebook, Mail, Phone, MessageSquare, CheckSquare, Square, ArrowUpDown, Send
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ConvertProfileDialog, ConversionOptions } from "./ConvertProfileDialog";
import { ProspectingMessageDialog } from "./ProspectingMessageDialog";
import { BulkOutreachDialog } from "./BulkOutreachDialog";

interface ProspectingResultsProps {
  searchId: string | null;
  onGoToSearch?: () => void;
  defaultTone?: "formal" | "casual" | "direto";
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
  instagram_followers_count: number | null;
  instagram_following_count: number | null;
  instagram_posts_count: number | null;
  instagram_full_bio: string | null;
  instagram_external_url: string | null;
  instagram_category: string | null;
  instagram_is_verified: boolean | null;
  instagram_is_business: boolean | null;
  instagram_enriched_at: string | null;
  extracted_email: string | null;
  extracted_phone: string | null;
  contact_source: string | null;
  outreach_step: number | null;
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

type SortOption = "score_desc" | "score_asc" | "followers_desc" | "date_desc";

export function ProspectingResults({ searchId, onGoToSearch, defaultTone }: ProspectingResultsProps) {
  const { currentWorkspace } = useWorkspace();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [pollingStartTime] = useState(() => Date.now());
  const [searchFilter, setSearchFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState<string | null>(null);
  const [platformFilter, setPlatformFilter] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [enrichingIds, setEnrichingIds] = useState<Set<string>>(new Set());
  const [convertDialogOpen, setConvertDialogOpen] = useState(false);
  const [profileToConvert, setProfileToConvert] = useState<Profile | null>(null);
  const [messageDialogOpen, setMessageDialogOpen] = useState(false);
  const [messageProfile, setMessageProfile] = useState<Profile | null>(null);
  const [sortBy, setSortBy] = useState<SortOption>("score_desc");
  const [minScore, setMinScore] = useState(0);
  const [bulkProcessing, setBulkProcessing] = useState<string | null>(null);
  const [bulkOutreachOpen, setBulkOutreachOpen] = useState(false);
  const [bulkOutreachMessages, setBulkOutreachMessages] = useState<Array<{ profileId: string; message: string; message_plain: string; error?: string }>>([]);
  const [bulkOutreachProfiles, setBulkOutreachProfiles] = useState<Array<{ id: string; profile_name: string | null; profile_url: string; inferred_profession: string | null; platform: string }>>([]);
  const [bulkGenerating, setBulkGenerating] = useState(false);
  const [bulkGenerationProgress, setBulkGenerationProgress] = useState({ done: 0, total: 0 });

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
    refetchInterval: bulkOutreachOpen ? false : (searchId && (Date.now() - pollingStartTime < 30000) ? 3000 : false),
    refetchOnWindowFocus: !bulkOutreachOpen,
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

      // Dados Instagram - incluir sempre que existirem dados (não depender de enriched_at)
      const hasInstagramData = profile.instagram_full_bio || profile.profile_bio || 
                               profile.instagram_followers_count || profile.instagram_posts_count;
      
      if (options.includeInstagramData && hasInstagramData) {
        noteParts.push(`\n📱 **Dados Instagram**`);
        if (profile.instagram_followers_count) noteParts.push(`- Seguidores: ${profile.instagram_followers_count.toLocaleString()}`);
        if (profile.instagram_following_count) noteParts.push(`- A seguir: ${profile.instagram_following_count.toLocaleString()}`);
        if (profile.instagram_posts_count) noteParts.push(`- Publicações: ${profile.instagram_posts_count.toLocaleString()}`);
        if (profile.instagram_category) noteParts.push(`- Categoria: ${profile.instagram_category}`);
        // Usar instagram_full_bio ou fallback para profile_bio
        const bio = profile.instagram_full_bio || profile.profile_bio;
        if (bio) noteParts.push(`- Bio: "${bio}"`);
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

      // Create lead with ALL enriched data from prospecting profile
      const leadData: Record<string, unknown> = {
        workspace_id: currentWorkspace.id,
        name: profile.profile_name || "Sem nome",
        source: "professional_prospecting",
        status: "new",
        website: profile.profile_url,
        assigned_to: user.id,
        created_by: user.id,
        // Reference to original prospecting profile
        prospecting_profile_id: profile.id,
        // Avatar from Instagram
        avatar_url: profile.profile_image_url || null,
        // Instagram URL
        instagram_url: profile.platform === "instagram" ? profile.profile_url : null,
        // Extracted contacts from prospecting
        email: profile.extracted_email || null,
        phone: profile.extracted_phone || null,
        // Notes with full context
        notes: enrichedNotes || null,
        ai_insight: fullAiInsight,
        // Tags
        tags: options.tags.length > 0 ? options.tags : null,
      };

      // Add AI analysis data if selected
      if (options.includeAnalysisData) {
        Object.assign(leadData, {
          inferred_type: profile.inferred_type || null,
          inferred_profession: profile.inferred_profession || null,
          inferred_specialty: profile.inferred_specialty || null,
          inferred_workplace: profile.inferred_workplace || null,
          city: profile.inferred_location || null,
          business_category: profile.inferred_profession || null,
          confidence_score: profile.confidence_score || null,
          lead_score: profile.lead_score || null,
          lead_score_explanation: profile.lead_score_explanation || null,
          lead_score_factors: profile.lead_score_factors || null,
        });
      }

      // Add Instagram data - SEMPRE que existirem dados (não depender de enriched_at)
      const hasInstagramDataForLead = profile.instagram_full_bio || profile.profile_bio || 
                                       profile.instagram_followers_count || profile.instagram_posts_count;
      
      if (options.includeInstagramData && hasInstagramDataForLead) {
        Object.assign(leadData, {
          instagram_followers_count: profile.instagram_followers_count || null,
          instagram_following_count: profile.instagram_following_count || null,
          instagram_posts_count: profile.instagram_posts_count || null,
          // Usar instagram_full_bio ou fallback para profile_bio
          instagram_bio: profile.instagram_full_bio || profile.profile_bio || null,
          instagram_external_url: profile.instagram_external_url || null,
          instagram_category: profile.instagram_category || null,
          instagram_is_verified: profile.instagram_is_verified ?? false,
          instagram_is_business: profile.instagram_is_business ?? false,
          instagram_enriched_at: profile.instagram_enriched_at || null,
        });
      }

      const { data: lead, error: leadError } = await supabase
        .from("leads")
        .insert([leadData as any])
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

      // Cancel pending outreach
      await supabase
        .from("prospecting_outreach_queue")
        .update({ status: "cancelled" } as any)
        .eq("profile_id", profile.id)
        .in("status", ["scheduled", "ready"]);

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

      // Cancel pending outreach
      await supabase
        .from("prospecting_outreach_queue")
        .update({ status: "cancelled" } as any)
        .eq("profile_id", profileId)
        .in("status", ["scheduled", "ready"]);
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

  // Bulk actions
  const handleBulkConvert = async () => {
    if (!currentWorkspace?.id || !user?.id) return;
    const selectedProfiles = profiles.filter(p => selectedIds.has(p.id));
    if (selectedProfiles.length === 0) return;

    setBulkProcessing("convert");
    let converted = 0;
    
    for (const profile of selectedProfiles) {
      try {
        const defaultOptions: ConversionOptions = {
          includeAnalysisData: true,
          includeInstagramData: true,
          tags: [],
          additionalNotes: "",
        };
        await convertMutation.mutateAsync({ profile, options: defaultOptions });
        converted++;
      } catch (e) {
        console.error("Bulk convert error for", profile.id, e);
      }
    }

    setBulkProcessing(null);
    setSelectedIds(new Set());
    queryClient.invalidateQueries({ queryKey: ["prospecting-profiles"] });
    queryClient.invalidateQueries({ queryKey: ["leads"] });
    toast.success(`${converted} leads criados com sucesso`);
  };

  const handleBulkReject = async () => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;

    setBulkProcessing("reject");
    
    const { error } = await supabase
      .from("professional_prospecting_profiles")
      .update({ status: "rejected", rejection_reason: "Rejeitado em lote" })
      .in("id", ids);

    setBulkProcessing(null);
    setSelectedIds(new Set());
    
    if (error) {
      toast.error("Erro ao rejeitar perfis");
    } else {
      queryClient.invalidateQueries({ queryKey: ["prospecting-profiles"] });
      toast.success(`${ids.length} perfis rejeitados`);
    }
  };

  const handleBulkEnrich = async () => {
    const selectedProfiles = profiles.filter(p => selectedIds.has(p.id) && p.platform === "instagram" && !p.instagram_enriched_at);
    if (selectedProfiles.length === 0) {
      toast.info("Nenhum perfil Instagram selecionado para enriquecer");
      return;
    }

    setBulkProcessing("enrich");
    let enriched = 0;

    for (const profile of selectedProfiles) {
      try {
        await enrichProfile(profile);
        enriched++;
      } catch (e) {
        console.error("Bulk enrich error", e);
      }
    }

    setBulkProcessing(null);
    setSelectedIds(new Set());
    toast.success(`${enriched} perfis enriquecidos`);
  };

  // Bulk outreach - generate messages for all selected profiles
  const handleBulkOutreach = async () => {
    const selectedProfiles = profiles.filter(p => selectedIds.has(p.id));
    
    if (selectedProfiles.length === 0) {
      toast.info("Nenhum perfil selecionado");
      return;
    }

    const profilesWithOutreach = selectedProfiles.filter(p => p.outreach_step && p.outreach_step > 0);
    if (profilesWithOutreach.length > 0) {
      toast.info(`${profilesWithOutreach.length} perfil(is) já iniciaram sequência - a gerar nova mensagem para todos`);
    }

    // Prepare profiles for dialog
    const dialogProfiles = selectedProfiles.map(p => ({
      id: p.id,
      profile_name: p.profile_name,
      profile_url: p.profile_url,
      inferred_profession: p.inferred_profession,
      platform: p.platform,
    }));

    setBulkOutreachProfiles(dialogProfiles);
    setBulkOutreachMessages([]);
    setBulkOutreachOpen(true);
    setBulkGenerating(true);
    setBulkGenerationProgress({ done: 0, total: selectedProfiles.length });

    // Get workspace context
    const wsContext = currentWorkspace ? {
      name: currentWorkspace.name || "",
      description: (currentWorkspace as any).description || "",
    } : null;

    // Process in mini-batches of 5 for incremental progress
    const BATCH_SIZE = 5;
    const allResults: Array<{ profileId: string; message: string; message_plain: string; error?: string }> = [];

    try {
      for (let i = 0; i < selectedProfiles.length; i += BATCH_SIZE) {
        const batchProfiles = selectedProfiles.slice(i, i + BATCH_SIZE);

        const profileInputs = batchProfiles.map(p => ({
          id: p.id,
          name: p.profile_name || "Sem nome",
          profession: p.inferred_profession || undefined,
          specialty: p.inferred_specialty || undefined,
          bio: p.instagram_full_bio || p.profile_bio || undefined,
          location: p.inferred_location || undefined,
          followers: p.instagram_followers_count || undefined,
          category: p.instagram_category || undefined,
          isVerified: p.instagram_is_verified || undefined,
          isBusiness: p.instagram_is_business || undefined,
          profileUrl: p.profile_url,
        }));

        const { data, error } = await supabase.functions.invoke("batch-generate-prospecting-messages", {
          body: {
            profiles: profileInputs,
            tone: defaultTone || "casual",
            workspaceContext: wsContext,
            serviceContext: null,
          },
        });

        if (error) {
          console.error("Batch error:", error);
          // Add error results for this batch
          const errorResults = batchProfiles.map(p => ({
            profileId: p.id,
            message: "",
            message_plain: "",
            error: "Erro ao gerar mensagem",
          }));
          allResults.push(...errorResults);
        } else {
          allResults.push(...(data.results || []));
        }

        // Update progress and messages incrementally
        setBulkGenerationProgress({ done: Math.min(i + BATCH_SIZE, selectedProfiles.length), total: selectedProfiles.length });
        setBulkOutreachMessages([...allResults]);
      }
    } catch (err) {
      toast.error("Erro ao gerar mensagens em massa");
      console.error("Bulk outreach error:", err);
    } finally {
      setBulkGenerating(false);
    }
  };

  // Filter and sort profiles
  const filteredProfiles = useMemo(() => {
    let result = profiles.filter((p) => {
      const matchesSearch =
        !searchFilter ||
        p.profile_name?.toLowerCase().includes(searchFilter.toLowerCase()) ||
        p.inferred_profession?.toLowerCase().includes(searchFilter.toLowerCase()) ||
        p.inferred_specialty?.toLowerCase().includes(searchFilter.toLowerCase()) ||
        p.inferred_location?.toLowerCase().includes(searchFilter.toLowerCase());

      const matchesType = !typeFilter || p.inferred_type === typeFilter;
      const matchesPlatform = !platformFilter || p.platform === platformFilter;
      const matchesScore = (p.lead_score || 0) >= minScore;

      return matchesSearch && matchesType && matchesPlatform && matchesScore;
    });

    // Sort
    result.sort((a, b) => {
      switch (sortBy) {
        case "score_desc":
          return (b.lead_score || 0) - (a.lead_score || 0);
        case "score_asc":
          return (a.lead_score || 0) - (b.lead_score || 0);
        case "followers_desc":
          return (b.instagram_followers_count || 0) - (a.instagram_followers_count || 0);
        case "date_desc":
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        default:
          return 0;
      }
    });

    return result;
  }, [profiles, searchFilter, typeFilter, platformFilter, minScore, sortBy]);

  const toggleSelect = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  const selectAll = () => {
    setSelectedIds(new Set(filteredProfiles.map(p => p.id)));
  };

  const selectNone = () => {
    setSelectedIds(new Set());
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
    const pollingExpired = searchId && (Date.now() - pollingStartTime >= 30000);
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <Users className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium mb-2">Sem resultados</h3>
          <p className="text-muted-foreground mb-4">
            {searchId && !pollingExpired
              ? "A aguardar análise dos perfis... Os resultados aparecerão automaticamente."
              : searchId && pollingExpired
              ? "Não foram encontrados perfis analisados para esta pesquisa."
              : "Execute uma pesquisa para ver perfis analisados"
            }
          </p>
          {searchId && !pollingExpired && (
            <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground mb-4">
              <Loader2 className="w-4 h-4 animate-spin" />
              A carregar resultados...
            </div>
          )}
          {(pollingExpired || (searchId && profiles.length === 0)) && onGoToSearch && (
            <Button variant="outline" onClick={onGoToSearch} className="gap-2">
              <RefreshCw className="w-4 h-4" />
              Repetir pesquisa
            </Button>
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

        <div className="flex flex-wrap gap-2">
          <Button
            variant={platformFilter === "instagram" ? "default" : "outline"}
            size="sm"
            onClick={() => setPlatformFilter(platformFilter === "instagram" ? null : "instagram")}
            className="gap-1"
          >
            <Instagram className="w-3 h-3" />
            Instagram
          </Button>
          <Button
            variant={platformFilter === "facebook" ? "default" : "outline"}
            size="sm"
            onClick={() => setPlatformFilter(platformFilter === "facebook" ? null : "facebook")}
            className="gap-1"
          >
            <Facebook className="w-3 h-3" />
            Facebook
          </Button>
          
          <div className="w-px bg-border mx-1" />
          
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

      {/* Sort + Score Filter + Select All */}
      <div className="flex flex-wrap gap-4 items-center">
        <div className="flex items-center gap-2">
          <ArrowUpDown className="w-4 h-4 text-muted-foreground" />
          <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortOption)}>
            <SelectTrigger className="w-[180px] h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="score_desc">Score (maior)</SelectItem>
              <SelectItem value="score_asc">Score (menor)</SelectItem>
              <SelectItem value="followers_desc">Seguidores</SelectItem>
              <SelectItem value="date_desc">Mais recentes</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-3 flex-1 min-w-[200px] max-w-[350px]">
          <span className="text-sm text-muted-foreground whitespace-nowrap">Score mín: {minScore}</span>
          <Slider
            value={[minScore]}
            onValueChange={(v) => setMinScore(v[0])}
            min={0}
            max={100}
            step={5}
            className="flex-1"
          />
        </div>

        <div className="flex items-center gap-2 ml-auto">
          <Button variant="outline" size="sm" onClick={selectAll} className="gap-1">
            <CheckSquare className="w-3 h-3" />
            Todos
          </Button>
          <Button variant="outline" size="sm" onClick={selectNone} className="gap-1">
            <Square className="w-3 h-3" />
            Nenhum
          </Button>
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
        <div className="space-y-3 pb-20">
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
                            {(profile.outreach_step || 0) > 0 && (
                              <Badge
                                variant="outline"
                                className={cn(
                                  "text-xs gap-0.5",
                                  (profile.outreach_step || 0) >= 3
                                    ? "text-green-600 border-green-600/30"
                                    : "text-amber-600 border-amber-600/30"
                                )}
                              >
                                {profile.outreach_step}/3
                              </Badge>
                            )}
                            <Badge
                              variant="outline"
                              className={cn(
                                "gap-1",
                                PLATFORM_COLORS[profile.platform] || PLATFORM_COLORS.other
                              )}
                            >
                              {profile.platform === "instagram" ? (
                                <Instagram className="w-3 h-3" />
                              ) : profile.platform === "facebook" ? (
                                <Facebook className="w-3 h-3" />
                              ) : null}
                              {profile.platform}
                            </Badge>
                          </div>

                          <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground flex-wrap">
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
                          
                          {/* Extracted Contacts */}
                          {(profile.extracted_email || profile.extracted_phone) && (
                            <div className="flex items-center gap-3 mt-2">
                              {profile.extracted_email && (
                                <a 
                                  href={`mailto:${profile.extracted_email}`}
                                  className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-md bg-blue-500/10 text-blue-600 hover:bg-blue-500/20 transition-colors"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <Mail className="w-3 h-3" />
                                  {profile.extracted_email}
                                </a>
                              )}
                              {profile.extracted_phone && (
                                <a 
                                  href={`tel:${profile.extracted_phone}`}
                                  className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-md bg-green-500/10 text-green-600 hover:bg-green-500/20 transition-colors"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <Phone className="w-3 h-3" />
                                  {profile.extracted_phone}
                                </a>
                              )}
                            </div>
                          )}
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

                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-primary hover:text-primary"
                          onClick={() => {
                            setMessageProfile(profile);
                            setMessageDialogOpen(true);
                          }}
                        >
                          <MessageSquare className="w-4 h-4 mr-1" />
                          Gerar Mensagem
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

      {/* Bulk Action Bar */}
      {selectedIds.size > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-background border rounded-xl shadow-lg px-6 py-3 flex items-center gap-4">
          <span className="text-sm font-medium">
            {selectedIds.size} selecionado{selectedIds.size > 1 ? "s" : ""}
          </span>
          <div className="w-px h-6 bg-border" />
          <Button
            size="sm"
            variant="default"
            onClick={handleBulkOutreach}
            disabled={!!bulkProcessing}
            className="gap-1"
          >
            <Send className="w-3 h-3" />
            Iniciar Sequência
          </Button>
          <Button
            size="sm"
            onClick={handleBulkConvert}
            disabled={!!bulkProcessing}
            className="gap-1"
          >
            {bulkProcessing === "convert" ? <Loader2 className="w-3 h-3 animate-spin" /> : <UserPlus className="w-3 h-3" />}
            Converter
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={handleBulkEnrich}
            disabled={!!bulkProcessing}
            className="gap-1"
          >
            {bulkProcessing === "enrich" ? <Loader2 className="w-3 h-3 animate-spin" /> : <Instagram className="w-3 h-3" />}
            Enriquecer
          </Button>
          <Button
            size="sm"
            variant="destructive"
            onClick={handleBulkReject}
            disabled={!!bulkProcessing}
            className="gap-1"
          >
            {bulkProcessing === "reject" ? <Loader2 className="w-3 h-3 animate-spin" /> : <ThumbsDown className="w-3 h-3" />}
            Rejeitar
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={selectNone}
          >
            Limpar
          </Button>
        </div>
      )}

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

      {/* Message Generator Dialog */}
      {messageProfile && (
        <ProspectingMessageDialog
          open={messageDialogOpen}
          onOpenChange={setMessageDialogOpen}
          profile={messageProfile}
          defaultTone={defaultTone}
          onOutreachUpdate={(profileId, step) => {
            queryClient.invalidateQueries({ queryKey: ["prospecting-profiles"] });
          }}
        />
      )}

      {/* Bulk Outreach Dialog */}
      <BulkOutreachDialog
        open={bulkOutreachOpen}
        onOpenChange={setBulkOutreachOpen}
        profiles={bulkOutreachProfiles}
        generatedMessages={bulkOutreachMessages}
        isGenerating={bulkGenerating}
        generationProgress={bulkGenerationProgress}
        onComplete={() => {
          setSelectedIds(new Set());
          queryClient.invalidateQueries({ queryKey: ["prospecting-profiles"] });
        }}
      />
    </div>
  );
}
