import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useC2CListingDetail, useC2CSellerReviews, useCreateC2CReport } from "@/hooks/useC2CListings";
import { useSendC2CMessage } from "@/hooks/useC2CMessages";
import { useC2CCheckout } from "@/hooks/useC2CCheckout";
import { useAuth } from "@/contexts/AuthContext";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { ArrowLeft, MapPin, Star, MessageCircle, Flag, Eye, Calendar, ShoppingBag, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { pt } from "date-fns/locale";

const conditionLabels: Record<string, string> = {
  new: "Novo",
  like_new: "Como novo",
  used: "Usado",
  for_parts: "Para peças",
};

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
      <div className="container mx-auto px-4 py-6 max-w-5xl">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate(-1)}
          className="mb-4 -ml-2"
        >
          <ArrowLeft className="h-4 w-4 mr-1" /> Voltar
        </Button>

        <div className="grid gap-6 lg:grid-cols-5">
          {/* Photos */}
          <div className="lg:col-span-3 space-y-3">
            <div className="aspect-square rounded-xl overflow-hidden bg-muted">
              {listing.photos && listing.photos.length > 0 ? (
                <img
                  src={listing.photos[selectedPhoto]}
                  alt={listing.title}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                  Sem foto
                </div>
              )}
            </div>
            {listing.photos && listing.photos.length > 1 && (
              <div className="flex gap-2 overflow-x-auto">
                {listing.photos.map((photo, i) => (
                  <button
                    key={i}
                    onClick={() => setSelectedPhoto(i)}
                    className={`w-16 h-16 rounded-lg overflow-hidden flex-shrink-0 border-2 ${
                      i === selectedPhoto ? "border-primary" : "border-transparent"
                    }`}
                  >
                    <img src={photo} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
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

            {/* Seller reviews */}
            {sellerReviews && sellerReviews.count > 0 && (
              <div className="flex items-center gap-2 text-sm">
                <Star className="h-4 w-4 text-amber-500 fill-amber-500" />
                <span className="font-medium">{sellerReviews.average}</span>
                <span className="text-muted-foreground">({sellerReviews.count} avaliações)</span>
              </div>
            )}

            <div className="border-t pt-4">
              <h3 className="font-medium mb-2">Descrição</h3>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                {listing.description}
              </p>
            </div>

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
