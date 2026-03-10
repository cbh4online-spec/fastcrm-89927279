import { useState, useRef } from "react";
import { useTranslation } from "react-i18next";
import { getShareUrl } from "@/utils/getShareUrl";
import { useParams, useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useC2CListingDetail, useC2CSellerReviews, useCreateC2CReport, useC2CFavorites, useToggleC2CFavorite } from "@/hooks/useC2CListings";
import { useSendC2CMessage } from "@/hooks/useC2CMessages";
import { useC2CCheckout } from "@/hooks/useC2CCheckout";
import { ShippingSelector } from "@/components/c2c/ShippingSelector";
import { useAuth } from "@/contexts/AuthContext";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { OfferDialog } from "@/components/c2c/OfferDialog";
import { ShareButtons } from "@/components/c2c/ShareButtons";
import { ListingCard } from "@/components/c2c/ListingCard";
import { SellerBadges, SellerRatingInline } from "@/components/c2c/SellerBadges";
import { ListingReviews } from "@/components/c2c/ListingReviews";
import { useIsMobile } from "@/hooks/use-mobile";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  ArrowLeft, MapPin, Star, MessageCircle, Flag, Eye, Calendar, ShoppingBag,
  Loader2, User, Camera, RotateCw, Video, Store, Heart, Bell,
  ShieldCheck, Truck, CreditCard, ChevronRight
} from "lucide-react";
import { format, type Locale as DateLocale } from "date-fns";
import { pt, enUS, es, fr } from "date-fns/locale";

const dateLocales: Record<string, DateLocale> = { pt, en: enUS, es, fr };

// --- Reusable sub-components ---

function SpinViewer({ images }: { images: string[] }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dragStart, setDragStart] = useState<number | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const baseIndexRef = useRef(0);

  const handleStart = (clientX: number) => { setDragStart(clientX); baseIndexRef.current = currentIndex; };
  const handleMove = (clientX: number) => {
    if (dragStart === null || !containerRef.current) return;
    const width = containerRef.current.offsetWidth;
    const delta = clientX - dragStart;
    const sensitivity = width / images.length;
    const indexDelta = Math.round(delta / sensitivity);
    let newIndex = (baseIndexRef.current - indexDelta) % images.length;
    if (newIndex < 0) newIndex += images.length;
    setCurrentIndex(newIndex);
  };
  const handleEnd = () => setDragStart(null);

  return (
    <div ref={containerRef} className="w-full h-full overflow-hidden cursor-grab active:cursor-grabbing relative select-none"
      onMouseDown={(e) => handleStart(e.clientX)} onMouseMove={(e) => handleMove(e.clientX)} onMouseUp={handleEnd} onMouseLeave={handleEnd}
      onTouchStart={(e) => handleStart(e.touches[0].clientX)} onTouchMove={(e) => handleMove(e.touches[0].clientX)} onTouchEnd={handleEnd}>
      <img src={images[currentIndex]} alt={`360° vista ${currentIndex + 1}`} className="w-full h-full object-contain select-none" draggable={false} />
      <div className="absolute bottom-2 left-1/2 -translate-x-1/2 bg-background/80 rounded-full px-3 py-1 text-xs text-muted-foreground flex items-center gap-1">
        <RotateCw className="h-3 w-3" /> ({currentIndex + 1}/{images.length})
      </div>
    </div>
  );
}

function PanoramaViewer({ src }: { src: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dragStart, setDragStart] = useState<number | null>(null);
  const [offset, setOffset] = useState(0);
  const [baseOffset, setBaseOffset] = useState(0);

  return (
    <div ref={containerRef} className="w-full h-full overflow-hidden cursor-grab active:cursor-grabbing relative"
      onMouseDown={(e) => { setDragStart(e.clientX); setBaseOffset(offset); }}
      onMouseMove={(e) => { if (dragStart !== null) setOffset(baseOffset + (e.clientX - dragStart)); }}
      onMouseUp={() => setDragStart(null)} onMouseLeave={() => setDragStart(null)}
      onTouchStart={(e) => { setDragStart(e.touches[0].clientX); setBaseOffset(offset); }}
      onTouchMove={(e) => { if (dragStart !== null) setOffset(baseOffset + (e.touches[0].clientX - dragStart)); }}
      onTouchEnd={() => setDragStart(null)}>
      <img src={src} alt="360°" className="h-full max-w-none select-none" style={{ transform: `translateX(${offset}px)` }} draggable={false} />
      <div className="absolute bottom-2 left-1/2 -translate-x-1/2 bg-background/80 rounded-full px-3 py-1 text-xs text-muted-foreground flex items-center gap-1">
        <RotateCw className="h-3 w-3" />
      </div>
    </div>
  );
}

