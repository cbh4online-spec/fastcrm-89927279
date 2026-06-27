import { useState, useMemo } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { motion } from "framer-motion";
import { Search, Filter, Users, Link2, Settings2, Zap, BarChart3, Heart, ArrowUpDown, Sparkles } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { IXCard } from "@/components/entity/ix/IXCard";
import { IXEntityTabs } from "@/components/entity/ix/IXEntityTabs";
import { MatchProfileCard } from "@/components/fastmatch/MatchProfileCard";
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
  const [activeTab, setActiveTab] = useState("discover");
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
      const { supabase } = await import("@/integrations/supabase/client");
      await supabase.from("fastmatch_interests").update({ status: "mutual" }).eq("id", interestId);

      const profile = profiles.find((p) => p.id === fromProfileId);
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

  const avgScore = profiles.length > 0
    ? Math.round(profiles.reduce((sum, p) => sum + (p.strategic_score ?? 0), 0) / profiles.length)
    : 0;

  const receivedPendingCount = interests?.received?.filter((i) => i.status === "pending")?.length || 0;

  // Wizard quando não há perfil
  if (!profileLoading && !myProfile) {
    return (
      <DashboardLayout>
        <div className="bg-background min-h-screen">
          <div className="max-w-4xl mx-auto px-4 py-12">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
              <div className="text-center space-y-3">
                <div className="inline-flex p-4 rounded-2xl bg-muted">
                  <Sparkles className="w-10 h-10 text-foreground" />
                </div>
                <h1 className="text-3xl font-bold tracking-tight text-foreground">FastMatch</h1>
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
      <div className="flex flex-col gap-6 p-6">
        {/* Header IX — limpo, sem gradientes */}
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">FastMatch</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Conexões estratégicas impulsionadas por IA.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="gap-1.5 rounded-full px-3 py-1.5 font-normal">
              <Zap className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="font-semibold tabular-nums">{quota.used}/{quota.monthly}</span>
              <span className="text-muted-foreground text-xs">este mês</span>
            </Badge>
            {myProfile && (
              <Button variant="outline" size="sm" onClick={() => setEditOpen(true)} className="gap-1.5 rounded-full">
                <Settings2 className="h-4 w-4" />
                Editar perfil
              </Button>
            )}
          </div>
        </div>

        {/* KPI strip — cartões planos */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="rounded-2xl border border-border bg-card px-5 py-4">
            <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Matches este mês</p>
            <p className="mt-1 text-2xl font-bold tabular-nums text-foreground">
              {quota.used}<span className="text-base font-normal text-muted-foreground">/{quota.monthly}</span>
            </p>
          </div>
          <div className="rounded-2xl border border-border bg-card px-5 py-4">
            <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Conexões ativas</p>
            <p className="mt-1 text-2xl font-bold tabular-nums text-foreground">{connections.length}</p>
          </div>
          <div className="rounded-2xl border border-border bg-card px-5 py-4">
            <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Score médio</p>
            <p className="mt-1 text-2xl font-bold tabular-nums text-foreground">{avgScore}%</p>
          </div>
        </div>

        {!quota.hasQuota && <UpgradeBanner />}

        {/* Tabs IX */}
        <div className="-mx-6">
          <IXEntityTabs
            tabs={[
              { id: "discover", label: "Descobrir" },
              { id: "interests", label: "Interesses", count: receivedPendingCount },
              { id: "connections", label: "Conexões", count: connections.length },
              { id: "analytics", label: "Analytics" },
            ]}
            activeId={activeTab}
            onChange={setActiveTab}
          />
        </div>

        {activeTab === "discover" && (
          <div className="space-y-4">
            {/* Toolbar */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative flex-1 min-w-[220px] max-w-md">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Pesquisar perfis..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9 h-10 rounded-full bg-card"
                />
              </div>
              <Select value={industry || "all"} onValueChange={(v) => setIndustry(v === "all" ? undefined : v)}>
                <SelectTrigger className="w-44 h-10 rounded-full">
                  <Filter className="w-4 h-4 mr-2 text-muted-foreground" />
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
                <SelectTrigger className="w-44 h-10 rounded-full">
                  <ArrowUpDown className="w-4 h-4 mr-2 text-muted-foreground" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="score">Score ↓</SelectItem>
                  <SelectItem value="recent">Recentes</SelectItem>
                  <SelectItem value="industry">Indústria A-Z</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {isLoading ? (
              <IXCard>
                <div className="py-10 text-center text-sm text-muted-foreground">A carregar perfis...</div>
              </IXCard>
            ) : filteredProfiles.length === 0 ? (
              <IXCard>
                <div className="flex flex-col items-center justify-center text-center py-12">
                  <Users className="h-10 w-10 text-muted-foreground/40 mb-3" />
                  <h3 className="text-sm font-medium mb-1">Nenhum perfil encontrado</h3>
                  <p className="text-xs text-muted-foreground max-w-sm">
                    Convida membros do teu workspace para criarem os seus perfis FastMatch e começa a descobrir oportunidades.
                  </p>
                </div>
              </IXCard>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredProfiles.map((profile, i) => (
                  <motion.div
                    key={profile.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.02 }}
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
          </div>
        )}

        {activeTab === "interests" && (
          <PendingInterestsTab
            profiles={profiles.map((p) => ({ id: p.id, company_name: p.company_name, industry: p.industry }))}
            onAccept={handleAcceptInterest}
            isAccepting={consumeQuota.isPending || unlockConnection.isPending}
          />
        )}

        {activeTab === "connections" && (
          <div className="space-y-4">
            {connectionsLoading ? (
              <IXCard>
                <div className="py-10 text-center text-sm text-muted-foreground">A carregar conexões...</div>
              </IXCard>
            ) : connections.length === 0 ? (
              <IXCard>
                <div className="flex flex-col items-center justify-center text-center py-12">
                  <Link2 className="h-10 w-10 text-muted-foreground/40 mb-3" />
                  <h3 className="text-sm font-medium mb-1">Ainda não tem conexões</h3>
                  <p className="text-xs text-muted-foreground max-w-sm">
                    Demonstre interesse em perfis na aba "Descobrir" para iniciar conexões estratégicas.
                  </p>
                </div>
              </IXCard>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {connectionProfiles.map(({ connection, otherProfileId, profile: connProfile }) => (
                  <motion.div
                    key={connection.id}
                    initial={{ opacity: 0, y: 8 }}
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
          </div>
        )}

        {activeTab === "analytics" && <FastMatchAnalytics />}

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
    </DashboardLayout>
  );
}
