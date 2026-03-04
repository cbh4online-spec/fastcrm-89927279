import { useState, useRef, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Send, MoreVertical, ShoppingBag, Eye, Flag, Ban, HandCoins, Lock, Tag, MessageCircle, ImagePlus, Loader2, X } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { format } from "date-fns";
import { pt } from "date-fns/locale";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { SystemMessage } from "./SystemMessage";
import type { C2CMessage, C2CConversation } from "@/hooks/useC2CMessages";
import type { C2COffer } from "@/hooks/useC2COffers";

interface ChatThreadProps {
  conversation: C2CConversation | null;
  messages: C2CMessage[];
  offers: C2COffer[];
  onSend: (content: string, messageType?: string, metadata?: Record<string, unknown>) => void;
  onMakeOffer: () => void;
  onRespondOffer: (offerId: string, action: "accepted" | "rejected") => void;
  onUpdateStatus: (status: "reserved" | "sold") => void;
  isSending?: boolean;
}

export function ChatThread({
  conversation,
  messages,
  offers,
  onSend,
  onMakeOffer,
  onRespondOffer,
  onUpdateStatus,
  isSending,
}: ChatThreadProps) {
  const { user } = useAuth();
  const [text, setText] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  const handleSend = async () => {
    if (pendingFile) {
      await handleSendImage();
      return;
    }
    if (!text.trim()) return;
    onSend(text.trim());
    setText("");
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Apenas imagens são suportadas");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error("Imagem demasiado grande (máx. 10MB)");
      return;
    }
    setPendingFile(file);
    setPreviewUrl(URL.createObjectURL(file));
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const clearPendingFile = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPendingFile(null);
    setPreviewUrl(null);
  };

  const handleSendImage = async () => {
    if (!pendingFile || !conversation || !user) return;
    setIsUploading(true);
    try {
      const ext = pendingFile.name.split(".").pop() || "jpg";
      const path = `chat/${conversation.listing_id}/${Date.now()}-${crypto.randomUUID().slice(0, 8)}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from("c2c-photos")
        .upload(path, pendingFile, { contentType: pendingFile.type });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from("c2c-photos")
        .getPublicUrl(path);

      const imageUrl = urlData.publicUrl;

      onSend(
        text.trim() || "📷 Imagem",
        "image",
        { image_url: imageUrl }
      );
      setText("");
      clearPendingFile();
    } catch (err) {
      console.error("Upload error:", err);
      toast.error("Erro ao enviar imagem");
    } finally {
      setIsUploading(false);
    }
  };

  if (!conversation) {
    return (
      <div className="flex-1 flex items-center justify-center glass-premium rounded-xl">
        <div className="text-center">
          <MessageCircle className="h-12 w-12 mx-auto mb-3 text-muted-foreground/30" />
          <p className="text-sm text-muted-foreground">Seleciona uma conversa</p>
        </div>
      </div>
    );
  }

  const isSeller = conversation.listing_seller_id === user?.id;
  const pendingOffer = offers.find(o => o.status === "pending");
  const canMakeOffer = !isSeller && conversation.listing_status === "active" && !pendingOffer;
  const canRespond = isSeller && !!pendingOffer;
  const canReserve = isSeller && conversation.listing_status === "active";
  const canSell = isSeller && (conversation.listing_status === "active" || conversation.listing_status === "reserved");

  return (
    <div className="flex flex-col h-full glass-premium rounded-xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-3 p-3 border-b border-border/50">
        <div className="w-9 h-9 rounded-lg bg-muted/50 overflow-hidden flex-shrink-0">
          {conversation.listing_photo ? (
            <img src={conversation.listing_photo} alt="" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <ShoppingBag className="h-4 w-4 text-muted-foreground/40" />
            </div>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate text-foreground">{conversation.listing_title}</p>
          <p className="text-xs text-[hsl(var(--gold))] font-semibold">{conversation.listing_price.toFixed(2)} €</p>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem>
              <Eye className="h-4 w-4 mr-2" /> Ver anúncio
            </DropdownMenuItem>
            <DropdownMenuItem>
              <Flag className="h-4 w-4 mr-2" /> Reportar
            </DropdownMenuItem>
            <DropdownMenuItem className="text-destructive">
              <Ban className="h-4 w-4 mr-2" /> Bloquear
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {messages.length === 0 && (
          <p className="text-center text-muted-foreground text-sm py-8">
            Nenhuma mensagem ainda. Inicia a conversa!
          </p>
        )}
        {messages.map(msg => {
          if (msg.message_type === "system" || msg.message_type === "offer") {
            return <SystemMessage key={msg.id} message={msg} />;
          }

          const isOwn = msg.sender_id === user?.id;
          const meta = (msg.metadata || {}) as Record<string, unknown>;
          const imageUrl = meta.image_url as string | undefined;
          const isImage = msg.message_type === "image" && imageUrl;

          return (
            <div key={msg.id} className={`flex ${isOwn ? "justify-end" : "justify-start"}`}>
              <div
                className={`max-w-[75%] rounded-2xl ${isImage ? "p-1" : "px-4 py-2.5"} ${
                  isOwn
                    ? "bg-[hsl(43,96%,56%)/0.15] text-foreground border border-[hsl(43,96%,56%)/0.2] rounded-br-md"
                    : "bg-muted/60 text-foreground border border-border/30 rounded-bl-md"
                }`}
              >
                {isImage && (
                  <a href={imageUrl} target="_blank" rel="noopener noreferrer">
                    <img
                      src={imageUrl}
                      alt="Imagem enviada"
                      className="rounded-xl max-h-60 w-auto object-cover cursor-pointer hover:opacity-90 transition-opacity"
                      loading="lazy"
                    />
                  </a>
                )}
                {(!isImage || (msg.content && msg.content !== "📷 Imagem")) && (
                  <p className={`text-sm leading-relaxed ${isImage ? "px-3 py-1.5" : ""}`}>{msg.content}</p>
                )}
                <p className={`text-[10px] mt-1 ${isImage ? "px-3 pb-1.5" : ""} ${isOwn ? "text-[hsl(var(--gold))]/60" : "text-muted-foreground/60"}`}>
                  {format(new Date(msg.created_at), "HH:mm", { locale: pt })}
                </p>
              </div>
            </div>
          );
        })}

        {/* Inline offer action for seller */}
        {canRespond && pendingOffer && (
          <div className="flex justify-center my-2">
            <div className="bg-primary/10 border border-primary/20 rounded-xl p-3 max-w-[85%] text-center">
              <p className="text-xs text-muted-foreground mb-1">Proposta pendente</p>
              <p className="text-lg font-bold text-[hsl(var(--gold))]">{pendingOffer.offer_price.toFixed(2)} €</p>
              <div className="flex gap-2 mt-2 justify-center">
                <Button size="sm" className="text-xs h-7" onClick={() => onRespondOffer(pendingOffer.id, "accepted")}>
                  Aceitar
                </Button>
                <Button size="sm" variant="outline" className="text-xs h-7" onClick={() => onRespondOffer(pendingOffer.id, "rejected")}>
                  Recusar
                </Button>
              </div>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Image preview */}
      {previewUrl && (
        <div className="px-3 pt-2 border-t border-border/30">
          <div className="relative inline-block">
            <img src={previewUrl} alt="Preview" className="h-20 rounded-lg object-cover border border-border/50" />
            <button
              onClick={clearPendingFile}
              className="absolute -top-1.5 -right-1.5 h-5 w-5 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        </div>
      )}

      {/* Composer */}
      <div className="border-t border-border/50 p-3 space-y-2">
        {/* Quick actions */}
        <div className="flex gap-1.5 overflow-x-auto no-scrollbar">
          {canMakeOffer && (
            <Button size="sm" variant="outline" className="text-[11px] h-7 px-2.5 flex-shrink-0" onClick={onMakeOffer}>
              <HandCoins className="h-3 w-3 mr-1" /> Fazer proposta
            </Button>
          )}
          {canReserve && (
            <Button size="sm" variant="outline" className="text-[11px] h-7 px-2.5 flex-shrink-0" onClick={() => onUpdateStatus("reserved")}>
              <Lock className="h-3 w-3 mr-1" /> Reservar
            </Button>
          )}
          {canSell && (
            <Button size="sm" variant="outline" className="text-[11px] h-7 px-2.5 flex-shrink-0" onClick={() => onUpdateStatus("sold")}>
              <Tag className="h-3 w-3 mr-1" /> Vendido
            </Button>
          )}
        </div>
        <div className="flex gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFileSelect}
          />
          <Button
            size="icon"
            variant="ghost"
            className="flex-shrink-0 h-9 w-9"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading || isSending}
          >
            <ImagePlus className="h-4 w-4 text-muted-foreground" />
          </Button>
          <Input
            value={text}
            onChange={e => setText(e.target.value)}
            placeholder={pendingFile ? "Adicionar legenda..." : "Escrever mensagem..."}
            onKeyDown={e => e.key === "Enter" && handleSend()}
            disabled={isSending || isUploading}
            className="bg-muted/30 border-border/30"
          />
          <Button
            size="icon"
            onClick={handleSend}
            disabled={(isSending || isUploading) || (!text.trim() && !pendingFile)}
            className="flex-shrink-0"
          >
            {isUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </Button>
        </div>
      </div>

      {/* Hidden file input */}
    </div>
  );
}
