import { useState, useMemo } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { motion } from "framer-motion";
import { Search, Filter, Users, Link2, Settings2, Zap, BarChart3, Heart, ArrowUpDown, Sparkles } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MatchProfileCard } from "@/components/fastmatch/MatchProfileCard";
import { QuotaIndicator } from "@/components/fastmatch/QuotaIndicator";
import { UpgradeBanner } from "@/components/fastmatch/UpgradeBanner";
import { InterestConfirmDialog } from "@/components/fastmatch/InterestConfirmDialog";
import { ConnectionUnlockedDialog } from "@/components/fastmatch/ConnectionUnlockedDialog";
import { ConnectionCard } from "@/components/fastmatch/ConnectionCard";
import { ProfileSetupWizard } from "@/components/fastmatch/ProfileSetupWizard";
import { ProfileEditDialog } from "@/components/fastmatch/ProfileEditDialog";
import { PendingInterestsTab } from "@/components/fastmatch/PendingInterestsTab";
import { FastMatchAnalytics } from "@/components/fastmatch/FastMatchAnalytics";
import { useFastMatchDiscovery } from "@/hooks/useFastMatchDiscovery";
import { useFastMatchQuota } from "@/hooks/useFastMatchQuota";
import { useFastMatchInterests, useSendInterest } from "@/hooks/useFastMatchInterests";
import { useConsumeMatchQuota } from "@/hooks/useFastMatchQuota";
import { useFastMatchConnections, useUnlockConnection } from "@/hooks/useFastMatchConnections";
import { useFastMatchProfile } from "@/hooks/useFastMatchProfile";
import { toast } from "sonner";

type SortOption = "score" | "recent" | "industry";

