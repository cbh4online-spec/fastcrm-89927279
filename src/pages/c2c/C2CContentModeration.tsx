import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { NexusPageHeader } from "@/components/dashboard/nexus/NexusPageHeader";
import { toast } from "sonner";
import {
  Shield, Search, Flag, CheckCircle2, XCircle, Eye, AlertTriangle,
  Package, Clock, Loader2, ExternalLink
} from "lucide-react";
import { format } from "date-fns";

function useC2CReports(workspaceId?: string) {
  return useQuery({
    queryKey: ["c2c-reports-admin", workspaceId],
    queryFn: async () => {
      if (!workspaceId) return [];
      const { data, error } = await supabase
        .from("c2c_reports")
        .select("*, c2c_listings(id, title, photos, status, seller_id)")
        .eq("workspace_id", workspaceId)
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return data || [];
    },
    enabled: !!workspaceId,
  });
}

function useFlaggedListings(workspaceId?: string) {
  return useQuery({
    queryKey: ["c2c-flagged-listings", workspaceId],
    queryFn: async () => {
      if (!workspaceId) return [];
      const { data, error } = await supabase
        .from("c2c_listings")
        .select("id, title, photos, status, moderation_status, seller_id, created_at, price, currency")
        .eq("workspace_id", workspaceId)
        .in("moderation_status", ["pending", "flagged"])
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!workspaceId,
  });
}

function useModerateReport(workspaceId?: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ reportId, status, action }: { reportId: string; status: string; action?: string }) => {
      const { error } = await supabase
        .from("c2c_reports")
        .update({ status, reviewed_at: new Date().toISOString(), reviewed_by: (await supabase.auth.getUser()).data.user?.id })
        .eq("id", reportId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["c2c-reports-admin"] });
      toast.success("Denúncia atualizada");
    },
  });
}

function useModerateListing(workspaceId?: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ listingId, moderationStatus, listingStatus }: { listingId: string; moderationStatus: string; listingStatus?: string }) => {
      const updates: any = { moderation_status: moderationStatus };
      if (listingStatus) updates.status = listingStatus;
      const { error } = await supabase.from("c2c_listings").update(updates).eq("id", listingId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["c2c-flagged-listings"] });
      toast.success("Anúncio moderado");
    },
  });
}

const reasonLabels: Record<string, string> = {
  spam: "Spam", fake: "Falso", inappropriate: "Impróprio", scam: "Fraude", other: "Outro"
};

