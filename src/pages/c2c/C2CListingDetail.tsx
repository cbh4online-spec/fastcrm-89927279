import { useState, useRef } from "react";
import { getShareUrl } from "@/utils/getShareUrl";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useC2CListingDetail, useC2CSellerReviews, useCreateC2CReport } from "@/hooks/useC2CListings";
import { useSendC2CMessage } from "@/hooks/useC2CMessages";
import { useC2CCheckout } from "@/hooks/useC2CCheckout";
import { useAuth } from "@/contexts/AuthContext";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { OfferDialog } from "@/components/c2c/OfferDialog";
import { ShareButtons } from "@/components/c2c/ShareButtons";
import { ArrowLeft, MapPin, Star, MessageCircle, Flag, Eye, Calendar, ShoppingBag, Loader2, User, Camera, RotateCw, Video, Store, Heart, Bell } from "lucide-react";
import { format } from "date-fns";
import { pt } from "date-fns/locale";

const conditionLabels: Record<string, string> = {
  new: "Novo",
  like_new: "Como novo",
  used: "Usado",
  for_parts: "Para peças",
};

function SpinViewer({ images }: { images: string[] }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dragStart, setDragStart] = useState<number | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const baseIndexRef = useRef(0);

  const handleStart = (clientX: number) => {
    setDragStart(clientX);
    baseIndexRef.current = currentIndex;
  };

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
    <div
      ref={containerRef}
      className="w-full h-full overflow-hidden cursor-grab active:cursor-grabbing relative select-none"
      onMouseDown={(e) => handleStart(e.clientX)}
      onMouseMove={(e) => handleMove(e.clientX)}
      onMouseUp={handleEnd}
      onMouseLeave={handleEnd}
      onTouchStart={(e) => handleStart(e.touches[0].clientX)}
      onTouchMove={(e) => handleMove(e.touches[0].clientX)}
      onTouchEnd={handleEnd}
    >
      <img
        src={images[currentIndex]}
        alt={`360° vista ${currentIndex + 1}`}
        className="w-full h-full object-contain select-none"
        draggable={false}
      />
      <div className="absolute bottom-2 left-1/2 -translate-x-1/2 bg-background/80 rounded-full px-3 py-1 text-xs text-muted-foreground flex items-center gap-1">
        <RotateCw className="h-3 w-3" /> Arrasta para rodar ({currentIndex + 1}/{images.length})
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
    <div
      ref={containerRef}
      className="w-full h-full overflow-hidden cursor-grab active:cursor-grabbing relative"
      onMouseDown={(e) => { setDragStart(e.clientX); setBaseOffset(offset); }}
      onMouseMove={(e) => { if (dragStart !== null) setOffset(baseOffset + (e.clientX - dragStart)); }}
      onMouseUp={() => setDragStart(null)}
      onMouseLeave={() => setDragStart(null)}
      onTouchStart={(e) => { setDragStart(e.touches[0].clientX); setBaseOffset(offset); }}
      onTouchMove={(e) => { if (dragStart !== null) setOffset(baseOffset + (e.touches[0].clientX - dragStart)); }}
      onTouchEnd={() => setDragStart(null)}
    >
      <img
        src={src}
        alt="360°"
        className="h-full max-w-none select-none"
        style={{ transform: `translateX(${offset}px)` }}
        draggable={false}
      />
      <div className="absolute bottom-2 left-1/2 -translate-x-1/2 bg-background/80 rounded-full px-3 py-1 text-xs text-muted-foreground flex items-center gap-1">
        <RotateCw className="h-3 w-3" /> Arrasta para rodar
      </div>
    </div>
  );
}

