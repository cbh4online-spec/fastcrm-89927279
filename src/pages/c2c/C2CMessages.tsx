import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { ArrowLeft, Info } from "lucide-react";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useAuth } from "@/contexts/AuthContext";
import {
  useC2CConversations,
  useC2CThread,
  useSendC2CMessage,
  useSendC2COfferMessage,
  useRespondToOfferInChat,
  useUpdateListingStatusInChat,
} from "@/hooks/useC2CMessages";
import { useListingOffers } from "@/hooks/useC2COffers";
import { ConversationList } from "@/components/c2c/inbox/ConversationList";
import { ChatThread } from "@/components/c2c/inbox/ChatThread";
import { DealPanel } from "@/components/c2c/inbox/DealPanel";
import type { C2CConversation } from "@/hooks/useC2CMessages";

export default function C2CMessages() {
  const navigate = useNavigate();
  const { currentWorkspace } = useWorkspace();
  const { user } = useAuth();
  const workspaceId = currentWorkspace?.id;

  const { data: conversations = [], isLoading } = useC2CConversations(workspaceId);
  const sendMessage = useSendC2CMessage(workspaceId);
  const sendOffer = useSendC2COfferMessage(workspaceId);
  const respondOffer = useRespondToOfferInChat(workspaceId);
  const updateStatus = useUpdateListingStatusInChat(workspaceId);

  const [selected, setSelected] = useState<C2CConversation | null>(null);
  const [mobileTab, setMobileTab] = useState("conversations");
  const [offerDialogOpen, setOfferDialogOpen] = useState(false);
  const [offerAmount, setOfferAmount] = useState("");

  const selectedKey = selected ? `${selected.listing_id}:${selected.other_user_id}` : null;

  const { data: threadMessages = [] } = useC2CThread(selected?.listing_id, selected?.other_user_id);
  const { data: offers = [] } = useListingOffers(selected?.listing_id);

  // Auto-select first conversation
  useEffect(() => {
    if (!selected && conversations.length > 0) {
      setSelected(conversations[0]);
    }
  }, [conversations, selected]);

  const handleSelect = useCallback((conv: C2CConversation) => {
    setSelected(conv);
    setMobileTab("chat");
  }, []);

  const handleSend = useCallback((content: string) => {
    if (!selected) return;
    sendMessage.mutate({
      listingId: selected.listing_id,
      receiverId: selected.other_user_id,
      content,
    });
  }, [selected, sendMessage]);

  const handleMakeOffer = useCallback((price?: number) => {
    if (price !== undefined && selected) {
      sendOffer.mutate({
        listingId: selected.listing_id,
        sellerId: selected.listing_seller_id,
        offerPrice: price,
      });
    } else {
      setOfferAmount(selected ? (selected.listing_price * 0.9).toFixed(2) : "");
      setOfferDialogOpen(true);
    }
  }, [selected, sendOffer]);

  const handleSubmitOffer = useCallback(() => {
    if (!selected || !offerAmount) return;
    sendOffer.mutate({
      listingId: selected.listing_id,
      sellerId: selected.listing_seller_id,
      offerPrice: parseFloat(offerAmount),
    });
    setOfferDialogOpen(false);
  }, [selected, offerAmount, sendOffer]);

  const handleRespondOffer = useCallback((offerId: string, action: "accepted" | "rejected") => {
    if (!selected) return;
    respondOffer.mutate({
      offerId,
      action,
      buyerId: selected.other_user_id,
      listingId: selected.listing_id,
    });
  }, [selected, respondOffer]);

  const handleUpdateStatus = useCallback((status: "reserved" | "sold") => {
    if (!selected) return;
    updateStatus.mutate({
      listingId: selected.listing_id,
      newStatus: status,
      otherUserId: selected.other_user_id,
    });
  }, [selected, updateStatus]);

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-4 max-w-7xl">
        <Button variant="ghost" size="sm" onClick={() => navigate("/dashboard/c2c")} className="mb-3 -ml-2">
          <ArrowLeft className="h-4 w-4 mr-1" /> Marketplace
        </Button>

        {/* Desktop Layout */}
        <div className="hidden lg:grid lg:grid-cols-[320px_1fr_360px] gap-3 h-[calc(100vh-120px)]">
          <ConversationList
            conversations={conversations}
            isLoading={isLoading}
            selectedKey={selectedKey}
            onSelect={handleSelect}
          />
          <ChatThread
            conversation={selected}
            messages={threadMessages}
            offers={offers}
            onSend={handleSend}
            onMakeOffer={() => handleMakeOffer()}
            onRespondOffer={handleRespondOffer}
            onUpdateStatus={handleUpdateStatus}
            isSending={sendMessage.isPending}
          />
          <DealPanel
            conversation={selected}
            offers={offers}
            onMakeOffer={handleMakeOffer}
          />
        </div>

        {/* Mobile Layout */}
        <div className="lg:hidden h-[calc(100vh-120px)]">
          <Tabs value={mobileTab} onValueChange={setMobileTab} className="h-full flex flex-col">
            <TabsList className="grid grid-cols-3 mb-3">
              <TabsTrigger value="conversations">Conversas</TabsTrigger>
              <TabsTrigger value="chat">Chat</TabsTrigger>
              <TabsTrigger value="deal">Produto</TabsTrigger>
            </TabsList>
            <TabsContent value="conversations" className="flex-1 mt-0">
              <ConversationList
                conversations={conversations}
                isLoading={isLoading}
                selectedKey={selectedKey}
                onSelect={handleSelect}
              />
            </TabsContent>
            <TabsContent value="chat" className="flex-1 mt-0">
              <div className="h-full relative">
                <ChatThread
                  conversation={selected}
                  messages={threadMessages}
                  offers={offers}
                  onSend={handleSend}
                  onMakeOffer={() => handleMakeOffer()}
                  onRespondOffer={handleRespondOffer}
                  onUpdateStatus={handleUpdateStatus}
                  isSending={sendMessage.isPending}
                />
                {selected && (
                  <Sheet>
                    <SheetTrigger asChild>
                      <Button size="icon" variant="outline" className="absolute top-3 right-14 h-8 w-8 z-10">
                        <Info className="h-4 w-4" />
                      </Button>
                    </SheetTrigger>
                    <SheetContent side="bottom" className="h-[70vh] p-0">
                      <DealPanel
                        conversation={selected}
                        offers={offers}
                        onMakeOffer={handleMakeOffer}
                      />
                    </SheetContent>
                  </Sheet>
                )}
              </div>
            </TabsContent>
            <TabsContent value="deal" className="flex-1 mt-0">
              <DealPanel
                conversation={selected}
                offers={offers}
                onMakeOffer={handleMakeOffer}
              />
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* Offer Dialog */}
      <Dialog open={offerDialogOpen} onOpenChange={setOfferDialogOpen}>
        <DialogContent className="sm:max-w-[380px]">
          <DialogHeader>
            <DialogTitle>Fazer proposta</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div>
              <p className="text-xs text-muted-foreground mb-1">Preço anunciado</p>
              <p className="text-lg font-bold text-[hsl(var(--gold))]">{selected?.listing_price.toFixed(2)} €</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">A tua proposta</p>
              <Input
                type="number"
                step="0.01"
                value={offerAmount}
                onChange={e => setOfferAmount(e.target.value)}
                placeholder="0.00"
                className="text-lg font-semibold"
              />
            </div>
            <Button className="w-full" onClick={handleSubmitOffer} disabled={!offerAmount || parseFloat(offerAmount) <= 0}>
              Enviar proposta
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