function useRelatedListings(listing: any) {
  return useQuery({
    queryKey: ["c2c-related", listing?.category_id, listing?.id],
    queryFn: async () => {
      if (!listing?.category_id || !listing?.workspace_id) return [];
      const { data } = await supabase
        .from("c2c_listings").select("*")
        .eq("workspace_id", listing.workspace_id).eq("category_id", listing.category_id)
        .eq("status", "active").eq("moderation_status", "approved")
        .neq("id", listing.id).order("created_at", { ascending: false }).limit(8);
      return data || [];
    },
    enabled: !!listing?.category_id,
  });
}

function useSellerProfile(sellerId: string | undefined) {
  return useQuery({
    queryKey: ["c2c-seller-mini", sellerId],
    queryFn: async () => {
      if (!sellerId) return null;
      const { data } = await supabase.from("c2c_sellers").select("*").eq("user_id", sellerId).maybeSingle();
      return data;
    },
    enabled: !!sellerId,
  });
}

function useCategoryName(categoryId: string | undefined) {
  return useQuery({
    queryKey: ["c2c-category-name", categoryId],
    queryFn: async () => {
      if (!categoryId) return null;
      const { data } = await supabase.from("c2c_categories").select("name").eq("id", categoryId).maybeSingle();
      return data?.name || null;
    },
    enabled: !!categoryId,
  });
}