export default function C2CContentModeration() {
  const { t } = useTranslation('marketplace');
  const { currentWorkspace } = useWorkspace();
  const wid = currentWorkspace?.id;
  const [search, setSearch] = useState("");
  const [selectedReport, setSelectedReport] = useState<any>(null);

  const { data: reports = [], isLoading: loadingReports } = useC2CReports(wid);
  const { data: flagged = [], isLoading: loadingFlagged } = useFlaggedListings(wid);
  const moderateReport = useModerateReport(wid);
  const moderateListing = useModerateListing(wid);

  const pendingReports = reports.filter((r: any) => r.status === 'pending');
  const resolvedReports = reports.filter((r: any) => r.status !== 'pending');

  const filteredFlagged = flagged.filter((l: any) =>
    !search || l.title?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <NexusPageHeader
        icon={Shield}
        title={t('modTitle')}
        subtitle={t('modDesc')}
        badge={pendingReports.length > 0 ? `${pendingReports.length} ${t('modPending')}` : undefined}
      />

      <Tabs defaultValue="reports">
        <TabsList>
          <TabsTrigger value="reports" className="gap-1.5">
            <Flag className="h-3.5 w-3.5" /> {t('modReports')} {pendingReports.length > 0 && `(${pendingReports.length})`}
          </TabsTrigger>
          <TabsTrigger value="queue" className="gap-1.5">
            <Package className="h-3.5 w-3.5" /> {t('modQueue')} {flagged.length > 0 && `(${flagged.length})`}
          </TabsTrigger>
        </TabsList>

        {/* Reports Tab */}
        <TabsContent value="reports" className="space-y-4 mt-4">
          {loadingReports ? (
            <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
          ) : pendingReports.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <CheckCircle2 className="h-10 w-10 mx-auto mb-3 opacity-40" />
              <p className="text-sm">{t('modNoReports')}</p>
            </div>
          ) : (
            pendingReports.map((report: any) => {
              const listing = report.c2c_listings;
              const photos = listing?.photos as string[] | null;
              return (
                <div key={report.id} className="rounded-xl border bg-card p-4 flex gap-4">
                  <div className="w-16 h-16 rounded-lg overflow-hidden bg-muted shrink-0">
                    {photos?.[0] ? <img src={photos[0]} className="w-full h-full object-cover" /> : <Package className="w-full h-full p-3 text-muted-foreground" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold text-sm truncate">{listing?.title || 'N/A'}</h3>
                      <Badge variant="destructive" className="text-[10px]">
                        <AlertTriangle className="h-3 w-3 mr-0.5" /> {reasonLabels[report.reason] || report.reason}
                      </Badge>
                    </div>
                    {report.details && <p className="text-xs text-muted-foreground line-clamp-2">{report.details}</p>}
                    <p className="text-[10px] text-muted-foreground mt-1">
                      <Clock className="h-3 w-3 inline mr-0.5" /> {format(new Date(report.created_at), "dd/MM/yyyy HH:mm")}
                    </p>
                  </div>
                  <div className="flex flex-col gap-1.5 shrink-0">
                    <Button size="sm" variant="destructive" onClick={() => {
                      moderateReport.mutate({ reportId: report.id, status: 'resolved' });
                      if (listing?.id) moderateListing.mutate({ listingId: listing.id, moderationStatus: 'rejected', listingStatus: 'removed' });
                    }}>
                      <XCircle className="h-3.5 w-3.5 mr-1" /> {t('modRemove')}
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => moderateReport.mutate({ reportId: report.id, status: 'dismissed' })}>
                      <CheckCircle2 className="h-3.5 w-3.5 mr-1" /> {t('modDismiss')}
                    </Button>
                  </div>
                </div>
              );
            })
          )}
        </TabsContent>

        {/* Moderation Queue */}
        <TabsContent value="queue" className="space-y-4 mt-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder={t('modSearchListings')} value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
          </div>

          {loadingFlagged ? (
            <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
          ) : filteredFlagged.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <CheckCircle2 className="h-10 w-10 mx-auto mb-3 opacity-40" />
              <p className="text-sm">{t('modNoQueue')}</p>
            </div>
          ) : (
            filteredFlagged.map((listing: any) => {
              const photos = listing.photos as string[] | null;
              return (
                <div key={listing.id} className="rounded-xl border bg-card p-4 flex gap-4">
                  <div className="w-16 h-16 rounded-lg overflow-hidden bg-muted shrink-0">
                    {photos?.[0] ? <img src={photos[0]} className="w-full h-full object-cover" /> : <Package className="w-full h-full p-3 text-muted-foreground" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-sm truncate">{listing.title}</h3>
                    <p className="text-xs text-muted-foreground">{listing.price?.toFixed(2)} {listing.currency}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="secondary" className="text-[10px]">{listing.moderation_status}</Badge>
                      <span className="text-[10px] text-muted-foreground">{format(new Date(listing.created_at), "dd/MM/yyyy")}</span>
                    </div>
                  </div>
                  <div className="flex flex-col gap-1.5 shrink-0">
                    <Button size="sm" onClick={() => moderateListing.mutate({ listingId: listing.id, moderationStatus: 'approved' })}>
                      <CheckCircle2 className="h-3.5 w-3.5 mr-1" /> {t('modApprove')}
                    </Button>
                    <Button size="sm" variant="destructive" onClick={() => moderateListing.mutate({ listingId: listing.id, moderationStatus: 'rejected', listingStatus: 'removed' })}>
                      <XCircle className="h-3.5 w-3.5 mr-1" /> {t('modReject')}
                    </Button>
                  </div>
                </div>
              );
            })
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
