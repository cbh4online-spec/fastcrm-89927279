import { useState, useMemo } from "react";
import { getPublicBaseUrl } from "@/utils/getPublicDomain";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useMyC2CListings, useUpdateC2CListing } from "@/hooks/useC2CListings";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { ListingStats } from "@/components/c2c/ListingStats";
import { MarketplaceShareCard } from "@/components/c2c/MarketplaceShareCard";
import { ShareButtons } from "@/components/c2c/ShareButtons";
import {
  ArrowLeft, Plus, Pencil, Pause, Play, Trash2, Rocket, MoreVertical,
  Eye, Heart, MessageCircle, Package, TrendingUp, ShieldCheck, Zap,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { pt, enUS, es, fr } from "date-fns/locale";

const dateLocales: Record<string, Locale> = { pt, en: enUS, es, fr };

type StatusFilter = "all" | "active" | "paused" | "sold";

export default function C2CMyListings() {
  const { t, i18n } = useTranslation('marketplace');
  const navigate = useNavigate();
  const { currentWorkspace } = useWorkspace();
  const workspaceId = currentWorkspace?.id;
  const { data: listings = [], isLoading } = useMyC2CListings(workspaceId);
  const updateListing = useUpdateC2CListing();
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const locale = dateLocales[i18n.language] || pt;

  const statusLabels: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
    active: { label: t('statusActive'), variant: "default" },
    paused: { label: t('statusPaused'), variant: "secondary" },
    sold: { label: t('statusSold'), variant: "outline" },
    flagged: { label: t('statusFlagged'), variant: "destructive" },
    removed: { label: t('statusRemoved'), variant: "destructive" },
  };

  const conditionLabels: Record<string, string> = {
    new: t('conditionNew'),
    like_new: t('conditionLikeNew'),
    used: t('conditionUsed'),
    for_parts: t('conditionForParts'),
  };

  const filteredListings = useMemo(() => {
    if (statusFilter === "all") return listings;
    return listings.filter((l) => l.status === statusFilter);
  }, [listings, statusFilter]);

  const kpis = useMemo(() => {
    const active = listings.filter((l) => l.status === "active").length;
    const totalViews = listings.reduce((s, l) => s + (l.views_count || 0), 0);
    const totalFavs = listings.reduce((s, l) => s + ((l as any).favorites_count || 0), 0);
    const totalMsgs = listings.reduce((s, l) => s + ((l as any).messages_count || 0), 0);
    return { active, totalViews, totalFavs, totalMsgs };
  }, [listings]);

  const statusCounts = useMemo(() => ({
    all: listings.length,
    active: listings.filter((l) => l.status === "active").length,
    paused: listings.filter((l) => l.status === "paused").length,
    sold: listings.filter((l) => l.status === "sold").length,
  }), [listings]);

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-6 max-w-4xl">
        <Button variant="ghost" size="sm" onClick={() => navigate("/dashboard/c2c")} className="mb-4 -ml-2">
          <ArrowLeft className="h-4 w-4 mr-1" /> {t('title')}
        </Button>

        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">{t('myListings')}</h1>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => navigate("/dashboard/c2c/boost")} className="gap-1">
              <Rocket className="h-4 w-4" /> {t('boost')}
            </Button>
            <Button onClick={() => navigate("/dashboard/c2c/create")}>
              <Plus className="h-4 w-4 mr-1" /> {t('newListing')}
            </Button>
          </div>
        </div>

        {!isLoading && currentWorkspace && (
          <div className="mb-6">
            <MarketplaceShareCard
              marketplaceUrl={`${getPublicBaseUrl()}/marketplace/${currentWorkspace.slug || currentWorkspace.id}`}
              marketplaceName={currentWorkspace.name}
            />
          </div>
        )}

        {!isLoading && listings.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
            <KpiCard icon={<Package className="h-4 w-4" />} label={t('activeCount')} value={kpis.active} />
            <KpiCard icon={<Eye className="h-4 w-4" />} label={t('kpiViews')} value={kpis.totalViews} />
            <KpiCard icon={<Heart className="h-4 w-4" />} label={t('kpiFavorites')} value={kpis.totalFavs} />
            <KpiCard icon={<MessageCircle className="h-4 w-4" />} label={t('kpiMessages')} value={kpis.totalMsgs} />
          </div>
        )}

        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center gap-4 p-4 rounded-xl border bg-card">
                <Skeleton className="w-20 h-20 rounded-lg flex-shrink-0" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-5 w-20" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
                <Skeleton className="h-6 w-16 rounded-full" />
              </div>
            ))}
          </div>
        ) : listings.length === 0 ? (
          <div className="text-center py-16 px-4">
            <div className="rounded-full bg-muted p-6 inline-flex mb-5">
              <Package className="h-12 w-12 text-muted-foreground" />
            </div>
            <h2 className="text-xl font-semibold mb-2">{t('startSelling')}</h2>
            <p className="text-muted-foreground mb-8 max-w-md mx-auto">{t('startSellingDesc')}</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-lg mx-auto mb-8">
              <BenefitItem icon={<Zap className="h-5 w-5 text-primary" />} text={t('instantPublishing')} />
              <BenefitItem icon={<TrendingUp className="h-5 w-5 text-primary" />} text={t('thousandsBuyers')} />
              <BenefitItem icon={<ShieldCheck className="h-5 w-5 text-primary" />} text={t('safeTransactions')} />
            </div>
            <Button size="lg" onClick={() => navigate("/dashboard/c2c/create")}>
              <Plus className="h-5 w-5 mr-2" /> {t('createFirstListing')}
            </Button>
          </div>
        ) : (
          <>
            <Tabs value={statusFilter} onValueChange={(v) => setStatusFilter(v as StatusFilter)} className="mb-4">
              <TabsList>
                <TabsTrigger value="all">{t('all')} ({statusCounts.all})</TabsTrigger>
                <TabsTrigger value="active">{t('active')} ({statusCounts.active})</TabsTrigger>
                <TabsTrigger value="paused">{t('paused')} ({statusCounts.paused})</TabsTrigger>
                <TabsTrigger value="sold">{t('sold')} ({statusCounts.sold})</TabsTrigger>
              </TabsList>
            </Tabs>

            {filteredListings.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">{t('noListingsStatus')}</div>
            ) : (
              <div className="space-y-3">
                {filteredListings.map((listing) => {
                  const st = statusLabels[listing.status] || statusLabels.active;
                  const timeAgo = formatDistanceToNow(new Date(listing.created_at), { addSuffix: true, locale });
                  const condition = conditionLabels[listing.condition] || listing.condition;
                  const listingUrl = `${getPublicBaseUrl()}/marketplace/${currentWorkspace?.slug || currentWorkspace?.id}/${listing.id}`;

                  return (
                    <div
                      key={listing.id}
                      className="flex items-start gap-4 p-4 rounded-xl border bg-card hover:shadow-sm transition-shadow cursor-pointer"
                      onClick={() => navigate(`/dashboard/c2c/${listing.id}`)}
                    >
                      <div className="w-20 h-20 rounded-lg overflow-hidden bg-muted flex-shrink-0">
                        {listing.photos?.[0] ? (
                          <img src={listing.photos[0]} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-muted-foreground/40">
                            <Package className="h-6 w-6" />
                          </div>
                        )}
                      </div>

                      <div className="flex-1 min-w-0 space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-medium truncate">{listing.title}</h3>
                          <Badge variant={st.variant} className="text-[10px] px-1.5 py-0">{st.label}</Badge>
                        </div>
                        <div className="flex items-center gap-2">
                          <p className="text-base font-bold text-foreground">{listing.price.toFixed(0)}€</p>
                          <span className="text-xs text-muted-foreground">· {condition}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <ListingStats views={listing.views_count || 0} favorites={(listing as any).favorites_count || 0} messages={(listing as any).messages_count || 0} />
                          <span className="text-xs text-muted-foreground">{timeAgo}</span>
                        </div>
                        <div onClick={(e) => e.stopPropagation()}>
                          <ShareButtons url={listingUrl} title={listing.title} />
                        </div>
                      </div>

                      <div onClick={(e) => e.stopPropagation()}>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => navigate(`/dashboard/c2c/edit/${listing.id}`)}>
                              <Pencil className="h-4 w-4 mr-2" /> {t('edit')}
                            </DropdownMenuItem>
                            {listing.status === "active" && (
                              <DropdownMenuItem onClick={() => updateListing.mutate({ id: listing.id, status: "paused" })}>
                                <Pause className="h-4 w-4 mr-2" /> {t('pause')}
                              </DropdownMenuItem>
                            )}
                            {listing.status === "paused" && (
                              <DropdownMenuItem onClick={() => updateListing.mutate({ id: listing.id, status: "active" })}>
                                <Play className="h-4 w-4 mr-2" /> {t('reactivate')}
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuSeparator />
                            <DropdownMenuItem className="text-destructive" onClick={() => updateListing.mutate({ id: listing.id, status: "removed" })}>
                              <Trash2 className="h-4 w-4 mr-2" /> {t('remove')}
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function KpiCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  return (
    <Card>
      <CardContent className="p-4 flex items-center gap-3">
        <div className="rounded-full bg-primary/10 p-2 text-primary">{icon}</div>
        <div>
          <p className="text-2xl font-bold leading-none">{value}</p>
          <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function BenefitItem({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <div className="flex flex-col items-center gap-2 p-3 rounded-lg bg-muted/50">
      {icon}
      <span className="text-xs font-medium text-foreground">{text}</span>
    </div>
  );
}
