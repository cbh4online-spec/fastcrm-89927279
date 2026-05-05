import { useState, useMemo } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Send, Search } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { supabase } from "@/integrations/supabase/client";
import { useWhatsAppProSend, useRegisterWhatsAppProductShare } from "@/hooks/useWhatsAppPro";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { z } from "zod";

const messageSchema = z
  .string()
  .trim()
  .min(1, "A mensagem não pode ficar vazia.")
  .max(2000, "A mensagem é demasiado longa (máx. 2000 caracteres).");

interface SendProductByWhatsAppDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  productId: string;
  productName?: string;
  productPrice?: number | null;
  productImageUrl?: string | null;
  productLink?: string | null;
  /** Pré-seleciona contacto/conversa quando aberto a partir do Inbox. */
  prefillContactId?: string | null;
  prefillConversationId?: string | null;
  prefillPhone?: string | null;
}

interface ContactOption {
  id: string;
  name: string | null;
  phone: string | null;
  email: string | null;
}

export function SendProductByWhatsAppDialog({
  open,
  onOpenChange,
  productId,
  productName,
  productPrice,
  productImageUrl,
  productLink,
  prefillContactId,
  prefillConversationId,
  prefillPhone,
}: SendProductByWhatsAppDialogProps) {
  const { currentWorkspace } = useWorkspace();
  const send = useWhatsAppProSend();
  const registerShare = useRegisterWhatsAppProductShare();

  const [search, setSearch] = useState("");
  const [selectedContactId, setSelectedContactId] = useState<string | null>(prefillContactId ?? null);
  const [phoneOverride, setPhoneOverride] = useState<string>(prefillPhone ?? "");

  const defaultMessage = useMemo(() => {
    const lines: string[] = [];
    if (productName) lines.push(`📦 *${productName}*`);
    if (typeof productPrice === "number") lines.push(`💶 ${productPrice.toFixed(2)} €`);
    if (productLink) lines.push("");
    if (productLink) lines.push(`🔗 ${productLink}`);
    if (lines.length === 0) lines.push("Olá! Queria partilhar este produto consigo.");
    return lines.join("\n");
  }, [productName, productPrice, productLink]);

  const [message, setMessage] = useState<string>(defaultMessage);

  const { data: contacts, isLoading: contactsLoading } = useQuery({
    queryKey: ["contacts-search-whatsapp", currentWorkspace?.id, search],
    queryFn: async () => {
      if (!currentWorkspace?.id) return [];
      let q = supabase
        .from("contacts")
        .select("id, name, phone, email")
        .eq("workspace_id", currentWorkspace.id)
        .not("phone", "is", null)
        .order("updated_at", { ascending: false })
        .limit(20);
      if (search.trim().length > 1) {
        q = q.or(`name.ilike.%${search}%,phone.ilike.%${search}%,email.ilike.%${search}%`);
      }
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as ContactOption[];
    },
    enabled: open && !!currentWorkspace,
  });

  const selectedContact = useMemo(
    () => contacts?.find((c) => c.id === selectedContactId) ?? null,
    [contacts, selectedContactId],
  );

  const effectivePhone = phoneOverride.trim() || selectedContact?.phone || prefillPhone || "";

  const handleSend = async () => {
    const parsed = messageSchema.safeParse(message);
    if (!parsed.success) {
      toast.error(parsed.error.issues[0].message);
      return;
    }
    if (!effectivePhone) {
      toast.error("Indique um número de telefone ou selecione um contacto.");
      return;
    }

    try {
      const result = await send.mutateAsync({
        phone: effectivePhone,
        contactId: selectedContactId ?? undefined,
        conversationId: prefillConversationId ?? undefined,
        messageType: "product",
        text: parsed.data,
        productId,
        mediaUrl: productImageUrl ?? undefined,
        metadata: {
          source: "send_product_dialog",
          product_name: productName,
          product_link: productLink,
        },
      });

      // Backup explícito do registo
      await registerShare.mutateAsync({
        productId,
        contactId: selectedContactId ?? null,
        conversationId: prefillConversationId ?? null,
        providerMessageId: result.providerMessageId,
      });

      toast.success("Produto enviado por WhatsApp ✅");
      onOpenChange(false);
    } catch {
      // toast já tratado no hook
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Enviar produto por WhatsApp</DialogTitle>
          <DialogDescription>
            Partilhe este produto com um contacto. A operação fica registada no histórico do cliente.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 md:grid-cols-2 flex-1 overflow-hidden">
          {/* Lado esquerdo: contacto */}
          <div className="space-y-3 overflow-hidden flex flex-col">
            <Label>Contacto</Label>
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Pesquisar contacto"
                className="pl-9"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <ScrollArea className="flex-1 border rounded-md">
              {contactsLoading ? (
                <div className="flex items-center justify-center p-6">
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                </div>
              ) : !contacts || contacts.length === 0 ? (
                <div className="text-center text-xs text-muted-foreground p-6">
                  Sem contactos com telefone disponíveis.
                </div>
              ) : (
                <div className="divide-y">
                  {contacts.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => {
                        setSelectedContactId(c.id);
                        setPhoneOverride("");
                      }}
                      className={
                        "w-full text-left px-3 py-2 hover:bg-muted/40 transition " +
                        (selectedContactId === c.id ? "bg-primary/5" : "")
                      }
                    >
                      <div className="text-sm font-medium truncate">{c.name || "Sem nome"}</div>
                      <div className="text-xs text-muted-foreground flex gap-2">
                        <span>{c.phone}</span>
                        {selectedContactId === c.id && <Badge variant="secondary" className="text-[10px]">Selecionado</Badge>}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </ScrollArea>
            <div className="space-y-1.5">
              <Label htmlFor="phone-override" className="text-xs">Ou indique um número manualmente</Label>
              <Input
                id="phone-override"
                placeholder="ex: 912345678"
                value={phoneOverride}
                onChange={(e) => {
                  setPhoneOverride(e.target.value);
                  if (e.target.value) setSelectedContactId(null);
                }}
              />
            </div>
          </div>

          {/* Lado direito: preview da mensagem */}
          <div className="space-y-3 flex flex-col">
            <Label htmlFor="message-preview">Mensagem</Label>
            <Textarea
              id="message-preview"
              rows={10}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              maxLength={2000}
              className="font-mono text-sm flex-1"
            />
            {productImageUrl && (
              <div className="border rounded-md overflow-hidden bg-muted/30">
                <img
                  src={productImageUrl}
                  alt={productName ?? "Produto"}
                  className="w-full max-h-32 object-cover"
                  loading="lazy"
                />
              </div>
            )}
            <p className="text-[11px] text-muted-foreground">
              {message.length}/2000 caracteres
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={send.isPending}>
            Cancelar
          </Button>
          <Button onClick={handleSend} disabled={send.isPending || !effectivePhone} className="gap-1.5">
            {send.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            Enviar agora
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