export default function C2CListingDetail() {
  const { t, i18n } = useTranslation('marketplace');
  const locale = dateLocales[i18n.language] || pt;
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { currentWorkspace } = useWorkspace();
  const workspaceId = currentWorkspace?.id;
  const isMobile = useIsMobile();

  const { data: listing, isLoading } = useC2CListingDetail(id);
  const { data: sellerReviews } = useC2CSellerReviews(listing?.seller_id);
  const { data: sellerProfile } = useSellerProfile(listing?.seller_id);
  const { data: relatedListings = [] } = useRelatedListings(listing);
  const { data: categoryName } = useCategoryName(listing?.category_id);
  const { data: favoriteIds = [] } = useC2CFavorites(workspaceId);
  const toggleFavorite = useToggleC2CFavorite(workspaceId);

  const sendMessage = useSendC2CMessage(workspaceId);
  const createReport = useCreateC2CReport(workspaceId);
  const checkout = useC2CCheckout();

  const [messageText, setMessageText] = useState("");
  const [reportReason, setReportReason] = useState("");
  const [reportDetails, setReportDetails] = useState("");
  const [selectedPhoto, setSelectedPhoto] = useState(0);
  const [shippingSelection, setShippingSelection] = useState<{ method: string; price: number; carrier: string; estimate: string } | null>(null);
  const [meetupLocation, setMeetupLocation] = useState("");

  const conditionLabels: Record<string, string> = {
    new: t('conditionNew'), like_new: t('conditionLikeNew'), used: t('conditionUsed'), for_parts: t('conditionForParts'),
  };

  if (isLoading) return <div className="flex items-center justify-center min-h-screen text-muted-foreground">{t('loading')}</div>;
  if (!listing) return <div className="flex items-center justify-center min-h-screen text-muted-foreground">{t('listingNotFound')}</div>;

  const isOwner = user?.id === listing.seller_id;
  const photos360 = (listing as any).photos_360 as string[] || [];
  const videos = (listing as any).videos as string[] || [];
  const hasMultiMedia = photos360.length > 0 || videos.length > 0;

  const handleSendMessage = () => {
    if (!messageText.trim() || !listing) return;
    sendMessage.mutate({ listingId: listing.id, receiverId: listing.seller_id, content: messageText.trim() });
    setMessageText("");
  };

  const handleReport = () => {
    if (!reportReason) return;
    createReport.mutate({ listingId: listing.id, reason: reportReason, details: reportDetails });
    setReportReason(""); setReportDetails("");
  };

  const trustItems = [
    { icon: ShieldCheck, label: t('protectedPayment'), sub: t('protectedPaymentDesc') },
    { icon: Truck, label: t('nationalShipping'), sub: t('nationalShippingDesc') },
    { icon: RotateCw, label: t('returns14Days'), sub: t('returns14DaysDesc') },
    { icon: CreditCard, label: t('secureCheckout'), sub: t('secureCheckoutDesc') },
  ];

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-card/95 backdrop-blur-md border-b shadow-sm">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard/c2c")} className="shrink-0">
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="flex items-center gap-2 shrink-0">
              <div className="p-1.5 rounded-lg bg-primary/10"><Store className="w-5 h-5 text-primary" /></div>
              <div className="hidden sm:block"><h1 className="text-lg font-bold leading-tight">{t('title')}</h1></div>
            </div>
            <div className="flex-1" />
            {user && (
              <div className="flex items-center gap-1.5 shrink-0">
                <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard/c2c/favorites")}><Heart className="h-5 w-5" /></Button>
                <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard/c2c/messages")}><MessageCircle className="h-5 w-5" /></Button>
                <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard/c2c/notifications")}><Bell className="h-5 w-5" /></Button>
                <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard/c2c/my-listings")}><User className="h-5 w-5" /></Button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Breadcrumb */}
      <div className="container mx-auto px-4 pt-4 max-w-6xl">
        <nav className="flex items-center gap-1.5 text-xs text-muted-foreground overflow-x-auto">
          <Link to="/dashboard/c2c" className="hover:text-foreground transition-colors whitespace-nowrap">{t('title')}</Link>
          <ChevronRight className="h-3 w-3 shrink-0" />
          {categoryName && (<><span className="whitespace-nowrap">{categoryName}</span><ChevronRight className="h-3 w-3 shrink-0" /></>)}
          <span className="text-foreground font-medium truncate">{listing.title}</span>
        </nav>
      </div>

      {/* Main */}
      <main className="flex-1">
        <div className="container mx-auto px-4 py-6 max-w-6xl">
          <div className="grid gap-6 lg:grid-cols-5">
            {/* Photos */}
            <div className="lg:col-span-3 space-y-3">
              {hasMultiMedia ? (
                <Tabs defaultValue="photos" className="w-full">
                  <TabsList className="w-full grid grid-cols-3">
                    <TabsTrigger value="photos" className="gap-1.5"><Camera className="h-3.5 w-3.5" />{t('photos')} {listing.photos?.length ? `(${listing.photos.length})` : ""}</TabsTrigger>
                    <TabsTrigger value="360" className="gap-1.5" disabled={photos360.length === 0}><RotateCw className="h-3.5 w-3.5" />360° {photos360.length > 0 && `(${photos360.length})`}</TabsTrigger>
                    <TabsTrigger value="video" className="gap-1.5" disabled={videos.length === 0}><Video className="h-3.5 w-3.5" />{t('video')} {videos.length > 0 && `(${videos.length})`}</TabsTrigger>
                  </TabsList>
                  <TabsContent value="photos" className="mt-3 space-y-3">
                    <div className="aspect-square rounded-xl overflow-hidden bg-muted">
                      {listing.photos && listing.photos.length > 0 ? (
                        <img src={listing.photos[selectedPhoto]} alt={listing.title} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-muted-foreground">{t('noPhoto')}</div>
                      )}
                    </div>
                    {listing.photos && listing.photos.length > 1 && (
                      <div className="flex gap-2 overflow-x-auto">
                        {listing.photos.map((photo, i) => (
                          <button key={i} onClick={() => setSelectedPhoto(i)} className={`w-16 h-16 rounded-lg overflow-hidden flex-shrink-0 border-2 ${i === selectedPhoto ? "border-primary" : "border-transparent"}`}>
                            <img src={photo} alt="" className="w-full h-full object-cover" />
                          </button>
                        ))}
                      </div>
                    )}
                  </TabsContent>
                  <TabsContent value="360" className="mt-3">
                    {photos360.length > 1 ? (
                      <div className="aspect-square rounded-xl overflow-hidden bg-muted"><SpinViewer images={photos360} /></div>
                    ) : photos360.length === 1 ? (
                      <div className="aspect-video rounded-xl overflow-hidden bg-muted"><PanoramaViewer src={photos360[0]} /></div>
                    ) : null}
                  </TabsContent>
                  <TabsContent value="video" className="mt-3">
                    {videos.map((video, i) => (
                      <div key={i} className="aspect-video rounded-xl overflow-hidden bg-muted mb-3">
                        <video src={video} controls className="w-full h-full object-contain" />
                      </div>
                    ))}
                  </TabsContent>
                </Tabs>
              ) : (
                <>
                  <div className="aspect-square rounded-xl overflow-hidden bg-muted">
                    {listing.photos && listing.photos.length > 0 ? (
                      <img src={listing.photos[selectedPhoto]} alt={listing.title} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-muted-foreground">{t('noPhoto')}</div>
                    )}
                  </div>
                  {listing.photos && listing.photos.length > 1 && (
                    <div className="flex gap-2 overflow-x-auto">
                      {listing.photos.map((photo, i) => (
                        <button key={i} onClick={() => setSelectedPhoto(i)} className={`w-16 h-16 rounded-lg overflow-hidden flex-shrink-0 border-2 ${i === selectedPhoto ? "border-primary" : "border-transparent"}`}>
                          <img src={photo} alt="" className="w-full h-full object-cover" />
                        </button>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Sidebar */}
            <div className="lg:col-span-2 space-y-5">
              <div>
                <p className="text-3xl font-bold text-foreground">{listing.price.toFixed(2)} {listing.currency}</p>
                <h2 className="text-xl font-semibold mt-1">{listing.title}</h2>
              </div>

              <div className="flex flex-wrap gap-2">
                <Badge variant="secondary">{conditionLabels[listing.condition]}</Badge>
                {listing.location && (<Badge variant="outline" className="gap-1"><MapPin className="h-3 w-3" /> {listing.location}</Badge>)}
              </div>

              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <span className="flex items-center gap-1"><Eye className="h-4 w-4" /> {listing.views_count} {t('views')}</span>
                <span className="flex items-center gap-1"><Calendar className="h-4 w-4" />{format(new Date(listing.created_at), "d MMM yyyy", { locale })}</span>
              </div>

              {/* Seller Card */}
              <div className="rounded-xl border bg-card p-4 space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-lg font-bold text-primary">
                    {sellerProfile?.display_name?.[0]?.toUpperCase() || "V"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="font-semibold text-sm truncate">{sellerProfile?.display_name || t('seller')}</span>
                    </div>
                    <SellerRatingInline
                      avgRating={sellerProfile?.avg_rating || sellerReviews?.average || 0}
                      totalReviews={sellerProfile?.total_reviews || sellerReviews?.count || 0}
                    />
                    {sellerProfile?.created_at && (
                      <span className="text-xs text-muted-foreground">{t('memberSince')} {format(new Date(sellerProfile.created_at), "MMM yyyy", { locale })}</span>
                    )}
                  </div>
                </div>
                {sellerProfile && (
                  <SellerBadges
                    avgRating={sellerProfile.avg_rating || 0}
                    totalReviews={sellerProfile.total_reviews || 0}
                    totalSales={sellerProfile.total_sales || 0}
                    isVerified={sellerProfile.is_verified || false}
                    memberSince={sellerProfile.created_at}
                  />
                )}
                <div className="grid grid-cols-2 gap-2">
                  <Button variant="outline" size="sm" className="w-full" onClick={() => navigate(`/dashboard/c2c/seller/${listing.seller_id}`)}>
                    {t('viewProfile')}
                  </Button>
                  {!isOwner && (
                    <Button variant="outline" size="sm" className="w-full gap-1" onClick={() => navigate(`/dashboard/c2c/messages?to=${listing.seller_id}&listing=${listing.id}`)}>
                      <MessageCircle className="h-3.5 w-3.5" /> {t('contact')}
                    </Button>
                  )}
                </div>
              </div>

              {/* Description */}
              <div className="border-t pt-4">
                <h3 className="font-medium mb-2">{t('description')}</h3>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">{listing.description}</p>
              </div>

              {/* Trust */}
              <div className="rounded-xl border bg-card/50 p-4">
                <div className="grid grid-cols-2 gap-3">
                  {trustItems.map(({ icon: Icon, label, sub }) => (
                    <div key={label} className="flex items-start gap-2">
                      <div className="p-1.5 rounded-lg bg-primary/10 shrink-0"><Icon className="h-4 w-4 text-primary" /></div>
                      <div>
                        <p className="text-xs font-medium leading-tight">{label}</p>
                        <p className="text-[10px] text-muted-foreground">{sub}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <ShareButtons url={getShareUrl("c2c-listing", (currentWorkspace?.slug || "") + "/" + id)} title={listing.title} description={`${listing.price.toFixed(2)} ${listing.currency}`} />

              {/* Actions (desktop) */}
              {user && !isOwner && (
                <div className="space-y-3 border-t pt-4 hidden lg:block">
                  {/* Shipping selector */}
                  <ShippingSelector
                    deliveryMode={(listing as any).delivery_mode || 'shipping'}
                    selectedMethod={shippingSelection?.method || null}
                    onSelect={setShippingSelection}
                    meetupLocation={meetupLocation}
                    onMeetupLocationChange={setMeetupLocation}
                  />

                  {shippingSelection && (
                    <div className="text-sm text-muted-foreground flex justify-between border rounded-lg p-2">
                      <span>{t('ordersTitle')}</span>
                      <span className="font-semibold text-foreground">
                        {(listing.price + (shippingSelection.price || 0)).toFixed(2)} {listing.currency}
                      </span>
                    </div>
                  )}

                  <Button className="w-full gap-2" size="lg" onClick={() => {
                    if (!workspaceId || !listing || !shippingSelection) return;
                    checkout.mutate({
                      listingId: listing.id, workspaceId,
                      shippingMethod: shippingSelection.method,
                      shippingPrice: shippingSelection.price,
                      shippingCarrier: shippingSelection.carrier,
                      meetupLocation: shippingSelection.method === 'in_person' ? meetupLocation : undefined,
                    });
                  }} disabled={checkout.isPending || !shippingSelection}>
                    {checkout.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShoppingBag className="h-4 w-4" />}
                    {!shippingSelection ? t('chooseShipping') : `${t('buyNow')} — ${(listing.price + (shippingSelection?.price || 0)).toFixed(2)} ${listing.currency}`}
                  </Button>

                  {workspaceId && (<OfferDialog listingId={listing.id} sellerId={listing.seller_id} currentPrice={listing.price} currency={listing.currency} workspaceId={workspaceId} />)}

                  <div id="contact-seller" className="space-y-2">
                    <Textarea placeholder={t('messagePlaceholder')} value={messageText} onChange={(e) => setMessageText(e.target.value)} rows={3} />
                    <Button variant="outline" className="w-full" onClick={handleSendMessage} disabled={!messageText.trim() || sendMessage.isPending}>
                      <MessageCircle className="h-4 w-4 mr-1" /> {t('sendMessage')}
                    </Button>
                  </div>

                  <Dialog>
                    <DialogTrigger asChild>
                      <Button variant="ghost" size="sm" className="text-muted-foreground"><Flag className="h-4 w-4 mr-1" /> {t('reportListing')}</Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader><DialogTitle>{t('reportTitle')}</DialogTitle></DialogHeader>
                      <div className="space-y-3">
                        <Select value={reportReason} onValueChange={setReportReason}>
                          <SelectTrigger><SelectValue placeholder={t('reportReasonPlaceholder')} /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="spam">{t('reportSpam')}</SelectItem>
                            <SelectItem value="fake">{t('reportFake')}</SelectItem>
                            <SelectItem value="inappropriate">{t('reportInappropriate')}</SelectItem>
                            <SelectItem value="scam">{t('reportScam')}</SelectItem>
                            <SelectItem value="other">{t('reportOther')}</SelectItem>
                          </SelectContent>
                        </Select>
                        <Textarea placeholder={t('reportDetailsPlaceholder')} value={reportDetails} onChange={(e) => setReportDetails(e.target.value)} />
                        <Button onClick={handleReport} disabled={!reportReason}>{t('sendReport')}</Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              )}

              {/* Mobile actions */}
              {user && !isOwner && (
                <div className="space-y-3 border-t pt-4 lg:hidden">
                  <div id="contact-seller-mobile" className="space-y-2">
                    <Textarea placeholder={t('messagePlaceholder')} value={messageText} onChange={(e) => setMessageText(e.target.value)} rows={3} />
                    <Button variant="outline" className="w-full" onClick={handleSendMessage} disabled={!messageText.trim() || sendMessage.isPending}>
                      <MessageCircle className="h-4 w-4 mr-1" /> {t('sendMessage')}
                    </Button>
                  </div>
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button variant="ghost" size="sm" className="text-muted-foreground"><Flag className="h-4 w-4 mr-1" /> {t('reportListing')}</Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader><DialogTitle>{t('reportTitle')}</DialogTitle></DialogHeader>
                      <div className="space-y-3">
                        <Select value={reportReason} onValueChange={setReportReason}>
                          <SelectTrigger><SelectValue placeholder={t('reportReasonPlaceholder')} /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="spam">{t('reportSpam')}</SelectItem>
                            <SelectItem value="fake">{t('reportFake')}</SelectItem>
                            <SelectItem value="inappropriate">{t('reportInappropriate')}</SelectItem>
                            <SelectItem value="scam">{t('reportScam')}</SelectItem>
                            <SelectItem value="other">{t('reportOther')}</SelectItem>
                          </SelectContent>
                        </Select>
                        <Textarea placeholder={t('reportDetailsPlaceholder')} value={reportDetails} onChange={(e) => setReportDetails(e.target.value)} />
                        <Button onClick={handleReport} disabled={!reportReason}>{t('sendReport')}</Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              )}

              {isOwner && (
                <div className="border-t pt-4">
                  <Button variant="outline" className="w-full" onClick={() => navigate(`/dashboard/c2c/my-listings`)}>{t('manageMy')}</Button>
                </div>
              )}
            </div>
          </div>

          {/* Reviews */}
          {workspaceId && listing && (
            <section className="mt-10">
              <ListingReviews listingId={listing.id} sellerId={listing.seller_id} workspaceId={workspaceId} />
            </section>
          )}

          {/* Related */}
          {relatedListings.length > 0 && (
            <section className="mt-10">
              <h2 className="text-lg font-bold mb-4">{t('relatedProducts')}</h2>
              <div className="flex gap-4 overflow-x-auto pb-4 snap-x snap-mandatory scrollbar-hide">
                {relatedListings.map((rel: any) => (
                  <ListingCard key={rel.id} listing={rel} variant="carousel" isFavorite={favoriteIds.includes(rel.id)} onToggleFavorite={() => toggleFavorite.mutate(rel.id)} onClick={() => navigate(`/dashboard/c2c/${rel.id}`)} />
                ))}
              </div>
            </section>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t bg-card/50 mt-8">
        <div className="container mx-auto px-4 py-8 max-w-6xl">
          <div className="grid gap-6 sm:grid-cols-3 text-sm">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <div className="p-1.5 rounded-lg bg-primary/10"><Store className="w-4 h-4 text-primary" /></div>
                <span className="font-bold">{t('title')}</span>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">{t('footerDescription')}</p>
            </div>
            <div>
              <h4 className="font-semibold mb-2">{t('information')}</h4>
              <ul className="space-y-1.5 text-xs text-muted-foreground">
                <li><button className="hover:text-foreground transition-colors">{t('howItWorks')}</button></li>
                <li><button className="hover:text-foreground transition-colors">{t('feesAndCommissions')}</button></li>
                <li><button className="hover:text-foreground transition-colors">{t('premiumProgram')}</button></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-2">{t('legal')}</h4>
              <ul className="space-y-1.5 text-xs text-muted-foreground">
                <li><button className="hover:text-foreground transition-colors">{t('termsAndConditions')}</button></li>
                <li><button className="hover:text-foreground transition-colors">{t('privacyPolicy')}</button></li>
                <li><button className="hover:text-foreground transition-colors">RGPD</button></li>
              </ul>
            </div>
          </div>
          <div className="border-t mt-6 pt-4 text-center text-[11px] text-muted-foreground">
            © {new Date().getFullYear()} {t('title')}. {t('allRightsReserved')}
          </div>
        </div>
      </footer>

      {/* Sticky Mobile Bar */}
      {isMobile && user && !isOwner && (
        <div className="fixed bottom-0 left-0 right-0 z-50 bg-card/95 backdrop-blur-md border-t shadow-[0_-4px_20px_rgba(0,0,0,0.15)] p-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))]">
          <div className="flex items-center gap-3">
            <div className="flex-1 min-w-0">
              <p className="text-lg font-bold leading-tight">{listing.price.toFixed(2)} {listing.currency}</p>
              <p className="text-[11px] text-muted-foreground truncate">{listing.title}</p>
            </div>
            <Button size="sm" variant="outline" onClick={() => {
              const el = document.getElementById("contact-seller-mobile");
              el?.scrollIntoView({ behavior: "smooth" });
            }}>
              {t('makeOffer')}
            </Button>
            <Button size="sm" onClick={() => {
              if (!workspaceId || !listing || !shippingSelection) return;
              checkout.mutate({
                listingId: listing.id, workspaceId,
                shippingMethod: shippingSelection.method,
                shippingPrice: shippingSelection.price,
                shippingCarrier: shippingSelection.carrier,
                meetupLocation: shippingSelection.method === 'in_person' ? meetupLocation : undefined,
              });
            }} disabled={checkout.isPending || !shippingSelection}>
              {checkout.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : t('buyNow').split(' ')[0]}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