export default function C2CListingDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { currentWorkspace } = useWorkspace();
  const workspaceId = currentWorkspace?.id;

  const { data: listing, isLoading } = useC2CListingDetail(id);
  const { data: sellerReviews } = useC2CSellerReviews(listing?.seller_id);
  const sendMessage = useSendC2CMessage(workspaceId);
  const createReport = useCreateC2CReport(workspaceId);
  const checkout = useC2CCheckout();

  const [messageText, setMessageText] = useState("");
  const [reportReason, setReportReason] = useState("");
  const [reportDetails, setReportDetails] = useState("");
  const [selectedPhoto, setSelectedPhoto] = useState(0);

  if (isLoading) return <div className="flex items-center justify-center min-h-screen text-muted-foreground">A carregar...</div>;
  if (!listing) return <div className="flex items-center justify-center min-h-screen text-muted-foreground">Anúncio não encontrado</div>;

  const isOwner = user?.id === listing.seller_id;
  const photos360 = (listing as any).photos_360 as string[] || [];
  const videos = (listing as any).videos as string[] || [];
  const hasMultiMedia = photos360.length > 0 || videos.length > 0;

  const handleSendMessage = () => {
    if (!messageText.trim() || !listing) return;
    sendMessage.mutate({
      listingId: listing.id,
      receiverId: listing.seller_id,
      content: messageText.trim(),
    });
    setMessageText("");
  };

  const handleReport = () => {
    if (!reportReason) return;
    createReport.mutate({ listingId: listing.id, reason: reportReason, details: reportDetails });
    setReportReason("");
    setReportDetails("");
  };

  return (
    <div className="min-h-screen bg-background">
      {/* C2C Marketplace Header */}
      <header className="sticky top-0 z-40 bg-card/95 backdrop-blur-md border-b shadow-sm">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate("/dashboard/c2c")}
              className="shrink-0"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>

            <div className="flex items-center gap-2 shrink-0">
              <div className="p-1.5 rounded-lg bg-primary/10">
                <Store className="w-5 h-5 text-primary" />
              </div>
              <div className="hidden sm:block">
                <h1 className="text-lg font-bold leading-tight">Marketplace</h1>
              </div>
            </div>

            <div className="flex-1" />

            {user && (
              <div className="flex items-center gap-1.5 shrink-0">
                <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard/c2c/favorites")}>
                  <Heart className="h-5 w-5" />
                </Button>
                <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard/c2c/messages")}>
                  <MessageCircle className="h-5 w-5" />
                </Button>
                <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard/c2c/notifications")}>
                  <Bell className="h-5 w-5" />
                </Button>
                <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard/c2c/my-listings")}>
                  <User className="h-5 w-5" />
                </Button>
              </div>
            )}
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-6 max-w-5xl">

        <div className="grid gap-6 lg:grid-cols-5">
          {/* Photos / Media */}
          <div className="lg:col-span-3 space-y-3">
            {hasMultiMedia ? (
              <Tabs defaultValue="photos" className="w-full">
                <TabsList className="w-full grid grid-cols-3">
                  <TabsTrigger value="photos" className="gap-1.5">
                    <Camera className="h-3.5 w-3.5" />
                    Fotos {listing.photos?.length ? `(${listing.photos.length})` : ""}
                  </TabsTrigger>
                  <TabsTrigger value="360" className="gap-1.5" disabled={photos360.length === 0}>
                    <RotateCw className="h-3.5 w-3.5" />
                    360° {photos360.length > 0 && `(${photos360.length})`}
                  </TabsTrigger>
                  <TabsTrigger value="video" className="gap-1.5" disabled={videos.length === 0}>
                    <Video className="h-3.5 w-3.5" />
                    Vídeo {videos.length > 0 && `(${videos.length})`}
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="photos" className="mt-3 space-y-3">
                  <div className="aspect-square rounded-xl overflow-hidden bg-muted">
                    {listing.photos && listing.photos.length > 0 ? (
                      <img src={listing.photos[selectedPhoto]} alt={listing.title} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-muted-foreground">Sem foto</div>
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
                    <div className="aspect-square rounded-xl overflow-hidden bg-muted">
                      <SpinViewer images={photos360} />
                    </div>
                  ) : photos360.length === 1 ? (
                    <div className="aspect-video rounded-xl overflow-hidden bg-muted">
                      <PanoramaViewer src={photos360[0]} />
                    </div>
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
                    <div className="w-full h-full flex items-center justify-center text-muted-foreground">Sem foto</div>
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

          {/* Details */}
          <div className="lg:col-span-2 space-y-4">
            <div>
              <p className="text-3xl font-bold text-foreground">
                {listing.price.toFixed(2)} {listing.currency}
              </p>
              <h1 className="text-xl font-semibold mt-1">{listing.title}</h1>
            </div>

            <div className="flex flex-wrap gap-2">
              <Badge variant="secondary">{conditionLabels[listing.condition]}</Badge>
              {listing.location && (
                <Badge variant="outline" className="gap-1">
                  <MapPin className="h-3 w-3" /> {listing.location}
                </Badge>
              )}
            </div>

            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <span className="flex items-center gap-1">
                <Eye className="h-4 w-4" /> {listing.views_count} visualizações
              </span>
              <span className="flex items-center gap-1">
                <Calendar className="h-4 w-4" />
                {format(new Date(listing.created_at), "d MMM yyyy", { locale: pt })}
              </span>
            </div>

            {/* Seller info + link to profile */}
            <Button
              variant="outline"
              className="w-full justify-start gap-2"
              onClick={() => navigate(`/dashboard/c2c/seller/${listing.seller_id}`)}
            >
              <User className="h-4 w-4" />
              <span>Ver perfil do vendedor</span>
              {sellerReviews && sellerReviews.count > 0 && (
                <span className="ml-auto flex items-center gap-1 text-xs">
                  <Star className="h-3 w-3 text-amber-500 fill-amber-500" />
                  {sellerReviews.average} ({sellerReviews.count})
                </span>
              )}
            </Button>

            <div className="border-t pt-4">
              <h3 className="font-medium mb-2">Descrição</h3>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                {listing.description}
              </p>
            </div>

            {/* Share buttons */}
            <ShareButtons
              url={getShareUrl("c2c-listing", (currentWorkspace?.slug || "") + "/" + id)}
              title={listing.title}
              description={`${listing.price.toFixed(2)} ${listing.currency}`}
            />

            {/* Actions */}
            {user && !isOwner && (
              <div className="space-y-3 border-t pt-4">
                {/* Buy button */}
                <Button
                  className="w-full gap-2"
                  size="lg"
                  onClick={() => {
                    if (!workspaceId || !listing) return;
                    checkout.mutate({
                      listingId: listing.id,
                      workspaceId,
                    });
                  }}
                  disabled={checkout.isPending}
                >
                  {checkout.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <ShoppingBag className="h-4 w-4" />
                  )}
                  Comprar agora — {listing.price.toFixed(2)} {listing.currency}
                </Button>

                {/* Make Offer (Vinted-style) */}
                {workspaceId && (
                  <OfferDialog
                    listingId={listing.id}
                    sellerId={listing.seller_id}
                    currentPrice={listing.price}
                    currency={listing.currency}
                    workspaceId={workspaceId}
                  />
                )}

                <div className="space-y-2">
                  <Textarea
                    placeholder="Enviar mensagem ao vendedor..."
                    value={messageText}
                    onChange={(e) => setMessageText(e.target.value)}
                    rows={3}
                  />
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={handleSendMessage}
                    disabled={!messageText.trim() || sendMessage.isPending}
                  >
                    <MessageCircle className="h-4 w-4 mr-1" />
                    Enviar Mensagem
                  </Button>
                </div>

                <Dialog>
                  <DialogTrigger asChild>
                    <Button variant="ghost" size="sm" className="text-muted-foreground">
                      <Flag className="h-4 w-4 mr-1" /> Denunciar anúncio
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Denunciar Anúncio</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-3">
                      <Select value={reportReason} onValueChange={setReportReason}>
                        <SelectTrigger>
                          <SelectValue placeholder="Motivo da denúncia" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="spam">Spam</SelectItem>
                          <SelectItem value="fake">Anúncio falso</SelectItem>
                          <SelectItem value="inappropriate">Conteúdo impróprio</SelectItem>
                          <SelectItem value="scam">Fraude/Burla</SelectItem>
                          <SelectItem value="other">Outro</SelectItem>
                        </SelectContent>
                      </Select>
                      <Textarea
                        placeholder="Detalhes adicionais (opcional)"
                        value={reportDetails}
                        onChange={(e) => setReportDetails(e.target.value)}
                      />
                      <Button onClick={handleReport} disabled={!reportReason}>
                        Enviar Denúncia
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            )}

            {isOwner && (
              <div className="border-t pt-4">
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => navigate(`/dashboard/c2c/my-listings`)}
                >
                  Gerir os Meus Anúncios
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
