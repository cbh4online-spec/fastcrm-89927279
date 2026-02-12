import { useState } from "react";
import { motion } from "framer-motion";
import { Search, Filter, Users } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MatchProfileCard } from "@/components/fastmatch/MatchProfileCard";
import { QuotaIndicator } from "@/components/fastmatch/QuotaIndicator";
import { UpgradeBanner } from "@/components/fastmatch/UpgradeBanner";
import { InterestConfirmDialog } from "@/components/fastmatch/InterestConfirmDialog";
import { ConnectionUnlockedDialog } from "@/components/fastmatch/ConnectionUnlockedDialog";
import { useFastMatchDiscovery } from "@/hooks/useFastMatchDiscovery";
import { useFastMatchQuota } from "@/hooks/useFastMatchQuota";
import { useFastMatchInterests, useSendInterest } from "@/hooks/useFastMatchInterests";
import { useConsumeMatchQuota } from "@/hooks/useFastMatchQuota";
import { useUnlockConnection } from "@/hooks/useFastMatchConnections";

export default function FastMatchDiscoveryPage() {
  const [industry, setIndustry] = useState<string>();
  const [searchTerm, setSearchTerm] = useState("");
  const [confirmProfile, setConfirmProfile] = useState<{ id: string; name: string } | null>(null);
  const [unlockedConnection, setUnlockedConnection] = useState<{ name: string; oppId?: string } | null>(null);

  const { data: profiles = [], isLoading } = useFastMatchDiscovery({ industry });
  const quota = useFastMatchQuota();
  const { data: interests } = useFastMatchInterests();
  const sendInterest = useSendInterest();
  const consumeQuota = useConsumeMatchQuota();
  const unlockConnection = useUnlockConnection();

  const sentInterestIds = new Set((interests?.sent || []).map((i) => i.to_profile_id));

  const filteredProfiles = profiles.filter((p) => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      p.company_name?.toLowerCase().includes(term) ||
      p.industry?.toLowerCase().includes(term) ||
      p.target_audience?.toLowerCase().includes(term)
    );
  });

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
      // Consume quota and unlock
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
        // Quota consumed but connection failed - still shows success from interest
      }
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-6xl mx-auto px-4 py-8 space-y-6">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-1">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-primary/10">
              <Users className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">FastMatch</h1>
              <p className="text-sm text-muted-foreground">
                Descubra conexões estratégicas e desbloqueie oportunidades de negócio
              </p>
            </div>
          </div>
        </motion.div>

        {/* Quota */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
          <QuotaIndicator
            used={quota.used}
            total={quota.monthly}
            extraCredits={quota.extraCredits}
            isFounder={quota.isFounder}
            className="max-w-sm"
          />
        </motion.div>

        {/* Upgrade banner if no quota */}
        {!quota.hasQuota && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }}>
            <UpgradeBanner />
          </motion.div>
        )}

        {/* Filters */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="flex items-center gap-3">
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
            <SelectTrigger className="w-48">
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
        </motion.div>

        {/* Grid */}
        {isLoading ? (
          <div className="text-center py-16 text-muted-foreground">A carregar perfis...</div>
        ) : filteredProfiles.length === 0 ? (
          <div className="text-center py-16 space-y-3">
            <Users className="w-10 h-10 mx-auto text-muted-foreground/50" />
            <p className="text-muted-foreground">Nenhum perfil encontrado.</p>
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
      </div>
    </div>
  );
}