export default function FastMatchDiscoveryPage() {
  const [industry, setIndustry] = useState<string>();
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState<SortOption>("score");
  const [confirmProfile, setConfirmProfile] = useState<{ id: string; name: string } | null>(null);
  const [unlockedConnection, setUnlockedConnection] = useState<{ name: string; oppId?: string } | null>(null);
  const [editOpen, setEditOpen] = useState(false);

  const { data: profiles = [], isLoading } = useFastMatchDiscovery({ industry });
  const quota = useFastMatchQuota();
  const { data: interests } = useFastMatchInterests();
  const sendInterest = useSendInterest();
  const consumeQuota = useConsumeMatchQuota();
  const unlockConnection = useUnlockConnection();
  const { data: connections = [], isLoading: connectionsLoading } = useFastMatchConnections();
  const { data: myProfile, isLoading: profileLoading } = useFastMatchProfile();

  const sentInterestIds = new Set((interests?.sent || []).map((i) => i.to_profile_id));

  const filteredProfiles = useMemo(() => {
    let result = profiles.filter((p) => {
      if (!searchTerm) return true;
      const term = searchTerm.toLowerCase();
      return (
        p.company_name?.toLowerCase().includes(term) ||
        p.industry?.toLowerCase().includes(term) ||
        p.target_audience?.toLowerCase().includes(term)
      );
    });

    // Sort
    result = [...result].sort((a, b) => {
      if (sortBy === "score") return (b.strategic_score ?? 0) - (a.strategic_score ?? 0);
      if (sortBy === "recent") return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      if (sortBy === "industry") return (a.industry || "").localeCompare(b.industry || "");
      return 0;
    });

    return result;
  }, [profiles, searchTerm, sortBy]);

  const handleInterest = async (profileId: string) => {
    const profile = profiles.find((p) => p.id === profileId);
    if (!profile) return;
    setConfirmProfile({ id: profileId, name: profile.company_name || "Empresa" });
  };

  const handleConfirmInterest = async () => {
    if (!confirmProfile) return;
    const result = await sendInterest.mutateAsync(confirmProfile.id);
    setConfirmProfile(null);

    if (result.mutual && quota.profile) {
      try {
        const quotaResult = await consumeQuota.mutateAsync(quota.profile.id);
        const connection = await unlockConnection.mutateAsync({
          otherProfileId: confirmProfile.id,
          quotaSource: quotaResult.source,
        });
        setUnlockedConnection({
          name: confirmProfile.name,
          oppId: connection.crm_opportunity_id || undefined,
        });
      } catch {
        // Quota consumed but connection failed
      }
    }
  };

  const handleAcceptInterest = async (interestId: string, fromProfileId: string) => {
    if (!quota.profile) return;
    try {
      const quotaResult = await consumeQuota.mutateAsync(quota.profile.id);
      const connection = await unlockConnection.mutateAsync({
        otherProfileId: fromProfileId,
        quotaSource: quotaResult.source,
      });
      // Update interest to mutual
      const { supabase } = await import("@/integrations/supabase/client");
      await supabase.from("fastmatch_interests").update({ status: "mutual" }).eq("id", interestId);

      const profile = profiles.find(p => p.id === fromProfileId);
      setUnlockedConnection({
        name: profile?.company_name || "Empresa",
        oppId: connection.crm_opportunity_id || undefined,
      });
      toast.success("Conexão desbloqueada!");
    } catch (err: any) {
      toast.error(err?.message || "Erro ao aceitar interesse.");
    }
  };

  const connectionProfiles = connections.map((conn) => {
    const otherProfileId = conn.profile_a_id === myProfile?.id ? conn.profile_b_id : conn.profile_a_id;
    const discoveredProfile = profiles.find((p) => p.id === otherProfileId);
    return { connection: conn, otherProfileId, profile: discoveredProfile || null };
  });

  // Average score
  const avgScore = profiles.length > 0
    ? Math.round(profiles.reduce((sum, p) => sum + (p.strategic_score ?? 0), 0) / profiles.length)
    : 0;

  const receivedPendingCount = interests?.received?.filter(i => i.status === "pending")?.length || 0;

  // Show wizard if no profile
  if (!profileLoading && !myProfile) {
    return (
      <DashboardLayout>
        <div className="bg-background min-h-screen">
          <div className="max-w-4xl mx-auto px-4 py-12">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
              <div className="text-center space-y-3">
                <div className="inline-flex p-4 rounded-2xl bg-primary/10">
                  <Sparkles className="w-10 h-10 text-primary" />
                </div>
                <h1 className="text-3xl font-bold text-foreground">FastMatch</h1>
                <p className="text-muted-foreground max-w-md mx-auto">
                  Crie o seu perfil para começar a descobrir conexões estratégicas e desbloquear oportunidades de negócio.
                </p>
              </div>
              <ProfileSetupWizard />
            </motion.div>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
    <div className="bg-background min-h-screen">
      <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">
        {/* Hero Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border border-primary/10 p-6"
        >
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-primary/10 ring-2 ring-primary/20">
                <Zap className="w-7 h-7 text-primary" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-foreground">FastMatch</h1>
                <p className="text-sm text-muted-foreground">
                  Conexões estratégicas impulsionadas por IA
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {myProfile && (
                <Button variant="outline" size="sm" onClick={() => setEditOpen(true)} className="gap-1.5">
                  <Settings2 className="w-4 h-4" />
                  Editar Perfil
                </Button>
              )}
            </div>
          </div>

          {/* KPI strip */}
          <div className="grid grid-cols-3 gap-4 mt-5">
            <Card className="bg-background/60 backdrop-blur border-border/40">
              <CardContent className="p-3 text-center">
                <p className="text-2xl font-bold text-foreground">{quota.used}/{quota.monthly}</p>
                <p className="text-xs text-muted-foreground">Matches este mês</p>
              </CardContent>
            </Card>
            <Card className="bg-background/60 backdrop-blur border-border/40">
              <CardContent className="p-3 text-center">
                <p className="text-2xl font-bold text-foreground">{connections.length}</p>
                <p className="text-xs text-muted-foreground">Conexões ativas</p>
              </CardContent>
            </Card>
            <Card className="bg-background/60 backdrop-blur border-border/40">
              <CardContent className="p-3 text-center">
                <p className="text-2xl font-bold text-foreground">{avgScore}%</p>
                <p className="text-xs text-muted-foreground">Score médio</p>
              </CardContent>
            </Card>
          </div>
        </motion.div>

        {!quota.hasQuota && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }}>
            <UpgradeBanner />
          </motion.div>
        )}

        {/* Tabs */}
        <Tabs defaultValue="discover" className="space-y-4">
          <TabsList className="bg-muted/50">
            <TabsTrigger value="discover" className="gap-1.5">
              <Search className="w-4 h-4" />
              Descobrir
            </TabsTrigger>
            <TabsTrigger value="interests" className="gap-1.5 relative">
              <Heart className="w-4 h-4" />
              Interesses
              {receivedPendingCount > 0 && (
                <Badge variant="destructive" className="absolute -top-1.5 -right-1.5 h-4 min-w-[16px] p-0 text-[9px] flex items-center justify-center rounded-full">
                  {receivedPendingCount}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="connections" className="gap-1.5">
              <Link2 className="w-4 h-4" />
              Conexões ({connections.length})
            </TabsTrigger>
            <TabsTrigger value="analytics" className="gap-1.5">
              <BarChart3 className="w-4 h-4" />
              Analytics
            </TabsTrigger>
          </TabsList>

          {/* Discover Tab */}
          <TabsContent value="discover" className="space-y-4">
            {/* Filters */}
            <div className="flex items-center gap-3 flex-wrap">
              <div className="relative flex-1 max-w-xs">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Pesquisar perfis..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Select value={industry || "all"} onValueChange={(v) => setIndustry(v === "all" ? undefined : v)}>
                <SelectTrigger className="w-44">
                  <Filter className="w-4 h-4 mr-2" />
                  <SelectValue placeholder="Indústria" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  <SelectItem value="Tecnologia">Tecnologia</SelectItem>
                  <SelectItem value="Marketing">Marketing</SelectItem>
                  <SelectItem value="Consultoria">Consultoria</SelectItem>
                  <SelectItem value="E-commerce">E-commerce</SelectItem>
                  <SelectItem value="Saúde">Saúde</SelectItem>
                  <SelectItem value="Educação">Educação</SelectItem>
                  <SelectItem value="Imobiliário">Imobiliário</SelectItem>
                </SelectContent>
              </Select>
              <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortOption)}>
                <SelectTrigger className="w-40">
                  <ArrowUpDown className="w-4 h-4 mr-2" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="score">Score ↓</SelectItem>
                  <SelectItem value="recent">Recentes</SelectItem>
                  <SelectItem value="industry">Indústria A-Z</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Grid */}
            {isLoading ? (
              <div className="text-center py-16 text-muted-foreground">A carregar perfis...</div>
            ) : filteredProfiles.length === 0 ? (
              <div className="text-center py-16 space-y-3">
                <div className="inline-flex p-4 rounded-2xl bg-muted">
                  <Users className="w-10 h-10 text-muted-foreground/50" />
                </div>
                <p className="text-muted-foreground font-medium">Nenhum perfil encontrado</p>
                <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                  Convida membros do teu workspace para criarem os seus perfis FastMatch e começa a descobrir oportunidades.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredProfiles.map((profile, i) => (
                  <motion.div
                    key={profile.id}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.03 }}
                  >
                    <MatchProfileCard
                      profile={profile}
                      hasInterest={sentInterestIds.has(profile.id)}
                      onInterest={handleInterest}
                      isLoading={sendInterest.isPending}
                    />
                  </motion.div>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Interests Tab */}
          <TabsContent value="interests">
            <PendingInterestsTab
              profiles={profiles.map(p => ({ id: p.id, company_name: p.company_name, industry: p.industry }))}
              onAccept={handleAcceptInterest}
              isAccepting={consumeQuota.isPending || unlockConnection.isPending}
            />
          </TabsContent>

          {/* Connections Tab */}
          <TabsContent value="connections" className="space-y-4">
            {connectionsLoading ? (
              <div className="text-center py-16 text-muted-foreground">A carregar conexões...</div>
            ) : connections.length === 0 ? (
              <div className="text-center py-16 space-y-3">
                <div className="inline-flex p-4 rounded-2xl bg-muted">
                  <Link2 className="w-10 h-10 text-muted-foreground/50" />
                </div>
                <p className="text-muted-foreground font-medium">Ainda não tem conexões</p>
                <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                  Demonstre interesse em perfis na aba "Descobrir" para iniciar conexões estratégicas.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {connectionProfiles.map(({ connection, otherProfileId, profile: connProfile }) => (
                  <motion.div
                    key={connection.id}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                  >
                    <ConnectionCard
                      connectionId={connection.id}
                      profile={{
                        id: otherProfileId,
                        company_name: connProfile?.company_name || null,
                        industry: connProfile?.industry || null,
                        reputation_score: connProfile?.reputation_score ?? 5,
                        reputation_count: connProfile?.reputation_count ?? 0,
                        is_verified: connProfile?.is_verified ?? false,
                        is_founder: connProfile?.is_founder ?? false,
                        founder_expiry_date: connProfile?.founder_expiry_date || null,
                        bio: connProfile?.bio || null,
                        services_offered: connProfile?.services_offered || null,
                        services_needed: connProfile?.services_needed || null,
                        ticket_range: connProfile?.ticket_range || null,
                        website_url: connProfile?.website_url || null,
                        linkedin_url: connProfile?.linkedin_url || null,
                        target_audience: connProfile?.target_audience || null,
                      }}
                      unlockedAt={connection.unlocked_at}
                      crmOpportunityId={connection.crm_opportunity_id}
                      crmContactId={connection.crm_contact_id}
                      crmCompanyId={connection.crm_company_id}
                    />
                  </motion.div>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Analytics Tab */}
          <TabsContent value="analytics">
            <FastMatchAnalytics />
          </TabsContent>
        </Tabs>

        {/* Dialogs */}
        <InterestConfirmDialog
          open={!!confirmProfile}
          onOpenChange={(open) => !open && setConfirmProfile(null)}
          companyName={confirmProfile?.name || ""}
          onConfirm={handleConfirmInterest}
          isLoading={sendInterest.isPending || consumeQuota.isPending}
        />
        <ConnectionUnlockedDialog
          open={!!unlockedConnection}
          onOpenChange={(open) => !open && setUnlockedConnection(null)}
          companyName={unlockedConnection?.name || ""}
          opportunityId={unlockedConnection?.oppId}
        />
        {myProfile && (
          <ProfileEditDialog
            open={editOpen}
            onOpenChange={setEditOpen}
            profile={myProfile}
          />
        )}
      </div>
    </div>
    </DashboardLayout>
  );
}
